# Conexa + Nexora — Migration Map v1

## Objetivo

Convertir Conexa-RMX-DEV en el monorepo de la Super App sin mezclar dominios ni perder datos.

## Destino

```text
apps/
  web/          # shell/dashboard unificado
  api-conexa/   # dominio de servicios profesionales
  api-nexora/   # dominio marketplace
packages/
  shared-types/
  shared-reputation/
  shared-auth/
  shared-wallet/
  shared-events/
  shared-payments/
  shared-security/   # siguiente fase
  shared-ai/         # siguiente fase
```

## Matriz de migración

| Origen | Destino | Acción | Regla |
|---|---|---|---|
| Conexa `src/types.ts` | `packages/shared-types` + `apps/api-conexa` | ADAPTAR | Los tipos exclusivos de servicio permanecen en Conexa |
| Conexa `src/server/reputationAggregation.ts` | `packages/shared-reputation` | MIGRAR | El archivo actual queda como adaptador de compatibilidad |
| Conexa `src/server/auth.ts` | `packages/shared-auth` + `apps/api-conexa` | ADAPTAR | Firebase UID sigue siendo identidad canónica |
| Nexora `src/types.ts` | `packages/shared-types` + `apps/api-nexora` | ADAPTAR | Marketplace conserva su modelo de dominio |
| Nexora `src/services/storage.ts` | `apps/api-nexora` + Firestore | REEMPLAZAR | localStorage no es persistencia de producción |
| Nexora `server.ts` | `apps/api-nexora` | MIGRAR/ADAPTAR | Gemini queda detrás de una frontera API propia |
| Nexora `src/App.tsx` | `apps/web` + módulos Nexora | ADAPTAR | Separar shell, navegación y dominio |
| Conexa `AppContext` | `apps/web` + servicios por dominio | REFACTORIZAR | No conservar el God Context |
| Conexa reviews | `packages/shared-reputation` + API Conexa | PRESERVAR/ADAPTAR | Excluir demo/reportadas y recalcular en backend |
| Nexora escrow conceptual | `apps/api-nexora` | ADAPTAR | Estados y dinero deben persistir server-side |

## Identidad canónica

La clave común es `users/{firebaseUid}`. No se fusionan cuentas por email automáticamente.

Cada usuario puede tener perfiles de dominio:

```text
users/{uid}
users/{uid}/profiles/conexa
users/{uid}/profiles/nexora
```

La migración debe usar un mapa explícito con estados `PENDING | MAPPED | VERIFIED | CONFLICT`.

## Datos financieros

No se debe compartir un `balance` mutable desde frontend. El monedero común será un ledger:

```text
wallets/{uid}
walletTransactions/{id}
```

Cada movimiento conserva `source: CONEXA | NEXORA | SYSTEM` y referencia de origen.

### Regla crítica de refunds

Mercado Pago devuelve el dinero directamente al comprador según el medio de pago. Por lo tanto, un refund externo **no debe crear automáticamente un `CREDIT` en `walletTransactions`**, porque eso produciría doble contabilización si el wallet representa dinero interno distinto del saldo de Mercado Pago. El ledger solo se mutará cuando exista un saldo interno previamente acreditado y la reversión de ese saldo esté explícitamente modelada. Mientras tanto, `financialReversals/{id}` funciona como registro financiero/auditoría idempotente del evento externo.

### Flujo de pago Nexora

La orden Nexora se crea como `PENDING` junto con `paymentTransactions/{id}` en `PAYMENT_PENDING`. El checkout de Mercado Pago es generado server-side y es idempotente. El webhook no confía en el payload del cliente: recupera el pago del proveedor, verifica referencia externa, comercio, monto e ID del pago y recién entonces permite `PAYMENT_PENDING -> PAID`.

La transición financiera canónica vive ahora en `packages/shared-payments`; la reconciliación de Mercado Pago es el adaptador que ejecuta las escrituras atómicas de cada dominio.

Las reversas son estados financieros explícitos:

```text
PAYMENT_PENDING -> PAID
PAYMENT_PENDING -> CANCELLED
PAID            -> REFUNDED
PAID            -> CHARGEBACK
```

Los refunds se solicitan únicamente desde backend. El endpoint autenticado no acepta un importe arbitrario: el flujo actual de Nexora soporta refund total y toma el importe de `paymentTransactions/{id}`. La solicitud usa `X-Idempotency-Key` de Mercado Pago derivada de la transacción y el estado local pasa a `PROCESSING/REQUESTED`; el estado financiero final se deriva de la confirmación del proveedor.

