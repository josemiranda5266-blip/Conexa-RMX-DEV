# Conexa Unified — Repository Structure

This document defines the canonical organization of the repository. It is the reference used before production hardening work.

## Root

Keep only project-level configuration, deployment/security configuration, the application entry points and package manifests at repository root.

Expected categories:

- `.github/` — GitHub/Copilot/project automation instructions.
- `docs/` — architecture, security and audit records.
- `scripts/` — deliberate maintenance/administrative scripts.
- `src/` — application source.
- `assets/` — application/tool assets that are actually required.
- `server.ts` — HTTP/server entry point.
- `firestore.rules` — Firestore authorization policy.
- Firebase/project configuration files.
- `package.json`, lockfiles and build configuration.
- `.env.example` and `.gitignore`.

## Source tree

### `src/components`
Presentation/UI components. Components should consume application/domain APIs rather than implement security or persistence rules themselves.

### `src/context`
React application state and orchestration. This layer is being treated as an application layer; oversized contexts are candidates for later decomposition.

### `src/domain`
Pure business/domain rules. Current canonical domain modules include authentication policy, conversations, job state transitions and professional matching.

### `src/services`
Client/application services for persistence and external application operations. Firestore access should be centralized here when it is intentionally client-side.

### `src/server`
Server-only support modules: authentication, Firebase Admin initialization and payment infrastructure.

### `src/lib`
Low-level shared libraries/infrastructure.

### `src/utils`
Small cross-cutting utilities that do not own business state.

### `src/data`
Static/reference data only. Runtime business state must not be placed here.

### `src/types.ts`
Current shared TypeScript contracts. During production hardening, duplicated domain types should be consolidated here or moved to explicit domain modules where appropriate.

## Documentation

```text
docs/
├── ARCHITECTURE/
├── AUDITORIAS/
└── SECURITY/
```

- `ARCHITECTURE/` — stable architectural decisions and ownership boundaries.
- `AUDITORIAS/` — dated technical audit findings and corrections.
- `SECURITY/` — security model, threat boundaries and hardening plan.

## Legacy material

`Conexa-RMX-Fase2-MercadoPago.zip` is a historical binary artifact currently located at repository root. It is **not production source** and must not be referenced by the application. It should only be removed or relocated after its contents have been confirmed unnecessary; the current GitHub file API used for this maintenance pass cannot safely relocate a binary artifact while preserving it.

## Important rule

Do not perform broad source-file moves merely for visual cleanliness. Before moving a source file, inspect imports, dynamic imports, build configuration and deployment references. Production correctness takes priority over cosmetic reorganization.
