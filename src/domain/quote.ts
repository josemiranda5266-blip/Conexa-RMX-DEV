import type { Quote } from '../types';

/**
 * Canonical lifecycle for a CONEXA quote.
 * A quote is a professional proposal; accepting it creates the commercial transaction.
 */
export const QUOTE_STATES = [
  'PENDING',
  'ACCEPTED',
  'REJECTED',
  'MODIFICATION_REQUESTED',
] as const;

export type QuoteState = typeof QUOTE_STATES[number];

export interface CreateQuoteCommand {
  requestId: string;
  professionalId: string;
  professionalName: string;
  professionalAvatar: string;
  professionalRating: number;
  professionalVerified: boolean;
  priceArs: number;
  description: string;
  materialsIncluded: string;
  estimatedTime: string;
  availableStartDate: string;
  warrantyInfo: string;
  termsAndConditions: string;
}

export interface QuoteValidationResult {
  valid: boolean;
  errors: string[];
}

export function validateCreateQuote(input: CreateQuoteCommand): QuoteValidationResult {
  const errors: string[] = [];

  if (!input.requestId?.trim()) errors.push('REQUEST_REQUIRED');
  if (!input.professionalId?.trim()) errors.push('PROFESSIONAL_REQUIRED');
  if (!Number.isFinite(input.priceArs) || input.priceArs <= 0) errors.push('INVALID_PRICE');
  if (!input.description?.trim()) errors.push('DESCRIPTION_REQUIRED');
  if (!input.estimatedTime?.trim()) errors.push('ESTIMATED_TIME_REQUIRED');
  if (!input.availableStartDate?.trim()) errors.push('AVAILABLE_DATE_REQUIRED');

  return { valid: errors.length === 0, errors };
}

export function isQuoteState(value: unknown): value is QuoteState {
  return typeof value === 'string' && (QUOTE_STATES as readonly string[]).includes(value);
}

export function canSubmitQuote(requestStatus: string): boolean {
  return requestStatus === 'REQUEST_CREATED' || requestStatus === 'QUOTES_RECEIVED';
}

export function canAcceptQuote(quoteStatus: QuoteState, requestStatus: string): boolean {
  return quoteStatus === 'PENDING' &&
    (requestStatus === 'REQUEST_CREATED' || requestStatus === 'QUOTES_RECEIVED');
}

export function canRejectQuote(quoteStatus: QuoteState): boolean {
  return quoteStatus === 'PENDING' || quoteStatus === 'MODIFICATION_REQUESTED';
}

export function canRequestQuoteModification(quoteStatus: QuoteState): boolean {
  return quoteStatus === 'PENDING';
}

export type CanonicalQuote = Quote;
