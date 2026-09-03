import { createHash } from 'crypto';
import { getAdminDb } from '../firebaseAdmin.js';
import type { RadarOpportunity, ServiceRequest, UserProfile } from '../../types.js';
import { normalizeLifecyclePatch } from './radarOpportunityLifecyclePolicy.js';

const OPPORTUNITY_COLLECTION = 'radar_opportunities';
const REQUEST_COLLECTION = 'service_requests';
const CANDIDATE_COLLECTION = 'radar_candidates';
const USER_COLLECTION = 'users';

export interface RadarOpportunityConversionInput {
  opportunityId: string;
  clientUserId: string;
  professionalId?: string;
  preferredDate?: string;
  preferredTimeSlot?: string;
}

export interface RadarOpportunityConversionDb {
  collection: (name: string) => any;
  runTransaction: <T>(callback: (transaction: any) => Promise<T>) => Promise<T>;
}

export interface RadarOpportunityConversionResult {
  opportunity: RadarOpportunity;
  serviceRequest: ServiceRequest;
  created: boolean;
}

function normalizeId(value: unknown, code: string): string {
  if (typeof value !== 'string') throw new Error(code);
  const normalized = value.trim();
  if (!normalized || normalized.length > 128 || normalized.includes('/')) throw new Error(code);
  return normalized;
}

function buildServiceRequestId(opportunityId: string, professionalId: string): string {
  return `RADAR-REQ-${createHash('sha256')
    .update(`RADAR_REQUEST:${opportunityId}:${professionalId}`)
    .digest('hex')
    .slice(0, 24)}`;
}

function mapUrgency(urgency: RadarOpportunity['urgency']): ServiceRequest['urgency'] {
  if (urgency === 'EMERGENCY') return 'URGENTE';
  if (urgency === 'HIGH') return 'URGENTE';
  if (urgency === 'MEDIUM') return 'ALTA';
  return 'NORMAL';
}

function buildServiceRequest(
  opportunity: RadarOpportunity,
  client: UserProfile,
  professional: any,
  requestId: string,
  now: string,
  preferredDate?: string,
  preferredTimeSlot?: string,
): ServiceRequest {
  const professionalName = typeof professional?.name === 'string' && professional.name.trim()
    ? professional.name.trim()
    : 'Profesional CONEXA';
  const professionName = typeof professional?.professionName === 'string' && professional.professionName.trim()
    ? professional.professionName.trim()
    : opportunity.category;

  return {
    id: requestId,
    clientId: client.id,
    clientName: client.name || 'Usuario CONEXA',
    clientAvatar: client.avatar || '',
    title: opportunity.subcategory || opportunity.category,
    category: opportunity.category,
    professionName,
    description: opportunity.description,
    approxLocation: opportunity.neighborhood
      ? `${opportunity.neighborhood}, ${opportunity.city}, ${opportunity.province}`
      : `${opportunity.city}, ${opportunity.province}`,
    preferredDate: preferredDate?.trim() || 'A coordinar',
    preferredTimeSlot: preferredTimeSlot?.trim() || 'A coordinar',
    urgency: mapUrgency(opportunity.urgency),
    status: 'REQUEST_CREATED',
    createdAt: now,
    quotesCount: 0,
    assignedProfessionalId: professional.id,
    discoveryMode: 'TARGETED',
    radarOpportunityId: opportunity.id,
    sourceType: 'RADAR',
  };
}

