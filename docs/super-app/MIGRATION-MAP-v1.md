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

### Flujo de pago Nexora

La orden Nexora se crea como `PENDING` junto con `paymentTransactions/{id}` en `PAYMENT_PENDING`. El checkout de Mercado Pago es generado server-side y es idempotente. El webhook no confía en el payload del cliente: recupera el pago del proveedor, verifica referencia externa, comercio, monto e ID del pago y recién entonces permite `PAYMENT_PENDING -> PAID`.

Las reversas también son estados financieros explícitos:

```text
PAYMENT_PENDING -> PAID
PAYMENT_PENDING -> CANCELLED
PAID            -> REFUNDED
PAID            -> CHARGEBACK
```

Un reembolso de proveedor no se interpreta automáticamente como reversión de un servicio ya completado. En Nexora, un reembolso de una orden pendiente/pagada cancela la orden; un chargeback marca una orden activa o completada como `DISPUTED` para resolución posterior.

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

La estructura del monorepo, los contratos compartidos iniciales y el flujo financiero base de Nexora ya están creados. La migración funcional de pantallas, rutas, persistencia Firestore y eventos debe hacerse por dominio, evitando un big-bang. La verificación automatizada de build/lint/tests queda deliberadamente para el cierre de la fase de correcciones.
