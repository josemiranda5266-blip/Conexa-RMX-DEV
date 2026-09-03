# RADAR — Implementación de proyección interna de candidatos

Repositorio: `josemiranda5266-blip/Conexa-RMX-DEV`
Rama: `integration/conexa-unified`
Fecha: 2026-09-03

## Verificación previa

Se verificó que el trabajo definitivo corresponde al repositorio `josemiranda5266-blip/Conexa-RMX-DEV`. La rama objetivo es `integration/conexa-unified`.

## Cambios

1. Se creó `src/server/radar/radarCandidateProjection.ts`.
2. La proyección reutiliza el contrato seguro `RadarCandidate` y no copia campos privados de `UserProfile`.
3. `professionalProfileService.ts` ahora escribe `radar_candidates/{userId}` dentro de la misma transacción que `users/{userId}` y `public_professional_profiles/{userId}`.
4. Si el perfil deja de ser candidato válido, la misma transacción elimina su documento de `radar_candidates`.
5. `radarCandidateRepository.ts` ahora lee exclusivamente `radar_candidates`, evitando que el flujo normal de matching consulte directamente `/users`.
6. `firestore.rules` bloquea lectura/escritura cliente sobre `radar_candidates`; la colección queda destinada al Admin SDK/server.

## Decisión de seguridad

`trustScore` forma parte de la proyección interna porque el ranking lo utiliza. No debe incorporarse al perfil público `public_professional_profiles`.

## Estado de migración

El lector y el escritor de la proyección ya están preparados. El principal punto pendiente es asegurar que todos los demás mutadores server-side que cambian rating, reviewCount, jobsCompleted, trustScore, availabilityStatus o estados de verificación también actualicen esta proyección. Además, el endpoint HTTP de `server.ts` todavía debe delegar al servicio canónico de perfil.

No se ejecutaron tests ni build.