export async function createServiceRequestFromRadarOpportunity(
  input: RadarOpportunityConversionInput,
  db: RadarOpportunityConversionDb = getAdminDb(),
): Promise<RadarOpportunityConversionResult> {
  const opportunityId = normalizeId(input.opportunityId, 'INVALID_RADAR_OPPORTUNITY_ID');
  const clientUserId = normalizeId(input.clientUserId, 'INVALID_RADAR_CLIENT_USER_ID');
  const requestedProfessionalId = input.professionalId === undefined
    ? undefined
    : normalizeId(input.professionalId, 'INVALID_RADAR_PROFESSIONAL_ID');

  const opportunityRef = db.collection(OPPORTUNITY_COLLECTION).doc(opportunityId);

  return db.runTransaction(async (transaction: any) => {
    const opportunitySnapshot = await transaction.get(opportunityRef);
    if (!opportunitySnapshot.exists) throw new Error('RADAR_OPPORTUNITY_NOT_FOUND');

    const opportunity = opportunitySnapshot.data() as RadarOpportunity;
    if (opportunity.clientUserId && opportunity.clientUserId !== clientUserId) {
      throw new Error('RADAR_OPPORTUNITY_CLIENT_MISMATCH');
    }
    if (!['REGISTERED', 'MATCHED'].includes(opportunity.status)) {
      throw new Error(`RADAR_OPPORTUNITY_NOT_CONVERTIBLE:${opportunity.status}`);
    }

    const clientRef = db.collection(USER_COLLECTION).doc(clientUserId);
    const clientSnapshot = await transaction.get(clientRef);
    if (!clientSnapshot.exists) throw new Error('RADAR_CLIENT_NOT_FOUND');
    const client = clientSnapshot.data() as UserProfile;
    if (client.isBlocked === true) throw new Error('RADAR_CLIENT_BLOCKED');

    const matched = Array.isArray(opportunity.matchedProfessionals)
      ? opportunity.matchedProfessionals
      : [];
    const professionalId = requestedProfessionalId || matched[0]?.professionalId;
    if (!professionalId) throw new Error('RADAR_NO_MATCHED_PROFESSIONAL');

    const candidateRef = db.collection(CANDIDATE_COLLECTION).doc(professionalId);
    const candidateSnapshot = await transaction.get(candidateRef);
    if (!candidateSnapshot.exists) throw new Error('RADAR_PROFESSIONAL_NOT_FOUND');
    const professional = candidateSnapshot.data();
    if (!professional?.id || professional.id !== professionalId) throw new Error('RADAR_PROFESSIONAL_INVALID');
    if (professional.isBlocked === true) throw new Error('RADAR_PROFESSIONAL_BLOCKED');
    if (!professional.isProfessionalVerified || !professional.isIdentityVerified) {
      throw new Error('RADAR_PROFESSIONAL_NOT_VERIFIED');
    }
    if (professional.availabilityStatus === 'OCUPADO') {
      throw new Error('RADAR_PROFESSIONAL_UNAVAILABLE');
    }

    const requestId = buildServiceRequestId(opportunityId, professionalId);
    const requestRef = db.collection(REQUEST_COLLECTION).doc(requestId);
    const requestSnapshot = await transaction.get(requestRef);
    const now = new Date().toISOString();

    if (requestSnapshot.exists) {
      const existingRequest = requestSnapshot.data() as ServiceRequest;
      if (existingRequest.radarOpportunityId !== opportunityId || existingRequest.clientId !== clientUserId) {
        throw new Error('RADAR_SERVICE_REQUEST_ID_COLLISION');
      }

      const lifecycle = normalizeLifecyclePatch(opportunity, {
        status: 'SERVICE_REQUESTED',
        clientUserId,
        serviceRequestId: requestId,
      }, now);
      transaction.update(opportunityRef, lifecycle);

      return {
        opportunity: { ...opportunity, ...lifecycle },
        serviceRequest: existingRequest,
        created: false,
      };
    }

    const serviceRequest = buildServiceRequest(
      opportunity,
      client,
      professional,
      requestId,
      now,
      input.preferredDate,
      input.preferredTimeSlot,
    );

    transaction.create(requestRef, serviceRequest);

    const lifecycle = normalizeLifecyclePatch(opportunity, {
      status: 'SERVICE_REQUESTED',
      clientUserId,
      serviceRequestId: requestId,
    }, now);
    transaction.update(opportunityRef, lifecycle);

    return {
      opportunity: { ...opportunity, ...lifecycle },
      serviceRequest,
      created: true,
    };
  });
}
