import type { ServiceRequest, Review } from '../types.js';

const MAX_COMMENT_LENGTH = 2000;

export interface ReviewWriteInput {
  professionalId: string;
  serviceRequestId: string;
  overallRating: number;
  qualityRating: number;
  punctualityRating: number;
  treatmentRating: number;
  priceRating: number;
  complianceRating: number;
  comment: string;
}

function normalizeId(value: unknown, code: string): string {
  if (typeof value !== 'string') throw new Error(code);
  const normalized = value.trim();
  if (!normalized || normalized.length > 128 || normalized.includes('/')) throw new Error(code);
  return normalized;
}

function normalizeRating(value: unknown): number {
  const rating = Number(value);
  if (!Number.isFinite(rating) || rating < 1 || rating > 5) throw new Error('INVALID_REVIEW_RATING');
  return Math.round(rating * 10) / 10;
}

function normalizeComment(value: unknown): string {
  if (typeof value !== 'string') throw new Error('INVALID_REVIEW_COMMENT');
  const comment = value.trim();
  if (!comment || comment.length > MAX_COMMENT_LENGTH) throw new Error('INVALID_REVIEW_COMMENT');
  return comment;
}

export function normalizeReviewWrite(input: ReviewWriteInput): ReviewWriteInput {
  return {
    professionalId: normalizeId(input.professionalId, 'INVALID_REVIEW_PROFESSIONAL_ID'),
    serviceRequestId: normalizeId(input.serviceRequestId, 'INVALID_REVIEW_SERVICE_REQUEST_ID'),
    overallRating: normalizeRating(input.overallRating),
    qualityRating: normalizeRating(input.qualityRating),
    punctualityRating: normalizeRating(input.punctualityRating),
    treatmentRating: normalizeRating(input.treatmentRating),
    priceRating: normalizeRating(input.priceRating),
    complianceRating: normalizeRating(input.complianceRating),
    comment: normalizeComment(input.comment),
  };
}

export function assertReviewEligible(
  request: ServiceRequest,
  clientId: string,
  professionalId: string,
): void {
  if (request.clientId !== clientId) throw new Error('REVIEW_CLIENT_MISMATCH');
  if (request.assignedProfessionalId !== professionalId) throw new Error('REVIEW_PROFESSIONAL_MISMATCH');
  if (request.status !== 'COMPLETED' && request.status !== 'REVIEW_PENDING') {
    throw new Error('REVIEW_SERVICE_NOT_COMPLETED');
  }
}

export function buildReviewDocument(
  id: string,
  request: ServiceRequest,
  client: { id: string; name?: string; avatar?: string },
  input: ReviewWriteInput,
  createdAt: string,
): Review {
  return {
    id,
    jobId: request.id,
    clientId: client.id,
    clientName: client.name || 'Usuario CONEXA',
    clientAvatar: client.avatar || '',
    professionalId: input.professionalId,
    comment: input.comment,
    overallRating: input.overallRating,
    qualityRating: input.qualityRating,
    punctualityRating: input.punctualityRating,
    treatmentRating: input.treatmentRating,
    priceRating: input.priceRating,
    complianceRating: input.complianceRating,
    isVerifiedJob: true,
    isReported: false,
    createdAt,
  };
}
