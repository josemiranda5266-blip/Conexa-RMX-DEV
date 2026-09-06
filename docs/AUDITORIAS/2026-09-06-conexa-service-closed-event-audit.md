# FASE 30 — Auditoría de contrato `CONEXA_SERVICE_CLOSED`

**Proyecto:** Conexa-RMX-DEV / Super App  
**Rama:** `integration/conexa-unified`  
**Fecha:** 2026-09-06  
**Estado:** **FASE 30.8 IMPLEMENTADA — DISPATCHER INTEGRADO; E2E LOCAL PENDIENTE**

## 1. Objetivo

Auditar y cerrar el contrato transversal que permitirá que CONEXA publique `CONEXA_SERVICE_CLOSED` hacia el mecanismo de Outbox/Eventos sin conectar todavía el productor al cierre de servicio.

## 2. Estado acumulado

- 30.2 contrato runtime: **PASS 5/5**.
- 30.3 dispatcher puro: **PASS 4/4**.
- 30.4 recovery/replay: **PASS 6/6**.
- 30.5 worker/scheduler: auditoría completada; automatización productiva pendiente.
- 30.6 idempotencia durable: **PASS 3/3**.
- 30.7 consumer Nexora + ledger: **PASS 2/2**.
- 30.8 integración dispatcher → outbox → consumer: **implementada; prueba E2E pendiente**.

## 3. FASE 30.8 — Integración Dispatcher → Outbox → Consumer

Se modificó:

`apps/api-conexa/src/eventConsumer.ts`

El flujo ya no ejecuta el handler Nexora directamente desde el loop del Outbox. Ahora:

1. lee un documento `eventOutbox` `PENDING`;
2. construye el `DomainEvent` canónico mínimo;
3. envía el evento a `dispatchDomainEvent()`;
4. el registry selecciona `NEXORA_ORDER_COMPLETED`;
5. el handler Nexora ejecuta `runEventIdempotently()`;
6. el ledger `processedEvents/{DomainEvent.id}`, `installationLeads/{orderId}` y `eventOutbox/{eventId}=PUBLISHED` quedan en la misma transacción Firestore;
7. una segunda entrega del mismo ID no vuelve a ejecutar el efecto.

La integración mantiene al dispatcher como router y deja la durabilidad en el handler, evitando introducir I/O externo dentro de la transacción. Esto respeta la semántica de Firestore: las transacciones pueden reintentarse por contención y todas sus escrituras se aplican atómicamente sólo al confirmar. citeturn0search0turn0search1

### Prueba agregada

`tests/event-dispatcher-emulator.test.ts`

Escenarios:

1. Outbox → dispatcher → handler → installation lead + ledger + PUBLISHED.
2. Dos entregas concurrentes → un único efecto durable.

Script:

```text
pnpm test:event-dispatcher-emulator
```

**Ejecución local:** pendiente.

## 4. FASE 30.7 — Consumer + ledger

Resultado confirmado por el entorno de desarrollo:

```text
✔ Nexora consumer: concurrent workers create one lead and publish once
✔ Nexora consumer: repeated delivery is a durable no-op
ℹ tests 2
ℹ pass 2
ℹ fail 0
+ Script exited successfully (code 0)
```

El `MetadataLookupWarning` de Node no afectó la ejecución; el proceso terminó correctamente con código 0.

## 5. FASE 30.6 — Idempotencia durable

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

## 6. Decisiones de seguridad y arquitectura

- No se habilita replay automático de `FAILED`.
- No se agrega scheduler todavía.
- No se modifica `reviewService.ts` todavía.
- No se produce todavía `CONEXA_SERVICE_CLOSED`.
- No se cambia todavía el contrato de payload legado de `NEXORA_ORDER_COMPLETED`.
- No se permite que el replay cambie el `DomainEvent.id`.
- `processedEvents` sólo garantiza idempotencia de efectos Firestore incluidos en la misma transacción.
- No se deben ejecutar Mercado Pago, HTTP, correo u otros side effects externos dentro de `runEventIdempotently()`.
- El scheduler/worker debe invocar este pipeline, no duplicar la lógica del consumer.

## 7. Gates restantes

1. **Ejecutar `pnpm test:event-dispatcher-emulator`.**
2. Corregir cualquier incompatibilidad real detectada por el emulator.
3. Diseñar autorización administrativa real para replay.
4. Diseñar worker/scheduler productivo gestionado.
5. Conectar `CONEXA_SERVICE_CLOSED` a un consumidor real cuando exista un efecto de negocio definido.
6. Sólo después producir `CONEXA_SERVICE_CLOSED` desde `reviewService.ts` dentro de la transacción de cierre.

## 8. Resultado

**FASE 30.2 — PASS 5/5.**  
**FASE 30.3 — PASS 4/4.**  
**FASE 30.4 — PASS 6/6.**  
**FASE 30.5 — AUDITORÍA COMPLETADA; scheduler/worker pendiente.**  
**FASE 30.6 — PASS 3/3.**  
**FASE 30.7 — PASS 2/2.**  
**FASE 30.8 — IMPLEMENTADA; E2E pendiente de ejecución local.**  
**Producción de `CONEXA_SERVICE_CLOSED`: BLOQUEADA hasta completar la prueba E2E y definir el consumidor de negocio correspondiente.**
