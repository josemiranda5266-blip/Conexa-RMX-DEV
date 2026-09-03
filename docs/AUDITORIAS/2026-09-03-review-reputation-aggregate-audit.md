# Auditoría — agregados de reputación de Reviews

Fecha: 2026-09-03
Rama definitiva: `integration/conexa-unified`

## Verificación

`src/server/reviewService.ts` ya incorpora el cierre transaccional del circuito de reputación.

Al crear una Review, el servicio:

- recalcula `rating` y `reviewCount` a partir del agregado previo del profesional y la nueva puntuación;
- actualiza `users/{professionalId}` con esos agregados;
- sincroniza `public_professional_profiles/{professionalId}` si la proyección ya existe;
- sincroniza `radar_candidates/{professionalId}` con el profesional actualizado;
- marca el `ServiceRequest` como `CLOSED`;
- si existe una transacción asociada en `SERVICE_COMPLETED`, la pasa a `REVIEW_COMPLETED`.

La operación se ejecuta dentro de una transacción Firestore y la Review tiene ID determinístico, por lo que los reintentos no deberían duplicar la reseña ni volver a incrementar los agregados.

## Riesgo residual

`trustScore` no se recalcula en este circuito. Esto es correcto mientras `trustScore` tenga otra política autoritativa, pero debe existir una única política de reputación antes de producción. No se debe inventar una fórmula de trustScore dentro del servicio de Reviews.

Otro punto a verificar durante la integración final es que todo camino legacy de creación de Review quede eliminado, porque la transacción autoritativa solo protege las escrituras que pasan por `saveProfessionalReview()`.

## Estado

El problema de agregados dejó de ser un hueco estructural inmediato. El cierre restante es de integración runtime/frontend y consolidación de la política de `trustScore`.
