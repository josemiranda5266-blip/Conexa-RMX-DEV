/**
 * Canonical identity helpers for CONEXA commercial transactions.
 *
 * A quote is the commercial contract selected by the client. The transaction
 * identifier is therefore deterministic from the accepted quote ID. Keeping
 * this invariant in one module prevents route-specific lookup strategies from
 * drifting toward non-deterministic serviceRequestId queries.
 */

const MAX_QUOTE_ID_LENGTH = 256;

function normalizeQuoteId(quoteId: unknown): string {
  if (typeof quoteId !== 'string') throw new Error('QUOTE_ID_REQUIRED');
  const normalizedQuoteId = quoteId.trim();
  if (!normalizedQuoteId || normalizedQuoteId.length > MAX_QUOTE_ID_LENGTH) {
    throw new Error('INVALID_QUOTE_ID');
  }
  return normalizedQuoteId;
}

export function getTransactionIdForQuote(quoteId: string): string {
  return `txn-${normalizeQuoteId(quoteId)}`;
}

export function getTransactionIdForAcceptedQuote(acceptedQuoteId: string): string {
  return getTransactionIdForQuote(acceptedQuoteId);
}
