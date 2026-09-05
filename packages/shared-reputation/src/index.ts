export type ReputationEntityType = 'PROFESSIONAL' | 'SELLER';

export interface ReputationReview {
  overallRating: unknown;
  isDemoData?: boolean;
  isReported?: boolean;
}

export interface ReputationAggregate {
  entityType: ReputationEntityType;
  rating: number;
  reviewCount: number;
}

function finiteRating(value: unknown): number | null {
  const rating = Number(value);
  return Number.isFinite(rating) && rating >= 1 && rating <= 5 ? rating : null;
}

/**
 * Canonical reputation calculation shared by Conexa professionals and Nexora sellers.
 * The caller supplies persisted reviews; client-provided aggregate fields are ignored.
 */
export function calculateReputationAggregate(
  reviews: ReputationReview[],
  entityType: ReputationEntityType,
): ReputationAggregate {
  const eligible = reviews
    .filter((review) => review.isDemoData !== true && review.isReported !== true)
    .map((review) => finiteRating(review.overallRating))
    .filter((rating): rating is number => rating !== null);

  if (eligible.length === 0) {
    return { entityType, rating: 0, reviewCount: 0 };
  }

  const total = eligible.reduce((sum, rating) => sum + rating, 0);
  return {
    entityType,
    rating: Math.round((total / eligible.length) * 100) / 100,
    reviewCount: eligible.length,
  };
}
