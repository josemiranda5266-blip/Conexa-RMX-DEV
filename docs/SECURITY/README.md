# Conexa Unified — Security Organization

Security-sensitive implementation and decisions are organized around these boundaries:

## Authentication

- Firebase Authentication is the identity provider.
- Server-side privileged authentication uses Firebase Admin.
- Authorization must be enforced server-side for privileged operations.

## Firestore

- `firestore.rules` is the canonical client-side authorization policy.
- Sensitive collections must remain explicitly denied unless a documented rule grants access.
- Public profile data and private user data must remain separate.

## Payments

Mercado Pago credentials, OAuth connections, webhooks and privileged payment operations belong to server-side code. Client code may request an operation but must not own platform secrets.

## Personal data

Phone numbers, exact addresses, identity documents and other sensitive information must not be exposed through ordinary public profile documents or casual chat text. Sharing mechanisms should use explicit structured permissions.

## Production-hardening rule

Security corrections are to be made in the canonical repository and branch only:

`josemiranda5266-blip/Conexa-RMX-DEV` → `integration/conexa-unified`

Every material security correction should receive a dated entry under `docs/AUDITORIAS/` describing the finding, affected surface, correction and remaining risk.
