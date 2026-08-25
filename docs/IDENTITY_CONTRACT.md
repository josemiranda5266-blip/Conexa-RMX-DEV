# CONEXA — Identity Contract

## Objective

CONEXA must have one authenticated account that can operate as a client and, when enabled, as a professional. Firebase authorization (`role`) and the current UI/business mode (`activeMode`) are different concepts and must not be treated as interchangeable.

## Canonical concepts

- `role`: authorization boundary used by the backend/security layer (`USER`, `PROFESSIONAL`, `ADMIN`, etc.).
- `hasClientProfile`: capability/profile flag indicating that the account can act as a client.
- `hasProfessionalProfile`: capability/profile flag indicating that the account can act as a professional.
- `activeMode`: current operating mode: `CLIENT` or `PROFESSIONAL`.
- `identityVerificationStatus`: identity verification lifecycle.
- `professionalVerificationStatus`: professional credential/qualification verification lifecycle.

## Rules

1. A Firebase role must never be used as the sole representation of account capability.
2. `activeMode=PROFESSIONAL` is valid only when `hasProfessionalProfile=true`.
3. Legacy users without capability flags remain compatible through a temporary role-based fallback.
4. The client profile remains available by default for legacy accounts unless explicitly disabled by a future migration.
5. Verification status is independent from authorization role. Being authenticated or having a professional profile does not imply verification.
6. Backend authorization remains authoritative. Frontend mode switching is only a UI/business-context selection.
7. No sensitive identity document or private contact data is exposed merely because a mode is active.

## Migration direction

The current flat `UserProfile` shape is retained temporarily to avoid a large destructive migration. New code should use the identity capability resolver in `src/domain/identity.ts` and progressively stop deriving business behavior directly from `role`.

Future target:

```text
Account
├── authentication
├── authorization
├── clientProfile
├── professionalProfile
└── verification
```

The migration is complete only when client/professional capability is represented independently of the authorization role across frontend, backend and Firestore rules.
