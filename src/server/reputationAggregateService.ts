import { getAdminDb } from './firebaseAdmin.js';
import type { Review } from '../types.js';

const USERS_COLLECTION = 'users';
const PUBLIC_PROFILES_COLLECTION = 'public_professional_profiles';

export interface ReputationAggregateDb {
  collection(name: string): any;
  runTransaction<T>(callback: (tx: any) => Promise<T>): Promise<T>;
}

export interface ReputationAggregateResult {
  rating: number;
  reviewCount: number;
}

export async function applyReviewToProfessionalReputation(
  review: Review,
  db: ReputationAggregateDb = getAdminDb(),
): Promise<ReputationAggregateResult> {
  const professionalId = String(review.professionalId || '').trim();
  if (!professionalId || professionalId.includes('/') || professionalId.length > 128) {
    throw new Error('INVALID_REVIEW_PROFESSIONAL_ID');
  }

  const reviewRef = db.collection('reviews').doc(review.id);
  const userRef = db.collection(USERS_COLLECTION).doc(professionalId);
  const publicProfileRef = db.collection(PUBLIC_PROFILES_COLLECTION).doc(professionalId);

  return db.runTransaction(async (tx: any) => {
    const reviewSnap = await tx.get(reviewRef);
    const userSnap = await tx.get(userRef);

    if (!reviewSnap.exists) throw new Error('REVIEW_NOT_FOUND');
    if (!userSnap.exists) throw new Error('PROFESSIONAL_NOT_FOUND');

    const user = (userSnap.data() || {}) as Record<string, unknown>;
    if (user.isBlocked === true) throw new Error('PROFESSIONAL_BLOCKED');

    const currentCount = Number.isFinite(user.reviewCount) ? Number(user.reviewCount) : 0;
    const currentRating = Number.isFinite(user.rating) ? Number(user.rating) : 0;
    const nextCount = Math.max(0, Math.floor(currentCount)) + 1;
    const reviewRating = Number(review.overallRating);
    const nextRating = Math.round(((currentRating * Math.max(0, nextCount - 1)) + reviewRating) / nextCount * 100) / 100;

    tx.update(userRef, {
      rating: Math.max(0, Math.min(5, nextRating)),
      reviewCount: nextCount,
      updatedAt: new Date().toISOString(),
    });

    tx.set(publicProfileRef, {
      rating: Math.max(0, Math.min(5, nextRating)),
      reviewCount: nextCount,
      updatedAt: new Date().toISOString(),
    }, { merge: true });

    return { rating: nextRating, reviewCount: nextCount };
  });
}
