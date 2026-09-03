# Reviews — sincronización de reputación y lifecycle

Fecha: 2026-09-03
Rama definitiva: `integration/conexa-unified`

## Estado confirmado

La creación autoritativa de una reseña se ejecuta dentro de una transacción Firestore.

La misma operación mantiene sincronizados:

- documento interno `reviews/{reviewId}`;
- agregados `rating` y `reviewCount` del usuario profesional;
- proyección `public_professional_profiles/{professionalId}`, si existe;
- proyección `radar_candidates/{professionalId}`;
- cierre del `ServiceRequest`;
- transición financiera `SERVICE_COMPLETED -> REVIEW_COMPLETED`, únicamente cuando corresponde.

## Corrección aplicada

El cierre del ServiceRequest ahora persiste también:

- `reviewCompletedAt`;
- `reviewId`.

Esto permite trazabilidad durable entre el trabajo y la reseña autoritativa que lo cerró.

## Integridad

El ID determinístico de Review hace idempotente la creación para la combinación:

`clientId + professionalId + serviceRequestId`

Los reintentos no incrementan nuevamente `reviewCount` ni recalculan `rating`.

## Pendiente

El runtime principal todavía debe registrar el endpoint HTTP y el frontend debe abandonar el escritor legacy del AppContext.
