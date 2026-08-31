# Auditoría — RADAR y autoridad del ciclo de Job

Fecha: 2026-08-30
Repositorio objetivo: josemiranda5266-blip/Conexa-RMX-DEV
Rama objetivo: integration/conexa-unified

## Hallazgos consolidados

### P0 — RADAR opportunity permite declarar simulación desde el cliente

`POST /api/radar/opportunity` deriva `isTestEnv` de `is_test`, `source === "radar_test"` o `environment === "simulation"` enviados en el body. Cuando resulta verdadero, se omite la autenticación por secreto del webhook. Producción no debe confiar en flags enviados por el cliente para cambiar la frontera de seguridad.

Corrección requerida: el modo de simulación debe depender exclusivamente de configuración del servidor/canal interno autorizado. Un payload externo no puede convertir una petición de producción en simulación.

### P0 — RADAR analyze repite el patrón de bypass

`POST /api/radar/analyze` permite que `contextType === USER_REQUEST` evite la autorización administrativa y, fuera de ese contexto, usa `isSimulation` derivado de `req.body.isSimulation || req.body.isTest`. Debe distinguirse el contexto de usuario de la simulación y la autorización debe depender del servidor y de la identidad autenticada.

### P0 — Job lifecycle contaminado por estado financiero

`POST /api/jobs/complete` valida `IN_PROGRESS` + transaction `PAID` + quote `ACCEPTED`, pero escribe `service_requests.status = SERVICE_COMPLETED`. `SERVICE_COMPLETED` pertenece al ciclo de Transaction, no al Job/ServiceRequest.

Corrección canónica:
- ServiceRequest: `IN_PROGRESS -> COMPLETED -> REVIEW_PENDING -> CLOSED`.
- Transaction: `PAID -> SERVICE_COMPLETED -> REVIEW_COMPLETED`.

### P0 — review-complete depende del estado financiero para cerrar el Job

`POST /api/jobs/review-complete` espera `service_requests.status === SERVICE_COMPLETED` y después cierra directamente el request. Debe operar sobre `REVIEW_PENDING` y exigir una Review válida antes de cerrar.

### P1 — Job start debe mantener una única relación autoritativa

`POST /api/jobs/start` ya valida que quote, transaction y profesional correspondan al usuario autenticado y que el estado sea `PROFESSIONAL_SELECTED + PAID + ACCEPTED`. La transición de ServiceRequest a `IN_PROGRESS` es correcta conceptualmente. Debe mantenerse separada de la transición financiera de Transaction.

## Estado de corrección

Este documento registra los hallazgos y el contrato objetivo. No se ejecutan tests todavía. Las modificaciones destructivas de `server.ts` se mantienen pendientes hasta poder aplicar un reemplazo íntegro del blob sin reconstrucción parcial.
