# Reviews — sincronización de reputación

Fecha: 2026-09-03
Rama definitiva: `integration/conexa-unified`

## Corrección aplicada

`saveProfessionalReview()` actualiza dentro de la misma transacción:

- `reviews/{reviewId}`;
- `users/{professionalId}`: `rating` y `reviewCount`;
- `public_professional_profiles/{professionalId}` cuando existe;
- `radar_candidates/{professionalId}` cuando existe.

La actualización se ejecuta solamente al crear una nueva reseña. Si el ID determinístico ya existe, el resultado es `created: false` y los agregados no se incrementan nuevamente.

## Pendientes

- Registrar `POST /api/reviews` en el runtime.
- Migrar `ReviewModal` y retirar la escritura legacy de `AppContext.addReview()`.
- Definir recalculación ante moderación, ocultamiento o eliminación administrativa de reseñas.
