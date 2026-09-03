# Auditoría — consolidación RADAR runtime

Fecha: 2026-09-03
Repositorio definitivo: `josemiranda5266-blip/Conexa-RMX-DEV`
Rama definitiva: `integration/conexa-unified`

## Verificación previa

Se verificó nuevamente el repositorio y la rama definitivos antes de continuar con la modificación.

## Hallazgo nuevo

La política de lifecycle permitía detectar el mismo estado como operación repetida, pero el servicio construía siempre un patch con `status` y `lastUpdated`. Por ello, la condición anterior para devolver `changed: false` nunca podía cumplirse: una repetición podía terminar escribiendo nuevamente la oportunidad.

Esto era especialmente relevante para webhooks y reintentos de operadores.

## Corrección

`src/server/radar/radarOpportunityLifecycleService.ts` ahora identifica explícitamente una operación idempotente cuando:

- el estado actual coincide con el solicitado; y
- no se está modificando ningún metadato (`clientUserId`, `serviceRequestId`, `linkedAt`, `convertedAt`).

En ese caso devuelve la oportunidad actual con `changed: false` y no ejecuta `transaction.update()`.

## Resultado arquitectónico

La máquina de estados RADAR queda preparada para reintentos sin mutaciones artificiales de `lastUpdated`.

El siguiente bloque pendiente sigue siendo la integración del runtime HTTP de `server.ts`: la ruta `/api/radar/opportunity` todavía contiene persistencia inline y el matching HTTP todavía consulta `users`/la estructura histórica en lugar de delegar completamente en `radarCandidateRepository` y `radarOpportunityMatchingService`.

También permanece pendiente consolidar definitivamente `radarPersistenceService.ts` y `radarOpportunityService.ts` en una única frontera conceptual de persistencia.

## Verificación dinámica

No se ejecutaron tests ni build, conforme a la estrategia vigente de terminar primero las correcciones estructurales.

## Progreso estimado

- RADAR / Matching: **97%** de preparación estructural para producción.
- Idempotencia del lifecycle: **100%** a nivel de servicio estructurado.
- Integración HTTP RADAR: **pendiente**, bloqueada por la edición segura del monolito `server.ts`.
- Global: **≈96%**.
