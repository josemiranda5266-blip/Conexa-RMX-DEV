# CONEXA CORE — Architecture Baseline

## Official development target

Repository: `Conexa-RMX-DEV`
Branch: `unification/conexa-unified`

This branch is the only development target for the unified CONEXA application. Historical repositories and branches are treated as reference material until explicitly migrated.

## Product core

The authoritative business chain is:

`Identity → ServiceRequest → Quote → Contract → Payment → Job → Review`

A feature is considered complete only when its frontend behavior, backend authorization, persistence model, state transitions and tests agree.

## Current baseline assessment

### Identity — KEEP / REFACTOR

The current branch already has a unified user profile concept with `activeMode`, client/professional capabilities, verification state and Firebase Authentication synchronization. This is useful and should be retained, but the role/mode model needs to be normalized before expanding business logic.

### ServiceRequest — REBUILD CONTRACT

`ServiceRequest` currently contains a `JobStatus` field and mixes request lifecycle with later job lifecycle. We should separate request lifecycle from contract/job lifecycle rather than continue adding states to one enum.

### Quote — KEEP / REFACTOR

The quote model and authoritative server endpoint are useful. Quote submission must remain server-authoritative, with ownership, professional eligibility, request eligibility and duplicate protection enforced server-side.

### Contract — BUILD NEW

There is currently no first-class `Contract` domain model. Accepting a quote currently creates a transaction and changes quote/request state. The definitive architecture will introduce a contract as the explicit commercial agreement between client and professional.

### Payment — KEEP / REFACTOR

The repository already has a Mercado Pago checkout and webhook path, including seller token isolation and payment status updates. The payment layer should be formalized behind a provider interface and payment confirmation must be the authoritative trigger for the paid state.

### Job — REBUILD STATE MODEL

The current `JobStatus` is too broad. `PAYMENT_PENDING` has already been introduced, but this is an intermediate compatibility step, not the final model. Job execution should begin only after confirmed payment and valid contract state.

### Review — KEEP / REFACTOR

Reviews already require a quote identifier and are created through the backend. They should ultimately reference a completed job/contract and be rejected unless the underlying commercial interaction is verified.

## Architectural rules

1. The backend is authoritative for commercial state.
2. The frontend never decides payment, contract or job completion facts.
3. Firestore writes for critical transitions must occur through domain services/repositories or authoritative API handlers.
4. No silent production fallback to mock data.
5. No new lifecycle state is added to a shared enum unless its domain ownership is explicit.
6. Idempotency is required for payment and contract creation.
7. Every state transition has a documented actor, precondition and resulting event.
8. Existing code is not preserved merely because it exists: each domain is classified as KEEP, REFACTOR, REBUILD or REMOVE.

## Immediate implementation order

1. Normalize Identity + role/mode semantics.
2. Introduce explicit ServiceRequest lifecycle.
3. Introduce `Contract` domain.
4. Move quote acceptance to Contract creation.
5. Formalize Payment as a provider-backed domain.
6. Connect confirmed payment to Job activation.
7. Implement Job lifecycle and completion authority.
8. Bind verified Review creation to completed Job.

## Current important finding

`AppContext.tsx` still initializes substantial application state from `src/data/mockData.ts`. This is acceptable as a development shell but must not remain a production data source. The unified core should progressively replace those collections with authoritative repository/API reads as each domain is rebuilt.

## Definition of done for the core

- TypeScript check passes.
- Production build passes.
- Critical transitions have backend authorization tests.
- Duplicate/race conditions are covered.
- Firestore rules do not contradict backend ownership rules.
- Payment webhooks are idempotent and verified.
- No critical commercial state can be forged by the browser.
- No production path depends on mock data.
