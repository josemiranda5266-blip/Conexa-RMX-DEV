/**
 * Canonical identity helpers for CONEXA commercial transactions.
 *
 * A quote is the commercial contract selected by the client. The transaction
 * identifier is therefore deterministic from the accepted quote ID. Keeping
 * this invariant in one module prevents route-specific lookup strategies from
 * drifting toward non-deterministic serviceRequestId queries.
 */

export function getTransactionIdForQuote(quoteId: string): string {
  const normalizedQuoteId = String(quoteId || '').trim();
  if (!normalizedQuoteId) throw new Error('QUOTE_ID_REQUIRED');
  return `txn-${normalizedQuoteId}`;
}

export function getTransactionIdForAcceptedQuote(acceptedQuoteId: string): string {
  return getTransactionIdForQuote(acceptedQuoteId);
}
