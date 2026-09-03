import { getAdminDb } from '../firebaseAdmin.js';
import type { UserProfile } from '../../types.js';
import { toRadarCandidate, type RadarCandidate } from '../../domain/radarCandidate.js';

const MAX_CANDIDATES = 500;

/**
 * Server-side RADAR candidate source.
 *
 * This repository deliberately exposes only RadarCandidate values to callers.
 * The underlying Firestore document may contain private UserProfile fields,
 * but those fields are never returned from this boundary.
 *
 * The current query is intentionally conservative: it scopes the collection
 * and caps the result set while preserving the existing matching semantics.
 * Further indexed predicates can be added here without changing the matcher.
 */
export async function loadRadarCandidates(): Promise<RadarCandidate[]> {
  const db = getAdminDb();
  const snapshot = await db.collection('users').limit(MAX_CANDIDATES).get();

  return snapshot.docs
    .map((doc: any) => {
      const data = doc.data() as Record<string, unknown>;
      return toRadarCandidate({ id: doc.id, ...data } as UserProfile);
    })
    .filter((candidate: RadarCandidate | null): candidate is RadarCandidate => candidate !== null);
}
