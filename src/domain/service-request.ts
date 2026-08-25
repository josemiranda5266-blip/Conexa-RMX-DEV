import type { ServiceRequest } from '../types';

/**
 * Canonical lifecycle for a CONEXA service request.
 * A request is the client's demand; it is not a contract, payment, or job.
 */
export const SERVICE_REQUEST_STATES = [
  'REQUEST_CREATED',
  'QUOTES_RECEIVED',
  'PROFESSIONAL_SELECTED',
  'PAYMENT_PENDING',
  'IN_PROGRESS',
  'COMPLETED',
  'REVIEW_PENDING',
  'CLOSED',
  'CANCELLED',
] as const;

export type ServiceRequestState = typeof SERVICE_REQUEST_STATES[number];

export interface CreateServiceRequestCommand {
  clientId: string;
  title: string;
  category: string;
  professionName: string;
  description: string;
  images?: string[];
  approxLocation: string;
  preferredDate: string;
  preferredTimeSlot: string;
  estimatedBudgetArs?: number;
  urgency: ServiceRequest['urgency'];
}

export interface ServiceRequestValidationResult {
  valid: boolean;
  errors: string[];
}

export function validateCreateServiceRequest(input: CreateServiceRequestCommand): ServiceRequestValidationResult {
  const errors: string[] = [];

  if (!input.clientId?.trim()) errors.push('CLIENT_REQUIRED');
  if (!input.title?.trim()) errors.push('TITLE_REQUIRED');
  if (!input.category?.trim()) errors.push('CATEGORY_REQUIRED');
  if (!input.professionName?.trim()) errors.push('PROFESSION_REQUIRED');
  if (!input.description?.trim()) errors.push('DESCRIPTION_REQUIRED');
  if (!input.approxLocation?.trim()) errors.push('LOCATION_REQUIRED');
  if (!input.preferredDate?.trim()) errors.push('DATE_REQUIRED');
  if (!input.preferredTimeSlot?.trim()) errors.push('TIME_SLOT_REQUIRED');

  if (input.estimatedBudgetArs !== undefined &&
      (!Number.isFinite(input.estimatedBudgetArs) || input.estimatedBudgetArs < 0)) {
    errors.push('INVALID_BUDGET');
  }

  return { valid: errors.length === 0, errors };
}

export function canReceiveQuote(status: ServiceRequestState): boolean {
  return status === 'REQUEST_CREATED' || status === 'QUOTES_RECEIVED';
}

export function canSelectProfessional(status: ServiceRequestState): boolean {
  return status === 'REQUEST_CREATED' || status === 'QUOTES_RECEIVED';
}

export function canCancelRequest(status: ServiceRequestState): boolean {
  return !['COMPLETED', 'CLOSED', 'CANCELLED'].includes(status);
}

/**
 * Compatibility guard for persisted legacy records.
 * Unknown/missing states are rejected rather than silently converted.
 */
export function isServiceRequestState(value: unknown): value is ServiceRequestState {
  return typeof value === 'string' && (SERVICE_REQUEST_STATES as readonly string[]).includes(value);
}
