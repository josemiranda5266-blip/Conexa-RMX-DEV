import { createHash } from 'crypto';
import type { OpportunitySourceType } from '../../types.js';

export interface RadarOpportunityIdentityInput {
  sourceType: OpportunitySourceType | string;
  externalReference?: string;
  source?: string;
  description?: string;
  city?: string;
  province?: string;
}

export interface RadarOpportunityIdentity {
  canonicalId: string;
  legacyExternalReferenceId?: string;
  idempotencyKey: string;
}

function sha256(value: string): string {
  return createHash('sha256').update(value).digest('hex');
}

export function buildRadarOpportunityIdentity(
  input: RadarOpportunityIdentityInput,
): RadarOpportunityIdentity {
  const sourceType = String(input.sourceType).trim();
  const externalReference = input.externalReference?.trim();

  if (!sourceType) throw new Error('INVALID_RADAR_OPPORTUNITY_SOURCE_TYPE');

  if (externalReference) {
    const idempotencyKey = sha256(`${sourceType}:${externalReference}`);
    return {
      canonicalId: `RAD-${idempotencyKey.slice(0, 24)}`,
      legacyExternalReferenceId: `RADAR-${sha256(externalReference).slice(0, 40)}`,
      idempotencyKey,
    };
  }

  const source = input.source?.trim() || '';
  const description = input.description?.trim() || '';
  const city = input.city?.trim() || '';
  const province = input.province?.trim() || '';
  const seed = [sourceType, source, description, city, province].join(':');
  const idempotencyKey = sha256(seed);

  return {
    canonicalId: `RAD-${idempotencyKey.slice(0, 24)}`,
    idempotencyKey,
  };
}

export function isRadarOpportunityId(value: unknown): value is string {
  return typeof value === 'string' && /^RAD(?:AR)?-[a-f0-9]{24,40}$/.test(value);
}
