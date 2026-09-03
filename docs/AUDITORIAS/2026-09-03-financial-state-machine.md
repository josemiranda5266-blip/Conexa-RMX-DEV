# Auditoría — máquina financiera CONEXA

Fecha: 2026-09-03
Repositorio: `josemiranda5266-blip/Conexa-RMX-DEV`
Rama: `integration/conexa-unified`

## Verificación

Se verificó nuevamente el repositorio definitivo y la rama `integration/conexa-unified` antes de esta auditoría.

## Hallazgo principal

CONEXA mantiene dos máquinas de estado relacionadas pero distintas:

- `ServiceRequest` usa `JobStatus`: `REQUEST_CREATED → QUOTES_RECEIVED → PROFESSIONAL_SELECTED → IN_PROGRESS → COMPLETED → REVIEW_PENDING → CLOSED`.
- `Transaction` usa `TransactionStatus`: `CREATED → PAYMENT_PENDING → PAID → SERVICE_IN_PROGRESS → SERVICE_COMPLETED → REVIEW_COMPLETED → SETTLED`, además de estados de cancelación/reembolso/chargeback.

El dominio ya separa correctamente ambos conceptos. fileciteturn1209file0 fileciteturn1210file0

## Riesgo P0/P1

No se debe interpretar `TransactionStatus.SERVICE_COMPLETED` como estado de `ServiceRequest`. El cierre del trabajo pertenece a `JobStatus.COMPLETED`; el estado financiero `SERVICE_COMPLETED` pertenece exclusivamente a `Transaction`.

La integración con Mercado Pago debe tratar el webhook como autoridad del pago, no como autoridad del ciclo completo del trabajo.

## Secuencia canónica objetivo

1. Cliente acepta un Quote mediante comando backend.
2. Backend crea/actualiza `Transaction` en `PAYMENT_PENDING` y marca el Quote como `ACCEPTED` dentro de la misma operación transaccional.
3. Mercado Pago confirma el pago.
4. Webhook validado actualiza `Transaction.paymentStatus` y, únicamente ante estado aprobado verificable, `Transaction.status = PAID`.
5. El dominio puede pasar el trabajo a `IN_PROGRESS` cuando corresponda según las reglas de contratación.
6. Finalización del trabajo: `ServiceRequest.status = COMPLETED` y `Transaction.status = SERVICE_COMPLETED` son dos transiciones coordinadas, pero no intercambiables.
7. Review: `ServiceRequest → REVIEW_PENDING`; `Transaction → REVIEW_COMPLETED` cuando la review requerida queda registrada.
8. Liquidación: `Transaction → SETTLED` sólo cuando se cumplen las condiciones financieras.

## Regla crítica

El webhook nunca debe confiar únicamente en un estado enviado por el cliente. Debe derivar el estado financiero desde la respuesta server-to-server de Mercado Pago y verificar transaction/quote/request antes de actualizar.

## Estado

La separación conceptual de las máquinas está presente. El cierre de todos los handlers runtime continúa pendiente porque las rutas críticas siguen parcialmente concentradas en `server.ts`.

## Verificación dinámica

No se ejecutaron tests ni build. La validación dinámica queda reservada para la fase final.
