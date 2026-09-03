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

/** Pure reputation aggregation helper. Firestore writes belong to the
 * transaction that creates the authoritative review. */
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
