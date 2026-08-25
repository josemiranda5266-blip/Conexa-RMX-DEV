# CONEXA — Quote Contract

## Responsibility

A `Quote` is a professional's formal commercial proposal for an existing `ServiceRequest`.

It is **not** a payment, transaction, or job.

## Canonical lifecycle

`PENDING → ACCEPTED`

Alternative terminal/branch states:

- `PENDING → REJECTED`
- `PENDING → MODIFICATION_REQUESTED`
- `MODIFICATION_REQUESTED → PENDING`
- `MODIFICATION_REQUESTED → REJECTED`

Acceptance is authoritative only when the backend creates the associated transaction.

## Invariants

1. Only an authenticated professional can submit a quote.
2. The professional must belong to the request's eligible bidding context.
3. A professional cannot submit a duplicate active quote for the same request.
4. Price is a positive ARS amount and is validated server-side.
5. A quote can only be submitted while the request accepts quotes.
6. The client is the only actor allowed to accept a quote for its request.
7. Acceptance must be atomic with creation of the authoritative transaction.
8. The browser cannot determine platform commission or professional net amount.
9. An accepted quote cannot be accepted a second time as a new transaction.
10. Quote state must not be changed optimistically before the authoritative backend operation succeeds.

## Current implementation boundary

The legacy application still contains the operational implementation in `server.ts` and `AppContext`.
This domain contract is the canonical target for the unified architecture.

Do not delete the legacy path until the domain contract is wired to the production API and the end-to-end flow passes tests.

## Required end-to-end flow

`submitQuote → QUOTES_RECEIVED → acceptQuote → transaction(PAYMENT_PENDING) → checkout → PAID → IN_PROGRESS → COMPLETED → REVIEW_PENDING → CLOSED`

The next implementation task is to make the quote endpoint and client adapter conform to this contract without rewriting unrelated functionality.
