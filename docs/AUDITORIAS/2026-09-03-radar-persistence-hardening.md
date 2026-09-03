# Auditoría RADAR — hardening de persistencia

Fecha: 2026-09-03  
Repositorio: `josemiranda5266-blip/Conexa-RMX-DEV`  
Rama: `integration/conexa-unified`  
Commit: `158cb5f1e96875e85cce77a8d965ba7a543dfc83`

## Hallazgo

La primera versión de `src/server/radar/radarPersistenceService.ts` ya utilizaba IDs determinísticos basados en SHA-256 y consultaba el documento antes de crearlo. Eso resolvía la idempotencia de reintentos secuenciales, pero no cerraba completamente la carrera entre dos webhooks concurrentes que observaran el documento como inexistente al mismo tiempo.

Además, `aiAnalysis`, `attribution`, `conversion` y los elementos de `matchedProfessionals` llegaban al límite de persistencia sin un presupuesto explícito de tamaño.

## Corrección

Se endureció la frontera de persistencia:

1. Se mantiene el ID determinístico `RADAR-${sha256(externalReference)}`.
2. `create()` continúa siendo la operación que gana la carrera de creación.
3. Si otro proceso creó primero el documento, el error `ALREADY_EXISTS` se transforma en lectura del documento ganador, evitando un falso error de duplicado.
4. `aiAnalysis`, `attribution` y `conversion` deben ser objetos planos serializables y quedan limitados a 64 KB cada uno.
5. `matchedProfessionals` queda limitado a 10 elementos y 120 KB serializados.
6. Se mantienen límites estrictos para strings y scores.
7. Se conserva la regla de que producción no puede marcarse simultáneamente como test.

## Estado

Esto fortalece la frontera, pero **no integra todavía el servicio en `server.ts`**. Por lo tanto, el P0 de integración de los endpoints RADAR continúa abierto.

## Siguiente paso

Integrar la frontera en `/api/radar/opportunity` y `/api/radar/conversion`, y posteriormente revisar los webhooks Meta/n8n para que utilicen la misma persistencia e idempotencia.

No se ejecutaron tests ni build en esta etapa.
