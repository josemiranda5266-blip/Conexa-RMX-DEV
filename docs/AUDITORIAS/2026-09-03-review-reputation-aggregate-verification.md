# Reviews — verificación de agregados de reputación

Fecha: 2026-09-03
Rama definitiva: `integration/conexa-unified`

## Resultado de la verificación

La implementación actual de `src/server/reviewService.ts` ya actualiza los agregados de reputación dentro de la misma transacción que crea la Review autoritativa.

La transacción lee:

- `service_requests/{serviceRequestId}`;
- `users/{clientId}`;
- `users/{professionalId}`;
- `public_professional_profiles/{professionalId}`;
- `reviews/{deterministicReviewId}`.

Cuando crea una nueva Review:

1. calcula `rating` y `reviewCount` mediante `calculateUpdatedReputation()`;
2. crea la Review;
3. actualiza el usuario profesional;
4. actualiza la proyección pública cuando existe.

Por lo tanto, la afirmación previa de que todavía faltaba implementar la sincronización de agregados era incorrecta para el estado actual de la rama. El problema pendiente no es el cálculo del agregado, sino el cableado efectivo del runtime y la migración del frontend legacy.

## Invariante actual

Una creación nueva de Review y la actualización de `rating/reviewCount` ocurren en una única transacción Firestore.

Los reintentos que encuentran la Review determinística existente devuelven `created: false` y no incrementan nuevamente el contador.

## Pendientes

- registrar `POST /api/reviews` en el runtime principal;
- sustituir `AppContext.addReview()` como escritor efectivo;
- integrar la lectura pública en `ProfessionalDetailModal`;
- definir el tratamiento de agregados si una proyección pública profesional no existe;
- completar anonimización de referencias durante eliminación de cuenta.
