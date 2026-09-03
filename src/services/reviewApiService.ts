import { auth } from '../lib/firebase';
import type { Review } from '../types';

export interface CreateProfessionalReviewInput {
  professionalId: string;
  serviceRequestId: string;
  overallRating: number;
  qualityRating: number;
  punctualityRating: number;
  treatmentRating: number;
  priceRating: number;
  complianceRating: number;
  comment: string;
}

export interface CreateProfessionalReviewResult {
  review: Review;
  created: boolean;
}

export async function createProfessionalReview(
  input: CreateProfessionalReviewInput,
): Promise<CreateProfessionalReviewResult> {
  if (!auth?.currentUser) {
    throw new Error('AUTH_REQUIRED');
  }

  const token = await auth.currentUser.getIdToken();
  const response = await fetch('/api/reviews', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(input),
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const code = typeof payload?.error === 'string' ? payload.error : 'REVIEW_SAVE_FAILED';
    throw new Error(code);
  }

  return payload as CreateProfessionalReviewResult;
}
