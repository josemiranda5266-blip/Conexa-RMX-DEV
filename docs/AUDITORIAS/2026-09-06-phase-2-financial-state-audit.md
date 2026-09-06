# Auditoría Fase 2 — Refund, Chargeback y Reversals

**Fecha:** 2026-09-06  
**Rama:** `integration/conexa-unified`  
**Estado:** CERRADA ESTRUCTURALMENTE — sin ejecutar build/tests por orden de trabajo.

## Alcance

Se revisaron `refundService`, `mercadoPagoReconciliation`, `mercadoPagoWebhook`, `chargebackResolutionService` y las escrituras de `financialReversals`.

## Invariantes verificados

### Refund

- La solicitud normal exige orden `PAID`, payment vinculado, comprador autenticado y monto completo.
- La preparación usa transacción Firestore y marca `refundStatus=PROCESSING` antes de llamar a Mercado Pago.
- La llamada externa usa idempotency key determinista `refund:{paymentTransactionId}`.
- Un refund concurrente no puede abrir una segunda solicitud mientras el estado sea `PROCESSING` o `REQUESTED`.
- Si el pago ya terminó como `REFUNDED`, el resultado externo se registra como confirmado sin duplicar reversión.
- Si el pago cambió a `CHARGEBACK`, el refund no pisa el estado financiero ni crea una segunda reversión.

### Refund versus inventario

- Un refund no revierte la consolidación de inventario de una orden completada.
- En estados `PENDING`/`PAID`, sólo se libera stock si la reserva sigue perteneciendo realmente a la orden.
- Un listing eliminado se ignora de forma segura.
- Una orden `COMPLETED` conserva su histórico y sólo recibe estado financiero separado.

### Refund versus chargeback

- Un chargeback de proveedor inicia o actualiza la disputa; no finaliza por sí solo `CHARGEBACK`.
- La resolución desfavorable es el único punto que crea `financialReversals` de tipo `CHARGEBACK`.
- La resolución favorable no puede ejecutarse sobre un pago ya refundido.
- Un refund confirmado absorbe casos `OPENED`, `UNDER_REVIEW` o `EXPIRED` y los mueve a `RESOLVED_BY_REFUND`.
- Un chargeback posterior al refund no reabre la disputa.
- La absorción sincroniza en la misma transacción el estado comercial/escrow cuando la orden aún no está consolidada.

### Reversals

- Refund: clave determinista `reversalLedgerKey(providerPaymentId, 'REFUND')`.
- Chargeback: clave determinista `reversalLedgerKey(providerPaymentId, 'CHARGEBACK')`.
- Las escrituras son create-if-absent dentro de transacciones Firestore.
- No se modifica el wallet interno por reversos externos del proveedor.

## Secuencia de carrera cerrada

```text
REFUND PROCESSING
      + CHARGEBACK WEBHOOK
      + REFUND WEBHOOK
      + CHARGEBACK RESOLUTION
      ↓
una sola autoridad final por estado:
- REFUNDED → absorbe chargeback y marca RESOLVED_BY_REFUND
- CHARGEBACK desfavorable → crea una sola reversión CHARGEBACK
- favorable → restaura estado financiero sin duplicar completion
```

## Pendiente no bloqueante

La auditoría de todos los consumidores de outbox y el cierre canónico de `REVIEW_PENDING -> CLOSED` siguen en la siguiente fase. No se ejecutaron build/tests todavía, conforme a la instrucción de completar primero las correcciones estructurales.
