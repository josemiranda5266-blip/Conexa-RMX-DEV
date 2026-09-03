# Auditoría — agregados de reputación de Reviews

Fecha: 2026-09-03
Rama definitiva: `integration/conexa-unified`

## Avance

`saveProfessionalReview()` ahora actualiza en la misma transacción:

- `reviews/{reviewId}`;
- `users/{professionalId}.rating`;
- `users/{professionalId}.reviewCount`;
- `public_professional_profiles/{professionalId}`;
- `radar_candidates/{professionalId}` cuando el candidato sigue siendo válido.

La identidad del profesional y la elegibilidad del servicio siguen derivándose del `ServiceRequest`; el cliente no puede establecer la reputación directamente.

## Cálculo

El nuevo promedio se calcula a partir del promedio y cantidad anteriores más la nueva valoración. El resultado se redondea a una décima para mantener una representación estable en el perfil.

## Idempotencia

Si la Review determinística ya existe, la operación retorna el documento existente sin incrementar `reviewCount` ni volver a aplicar el promedio.

## Pendiente

La sincronización runtime de `POST /api/reviews/create` en `server.ts` continúa pendiente por el tamaño/riesgo de edición del archivo. El frontend ya tiene un cliente HTTP que usa ese endpoint.

No se ejecutaron tests ni build.
