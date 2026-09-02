# Conexa Unified — Architecture

## Canonical repository

- Repository: `josemiranda5266-blip/Conexa-RMX-DEV`
- Target branch: `integration/conexa-unified`
- This repository is the single canonical Conexa codebase.

## Architectural layers

```text
UI / React
  ├── src/components
  ├── src/App.tsx
  └── src/main.tsx

Application state
  └── src/context

Domain
  └── src/domain
      ├── authentication policies
      ├── conversations
      ├── job state machine
      └── professional matching

Application services
  └── src/services

Shared infrastructure
  ├── src/lib
  └── src/utils

Server-side support
  └── src/server
      ├── auth
      ├── Firebase Admin
      └── payments

HTTP/API entry point
  └── server.ts

Persistence/security
  ├── firestore.rules
  ├── Firebase configuration
  └── server-side Admin SDK

Operational documentation
  └── docs/
      ├── AUDITORIAS/
      ├── ARCHITECTURE/
      └── SECURITY/
```

## Canonical ownership rules

1. Business rules belong in `src/domain` and must not be duplicated in UI components.
2. Firestore/API access belongs in services or server-side modules, not scattered across components.
3. Authentication and authorization decisions must have one canonical policy.
4. Payment credentials and privileged operations remain server-side.
5. Audit records belong under `docs/AUDITORIAS`.
6. Security architecture and security decisions belong under `docs/SECURITY`.
7. Historical artifacts must never be treated as production source code.

## Current structural decision

The existing source tree is already partially organized into domain, services, server, context, components, utilities and data. At this stage we deliberately avoid mass-moving source files until import dependencies are audited. The first ordering pass therefore establishes canonical ownership and documentation without risking functional regressions.
