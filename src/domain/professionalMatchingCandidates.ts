import type { MatchedProfessional, RadarOpportunity } from '../types';
import {
  calculateProfessionalMatchScore,
  isDiscoverableProfessional,
  matchesLocation,
  matchesProfession,
  toMatchedProfessional,
  type ProfessionalCandidate,
  type ProfessionalMatch,
} from './professionalMatching';

type RadarOpportunityInput = Pick<
  RadarOpportunity,
  'category' | 'subcategory' | 'city' | 'province' | 'neighborhood'
>;

export interface ProfessionalCandidateMatchOptions {
  limit?: number;
  includeUnavailable?: boolean;
}

const DEFAULT_MATCH_LIMIT = 10;
const MAX_MATCH_LIMIT = 50;

/**
 * Candidate-only RADAR boundary.
 *
 * The matcher intentionally accepts the normalized ProfessionalCandidate
 * contract instead of UserProfile. This prevents the matching algorithm from
 * requiring the complete private `/users` document and gives the backend a
 * stable contract for a future server-side matching implementation.
 */
export function findMatchingProfessionalCandidates(
  candidates: ProfessionalCandidate[],
  opportunity: RadarOpportunityInput,
  options: ProfessionalCandidateMatchOptions = {},
): ProfessionalMatch[] {
  const requestedLimit = options.limit ?? DEFAULT_MATCH_LIMIT;
  const limit = Number.isFinite(requestedLimit)
    ? Math.min(MAX_MATCH_LIMIT, Math.max(0, Math.floor(requestedLimit)))
    : DEFAULT_MATCH_LIMIT;

  return candidates
    .filter(isDiscoverableProfessional)
    .filter(candidate => options.includeUnavailable || candidate.availabilityStatus !== 'OCUPADO')
    .filter(candidate => matchesProfession(candidate, opportunity))
    .filter(candidate => matchesLocation(candidate, opportunity))
    .map(candidate => calculateProfessionalMatchScore(candidate, opportunity))
    .sort((a, b) =>
      b.matchScore - a.matchScore ||
      b.candidate.trustScore - a.candidate.trustScore ||
      b.candidate.rating - a.candidate.rating ||
      a.candidate.id.localeCompare(b.candidate.id)
    )
    .slice(0, limit);
}

/**
 * Convenience projection for UI consumers. No private UserProfile fields are
 * introduced at this boundary.
 */
export function matchCandidateProfiles(
  candidates: ProfessionalCandidate[],
  opportunity: RadarOpportunityInput,
  options?: ProfessionalCandidateMatchOptions,
): MatchedProfessional[] {
  return findMatchingProfessionalCandidates(candidates, opportunity, options).map(toMatchedProfessional);
}
