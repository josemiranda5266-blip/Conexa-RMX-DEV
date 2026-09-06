# FASE 27.6 — AUDITORÍA DE CIERRE DE SERVICIO CONEXA

**Fecha:** 2026-09-06  
**Rama:** `integration/conexa-unified`  
**HEAD auditado:** `13255c6f524a111645497a60eb1619b152ea80a6`  
**Estado:** ABIERTO — requiere corrección antes de cerrar la fase de eventos.

## Objetivo

Determinar si `CONEXA_SERVICE_CLOSED` tiene hoy una transición de dominio real que pueda producirse de forma atómica y ser consumida por Nexora u otros módulos, sin inventar una integración inexistente.

## Hallazgos

### 1. La máquina de estados define `CLOSED`, pero el cierre no tiene implementación demostrada

`src/domain/jobStateMachine.ts` define:

- `COMPLETED`
- `REVIEW_PENDING`
- `CLOSED`

Y define `CLOSE_JOB` como transición válida únicamente desde `REVIEW_PENDING` hacia `CLOSED`.

Conclusión: el contrato de dominio reconoce un cierre posterior a la reseña, pero la implementación efectiva debe localizarse y verificarse antes de producir un evento de cierre.

### 2. La ruta de completar trabajo sí implementa `IN_PROGRESS -> REVIEW_PENDING`

El runtime legado/unificado verifica que el trabajo esté `IN_PROGRESS` y, dentro de una transacción Firestore, actualiza la solicitud a `REVIEW_PENDING`, registra `completedAt/completedBy` y actualiza la transacción financiera a `SERVICE_COMPLETED`.

Esto es consistente con la máquina de estados y constituye el verdadero hito de finalización del servicio, pero NO es todavía `CLOSED`.

### 3. La creación de reseña es transaccional, pero no cierra `service_requests`

`src/server/reviewService.ts` ejecuta la creación de la reseña y sus proyecciones en una transacción. También puede pasar una transacción financiera de `SERVICE_COMPLETED` a `SETTLED`.

Sin embargo, en la transacción auditada no existe una actualización de `service_requests/{id}` a `CLOSED`.

Por lo tanto, no debe producirse `CONEXA_SERVICE_CLOSED` simplemente al crear la reseña: hacerlo convertiría un evento de cierre en un hecho que el agregado de servicio todavía no registra.

### 4. El endpoint legado `/api/jobs/review-complete` está retirado

El endpoint devuelve HTTP 410 y deriva la responsabilidad a `/api/reviews/create`, indicando que la reseña y el cierre deben ser atómicos.

Pero el `reviewService` actual no materializa el estado `CLOSED` en `service_requests` dentro de la transacción inspeccionada.

Esto constituye una discrepancia de contrato/lifecycle que debe resolverse antes de introducir el evento `CONEXA_SERVICE_CLOSED`.

### 5. Firestore Rules impiden que el cliente cierre arbitrariamente la solicitud

La regla de `service_requests` permite al cliente modificar únicamente un conjunto limitado de campos descriptivos y sólo mientras `resource.data.status == 'REQUEST_CREATED'`. El cambio de estado no está autorizado directamente desde el cliente.

Esto es correcto desde el punto de vista de autoridad, pero implica que el cierre canónico debe quedar explícitamente en backend.

## Decisión de arquitectura

**NO producir todavía `CONEXA_SERVICE_CLOSED`.**

El evento permanece como contrato reservado en `shared-events`, pero no debe tener productor hasta que exista una transición backend canónica:

`REVIEW_PENDING -> CLOSED`

La transición debe:

1. verificar identidad/autoridad;
2. verificar que la solicitud esté en `REVIEW_PENDING`;
3. crear/confirmar la reseña de forma idempotente;
4. actualizar `service_requests.status = CLOSED` dentro de la misma transacción;
5. crear el evento `CONEXA_SERVICE_CLOSED` en `eventOutbox` dentro de esa misma transacción si existe un consumidor real;
6. usar un identificador único del evento, sin duplicar `id`/`eventId` innecesariamente;
7. mantener la operación segura ante reintentos y concurrencia.

## Severidad

- **P1 — lifecycle/contract drift:** `CLOSED` está definido en el dominio pero no se demostró un writer backend que materialice el cierre.
- **P1 — event readiness:** `CONEXA_SERVICE_CLOSED` no debe producirse hasta que exista un agregado de servicio realmente cerrado y un consumidor definido.
- **Sin P0:** no se detectó pérdida financiera inmediata derivada de este hallazgo; la ruta financiera de finalización ya está separada del cierre administrativo de la reseña.

## Próximo paso

Auditar y, si corresponde, corregir el writer canónico de `REVIEW_PENDING -> CLOSED`. Después de eso se debe decidir el consumidor real de `CONEXA_SERVICE_CLOSED` y agregar pruebas de concurrencia/idempotencia antes de activar su productor.

## Referencias inspeccionadas

- `src/domain/jobStateMachine.ts`
- `src/server/reviewRoute.ts`
- `src/server/reviewService.ts`
- `src/server/reviewPolicy.ts`
- `firestore.rules`
- `server.ts`
