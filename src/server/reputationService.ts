import { getAdminDb } from './firebaseAdmin.js';
import type { Review } from '../types.js';

const USERS_COLLECTION = 'users';
const PUBLIC_PROFILES_COLLECTION = 'public_professional_profiles';

export interface ReputationUpdateResult {
  rating: number;
  reviewCount: number;
  changed: boolean;
}

function normalizeRating(value: unknown): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.max(0, Math.min(5, parsed)) : 0;
}

function normalizeCount(value: unknown): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? Math.floor(parsed) : 0;
}

/**
 * Authoritative reputation aggregation.
 * The aggregate is derived from persisted reviews and is never accepted
 * from the browser. The caller must invoke this in the same transaction
 * that creates the review so a successful review cannot leave its owner
 * with a stale rating/count.
 */
export function calculateUpdatedReputation(
  existingRating: unknown,
  existingReviewCount: unknown,
  newRating: number,
): ReputationUpdateResult {
  const rating = normalizeRating(existingRating);
  const reviewCount = normalizeCount(existingReviewCount);
  const safeNewRating = normalizeRating(newRating);

  if (reviewCount <= 0) {
    return { rating: safeNewRating, reviewCount: 1, changed: true };
  }

  const nextCount = reviewCount + 1;
  const nextRating = Math.round(((rating * reviewCount + safeNewRating) / nextCount) * 100) / 100;
  return { rating: nextRating, reviewCount: nextCount, changed: true };
}

export async function applyReputationForReview(
  review: Review,
): Promise<ReputationUpdateResult> {
  const db = getAdminDb();
  const userRef = db.collection(USERS_COLLECTION).doc(review.professionalId);
  const publicProfileRef = db.collection(PUBLIC_PROFILES_COLLECTION).doc(review.professionalId);

  return db.runTransaction(async (tx: any) => {
    const userSnap = await tx.get(userRef);
    if (!userSnap.exists) throw new Error('PROFESSIONAL_NOT_FOUND');

    const user = userSnap.data() as Record<string, unknown>;
    if (user.isBlocked === true) throw new Error('PROFESSIONAL_BLOCKED');

    const reputation = calculateUpdatedReputation(
      user.rating,
      user.reviewCount,
      review.overallRating,
    );

    tx.set(userRef, {
      rating: reputation.rating,
      reviewCount: reputation.reviewCount,
    }, { merge: true });

    const publicSnap = await tx.get(publicProfileRef);
    if (publicSnap.exists) {
      tx.set(publicProfileRef, {
        rating: reputation.rating,
        reviewCount: reputation.reviewCount,
        updatedAt: new Date().toISOString(),
      }, { merge: true });
    }

    return reputation;
  });
}
