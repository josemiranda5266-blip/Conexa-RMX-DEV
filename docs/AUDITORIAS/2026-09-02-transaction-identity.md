# CONEXA — Auditoría de identidad transaccional

## Repositorio y rama

- Repositorio: `josemiranda5266-blip/Conexa-RMX-DEV`
- Rama: `integration/conexa-unified`
- Fecha de revisión: 2026-09-02

## Hallazgo

El flujo de contratación ya crea transacciones con una identidad determinística derivada del presupuesto: `txn-{quoteId}`. Sin embargo, `jobs/start`, `jobs/complete` y `reviews/create` todavía resuelven la transacción mediante consultas por `serviceRequestId` y límites (`limit(1)`/`limit(5)`).

Esto introduce una dependencia innecesaria del orden de los documentos y deja abierta una inconsistencia si existieran varias transacciones históricas para una misma solicitud.

## Corrección estructural realizada

Se agregó `src/server/payments/transactionIdentity.ts` como única fuente de verdad para derivar:

- `getTransactionIdForQuote(quoteId)`
- `getTransactionIdForAcceptedQuote(acceptedQuoteId)`

Ambas funciones producen `txn-{quoteId}` y rechazan identificadores vacíos.

## Estado

- Identidad determinística: **formalizada en módulo compartido**.
- `ServiceRequest.acceptedQuoteId`: **modelado**.
- Persistencia de `acceptedQuoteId` en la aceptación: **pendiente de integración en `server.ts`**.
- `jobs/start`: **pendiente de migrar a referencia directa**.
- `jobs/complete`: **pendiente de migrar a referencia directa**.
- `reviews/create`: **pendiente de migrar a referencia directa**.

## Criterio de producción

La cadena final debe ser:

`acceptedQuoteId` → `transactions/txn-{acceptedQuoteId}`

sin resolver la transacción comercial por consultas ambiguas sobre `serviceRequestId`.

No se ejecutaron builds ni tests en esta etapa, por la política de trabajo definida para la auditoría.
