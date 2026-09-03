# Auditoría — consistencia de agregados de reputación

Fecha: 2026-09-03
Rama definitiva: `integration/conexa-unified`

## Estado confirmado

`saveProfessionalReview()` ya actualiza en la misma transacción:

- `reviews/{reviewId}`;
- `users/{professionalId}.rating`;
- `users/{professionalId}.reviewCount`;
- `public_professional_profiles/{professionalId}` cuando la proyección existe;
- `radar_candidates/{professionalId}`;
- cierre del `service_requests/{serviceRequestId}`;
- transición financiera `SERVICE_COMPLETED -> REVIEW_COMPLETED` cuando corresponde.

Por lo tanto, la creación normal de una reseña no deja los agregados de reputación desincronizados por separado.

## Riesgo pendiente: moderación posterior

La proyección pública excluye reseñas con `isReported === true`, pero el agregado `rating/reviewCount` se calcula únicamente al crear la reseña. Si una reseña válida es posteriormente reportada/ocultada, no existe todavía un flujo autoritativo identificado que recalcule los agregados del profesional.

Esto puede producir una diferencia entre:

- reputación visible en el detalle público;
- `rating` y `reviewCount` almacenados en el perfil;
- ranking/proyección RADAR.

## Recomendación

Toda moderación que cambie la visibilidad de una reseña debe disparar una reconciliación transaccional o una tarea administrativa que recalcule los agregados verificables del profesional y sincronice las proyecciones pública/RADAR.

## Estado

La creación de Reviews está estructuralmente endurecida. El siguiente problema ya no es la creación sino el ciclo completo de moderación y reconciliación.