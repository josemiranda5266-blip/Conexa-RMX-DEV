# Hardening — identidad de transacciones

Fecha: 2026-09-03
Rama objetivo: `integration/conexa-unified`

## Verificación de alcance

Se verificó la rama objetivo antes de modificar `src/server/payments/transactionIdentity.ts`.

## Corrección

La identidad canónica de una transacción sigue derivándose del `quoteId` aceptado (`txn-{quoteId}`), pero ahora el identificador se valida como string, se recorta y se limita a 256 caracteres. Se evita la coerción silenciosa de tipos inválidos y se mantiene un único punto de normalización para las rutas que usen la identidad comercial.

## Importancia comercial

Esto refuerza la idempotencia y evita que distintas rutas construyan identificadores a partir de valores ambiguos. No resuelve todavía la integración runtime pendiente: el flujo de aceptación debe persistir explícitamente el `acceptedQuoteId` y las consultas posteriores deben abandonar las búsquedas históricas por `serviceRequestId` cuando la identidad de transacción corresponda al quote aceptado.

No se ejecutaron tests ni build.
