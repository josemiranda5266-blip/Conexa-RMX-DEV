import crypto from 'crypto';

export interface RadarPersistenceDb {
  collection(name: string): {
    doc(id: string): RadarPersistenceDocRef;
  };
}

export interface RadarPersistenceDocRef {
  id: string;
  get(): Promise<RadarPersistenceSnapshot>;
  create(data: Record<string, unknown>): Promise<void>;
  update(data: Record<string, unknown>): Promise<void>;
}

export interface RadarPersistenceSnapshot {
  exists: boolean;
  data(): Record<string, unknown> | undefined;
}

export interface PersistRadarOpportunityInput {
  source: string;
  sourceType: string;
  externalReference: string;
  environment: 'production' | 'simulation';
  isTest: boolean;
  category: string;
  subcategory: string;
  description: string;
  city: string;
  province: string;
  neighborhood?: string;
  urgency: string;
  intentScore: number;
  confidenceScore: number;
  spamRiskScore?: number;
  status: string;
  consentStatus: string;
  contactMethod: string;
  matchedProfessionals: unknown[];
  aiAnalysis: Record<string, unknown>;
  attribution: Record<string, unknown>;
  now: string;
}

const MAX_EXTERNAL_REFERENCE_LENGTH = 240;
const MAX_DESCRIPTION_LENGTH = 5000;
const MAX_MATCHES = 10;
const MAX_MATCHES_PAYLOAD_BYTES = 120_000;
const MAX_METADATA_BYTES = 64_000;

function requireBoundedString(value: unknown, field: string, maxLength: number): string {
  if (typeof value !== 'string') throw new Error(`INVALID_RADAR_${field.toUpperCase()}`);
  const normalized = value.trim();
  if (!normalized || normalized.length > maxLength) {
    throw new Error(`INVALID_RADAR_${field.toUpperCase()}`);
  }
  return normalized;
}

function clampScore(value: unknown, field: string): number {
  const score = Number(value);
  if (!Number.isFinite(score) || score < 0 || score > 100) {
    throw new Error(`INVALID_RADAR_${field.toUpperCase()}`);
  }
  return Math.round(score);
}

function normalizeBoundedRecord(
  value: unknown,
  field: string,
  maxBytes = MAX_METADATA_BYTES,
): Record<string, unknown> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new Error(`INVALID_RADAR_${field.toUpperCase()}`);
  }

  let serialized: string;
  try {
    serialized = JSON.stringify(value);
  } catch {
    throw new Error(`INVALID_RADAR_${field.toUpperCase()}`);
  }

  if (new TextEncoder().encode(serialized).byteLength > maxBytes) {
    throw new Error(`INVALID_RADAR_${field.toUpperCase()}_TOO_LARGE`);
  }

  return { ...(value as Record<string, unknown>) };
}

function normalizeMatches(value: unknown[]): unknown[] {
  const matches = value.slice(0, MAX_MATCHES);

  let serialized: string;
  try {
    serialized = JSON.stringify(matches);
  } catch {
    throw new Error('INVALID_RADAR_MATCHES');
  }

  if (new TextEncoder().encode(serialized).byteLength > MAX_MATCHES_PAYLOAD_BYTES) {
    throw new Error('INVALID_RADAR_MATCHES_TOO_LARGE');
  }

  return matches;
}

