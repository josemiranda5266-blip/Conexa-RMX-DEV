# Auditoría — agregados autoritativos de reputación

Fecha: 2026-09-03
Rama definitiva: `integration/conexa-unified`

## Corrección aplicada

`saveProfessionalReview()` ahora actualiza en la misma transacción:

- la nueva reseña en `reviews`;
- `rating` y `reviewCount` del documento profesional en `users/{professionalId}`;
- los mismos agregados en `public_professional_profiles/{professionalId}` cuando la proyección pública existe.

La reseña y sus agregados se calculan únicamente cuando el ID determinístico todavía no existe. Los reintentos idempotentes no vuelven a incrementar el contador ni alteran el promedio.

## Invariante

Para una nueva reseña válida:

`reviewCount(nuevo) = reviewCount(actual) + 1`

`rating(nuevo) = promedio ponderado(rating actual, reviewCount actual, overallRating nueva)`

## Pendientes

- El runtime debe registrar la ruta HTTP autoritativa.
- El frontend debe abandonar `AppContext.addReview()`.
- Debe definirse la estrategia para editar/eliminar una review en el futuro, porque los agregados incrementales requieren recomputación o delta controlado.
- La eliminación de cuenta debe decidir qué referencias y agregados históricos se preservan/anónimizan.
