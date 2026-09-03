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
    const normalized = normalizeLifecyclePatch(current, patch);

    if (current.status === patch.status && Object.keys(normalized).length === 1) {
      return {
        opportunity: current,
        previousStatus: current.status,
        changed: false,
      };
    }

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
