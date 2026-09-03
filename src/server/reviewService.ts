import { createHash } from 'crypto';
import { getAdminDb } from './firebaseAdmin.js';
import type { Review, ServiceRequest } from '../types.js';
import { buildPublicProfessionalProfileDocument } from './publicProfessionalProfileProjection.js';
import { buildRadarCandidateProjection } from './radar/radarCandidateProjection.js';
import {
  assertReviewEligible,
  buildReviewDocument,
  normalizeReviewWrite,
  type ReviewWriteInput,
} from './reviewPolicy.js';

const REVIEWS_COLLECTION = 'reviews';
const USERS_COLLECTION = 'users';
const REQUESTS_COLLECTION = 'service_requests';
const PUBLIC_PROFILES_COLLECTION = 'public_professional_profiles';
const RADAR_CANDIDATES_COLLECTION = 'radar_candidates';
const TRANSACTIONS_COLLECTION = 'transactions';

export interface SaveReviewResult {
  review: Review;
  created: boolean;
}

function buildReviewId(clientId: string, professionalId: string, serviceRequestId: string): string {
  const seed = `CONEXA_REVIEW:${clientId}:${professionalId}:${serviceRequestId}`;
  return `REV-${createHash('sha256').update(seed).digest('hex').slice(0, 40)}`;
}

function calculateRating(existing: Record<string, unknown>, nextRating: number): { rating: number; reviewCount: number } {
  const previousCountRaw = Number(existing.reviewCount);
  const previousRatingRaw = Number(existing.rating);
  const normalizedPreviousCount = Number.isFinite(previousCountRaw)
    ? Math.max(0, Math.trunc(previousCountRaw))
    : 0;
  const previousRating = Number.isFinite(previousRatingRaw)
    ? Math.max(0, Math.min(5, previousRatingRaw))
    : 0;
  const reviewCount = normalizedPreviousCount + 1;
  const rating = reviewCount === 1
    ? nextRating
    : Math.round((((previousRating * normalizedPreviousCount) + nextRating) / reviewCount) * 10) / 10;

  return { rating, reviewCount };
}

export async function saveProfessionalReview(
  clientId: string,
  input: ReviewWriteInput,
): Promise<SaveReviewResult> {
  const normalizedClientId = String(clientId || '').trim();
  if (!normalizedClientId || normalizedClientId.includes('/') || normalizedClientId.length > 128) {
    throw new Error('INVALID_REVIEW_CLIENT_ID');
  }

  const normalized = normalizeReviewWrite(input);
  const db = getAdminDb();
  const requestRef = db.collection(REQUESTS_COLLECTION).doc(normalized.serviceRequestId);
  const clientRef = db.collection(USERS_COLLECTION).doc(normalizedClientId);
  const professionalRef = db.collection(USERS_COLLECTION).doc(normalized.professionalId);
  const reviewRef = db.collection(REVIEWS_COLLECTION).doc(
    buildReviewId(normalizedClientId, normalized.professionalId, normalized.serviceRequestId),
  );
  const publicProfileRef = db.collection(PUBLIC_PROFILES_COLLECTION).doc(normalized.professionalId);
  const radarCandidateRef = db.collection(RADAR_CANDIDATES_COLLECTION).doc(normalized.professionalId);

  return db.runTransaction(async (tx: any) => {
    const [requestSnap, clientSnap, professionalSnap, reviewSnap] = await Promise.all([
      tx.get(requestRef),
      tx.get(clientRef),
      tx.get(professionalRef),
      tx.get(reviewRef),
    ]);

    if (!requestSnap.exists) throw new Error('SERVICE_REQUEST_NOT_FOUND');
    if (!clientSnap.exists) throw new Error('USER_NOT_FOUND');
    if (!professionalSnap.exists) throw new Error('PROFESSIONAL_NOT_FOUND');

    // Firestore transactions retry automatically on concurrent writes. If a retry
    // sees the deterministic review document, this becomes an idempotent no-op.
    if (reviewSnap.exists) {
      return { review: reviewSnap.data() as Review, created: false };
    }

    const request = requestSnap.data() as ServiceRequest;
    const client = clientSnap.data() as { id?: string; name?: string; avatar?: string; isBlocked?: boolean };
    const professional = professionalSnap.data() as Record<string, unknown>;

    if (client.isBlocked === true) throw new Error('USER_BLOCKED');
    if (professional.isBlocked === true) throw new Error('PROFESSIONAL_BLOCKED');

    assertReviewEligible(request, normalizedClientId, normalized.professionalId);

    const review = buildReviewDocument(
      reviewRef.id,
      request,
      { id: normalizedClientId, name: client.name, avatar: client.avatar },
      normalized,
      new Date().toISOString(),
    );

    const aggregate = calculateRating(professional, normalized.overallRating);
    const updatedProfessional = {
      ...professional,
      id: normalized.professionalId,
      rating: aggregate.rating,
      reviewCount: aggregate.reviewCount,
    };
    const publicDocument = buildPublicProfessionalProfileDocument(updatedProfessional as any);
    const radarCandidate = buildRadarCandidateProjection(updatedProfessional as any);
    const transactionQuery = await db.collection(TRANSACTIONS_COLLECTION)
      .where('serviceRequestId', '==', request.id)
      .limit(1)
      .get();

    tx.create(reviewRef, review);
    tx.set(professionalRef, {
      rating: aggregate.rating,
      reviewCount: aggregate.reviewCount,
    }, { merge: true });
    tx.set(publicProfileRef, {
      ...publicDocument,
      updatedAt: new Date().toISOString(),
    }, { merge: true });

    if (radarCandidate) {
      tx.set(radarCandidateRef, radarCandidate, { merge: true });
    } else {
      tx.delete(radarCandidateRef);
    }

    // A completed review closes the commercial request. For payment-backed jobs,
    // the transaction advances only from SERVICE_COMPLETED to REVIEW_COMPLETED;
    // refunded/chargeback/settled states are never overwritten.
    tx.update(requestRef, {
      status: 'CLOSED',
    });

    if (!transactionQuery.empty) {
      const transactionDoc = transactionQuery.docs[0];
      const transactionData = transactionDoc.data() as { status?: string };
      if (transactionData.status === 'SERVICE_COMPLETED') {
        tx.update(transactionDoc.ref, {
          status: 'REVIEW_COMPLETED',
          reviewCompletedAt: review.createdAt,
        });
      }
    }

    return { review, created: true };
  });
}

export function reviewIdForService(
  clientId: string,
  professionalId: string,
  serviceRequestId: string,
): string {
  return buildReviewId(clientId, professionalId, serviceRequestId);
}
