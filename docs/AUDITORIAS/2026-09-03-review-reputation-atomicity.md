# Auditoría — atomicidad de Reviews y reputación

Fecha: 2026-09-03
Rama definitiva: `integration/conexa-unified`

## Verificación

`src/server/reviewService.ts` ya concentra en una única transacción:

- lectura del `ServiceRequest`;
- lectura del cliente y profesional;
- detección del Review determinístico existente;
- validación de elegibilidad;
- creación de la Review;
- actualización de `rating` y `reviewCount` del profesional;
- sincronización de `public_professional_profiles` si existe;
- sincronización/eliminación de `radar_candidates`;
- cierre del `ServiceRequest`;
- transición de una transacción financiera `SERVICE_COMPLETED -> REVIEW_COMPLETED` cuando corresponde.

Esto evita que una reseña exitosa deje deliberadamente el agregado de reputación desactualizado dentro del mismo commit transaccional.

## Protección financiera

La actualización financiera está limitada explícitamente a `SERVICE_COMPLETED -> REVIEW_COMPLETED`; no sobrescribe `REFUNDED`, `CHARGEBACK` ni `SETTLED`.

## Punto a verificar posteriormente

La consulta de la transacción financiera se realiza por `serviceRequestId`. Debe confirmarse durante la auditoría final de contratos de datos que la colección `transactions` utiliza exactamente ese campo y no el identificador histórico `requestId`. No se cambia este contrato sin evidencia del modelo/runtime.

## Estado

El agregado de reputación está estructuralmente integrado. El siguiente cierre de Reviews sigue siendo la conexión de `reviewRoute` al runtime principal y la eliminación del escritor legacy del frontend.
