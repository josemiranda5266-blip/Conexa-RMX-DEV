# Auditoría — agregados de reputación y consistencia de Reviews

Fecha: 2026-09-03
Rama definitiva: `integration/conexa-unified`

## Estado verificado

`reviewService.ts` ya actualiza en la misma transacción:

- la colección `reviews`;
- `users/{professionalId}` con `rating` y `reviewCount`;
- la proyección `public_professional_profiles` cuando ya existe;
- la proyección `radar_candidates`;
- el cierre del `service_request`;
- el estado financiero `SERVICE_COMPLETED -> REVIEW_COMPLETED` cuando corresponde.

Esto significa que la reputación ya no es solamente un dato de UI: su agregación está dentro del servicio autoritativo.

## Corrección realizada

`reviewRoute.ts` ahora clasifica explícitamente:

- profesional inexistente como 404;
- profesional bloqueado como 403;
- errores de identidad/elegibilidad como 409;
- entradas inválidas como 400.

También se eliminó el uso de `any` en el manejo de errores del boundary.

## Pendiente crítico

La arquitectura todavía no está cerrada mientras:

1. `POST /api/reviews` no esté registrado en `server.ts`;
2. `ReviewModal` siga utilizando el escritor legacy del `AppContext`;
3. la eliminación de cuentas no cubra todas las referencias profesionales y de autoría en Reviews.

## Conclusión

Los agregados de reputación ya están integrados en el servicio de dominio. El principal riesgo restante no es el cálculo del rating sino la coexistencia del camino runtime legacy con el nuevo camino autoritativo.
