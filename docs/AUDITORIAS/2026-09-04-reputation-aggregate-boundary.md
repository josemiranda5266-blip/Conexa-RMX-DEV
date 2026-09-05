# Auditoría — boundary de agregados de reputación

Fecha: 2026-09-04
Rama definitiva: `integration/conexa-unified`

## Corrección incorporada

Se creó `src/server/reputationAggregation.ts` como función pura para recalcular `rating` y `reviewCount` usando exclusivamente Reviews persistidas, no demo y no reportadas.

## Motivo

Los agregados de reputación no deben derivarse de valores enviados por el navegador ni de contadores previamente almacenados sin validación. El helper permite que el servicio autoritativo recalcule la reputación desde la fuente de verdad y mantenga consistencia entre `users`, `public_professional_profiles` y `radar_candidates`.

## Pendiente de integración

La integración transaccional debe ejecutarse en el backend cuando se crea o modera una Review. No se modificó `server.ts` en esta fase porque continúa siendo un archivo monolítico de alto riesgo. Hasta conectar el helper al servicio/ruta efectiva y retirar el writer legacy del AppContext, Reviews sigue siendo un frente parcialmente cerrado.
