# Auditoría — reputación y cierre transaccional de Reviews

Fecha: 2026-09-03
Rama definitiva: `integration/conexa-unified`

## Corrección aplicada

`src/server/reviewService.ts` ahora realiza dentro de una única transacción Firestore:

- lectura del `ServiceRequest`;
- lectura del cliente autenticado;
- lectura del profesional;
- lectura del Review determinístico;
- lectura de la transacción financiera asociada, cuando existe;
- creación idempotente de la Review;
- actualización autoritativa de `rating` y `reviewCount` del profesional;
- actualización de `public_professional_profiles`;
- actualización de `radar_candidates`;
- cierre del `ServiceRequest` en `CLOSED`;
- transición financiera `SERVICE_COMPLETED -> REVIEW_COMPLETED` cuando corresponde.

Las transiciones financieras `REFUNDED`, `CHARGEBACK` y `SETTLED` no son sobrescritas.

## Hallazgo importante

La agregación de reputación usa el acumulado actual del perfil. Esto es correcto para un modelo donde Reviews son inmutables para clientes y los cambios/borrados administrativos son excepcionales. Si en el futuro se permiten editar/eliminar Reviews, será necesario recalcular agregados desde Reviews o implementar una compensación transaccional.

## Estado pendiente

Todavía falta integrar la ruta HTTP al runtime principal y sustituir el escritor legacy del `AppContext`. Sin esas dos integraciones, la arquitectura nueva no es aún el único camino efectivo.
