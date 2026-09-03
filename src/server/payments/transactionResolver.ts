/**
 * Canonical transaction resolution for a service request.
 *
 * Preferred production path:
 *   serviceRequest.acceptedQuoteId -> txn-{acceptedQuoteId}
 *
 * The legacy serviceRequestId query is intentionally isolated here so route code
 * cannot silently introduce a new non-deterministic lookup strategy.
 */

import { getTransactionIdForAcceptedQuote } from './transactionIdentity.js';

export function getCanonicalTransactionIdForRequest(serviceRequest: { acceptedQuoteId?: string | null }): string | null {
  const acceptedQuoteId = String(serviceRequest?.acceptedQuoteId || '').trim();
  return acceptedQuoteId ? getTransactionIdForAcceptedQuote(acceptedQuoteId) : null;
}

export function assertTransactionMatchesAcceptedQuote(
  transaction: { id?: string; quoteId?: string },
  acceptedQuoteId: string
): void {
  const canonicalId = getTransactionIdForAcceptedQuote(acceptedQuoteId);
  if (transaction.id !== canonicalId || transaction.quoteId !== acceptedQuoteId) {
    throw new Error('TRANSACTION_QUOTE_RELATION_INVALID');
  }
}
