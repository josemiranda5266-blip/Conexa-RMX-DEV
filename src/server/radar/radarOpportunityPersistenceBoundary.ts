import crypto from 'crypto';

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
  externalReference: string;
  document: Record<string, unknown>;
}

export interface PersistOpportunityDocumentResult {
  id: string;
  created: boolean;
  document: Record<string, unknown>;
}

export function buildCanonicalRadarOpportunityId(externalReference: string): string {
  return `RADAR-${crypto.createHash('sha256').update(externalReference).digest('hex').slice(0, 40)}`;
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

/**
 * Canonical Firestore boundary for RADAR opportunity creation.
 * Validation and business policy remain in the callers; this module owns only
 * deterministic identity plus create-or-read concurrency semantics.
 */
export async function persistOpportunityDocument(
  db: RadarOpportunityPersistenceDb,
  input: PersistOpportunityDocumentInput,
): Promise<PersistOpportunityDocumentResult> {
  const id = buildCanonicalRadarOpportunityId(input.externalReference);
  const ref = db.collection('radar_opportunities').doc(id);
  const existing = await ref.get();

  if (existing.exists) {
    return { id, created: false, document: { ...(existing.data() || {}), id } };
  }

  const document = { ...input.document, id };

  try {
    await ref.create(document);
    return { id, created: true, document };
  } catch (error) {
    if (!isAlreadyExistsError(error)) throw error;
    const concurrent = await ref.get();
    if (!concurrent.exists) throw error;
    return { id, created: false, document: { ...(concurrent.data() || {}), id } };
  }
}
