# Regla de Contabilización Financiera v1

## Principio

`walletTransactions` representa exclusivamente dinero o crédito **interno de la plataforma**. No representa el saldo que un usuario mantiene directamente en Mercado Pago ni movimientos que Mercado Pago ejecuta sobre el medio de pago original del comprador.

## Reglas obligatorias

1. Un refund de Mercado Pago devuelve fondos al comprador mediante el proveedor y **no genera automáticamente un `CREDIT` en `walletTransactions`**.
2. Un chargeback perdido de Mercado Pago tampoco genera un débito artificial del wallet si el dinero disputado nunca fue contabilizado como saldo interno.
3. Refunds y chargebacks externos se registran en `financialReversals/{deterministic-key}` como evidencia financiera idempotente.
4. `walletTransactions` solo cambia cuando existe un saldo interno previamente acreditado —por ejemplo comisión, bonificación o recompensa de cross-selling— y existe una regla explícita que determine su reversión.
5. La identidad financiera entre dominios usa el Firebase UID canónico y la transacción/pago de origen como referencia; nunca se crea una cuenta de wallet paralela por email.

## Modelo causal

```text
Mercado Pago
   │
   ├── refund ────────────────> dinero vuelve al comprador
   │                              │
   │                              └──> financialReversals
   │
   └── chargeback perdido ────> pérdida/ajuste externo
                                  │
                                  └──> financialReversals

walletTransactions
   │
   └── solo movimientos internos previamente reconocidos
```

## Invariante

> No se puede acreditar ni debitar el wallet interno para reflejar una operación externa que nunca pasó por ese ledger.

Esta regla evita doble contabilización y separa claramente el **ledger interno** de la **liquidación con proveedores externos**.
