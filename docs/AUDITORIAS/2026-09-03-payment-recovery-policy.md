# Auditoría — política de recuperación financiera

Fecha: 2026-09-03
Repositorio: `josemiranda5266-blip/Conexa-RMX-DEV`
Rama: `integration/conexa-unified`

## Verificación

Repositorio y rama definitivos verificados antes de continuar.

## Objetivo

Cerrar la política de recuperación del flujo Mercado Pago sin mezclar el estado del pago con el estado del servicio.

## Política canónica

- `PAYMENT_PENDING`: existe intención de cobro, pero no existe confirmación financiera.
- `PAID`: Mercado Pago confirmó server-to-server un pago aprobado y consistente con la transacción.
- `SERVICE_IN_PROGRESS`: el servicio comenzó después de `PAID` y de las demás condiciones comerciales.
- `SERVICE_COMPLETED`: el trabajo terminó; no significa que los fondos estén liquidados.
- `REVIEW_COMPLETED`: se completó la etapa de reputación requerida.
- `SETTLED`: la operación puede considerarse financieramente liquidada sólo cuando no existe refund/chargeback pendiente o posterior que invalide la liquidación.
- `REFUNDED`: la operación no puede continuar hacia `SETTLED` como si el cobro siguiera vigente.
- `CHARGEBACK`: la operación queda financieramente bloqueada y requiere tratamiento de disputa/conciliación.

## Regla de recuperación

Un webhook repetido no debe crear una segunda transacción ni volver a ejecutar efectos comerciales. La identidad de la transacción es estable y el procesamiento debe ser idempotente.

Un pago aprobado repetido debe resultar en un no-op si la transacción ya está en `PAID` o en una etapa posterior compatible.

Una notificación de refund/chargeback debe impedir la liquidación normal mientras exista impacto financiero abierto.

## Hallazgo

La arquitectura de dominio ya contiene estados financieros suficientes para representar estos escenarios, pero el handler runtime todavía concentra demasiada responsabilidad y requiere extracción a un consumidor durable antes de considerarse cerrado para producción.

## No hacer

No se debe:

- confiar en el navegador para declarar un pago aprobado;
- usar `ServiceRequest.COMPLETED` como prueba de pago;
- mover automáticamente `REFUNDED` o `CHARGEBACK` a `SETTLED`;
- responder éxito permanente a un webhook cuyo procesamiento interno falló.

## Verificación dinámica

No se ejecutaron tests ni build. Quedan para la fase final.
