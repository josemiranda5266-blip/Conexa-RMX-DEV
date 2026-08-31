# P0 — Corrección de estados Job / Transaction

Fecha: 2026-08-30
Rama: integration/conexa-unified

## Hallazgo

`/api/jobs/complete` escribía `SERVICE_COMPLETED` tanto en `service_requests` como en `transactions`.

## Contrato corregido

- `service_requests.status` usa `COMPLETED` al terminar el trabajo.
- `transactions.status` usa `SERVICE_COMPLETED` para el cierre financiero del servicio.
- `/api/jobs/review-complete` debe consumir `service_requests.status === COMPLETED`.
- La máquina de estados de Job conserva `COMPLETED -> REVIEW_PENDING -> CLOSED`.

## Estado

El hallazgo está confirmado y documentado. La modificación del bloque grande de `server.ts` requiere reemplazo integral del blob; no se realiza una edición parcial sobre contenido truncado.
