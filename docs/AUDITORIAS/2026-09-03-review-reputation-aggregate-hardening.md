# Auditoría — agregados de reputación de Reviews

Fecha: 2026-09-03
Rama definitiva: `integration/conexa-unified`

## Avance

`saveProfessionalReview()` actualiza de forma transaccional:

- `reviews/{reviewId}`;
- `users/{professionalId}.rating`;
- `users/{professionalId}.reviewCount`;
- `public_professional_profiles/{professionalId}` solo si la proyección pública ya existe;
- `radar_candidates/{professionalId}` cuando el candidato sigue siendo válido;
- `service_requests/{serviceRequestId}` a `CLOSED`;
- la transacción asociada desde `SERVICE_COMPLETED` a `REVIEW_COMPLETED`.

La identidad del profesional y la elegibilidad del servicio siguen derivándose del `ServiceRequest`; el cliente no puede establecer la reputación directamente.

## Cálculo

El nuevo promedio se calcula a partir del promedio y cantidad anteriores más la nueva valoración. El resultado se redondea a una décima para mantener una representación estable en el perfil.

## Idempotencia

Si la Review determinística ya existe, la operación retorna el documento existente sin incrementar `reviewCount` ni volver a aplicar el promedio.

## Corrección

Una Review ya no crea como efecto secundario una proyección pública inexistente. Esto evita publicar un profesional que no tenía previamente su perfil público establecido.

## Pendiente

La sincronización runtime de la ruta HTTP en `server.ts` continúa pendiente por el tamaño/riesgo de edición del archivo. El boundary HTTP ya existe y el frontend todavía debe terminar la migración completa desde el escritor legacy del AppContext.

También queda una futura rutina administrativa de reconciliación para datos históricos en los que `rating`/`reviewCount` pudieran no coincidir con Reviews verificadas.

No se ejecutaron tests ni build.
