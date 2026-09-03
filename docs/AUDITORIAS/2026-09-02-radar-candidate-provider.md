# Auditoría RADAR — proveedor de candidatos

**Fecha:** 2026-09-02  
**Rama definitiva:** `integration/conexa-unified`  
**Repositorio:** `josemiranda5266-blip/Conexa-RMX-DEV`

## Verificación previa

Antes de esta modificación se verificó el repositorio definitivo y la rama `integration/conexa-unified`.

## Hallazgo

El motor `professionalMatching.ts` ya dispone del contrato `ProfessionalCandidate`, pero el consumidor RADAR dentro de `AppContext.tsx` continúa llamando a `matchOpportunityWithProfessionals(users, opp)`. Esto mantiene el acoplamiento del flujo RADAR con el estado global `users` y, por extensión, con la colección privada `/users`.

## Corrección estructural

Se creó `src/services/radarCandidateService.ts` con `buildRadarCandidates(users)` como frontera explícita de transición.

La función normaliza `UserProfile[]` a `ProfessionalCandidate[]` y descarta todos los campos que no pertenecen al contrato de matching. Esto permite que el motor RADAR opere sobre un modelo mínimo y reemplazable.

## Arquitectura objetivo

```text
HOY (transición)
AppContext users[]
      ↓
buildRadarCandidates()
      ↓
ProfessionalCandidate[]
      ↓
matching

OBJETIVO
fuente scoped/backend RADAR
      ↓
ProfessionalCandidate[]
      ↓
matching
```

## Pendiente deliberado

La sustitución del origen `users` no se hizo todavía porque `AppContext.tsx` concentra múltiples subsistemas y su modificación requiere un parche seguro sobre el archivo completo. No se debe ampliar `public_profiles` para solucionar el matching si eso expone `trustScore`, `specialties` u otros datos internos.

El siguiente paso técnico es migrar el consumidor RADAR para usar esta frontera y, posteriormente, sustituir su fuente de datos por una consulta backend/scoped.

## Validación

No se ejecutaron tests ni build, conforme al plan de trabajo: primero completar las correcciones estructurales y después realizar la verificación final.
