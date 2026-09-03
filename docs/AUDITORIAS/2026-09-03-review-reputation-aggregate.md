# Auditoría — agregados de reputación de Reviews

Fecha: 2026-09-03
Rama definitiva: `integration/conexa-unified`

## Cambio aplicado

`src/server/reviewService.ts` ahora actualiza de forma atómica, dentro de la misma transacción que crea la Review:

- `users/{professionalId}.rating`
- `users/{professionalId}.reviewCount`
- `public_professional_profiles/{professionalId}`

El promedio se recalcula a partir del agregado existente y de la nueva puntuación, sin aceptar `rating` ni `reviewCount` enviados por el cliente.

## Idempotencia

La Review mantiene un ID determinístico derivado de cliente + profesional + ServiceRequest. Si ya existe, la operación retorna la Review existente sin volver a incrementar los agregados.

## Seguridad

La operación valida además que exista el profesional y que no esté bloqueado. La elegibilidad del trabajo sigue dependiendo del `ServiceRequest` real y del profesional asignado.

## Pendientes

Todavía falta integrar el endpoint al `server.ts`, migrar `ReviewModal`/`AppContext` al endpoint y revisar el cálculo histórico de `trustScore`. No se considera cerrado hasta eliminar el camino legacy de escritura.
