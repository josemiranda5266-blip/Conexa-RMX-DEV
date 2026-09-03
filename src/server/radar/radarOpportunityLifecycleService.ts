import { getAdminDb } from '../firebaseAdmin.js';
import type { RadarOpportunity } from '../../types.js';
import {
  normalizeLifecyclePatch,
  type RadarOpportunityLifecyclePatch,
} from './radarOpportunityLifecyclePolicy.js';

const OPPORTUNITY_COLLECTION = 'radar_opportunities';

export interface RadarOpportunityLifecycleDb {
  collection: (name: string) => any;
  runTransaction: <T>(callback: (transaction: any) => Promise<T>) => Promise<T>;
}

export interface RadarOpportunityLifecycleResult {
  opportunity: RadarOpportunity;
  previousStatus: RadarOpportunity['status'];
  changed: boolean;
}

function hasLifecycleMetadataPatch(patch: RadarOpportunityLifecyclePatch): boolean {
  return patch.clientUserId !== undefined ||
    patch.serviceRequestId !== undefined ||
    patch.linkedAt !== undefined ||
    patch.convertedAt !== undefined;
}

export async function transitionRadarOpportunity(
  opportunityId: string,
  patch: RadarOpportunityLifecyclePatch,
  db: RadarOpportunityLifecycleDb = getAdminDb(),
): Promise<RadarOpportunityLifecycleResult> {
  const normalizedId = opportunityId.trim();
  if (!normalizedId || normalizedId.length > 128 || normalizedId.includes('/')) {
    throw new Error('INVALID_RADAR_OPPORTUNITY_ID');
  }

  const ref = db.collection(OPPORTUNITY_COLLECTION).doc(normalizedId);

  return db.runTransaction(async (transaction: any) => {
    const snapshot = await transaction.get(ref);
    if (!snapshot.exists) {
      throw new Error('RADAR_OPPORTUNITY_NOT_FOUND');
    }

    const current = snapshot.data() as RadarOpportunity;

    // A repeated lifecycle command with no metadata mutation is a true no-op.
    // This keeps webhook retries idempotent and avoids rewriting lastUpdated.
    if (current.status === patch.status && !hasLifecycleMetadataPatch(patch)) {
      return {
        opportunity: current,
        previousStatus: current.status,
        changed: false,
      };
    }

    const normalized = normalizeLifecyclePatch(current, patch);
    transaction.update(ref, normalized);

    return {
      opportunity: {
        ...current,
        ...normalized,
      },
      previousStatus: current.status,
      changed: true,
    };
  });
}
