import type { UserProfile } from '../types';
import { normalizeProfessionalCandidate, type ProfessionalCandidate } from '../domain/professionalMatching';

/**
 * Transitional RADAR candidate provider.
 *
 * The matching engine consumes only ProfessionalCandidate. This adapter is the
 * current bridge while AppContext still owns the legacy `/users` collection.
 * It deliberately drops every UserProfile field that is not part of the
 * matching contract.
 *
 * Future production migration can replace this implementation with a scoped
 * backend candidate query without changing the matching engine API.
 */
export function buildRadarCandidates(users: UserProfile[]): ProfessionalCandidate[] {
  return users
    .map(normalizeProfessionalCandidate)
    .filter((candidate): candidate is ProfessionalCandidate => candidate !== null);
}
