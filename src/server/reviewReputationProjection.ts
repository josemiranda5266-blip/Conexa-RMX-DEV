import type { Review } from '../types.js';

export interface ReputationAggregate {
  rating: number;
  reviewCount: number;
}

export function normalizeReputationAggregate(input: unknown): ReputationAggregate {
  const value = input && typeof input === 'object' ? input as Record<string, unknown> : {};
  const rating = Number(value.rating);
  const reviewCount = Number(value.reviewCount);

  return {
    rating: Number.isFinite(rating) && rating >= 0 && rating <= 5 ? rating : 0,
    reviewCount: Number.isFinite(reviewCount) && reviewCount >= 0 ? Math.floor(reviewCount) : 0,
  };
}

export function nextReputationAggregate(
  current: ReputationAggregate,
  review: Pick<Review, 'overallRating'>,
): ReputationAggregate {
  const previousCount = current.reviewCount;
  const nextCount = previousCount + 1;
  const nextRating = (
    (current.rating * previousCount + Number(review.overallRating)) / nextCount
  );

  return {
    rating: Math.round(nextRating * 100) / 100,
    reviewCount: nextCount,
  };
}
