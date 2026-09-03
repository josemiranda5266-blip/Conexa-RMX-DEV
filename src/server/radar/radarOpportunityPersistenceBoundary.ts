import type { OpportunitySourceType } from '../../types.js';
import {
  buildLegacyRadarOpportunityId,
  buildRadarOpportunityIdentity,
} from './radarOpportunityIdentity.js';

export interface RadarOpportunityPersistenceDb {
  collection(name: string): {
    doc(id: string): RadarOpportunityPersistenceDocRef;
  };
}

export interface RadarOpportunityPersistenceDocRef {
  id: string;
  get(): Promise<{ exists: boolean; data(): Record<string, unknown> | undefined }>;
  create(data: Record<string, unknown>): Promise<void>;
}

export interface PersistOpportunityDocumentInput {
  sourceType: OpportunitySourceType | string;
  externalReference?: string;
  source?: string;
  description?: string;
  city?: string;
  province?: string;
  document: Record<string, unknown>;
}

export interface PersistOpportunityDocumentResult {
  id: string;
  created: boolean;
  document: Record<string, unknown>;
  resolvedFrom?: string;
}

function isAlreadyExistsError(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false;
  const candidate = error as { code?: unknown; status?: unknown; message?: unknown };
  return candidate.code === 6 ||
    candidate.code === '6' ||
    candidate.code === 'ALREADY_EXISTS' ||
    candidate.status === 6 ||
    candidate.status === 'ALREADY_EXISTS' ||
    (typeof candidate.message === 'string' && /already exists|already-exists|ALREADY_EXISTS/i.test(candidate.message));
}

function identityCandidates(input: PersistOpportunityDocumentInput): string[] {
  const identity = buildRadarOpportunityIdentity(input);
  const ids = [identity.canonicalId];

  if (input.externalReference) {
    ids.push(buildLegacyRadarOpportunityId(input.externalReference));
  }

  return [...new Set(ids)];
}

/**
 * Canonical Firestore boundary for RADAR opportunity creation.
 * It owns deterministic identity and backward-compatible reads. Existing
 * historical documents are never renamed or copied implicitly.
 */
export async function persistOpportunityDocument(
  db: RadarOpportunityPersistenceDb,
  input: PersistOpportunityDocumentInput,
): Promise<PersistOpportunityDocumentResult> {
  const candidates = identityCandidates(input);
  const canonicalId = candidates[0];

  for (const id of candidates) {
    const ref = db.collection('radar_opportunities').doc(id);
    const existing = await ref.get();
    if (existing.exists) {
      return {
        id,
        created: false,
        resolvedFrom: id === canonicalId ? undefined : id,
        document: { ...(existing.data() || {}), id },
      };
    }
  }

  const document = { ...input.document, id: canonicalId };
  const ref = db.collection('radar_opportunities').doc(canonicalId);

  try {
    await ref.create(document);
    return { id: canonicalId, created: true, document };
  } catch (error) {
    if (!isAlreadyExistsError(error)) throw error;

    for (const id of candidates) {
      const concurrent = await db.collection('radar_opportunities').doc(id).get();
      if (concurrent.exists) {
        return {
          id,
          created: false,
          resolvedFrom: id === canonicalId ? undefined : id,
          document: { ...(concurrent.data() || {}), id },
        };
      }
    }

    throw error;
  }
}
