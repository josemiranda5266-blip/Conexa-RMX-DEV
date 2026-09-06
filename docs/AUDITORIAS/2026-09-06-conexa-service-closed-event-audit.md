# FASE 30 — Auditoría de contrato `CONEXA_SERVICE_CLOSED`

**Proyecto:** Conexa-RMX-DEV / Super App  
**Rama:** `integration/conexa-unified`  
**Fecha:** 2026-09-06  
**Estado:** **FASE 30.9 IMPLEMENTADA — RECOVERY E2E PENDIENTE DE EJECUCIÓN LOCAL**

## 1. Objetivo

Auditar y cerrar el contrato transversal que permitirá que CONEXA publique `CONEXA_SERVICE_CLOSED` hacia el mecanismo de Outbox/Eventos sin conectar todavía el productor al cierre de servicio.

## 2. Estado acumulado

- 30.2 contrato runtime: **PASS 5/5**.
- 30.3 dispatcher puro: **PASS 4/4**.
- 30.4 recovery/replay: **PASS 6/6**.
- 30.5 worker/scheduler: auditoría completada; automatización productiva pendiente.
- 30.6 idempotencia durable: **PASS 3/3**.
- 30.7 consumer Nexora + ledger: **PASS 2/2**.
- 30.8 integración dispatcher → outbox → consumer: **PASS 2/2**.
- 30.9 recovery E2E: **implementada; ejecución local pendiente**.

## 3. FASE 30.9 — Recovery E2E

Se integró `nextFailureState()` de `apps/api-conexa/src/outboxRecovery.ts` en el consumer real `apps/api-conexa/src/eventConsumer.ts`. El consumer ya no mantiene una política de reintentos paralela: la clasificación RETRYABLE/PERMANENT y el límite de intentos quedan centralizados en el módulo de recovery.

Se agregó:

`tests/outbox-recovery.emulator.test.ts`

Escenarios:

1. Evento inválido → `FAILED` con `INVALID_EVENT`.
2. Replay autorizado → vuelve a `PENDING`, reinicia `attempts`, incrementa `replayCount` y conserva el mismo `DomainEvent.id`.
3. Evento corregido → `PUBLISHED` + `installationLeads/{orderId}` + `processedEvents/{eventId}`.
4. Replay no autorizado → rechazado y el evento permanece `FAILED`.
5. Entregas concurrentes después del replay → un único efecto durable.

Script:

```text
pnpm test:outbox-recovery-emulator
```

**Ejecución local:** pendiente.

La separación mantiene una frontera importante: `runEventIdempotently()` sólo cubre efectos Firestore transaccionales. No deben incorporarse HTTP, Mercado Pago, correo u otros side effects externos dentro de esa transacción. Firestore puede reintentar una función de transacción ante contención, por lo que el callback debe ser seguro frente a múltiples ejecuciones. citeturn0search0turn0search4

## 4. FASE 30.8 — Integración Dispatcher → Outbox → Consumer

Se modificó `apps/api-conexa/src/eventConsumer.ts` para que el flujo lea `eventOutbox` `PENDING`, construya el `DomainEvent`, pase por `dispatchDomainEvent()` y ejecute el handler Nexora con idempotencia durable.

Resultado local confirmado:

```text
✔ dispatcher E2E: outbox routes through dispatcher and creates one installation lead
✔ dispatcher E2E: concurrent deliveries remain idempotent
ℹ tests 2
ℹ pass 2
ℹ fail 0
+ Script exited successfully (code 0)
```

El circuito validado es:

```text
 eventOutbox
      ↓
 Domain Event
      ↓
 Dispatcher
      ↓
 NEXORA_ORDER_COMPLETED handler
      ↓
 processedEvents/{eventId}
      ↓
 installationLeads/{orderId}
      ↓
 PUBLISHED
```

## 5. FASE 30.7 — Consumer + ledger

Resultado confirmado:

```text
✔ Nexora consumer: concurrent workers create one lead and publish once
✔ Nexora consumer: repeated delivery is a durable no-op
ℹ tests 2
ℹ pass 2
ℹ fail 0
+ Script exited successfully (code 0)
```

## 6. FASE 30.6 — Idempotencia durable

Resultado confirmado:

```text
✔ event idempotency: concurrent deliveries execute the Firestore effect once
✔ event idempotency: repeated delivery becomes a durable no-op
✔ event idempotency: failed effect does not leave a false processed ledger
ℹ tests 3
ℹ pass 3
ℹ fail 0
+ Script exited successfully (code 0)
```

## 7. Decisiones de seguridad y arquitectura

- No se habilita replay automático de `FAILED`.
- El replay manual requiere autorización explícita.
- El replay nunca cambia `DomainEvent.id`.
- No se agrega scheduler todavía.
- No se modifica `reviewService.ts` todavía.
- No se produce todavía `CONEXA_SERVICE_CLOSED`.
- No se cambia todavía el contrato de payload legado de `NEXORA_ORDER_COMPLETED`.
- `processedEvents` sólo garantiza idempotencia de efectos Firestore incluidos en la misma transacción.
- No se deben ejecutar Mercado Pago, HTTP, correo u otros side effects externos dentro de `runEventIdempotently()`.
- El scheduler/worker futuro debe invocar este pipeline, no duplicar la lógica del consumer.
- Los eventos son un modelo de entrega al menos una vez; la idempotencia persistente por ID es necesaria para que los reintentos sean seguros. citeturn0search1turn0search2

## 8. Gates restantes

1. **Ejecutar `pnpm test:outbox-recovery-emulator`.**
2. Corregir cualquier incompatibilidad real detectada por el emulator.
3. Diseñar autorización administrativa real para replay en runtime, no sólo en el helper.
4. Diseñar worker/scheduler productivo gestionado.
5. Conectar `CONEXA_SERVICE_CLOSED` a un consumidor real cuando exista un efecto de negocio definido.
6. Sólo después producir `CONEXA_SERVICE_CLOSED` desde `reviewService.ts` dentro de la transacción de cierre.

## 9. Resultado

**FASE 30.2 — PASS 5/5.**  
**FASE 30.3 — PASS 4/4.**  
**FASE 30.4 — PASS 6/6.**  
**FASE 30.5 — AUDITORÍA COMPLETADA; scheduler/worker pendiente.**  
**FASE 30.6 — PASS 3/3.**  
**FASE 30.7 — PASS 2/2.**  
**FASE 30.8 — PASS 2/2.**  
**FASE 30.9 — IMPLEMENTADA; E2E pendiente de ejecución local.**  
**Producción de `CONEXA_SERVICE_CLOSED`: BLOQUEADA hasta completar recovery E2E, definir autorización real de replay y definir el consumidor de negocio correspondiente.**
