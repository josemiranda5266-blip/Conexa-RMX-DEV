import type { Review } from '../types.js';

export interface ReputationAggregate {
  rating: number;
  reviewCount: number;
}

function finiteRating(value: unknown): number | null {
  const rating = Number(value);
  return Number.isFinite(rating) && rating >= 1 && rating <= 5 ? rating : null;
}

/**
 * Recomputes the public reputation aggregate from persisted, non-reported reviews.
 * This pure helper intentionally ignores client-provided aggregate values.
 */
export function calculateReputationAggregate(reviews: Review[]): ReputationAggregate {
  const eligible = reviews
    .filter((review) => review.isDemoData !== true && review.isReported !== true)
    .map((review) => finiteRating(review.overallRating))
    .filter((rating): rating is number => rating !== null);

  if (eligible.length === 0) {
    return { rating: 0, reviewCount: 0 };
  }

  const total = eligible.reduce((sum, rating) => sum + rating, 0);
  return {
    rating: Math.round((total / eligible.length) * 100) / 100,
    reviewCount: eligible.length,
  };
}
