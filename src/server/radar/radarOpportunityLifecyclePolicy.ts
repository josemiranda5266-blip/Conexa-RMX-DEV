import type { OpportunityStatus, RadarOpportunity } from '../../types.js';

export type RadarOpportunityLifecycleStatus = OpportunityStatus;

const ALLOWED_TRANSITIONS: Record<RadarOpportunityLifecycleStatus, readonly RadarOpportunityLifecycleStatus[]> = {
  NEW: ['ANALYZED', 'IGNORED', 'CLOSED'],
  ANALYZED: ['QUALIFIED', 'READY_TO_CONTACT', 'IGNORED', 'CLOSED'],
  QUALIFIED: ['READY_TO_CONTACT', 'CONTACTED', 'IGNORED', 'CLOSED'],
  READY_TO_CONTACT: ['CONTACTED', 'IGNORED', 'CLOSED'],
  CONTACTED: ['RESPONDED', 'REGISTERED', 'IGNORED', 'CLOSED'],
  RESPONDED: ['REGISTERED', 'MATCHED', 'IGNORED', 'CLOSED'],
  REGISTERED: ['MATCHED', 'SERVICE_REQUESTED', 'IGNORED', 'CLOSED'],
  MATCHED: ['SERVICE_REQUESTED', 'IGNORED', 'CLOSED'],
  SERVICE_REQUESTED: ['CONVERTED', 'CLOSED'],
  CONVERTED: ['CLOSED'],
  CLOSED: [],
  IGNORED: [],
};

export interface RadarOpportunityLifecyclePatch {
  status: RadarOpportunityLifecycleStatus;
  clientUserId?: string;
  serviceRequestId?: string;
  linkedAt?: string;
  convertedAt?: string;
}

export function canTransitionRadarOpportunity(
  current: RadarOpportunityLifecycleStatus,
  next: RadarOpportunityLifecycleStatus,
): boolean {
  return ALLOWED_TRANSITIONS[current].includes(next);
}

export function assertRadarOpportunityTransition(
  current: RadarOpportunityLifecycleStatus,
  next: RadarOpportunityLifecycleStatus,
): void {
  if (current === next) return;
  if (!canTransitionRadarOpportunity(current, next)) {
    throw new Error(`INVALID_RADAR_OPPORTUNITY_TRANSITION:${current}->${next}`);
  }
}

export function normalizeLifecyclePatch(
  current: RadarOpportunity,
  patch: RadarOpportunityLifecyclePatch,
  timestamp = new Date().toISOString(),
): Partial<RadarOpportunity> & { lastUpdated: string } {
  assertRadarOpportunityTransition(current.status, patch.status);

  const normalized: Partial<RadarOpportunity> & { lastUpdated: string } = {
    status: patch.status,
    lastUpdated: timestamp,
  };

  if (patch.clientUserId !== undefined) {
    const clientUserId = patch.clientUserId.trim();
    if (!clientUserId || clientUserId.length > 128) {
      throw new Error('INVALID_RADAR_OPPORTUNITY_CLIENT_USER_ID');
    }
    normalized.clientUserId = clientUserId;
  }

  if (patch.serviceRequestId !== undefined) {
    const serviceRequestId = patch.serviceRequestId.trim();
    if (!serviceRequestId || serviceRequestId.length > 128) {
      throw new Error('INVALID_RADAR_OPPORTUNITY_SERVICE_REQUEST_ID');
    }
    normalized.serviceRequestId = serviceRequestId;
  }

  if (patch.status === 'REGISTERED' && !(patch.clientUserId || current.clientUserId)) {
    throw new Error('RADAR_OPPORTUNITY_REGISTRATION_REQUIRES_CLIENT_USER_ID');
  }

  if (patch.status === 'SERVICE_REQUESTED' && !(patch.serviceRequestId || current.serviceRequestId)) {
    throw new Error('RADAR_OPPORTUNITY_SERVICE_REQUEST_REQUIRES_SERVICE_REQUEST_ID');
  }

  if (patch.status === 'CONVERTED' && !(patch.serviceRequestId || current.serviceRequestId)) {
    throw new Error('RADAR_OPPORTUNITY_CONVERSION_REQUIRES_SERVICE_REQUEST_ID');
  }

  if (patch.status === 'REGISTERED' && !current.linkedAt) {
    normalized.linkedAt = patch.linkedAt || timestamp;
  } else if (patch.linkedAt !== undefined) {
    normalized.linkedAt = patch.linkedAt;
  }

  if (patch.status === 'CONVERTED') {
    normalized.convertedAt = patch.convertedAt || timestamp;
    normalized.conversionStatus = 'CONVERTED';
  } else if (['CONTACTED', 'RESPONDED', 'REGISTERED', 'MATCHED', 'SERVICE_REQUESTED'].includes(patch.status)) {
    normalized.conversionStatus = 'PENDING';
  } else if (['IGNORED', 'CLOSED'].includes(patch.status)) {
    normalized.conversionStatus = current.conversionStatus === 'CONVERTED' ? 'CONVERTED' : 'FAILED';
  }

  return normalized;
}

export function getAllowedRadarOpportunityTransitions(
  current: RadarOpportunityLifecycleStatus,
): readonly RadarOpportunityLifecycleStatus[] {
  return ALLOWED_TRANSITIONS[current];
}
