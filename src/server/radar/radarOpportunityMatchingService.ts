import type { MatchedProfessional, RadarOpportunity } from '../../types.js';
import { findMatchingProfessionalCandidates } from '../../domain/professionalMatchingCandidates.js';
import { loadRadarCandidates } from './radarCandidateRepository.js';

export interface RadarOpportunityMatchingResult {
  matchedProfessionals: MatchedProfessional[];
  matchingStatus: RadarOpportunity['matchingStatus'];
}

export async function matchRadarOpportunity(
  opportunity: Pick<RadarOpportunity, 'category' | 'subcategory' | 'city' | 'province' | 'neighborhood'>,
  limit = 10,
): Promise<RadarOpportunityMatchingResult> {
  const candidates = await loadRadarCandidates();
  const matches = findMatchingProfessionalCandidates(candidates, opportunity, { limit });

  return {
    matchedProfessionals: matches.map((match, index) => ({
      ...match.matchedProfessional,
      rank: index + 1,
    })),
    matchingStatus: 'COMPLETED',
  };
}
