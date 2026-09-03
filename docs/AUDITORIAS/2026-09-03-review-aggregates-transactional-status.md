# Reviews — agregados transaccionales

Fecha: 2026-09-03
Repositorio: `josemiranda5266-blip/Conexa-RMX-DEV`
Rama: `integration/conexa-unified`

## Estado confirmado

`src/server/reviewService.ts` ya actualiza dentro de la misma transacción Firestore:

- documento de `reviews`;
- `rating` y `reviewCount` del usuario profesional;
- proyección `public_professional_profiles` cuando ya existe;
- proyección `radar_candidates`;
- cierre del `service_requests` revisado;
- transición de transacción `SERVICE_COMPLETED -> REVIEW_COMPLETED` cuando corresponde.

El ID determinístico de review mantiene idempotencia para el mismo cliente, profesional y ServiceRequest.

## Hallazgo de arquitectura

La capa de dominio ya contiene los agregados y proyecciones. El principal pendiente de Reviews no es persistencia sino integración efectiva:

1. registrar `POST /api/reviews` en el runtime principal;
2. migrar `ReviewModal` fuera de `AppContext.addReview()`;
3. retirar el camino legacy de escritura directa;
4. verificar que los estados financieros declarados acepten `REVIEW_COMPLETED` como transición válida en todos los consumidores.

## Decisión

No se duplicará el cálculo de reputación en frontend ni en handlers HTTP. `saveProfessionalReview()` queda como único candidato a fuente autoritativa del cálculo de agregados.