Un reembolso de proveedor no se interpreta automáticamente como reversión de un servicio ya completado. En Nexora, un reembolso de una orden pendiente/pagada cancela la orden; un chargeback marca una orden activa o completada como `DISPUTED` para resolución posterior.

Cada refund/chargeback confirmado genera además un documento determinista en `financialReversals`, cuya clave incorpora el `payment_id` y el tipo de reversión. Esto hace idempotente el registro aun cuando Mercado Pago reintente la notificación.

### Inventario y concurrencia Nexora

La creación de una orden lee listings dentro de una única transacción Firestore y reserva inventario antes de crear la orden y su `paymentTransaction`. Firestore reintentará la transacción ante una escritura concurrente sobre el mismo listing, evitando la doble reserva.

La reserva queda ligada a `reservedByOrderId` y expira a los 15 minutos. Un checkout no puede generarse después de la expiración; en ese caso la orden y su pago pendiente se cancelan y el inventario se libera. El pago confirmado por Mercado Pago también debe encontrar una reserva válida: si llega después de la expiración, el pago financiero se registra pero la orden queda `DISPUTED` y el inventario se libera para evitar una doble venta.

El endpoint de cancelación libera la reserva dentro de la misma transacción y `PAID -> COMPLETED` consume definitivamente la reserva, marcando el listing como `Vendido` cuando el stock llega a cero.

## Integración entre dominios

Los dominios no importan lógica interna entre sí.

Flujo objetivo:

```text
NEXORA order completed
        ↓
NEXORA_ORDER_COMPLETED
        ↓
     outbox
        ↓
Conexa consumer
        ↓
installation lead / notification
```

## Cross-selling

Cuando un servicio Conexa termina en `CLOSED` o `SETTLED`, el shell puede mostrar una oferta de Nexora. El descuento final deberá provenir del backend/campaña y no de una constante confiada por el cliente.

## Datos que NO se deben fusionar

- Conexa `ServiceRequest` con Nexora `Listing`.
- Conexa `Transaction` con Nexora `EscrowPayment`.
- Conexa `Review` con Nexora `Review` como un único documento sin `entityType`.
- Roles internos de Conexa con categorías comerciales de Nexora.
- localStorage de Nexora con persistencia productiva.

## Estado de esta fase

### Endurecimiento completado

- `shared-payments` creado como máquina de estados financiera común.
- Settlement de Mercado Pago de Conexa/Nexora encaminado por el mismo contrato de transición.
- Creación de órdenes Nexora con reserva de inventario transaccional.
- Reservas ligadas a la orden, con expiración de 15 minutos.
- Checkout bloqueado cuando la reserva expiró.
- Confirmación de pago Nexora actualiza atómicamente pago + orden + inventario cuando la reserva sigue vigente.
- Pago confirmado después de perder la reserva queda financiero como pagado, pero la orden se marca `DISPUTED` para evitar una venta inconsistente.
- Cancelación pendiente libera inventario y cancela el `paymentTransaction` pendiente.
- `PAID -> COMPLETED` libera la reserva y consolida el estado del listing.
- Se eliminó el camino de settlement directo como mecanismo operativo; el método antiguo queda únicamente como guardia de compatibilidad y falla explícitamente.
- Refund total Nexora iniciado exclusivamente server-side mediante Mercado Pago.
- Idempotencia del refund mediante `X-Idempotency-Key` del proveedor.
- Reversión confirmada registrada de forma determinista en `financialReversals`.
- Chargeback/refund no generan créditos artificiales en el wallet interno.
- Webhook puede resolver el comercio a partir del `providerPaymentId` cuando no existe `transactionId` en query.

La verificación automatizada de build/lint/tests queda deliberadamente para el cierre de la fase de correcciones.

## Siguiente orden recomendado

1. Completar soporte específico de notificaciones `chargebacks` y resolución de casos contra Mercado Pago.
2. Ledger `shared-wallet` conectado a eventos financieros internos reales, solo cuando exista un saldo interno que revertir.
3. Escrow y settlement económico real.
4. Firestore Rules y auditoría final de seguridad.
5. Refactor progresivo de `AppContext`, matching y mensajería de Conexa.
6. Migración final de pantallas Nexora fuera de localStorage.
7. Build/lint/tests y auditoría de cierre.
