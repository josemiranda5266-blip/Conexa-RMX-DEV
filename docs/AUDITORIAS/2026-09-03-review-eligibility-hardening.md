# Auditoría — endurecimiento de elegibilidad de Reviews

Fecha: 2026-09-03
Rama definitiva: `integration/conexa-unified`

## Corrección aplicada

`src/server/reviewPolicy.ts` ya no considera `ServiceRequest.status === CLOSED` como estado suficiente para crear una nueva review.

Los únicos estados elegibles son:

- `COMPLETED`
- `REVIEW_PENDING`

Esto evita que un servicio cerrado posteriormente pueda reabrir de facto la ventana de creación de reseñas simplemente enviando otra petición al endpoint.

## Motivo

`CLOSED` es un estado terminal del flujo comercial. Una vez cerrado el ciclo, una nueva creación no debe quedar implícitamente habilitada por la política de Reviews.

La protección contra duplicados sigue siendo determinística en `reviewService.ts`.

## Pendiente

El runtime principal todavía debe registrar `POST /api/reviews`, y el frontend debe dejar de usar `AppContext.addReview()` como escritor directo. La actualización de agregados de reputación también permanece pendiente.
