import type { UserProfile } from '../types';
import { toRadarCandidate, type RadarCandidate } from '../domain/radarCandidate';

/**
 * Transitional RADAR candidate provider.
 *
 * The source is still the legacy /users collection, but the privacy boundary
 * is now explicit: callers receive only RadarCandidate projections. The
 * implementation can later be replaced by a scoped backend query without
 * changing the matching contract.
 */
export function buildRadarCandidates(users: UserProfile[]): RadarCandidate[] {
  return users
    .map(toRadarCandidate)
    .filter((candidate): candidate is RadarCandidate => candidate !== null);
}
