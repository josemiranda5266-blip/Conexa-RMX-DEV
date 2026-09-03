import { createHash } from 'crypto';
import { getAdminDb } from '../firebaseAdmin.js';
import {
  buildOpportunityId,
  normalizeRadarOpportunityWrite,
  type RadarOpportunityWriteInput,
} from './radarOpportunityPolicy.js';
import type { RadarOpportunity } from '../../types.js';
import type { RadarCandidate } from '../../domain/radarCandidate.js';

const OPPORTUNITY_COLLECTION = 'radar_opportunities';

export interface RadarOpportunityServiceDb {
  collection: (name: string) => any;
}

function stableIdempotencyKey(input: ReturnType<typeof normalizeRadarOpportunityWrite>): string {
  const seed = input.externalReference
    ? `${input.sourceType}:${input.externalReference}`
    : `${input.sourceType}:${input.source}:${input.description}:${input.city}:${input.province}`;
  return createHash('sha256').update(seed).digest('hex');
}

function now(): string {
  return new Date().toISOString();
}

export interface PersistedRadarOpportunity extends RadarOpportunity {
  idempotencyKey: string;
}

export async function persistRadarOpportunity(
  input: RadarOpportunityWriteInput,
  matchedProfessionals: RadarOpportunity['matchedProfessionals'] = [],
  aiAnalysis: RadarOpportunity['aiAnalysis'] = {
    category: input.category,
    subcategory: input.subcategory,
    intent: 'LOW',
    urgency: input.urgency === 'EMERGENCY' ? 'EMERGENCY' : input.urgency,
    intentScore: input.intentScore,
    confidenceScore: input.confidenceScore,
    reasoning: 'Análisis no disponible.',
  },
  db: RadarOpportunityServiceDb = getAdminDb(),
): Promise<{ opportunity: PersistedRadarOpportunity; created: boolean }> {
  const normalized = normalizeRadarOpportunityWrite(input);
  const idempotencyKey = stableIdempotencyKey(normalized);
  const opportunityId = buildOpportunityId(normalized.sourceType, idempotencyKey);
  const ref = db.collection(OPPORTUNITY_COLLECTION).doc(opportunityId);
  const existingSnapshot = await ref.get();

  if (existingSnapshot.exists) {
    return {
      opportunity: existingSnapshot.data() as PersistedRadarOpportunity,
      created: false,
    };
  }

  const timestamp = now();
  const opportunity: PersistedRadarOpportunity = {
    id: opportunityId,
    ...normalized,
    matchedProfessionals,
    matchingStatus: matchedProfessionals.length > 0 ? 'COMPLETED' : 'NOT_RUN',
    conversionStatus: 'NOT_STARTED',
    detectedAt: timestamp,
    lastUpdated: timestamp,
    aiAnalysis,
    idempotencyKey,
  };

  try {
    await ref.create(opportunity);
    return { opportunity, created: true };
  } catch (error: any) {
    if (error?.code === 6 || error?.code === '6' || error?.code === 'ALREADY_EXISTS') {
      const concurrentSnapshot = await ref.get();
      if (concurrentSnapshot.exists) {
        return {
          opportunity: concurrentSnapshot.data() as PersistedRadarOpportunity,
          created: false,
        };
      }
    }
    throw error;
  }
}

export function buildRadarOpportunityAiAnalysis(
  category: string,
  subcategory: string,
  urgency: RadarOpportunity['urgency'],
  intentScore: number,
  confidenceScore: number,
  reasoning: string,
  intent: RadarOpportunity['aiAnalysis']['intent'] = 'MEDIUM',
): RadarOpportunity['aiAnalysis'] {
  return {
    category,
    subcategory,
    intent,
    urgency,
    intentScore,
    confidenceScore,
    reasoning,
  };
}

export function normalizeOpportunityIdempotencySeed(
  sourceType: RadarOpportunity['sourceType'],
  externalReference?: string,
): string {
  return createHash('sha256')
    .update(`${sourceType}:${externalReference || ''}`)
    .digest('hex');
}

export type { RadarCandidate };