function buildRadarOpportunityId(externalReference: string): string {
  const digest = crypto.createHash('sha256').update(externalReference).digest('hex').slice(0, 40);
  return `RADAR-${digest}`;
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
 * Persist a RADAR opportunity using a deterministic external reference.
 *
 * The caller owns authentication and webhook authorization. This service owns
 * the persistence invariant: production opportunities cannot be represented
 * only by an in-memory response, and retries of the same external event must
 * resolve to the same document.
 */
export async function persistRadarOpportunity(
  db: RadarPersistenceDb,
  input: PersistRadarOpportunityInput,
): Promise<{ id: string; created: boolean; opportunity: Record<string, unknown> }> {
  if (input.environment === 'production' && input.isTest) {
    throw new Error('RADAR_PRODUCTION_CANNOT_BE_TEST');
  }

  const externalReference = requireBoundedString(
    input.externalReference,
    'EXTERNAL_REFERENCE',
    MAX_EXTERNAL_REFERENCE_LENGTH,
  );
  const source = requireBoundedString(input.source, 'SOURCE', 120);
  const sourceType = requireBoundedString(input.sourceType, 'SOURCE_TYPE', 80);
  const description = requireBoundedString(input.description, 'DESCRIPTION', MAX_DESCRIPTION_LENGTH);
  const city = requireBoundedString(input.city, 'CITY', 120);
  const province = requireBoundedString(input.province, 'PROVINCE', 120);
  const category = requireBoundedString(input.category, 'CATEGORY', 120);
  const subcategory = requireBoundedString(input.subcategory, 'SUBCATEGORY', 160);
  const urgency = requireBoundedString(input.urgency, 'URGENCY', 40);
  const status = requireBoundedString(input.status, 'STATUS', 60);
  const consentStatus = requireBoundedString(input.consentStatus, 'CONSENT_STATUS', 40);
  const contactMethod = requireBoundedString(input.contactMethod, 'CONTACT_METHOD', 80);

  const intentScore = clampScore(input.intentScore, 'INTENT_SCORE');
  const confidenceScore = clampScore(input.confidenceScore, 'CONFIDENCE_SCORE');
  const spamRiskScore = input.spamRiskScore === undefined
    ? 0
    : clampScore(input.spamRiskScore, 'SPAM_RISK_SCORE');

  const matches = normalizeMatches(input.matchedProfessionals);
  const aiAnalysis = normalizeBoundedRecord(input.aiAnalysis, 'AI_ANALYSIS');
  const attribution = normalizeBoundedRecord(input.attribution, 'ATTRIBUTION');

  const documentId = buildRadarOpportunityId(externalReference);
  const ref = db.collection('radar_opportunities').doc(documentId);
  const existing = await ref.get();

  const opportunity: Record<string, unknown> = {
    id: documentId,
    source,
    sourceType,
    externalReference,
    environment: input.environment,
    is_test: input.isTest,
    category,
    subcategory,
    description,
    city,
    province,
    ...(input.neighborhood ? { neighborhood: input.neighborhood.trim().slice(0, 120) } : {}),
    urgency,
    intentScore,
    confidenceScore,
    spamRiskScore,
    status,
    matchedProfessionals: matches,
    conversionStatus: 'NOT_STARTED',
    consentStatus,
    contactMethod,
    aiAnalysis,
    attribution,
    lastUpdated: input.now,
  };

  if (existing.exists) {
    const current = existing.data() || {};
    return {
      id: documentId,
      created: false,
      opportunity: { ...current, id: documentId },
    };
  }

  try {
    await ref.create({ ...opportunity, createdAt: input.now });
    return { id: documentId, created: true, opportunity };
  } catch (error) {
    // Deterministic document IDs make concurrent webhook retries converge on
    // one record. Firestore create() rejects the losing writer; read the
    // winner instead of surfacing a false duplicate failure.
    if (!isAlreadyExistsError(error)) throw error;

    const concurrent = await ref.get();
    if (!concurrent.exists) throw error;

    return {
      id: documentId,
      created: false,
      opportunity: { ...(concurrent.data() || {}), id: documentId },
    };
  }
}

export async function persistRadarConversion(
  db: RadarPersistenceDb,
  opportunityId: string,
  conversion: Record<string, unknown>,
  now: string,
): Promise<void> {
  const id = requireBoundedString(opportunityId, 'OPPORTUNITY_ID', 120);
  const normalizedConversion = normalizeBoundedRecord(conversion, 'CONVERSION');
  const ref = db.collection('radar_opportunities').doc(id);
  const snapshot = await ref.get();
  if (!snapshot.exists) throw new Error('RADAR_OPPORTUNITY_NOT_FOUND');

  await ref.update({
    conversionStatus: 'CONVERTED',
    conversion: normalizedConversion,
    convertedAt: now,
    lastUpdated: now,
  });
}
