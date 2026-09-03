import { getAdminDb } from '../firebaseAdmin.js';
import type { RadarCandidate } from '../../domain/radarCandidate.js';

const MAX_CANDIDATES = 500;

/**
 * Server-side RADAR candidate source.
 *
 * Only the dedicated projection is queried here. Private `/users` documents
 * are no longer part of the normal RADAR matching read path.
 */
export async function loadRadarCandidates(): Promise<RadarCandidate[]> {
  const db = getAdminDb();
  const snapshot = await db.collection('radar_candidates').limit(MAX_CANDIDATES).get();

  return snapshot.docs
    .map((doc: any) => doc.data() as RadarCandidate)
    .filter((candidate: RadarCandidate) => Boolean(candidate?.id));
}
