# Escrow Nexora v1

## Objetivo

Implementar el control de entrega, liberación y disputa asociado a una orden Nexora pagada, manteniendo separadas la máquina de estados interna y la custodia efectiva del dinero.

## Regla financiera crítica

La implementación actual **no simula ni afirma custodia de fondos por parte de la plataforma**. Mercado Pago puede haber liquidado el pago al comercio según la configuración del marketplace y la cuenta receptora. Por eso `escrows/{orderId}` es un **control de escrow/dispute**, no un ledger de dinero ni una cuenta de custodia.

El campo `custodyMode: PROVIDER_SETTLED_CONTROL` deja esta distinción explícita.

Un escrow monetario real, en el sentido de impedir que el vendedor disponga de los fondos hasta la entrega, requiere que el flujo de Mercado Pago utilizado por Conexa/Nexora soporte y configure ese mecanismo de marketplace/payout. No se debe implementar una falsa retención escribiendo estados en Firestore.

## Modelo

`escrows/escrow:{orderId}` contiene:

- `paymentTransactionId`
- `orderId`
- `buyerId`
- `sellerId`
- `amountArs`
- `providerPaymentId`
- `status`
- `heldAt`
- `autoReleaseAt`
- `releasedAt`
- `releaseReason`
- `disputedAt`
- `disputeReason`
- `refundedAt`
- `custodyMode`

## Máquina de estados

```text
PENDING --PAYMENT_APPROVED--> HELD
HELD --BUYER_CONFIRMED------> RELEASED
HELD --AUTO_RELEASE---------> RELEASED
HELD --DISPUTE_OPENED-------> DISPUTED
PENDING/HELD/DISPUTED --REFUND--> REFUNDED
```

Las transiciones están centralizadas en `packages/shared-payments/src/escrow.ts`.

## Integración con pago

Cuando la reconciliación server-side confirma un pago Nexora como `approved` y la reserva de inventario sigue vigente:

1. `paymentTransactions/{id}` pasa a `PAID`.
2. `orders/{id}` pasa a `PAID`.
3. Se consolida el inventario.
4. Se crea atómicamente `escrows/escrow:{orderId}` en `HELD`.
5. Se calcula `autoReleaseAt` a 72 horas.

Si la reserva expiró antes de la confirmación, la orden queda `DISPUTED` y **no se crea un escrow liberable**, evitando entregar inventario dos veces.

## Liberación

El comprador confirma la recepción mediante `POST /api/orders/:id/confirm-delivery`.

La operación es una transacción Firestore que:

- valida que el actor sea el comprador;
- exige escrow `HELD`;
- exige orden `PAID`;
- cambia escrow a `RELEASED`;
- cambia orden a `COMPLETED`;
- marca `paymentTransactions/{id}` como `SETTLED`;
- crea el evento `NEXORA_ORDER_COMPLETED` cuando corresponde.

El endpoint histórico `POST /api/orders/:id/complete` utiliza ahora la misma confirmación de entrega para evitar un camino alternativo que pudiera saltarse el escrow.

## Auto-release

Un worker cada 15 minutos busca escrows `HELD` cuyo `autoReleaseAt` ya venció. Cada caso se vuelve a procesar dentro de una transacción, por lo que el efecto es idempotente.

El auto-release tampoco mueve dinero: solo consolida el estado operativo de la orden y su settlement interno.

## Disputas

El comprador puede abrir una disputa mientras el escrow está `HELD`. La orden pasa a `DISPUTED` y el escrow queda `DISPUTED`.

Un chargeback de Mercado Pago también puede llevar el escrow a `DISPUTED`; la resolución financiera definitiva continúa gobernada por el lifecycle de chargeback y por `coverage_applied`.

## Refunds

Los refunds externos siguen la regla contable de la plataforma: Mercado Pago devuelve el dinero al comprador y `financialReversals` registra la evidencia. No se genera un crédito artificial en `walletTransactions`.

## Próxima fase

Antes de activar un wallet económico real debe definirse y verificarse con Mercado Pago el mecanismo de disponibilidad/payout que determine cuándo el dinero del vendedor puede considerarse económicamente disponible. El estado Firestore por sí solo no constituye custodia de fondos.
