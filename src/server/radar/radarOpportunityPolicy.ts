import { createHash } from 'crypto';
import type {
  OpportunitySourceType,
  RadarOpportunity,
} from '../../types.js';

export const MAX_OPPORTUNITY_DESCRIPTION_LENGTH = 2000;
export const MAX_OPPORTUNITY_NOTES_LENGTH = 1000;
export const MAX_EXTERNAL_REFERENCE_LENGTH = 256;

export interface RadarOpportunityWriteInput {
  source: string;
  sourceType: OpportunitySourceType;
  externalReference?: string;
  clientUserId?: string;
  serviceRequestId?: string;
  category: string;
  subcategory: string;
  description: string;
  city: string;
  province: string;
  neighborhood?: string;
  urgency: RadarOpportunity['urgency'];
  intentScore: number;
  confidenceScore: number;
  status: RadarOpportunity['status'];
  consentStatus: RadarOpportunity['consentStatus'];
  contactMethod: RadarOpportunity['contactMethod'];
  notes?: string;
  environment?: RadarOpportunity['environment'];
  is_test?: boolean;
  attribution?: RadarOpportunity['attribution'];
}

export interface NormalizedRadarOpportunityWrite {
  source: string;
  sourceType: OpportunitySourceType;
  externalReference?: string;
  clientUserId?: string;
  serviceRequestId?: string;
  category: string;
  subcategory: string;
  description: string;
  city: string;
  province: string;
  neighborhood?: string;
  urgency: RadarOpportunity['urgency'];
  intentScore: number;
  confidenceScore: number;
  status: RadarOpportunity['status'];
  consentStatus: RadarOpportunity['consentStatus'];
  contactMethod: RadarOpportunity['contactMethod'];
  notes?: string;
  environment?: RadarOpportunity['environment'];
  is_test: boolean;
  attribution?: RadarOpportunity['attribution'];
}

function normalizeRequiredString(value: unknown, maxLength: number, code: string): string {
  if (typeof value !== 'string') throw new Error(code);
  const normalized = value.trim();
  if (!normalized || normalized.length > maxLength) throw new Error(code);
  return normalized;
}

function normalizeOptionalString(value: unknown, maxLength: number, code: string): string | undefined {
  if (value === undefined || value === null || value === '') return undefined;
  return normalizeRequiredString(value, maxLength, code);
}

function normalizeScore(value: unknown, code: string): number {
  const score = Number(value);
  if (!Number.isFinite(score) || score < 0 || score > 100) throw new Error(code);
  return Math.round(score * 10) / 10;
}

export function normalizeRadarOpportunityWrite(
  input: RadarOpportunityWriteInput,
): NormalizedRadarOpportunityWrite {
  const validSourceTypes: OpportunitySourceType[] = [
    'API_AUTORIZADA',
    'WEBHOOK',
    'FORMULARIO_CONEXA',
    'META_INTEGRATION_OFFICIAL',
    'CANAL_PROPIO',
    'CAMPAÑA_MARKETING',
    'REFERIDOS',
    'FUENTE_PUBLICA_PERMITIDA',
  ];

  if (!validSourceTypes.includes(input.sourceType)) throw new Error('INVALID_OPPORTUNITY_SOURCE_TYPE');
  if (!['LOW', 'MEDIUM', 'HIGH', 'EMERGENCY'].includes(input.urgency)) throw new Error('INVALID_OPPORTUNITY_URGENCY');
  if (!['NEW', 'ANALYZED', 'QUALIFIED', 'READY_TO_CONTACT', 'CONTACTED', 'RESPONDED', 'REGISTERED', 'MATCHED', 'SERVICE_REQUESTED', 'CONVERTED', 'CLOSED', 'IGNORED'].includes(input.status)) throw new Error('INVALID_OPPORTUNITY_STATUS');
  if (!['PENDING_CONSENT', 'CONSENT_GRANTED', 'NOT_REQUIRED'].includes(input.consentStatus)) throw new Error('INVALID_OPPORTUNITY_CONSENT_STATUS');
  if (!['CANAL_OFICIAL', 'RESPUESTA_PUBLICA_PERMITIDA', 'FORMULARIO_LANDING', 'WHATSAPP_API', 'EMAIL'].includes(input.contactMethod)) throw new Error('INVALID_OPPORTUNITY_CONTACT_METHOD');

  return {
    source: normalizeRequiredString(input.source, 160, 'INVALID_OPPORTUNITY_SOURCE'),
    sourceType: input.sourceType,
    externalReference: normalizeOptionalString(input.externalReference, MAX_EXTERNAL_REFERENCE_LENGTH, 'INVALID_OPPORTUNITY_EXTERNAL_REFERENCE'),
    clientUserId: normalizeOptionalString(input.clientUserId, 128, 'INVALID_OPPORTUNITY_CLIENT_ID'),
    serviceRequestId: normalizeOptionalString(input.serviceRequestId, 128, 'INVALID_OPPORTUNITY_REQUEST_ID'),
    category: normalizeRequiredString(input.category, 120, 'INVALID_OPPORTUNITY_CATEGORY'),
    subcategory: normalizeRequiredString(input.subcategory, 160, 'INVALID_OPPORTUNITY_SUBCATEGORY'),
    description: normalizeRequiredString(input.description, MAX_OPPORTUNITY_DESCRIPTION_LENGTH, 'INVALID_OPPORTUNITY_DESCRIPTION'),
    city: normalizeRequiredString(input.city, 120, 'INVALID_OPPORTUNITY_CITY'),
    province: normalizeRequiredString(input.province, 120, 'INVALID_OPPORTUNITY_PROVINCE'),
    neighborhood: normalizeOptionalString(input.neighborhood, 120, 'INVALID_OPPORTUNITY_NEIGHBORHOOD'),
    urgency: input.urgency,
    intentScore: normalizeScore(input.intentScore, 'INVALID_OPPORTUNITY_INTENT_SCORE'),
    confidenceScore: normalizeScore(input.confidenceScore, 'INVALID_OPPORTUNITY_CONFIDENCE_SCORE'),
    status: input.status,
    consentStatus: input.consentStatus,
    contactMethod: input.contactMethod,
    notes: normalizeOptionalString(input.notes, MAX_OPPORTUNITY_NOTES_LENGTH, 'INVALID_OPPORTUNITY_NOTES'),
    environment: input.environment === 'simulation' ? 'simulation' : 'production',
    is_test: input.is_test === true,
    attribution: input.attribution,
  };
}

export function buildOpportunityId(sourceType: OpportunitySourceType, externalReference?: string): string {
  const seed = `${sourceType}:${externalReference || 'anonymous'}`;
  return `RAD-${createHash('sha256').update(seed).digest('hex').slice(0, 24)}`;
}
