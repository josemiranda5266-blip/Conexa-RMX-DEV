import type { Review } from '../types.js';

export interface ReputationAggregate {
  rating: number;
  reviewCount: number;
}

export function calculateReputationAggregate(reviews: readonly Review[]): ReputationAggregate {
  const valid = reviews.filter((review) =>
    review.isDemoData !== true &&
    review.isReported !== true &&
    typeof review.professionalId === 'string' &&
    review.professionalId.trim() !== '' &&
    Number.isFinite(review.overallRating) &&
    review.overallRating >= 1 &&
    review.overallRating <= 5,
  );

  if (valid.length === 0) {
    return { rating: 0, reviewCount: 0 };
  }

  const total = valid.reduce((sum, review) => sum + review.overallRating, 0);
  return {
    rating: Math.round((total / valid.length) * 100) / 100,
    reviewCount: valid.length,
  };
}

export function normalizeReputationAggregate(value: unknown): ReputationAggregate {
  if (!value || typeof value !== 'object') return { rating: 0, reviewCount: 0 };
  const candidate = value as { rating?: unknown; reviewCount?: unknown };
  const rating = Number(candidate.rating);
  const reviewCount = Number(candidate.reviewCount);

  return {
    rating: Number.isFinite(rating) ? Math.min(Math.max(Math.round(rating * 100) / 100, 0), 5) : 0,
    reviewCount: Number.isFinite(reviewCount) ? Math.max(Math.trunc(reviewCount), 0) : 0,
  };
}
