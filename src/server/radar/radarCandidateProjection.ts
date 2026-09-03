import { getAdminDb } from '../firebaseAdmin.js';
import type { UserProfile } from '../../types.js';
import { toRadarCandidate, type RadarCandidate } from '../../domain/radarCandidate.js';

export function buildRadarCandidateProjection(
  user: UserProfile,
): RadarCandidate | null {
  return toRadarCandidate(user);
}

export async function syncRadarCandidateProjection(
  user: UserProfile,
): Promise<RadarCandidate | null> {
  const candidate = buildRadarCandidateProjection(user);
  const db = getAdminDb();
  const ref = db.collection('radar_candidates').doc(user.id);

  if (!candidate) {
    await ref.delete();
    return null;
  }

  await ref.set(candidate, { merge: true });
  return candidate;
}
