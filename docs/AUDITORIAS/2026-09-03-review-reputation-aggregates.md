# Auditoría — agregados autoritativos de reputación

Fecha: 2026-09-03
Rama definitiva: `integration/conexa-unified`

## Corrección aplicada

`saveProfessionalReview()` ahora mantiene la reseña y los agregados de reputación dentro de la misma transacción Firestore.

Cuando se crea una nueva reseña verificable:

- incrementa `reviewCount`;
- recalcula `rating` con media ponderada;
- actualiza `users/{professionalId}`;
- sincroniza `public_professional_profiles/{professionalId}` cuando la proyección existe;
- no vuelve a modificar agregados en reintentos, porque una reseña existente retorna `created: false`.

## Integridad

La actualización utiliza la transacción existente que valida:

- cliente autenticado;
- ServiceRequest existente;
- cliente propietario;
- profesional asignado;
- estado elegible;
- profesional existente;
- cuentas no bloqueadas.

## Pendiente

El promedio incremental depende de que cualquier modificación/eliminación administrativa de reseñas recalcule los agregados correspondientes. Mientras la producción sea append-only para reseñas verificadas, el promedio es consistente.

Todavía falta:

1. registrar `POST /api/reviews` en el runtime principal;
2. migrar `ReviewModal` y `AppContext.addReview()`;
3. definir una estrategia administrativa de reporte/ocultación que mantenga agregados consistentes.
