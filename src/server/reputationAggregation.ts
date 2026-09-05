import { calculateReputationAggregate as calculateSharedReputationAggregate } from '@super-app/shared-reputation';
import type { Review } from '../types.js';

export type ReputationAggregate = {
  rating: number;
  reviewCount: number;
};

/**
 * Compatibility adapter for the existing Conexa domain.
 * The canonical implementation now lives in @super-app/shared-reputation.
 */
export function calculateReputationAggregate(reviews: Review[]): ReputationAggregate {
  const aggregate = calculateSharedReputationAggregate(reviews, 'PROFESSIONAL');
  return { rating: aggregate.rating, reviewCount: aggregate.reviewCount };
}
