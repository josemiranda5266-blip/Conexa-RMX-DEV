import { createHash } from 'crypto';
import { getAdminDb } from './firebaseAdmin.js';
import type { Review, ServiceRequest } from '../types.js';
import { calculateUpdatedReputation } from './reputationService.js';
import {
  assertReviewEligible,
  buildReviewDocument,
  normalizeReviewWrite,
  type ReviewWriteInput,
} from './reviewPolicy.js';

const REVIEWS_COLLECTION = 'reviews';
const USERS_COLLECTION = 'users';
const REQUESTS_COLLECTION = 'service_requests';
const PUBLIC_PROFESSIONAL_PROFILES_COLLECTION = 'public_professional_profiles';

export interface SaveReviewResult {
  review: Review;
  created: boolean;
}

function buildReviewId(clientId: string, professionalId: string, serviceRequestId: string): string {
  const seed = `CONEXA_REVIEW:${clientId}:${professionalId}:${serviceRequestId}`;
  return `REV-${createHash('sha256').update(seed).digest('hex').slice(0, 40)}`;
}

function isAlreadyExists(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false;
  const candidate = error as { code?: unknown; status?: unknown; message?: unknown };
  return candidate.code === 6 || candidate.code === '6' || candidate.code === 'ALREADY_EXISTS' ||
    candidate.status === 6 || candidate.status === 'ALREADY_EXISTS' ||
    (typeof candidate.message === 'string' && /already exists|already-exists|ALREADY_EXISTS/i.test(candidate.message));
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
  const publicProfileRef = db.collection(PUBLIC_PROFESSIONAL_PROFILES_COLLECTION).doc(normalized.professionalId);
  const reviewRef = db.collection(REVIEWS_COLLECTION).doc(
    buildReviewId(normalizedClientId, normalized.professionalId, normalized.serviceRequestId),
  );

  const result = await db.runTransaction(async (tx: any) => {
    const [requestSnap, clientSnap, professionalSnap, publicProfileSnap, reviewSnap] = await Promise.all([
      tx.get(requestRef),
      tx.get(clientRef),
      tx.get(professionalRef),
      tx.get(publicProfileRef),
      tx.get(reviewRef),
    ]);

    if (!requestSnap.exists) throw new Error('SERVICE_REQUEST_NOT_FOUND');
    if (!clientSnap.exists) throw new Error('USER_NOT_FOUND');
    if (!professionalSnap.exists) throw new Error('PROFESSIONAL_NOT_FOUND');
    if (reviewSnap.exists) {
      return { review: reviewSnap.data() as Review, created: false };
    }

    const request = requestSnap.data() as ServiceRequest;
    const client = clientSnap.data() as { id?: string; name?: string; avatar?: string; isBlocked?: boolean };
    if (client.isBlocked === true) throw new Error('USER_BLOCKED');

    assertReviewEligible(request, normalizedClientId, normalized.professionalId);

    const review = buildReviewDocument(
      reviewRef.id,
      request,
      { id: normalizedClientId, name: client.name, avatar: client.avatar },
      normalized,
      new Date().toISOString(),
    );

    // The canonical aggregate is derived from the authoritative professional
    // account. The public projection receives exactly the same transaction result.
    const professional = professionalSnap.data() as Record<string, unknown>;
    const aggregate = calculateUpdatedReputation(
      professional.rating,
      professional.reviewCount,
      review.overallRating,
    );

    tx.create(reviewRef, review);
    tx.update(professionalRef, aggregate);
    if (publicProfileSnap.exists) {
      tx.update(publicProfileRef, aggregate);
    }

    return { review, created: true };
  });

  return result;
}

export function reviewIdForService(
  clientId: string,
  professionalId: string,
  serviceRequestId: string,
): string {
  return buildReviewId(clientId, professionalId, serviceRequestId);
}

export function isReviewAlreadyExistsError(error: unknown): boolean {
  return isAlreadyExists(error);
}
