# CONEXA — Service Request Contract

## Purpose

`ServiceRequest` represents the client's demand. It is the first commercial object in the unified flow and must remain independent from quotes, transactions and job execution.

## Canonical flow

```text
REQUEST_CREATED
      |
      v
QUOTES_RECEIVED
      |
      v
PROFESSIONAL_SELECTED
      |
      v
PAYMENT_PENDING
      |
      v
IN_PROGRESS
      |
      v
COMPLETED
      |
      v
REVIEW_PENDING
      |
      v
CLOSED
```

`CANCELLED` is a terminal state reachable only while cancellation is still allowed.

## Rules

- The client owns the request.
- A professional does not become the owner of the request merely by submitting a quote.
- A quote is not a contract.
- `PROFESSIONAL_SELECTED` identifies the selected professional but does not mean payment has been confirmed.
- `PAYMENT_PENDING` represents an outstanding payment obligation.
- `IN_PROGRESS` must only be entered after the authoritative payment flow has confirmed the transaction and the service is allowed to start.
- `COMPLETED` means the work was reported complete; it is not synonymous with the review lifecycle being closed.
- `REVIEW_PENDING` is intentionally retained as a separate state so review/closure cannot be confused with physical job completion.

## Current implementation finding

The unified branch already exposes the `PAYMENT_PENDING` state in `JobStatus`, and `acceptQuote()` updates the local request to that state after the backend creates the transaction. fileciteturn90file0L2-L10 fileciteturn92file0L2-L2

The next implementation step is to move request creation and request persistence behind this domain boundary, without rewriting the entire application context at once.

## Migration rule

Do not delete legacy request code yet. Replace it only after the new command/validation boundary is wired to the real UI and backend and the production build passes.
