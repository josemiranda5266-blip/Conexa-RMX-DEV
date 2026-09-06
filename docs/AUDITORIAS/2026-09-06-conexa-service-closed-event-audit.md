# FASE 30 — Auditoría de contrato `CONEXA_SERVICE_CLOSED`

**Proyecto:** Conexa-RMX-DEV / Super App  
**Rama:** `integration/conexa-unified`  
**Fecha:** 2026-09-06  
**Estado:** **FASE 31.1 PASS — INVENTARIO DE INFRAESTRUCTURA CERRADO**

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
- 30.9 recovery E2E: **PASS 3/3**.
- 31.1 inventario de infraestructura: **PASS**.

## 3. FASE 31.1 — Inventario de infraestructura

Se revisó la rama `integration/conexa-unified` antes de agregar cualquier worker o scheduler.

### Hallazgos

1. **No existe infraestructura de Cloud Functions en el repositorio.**
   - `package.json` no contiene `firebase-functions`.
   - `firebase.json` sólo declara Firestore/Storage rules y el emulador de Firestore; no existe bloque `functions`.

2. **No existe scheduler/worker gestionado declarado en el repo.**
   - No se encontró `setInterval` para el pipeline de eventos.
   - No se encontró integración de `firebase-functions`, Cloud Scheduler ni Cloud Tasks en la configuración actual.

3. **El pipeline de eventos ya tiene un punto de entrada HTTP interno.**
   - `apps/api-conexa/src/server.ts` expone `POST /internal/events/process-nexora`.
   - El endpoint exige `INTERNAL_EVENT_SECRET` mediante el header `x-internal-event-secret` y comparación `timingSafeEqual`.
   - El endpoint delega exclusivamente en `processNexoraOrderCompleted()`; no duplica la lógica del consumer.

4. **El consumer ya contiene las piezas necesarias para ser invocado por un worker externo.**
   - Outbox `PENDING` → dispatcher → handler → `processedEvents`/efecto Firestore.
   - Recovery clasifica fallos y mantiene `FAILED` fuera del retry automático.
   - El replay autorizado vuelve a `PENDING`, por lo que el scheduler futuro no necesita implementar lógica de replay propia.

5. **El diseño actual todavía no justifica agregar un proceso residente al servidor.**
   - Agregar `setInterval`, cron embebido o un worker dentro del proceso Express volvería a introducir coupling entre disponibilidad HTTP y procesamiento de eventos.
   - El pipeline debe conservar una frontera separada y gestionada.

### Decisión de arquitectura para FASE 31

La primera opción a evaluar será **Cloud Functions for Firebase 2nd gen + `onSchedule`**, ejecutando el mismo pipeline existente, porque Firebase documenta `onSchedule` como integración directa con Cloud Scheduler y recomienda Cloud Functions 2nd gen para nuevas funciones. citeturn0search0turn0search2

No se implementa todavía. Antes de escribir código deben cerrarse:

- ubicación y estructura mínima de `functions/`;
- dependencia `firebase-functions` y compatibilidad con Node/TypeScript del monorepo;
- acceso al mismo Firestore Admin y configuración de secretos;
- autorización del scheduler sin reutilizar un secreto estático si puede evitarse;
- frecuencia inicial y límites de lote;
- pruebas locales/emulador de concurrencia y doble ejecución.

Como alternativa, si el despliegue final mantiene el API Express fuera de Functions, puede evaluarse Cloud Scheduler → endpoint HTTP autenticado. Google documenta OIDC con una service account para targets HTTP autenticados; el target debe ser públicamente accesible. citeturn0search5turn0search14

**No se selecciona todavía esa alternativa**, porque introduciría una dependencia de exposición pública del API y un puente HTTP innecesario si podemos ejecutar el pipeline directamente en una función programada.

## 4. FASE 30.9 — Recovery E2E

Se integró `nextFailureState()` de `apps/api-conexa/src/outboxRecovery.ts` en el consumer real `apps/api-conexa/src/eventConsumer.ts`. El consumer ya no mantiene una política de reintentos paralela: la clasificación RETRYABLE/PERMANENT y el límite de intentos quedan centralizados en el módulo de recovery.

Se agregó:

`tests/outbox-recovery.emulator.test.ts`

Escenarios validados localmente:

1. Evento inválido → `FAILED` con `INVALID_EVENT`.
2. Replay autorizado → vuelve a `PENDING`, reinicia `attempts`, incrementa `replayCount` y conserva el mismo `DomainEvent.id`.
3. Evento corregido → `PUBLISHED` + `installationLeads/{orderId}` + `processedEvents/{eventId}`.
4. Replay no autorizado → rechazado y el evento permanece `FAILED`.
5. Entregas concurrentes después del replay → un único efecto durable.

Resultado local confirmado:

```text
✔ outbox recovery E2E: permanent failure becomes FAILED, authorized replay preserves identity and succeeds
✔ outbox recovery E2E: unauthorized replay is rejected and FAILED event remains untouched
✔ outbox recovery E2E: concurrent deliveries after replay create one installation lead
ℹ tests 3
ℹ pass 3
ℹ fail 0
+ Script exited successfully (code 0)
```

Script ejecutado:

```text
pnpm test:outbox-recovery-emulator
```

La separación mantiene una frontera importante: `runEventIdempotently()` sólo cubre efectos Firestore transaccionales. No deben incorporarse HTTP, Mercado Pago, correo u otros side effects externos dentro de esa transacción. Firestore puede reintentar una función de transacción ante contención, por lo que el callback debe ser seguro frente a múltiples ejecuciones. citeturn0search0turn0search4

## 5. FASE 30.8 — Integración Dispatcher → Outbox → Consumer

Se modificó `apps/api-conexa/src/eventConsumer.ts` para que el flujo lea `eventOutbox` `PENDING`, construya el `DomainEvent`, pase por `dispatchDomainEvent()` y ejecute el handler Nexora con idempotencia durable.

Resultado local confirmado:

```text
✔ dispatcher E2E: outbox routes through dispatcher and creates one installation lead
✔ dispatcher E2E: concurrent deliveries remain idempotent
ℹ tests 2
ℹ pass 2
+ Script exited successfully (code 0)
```

## 6. FASE 30.7 — Consumer + ledger

Resultado confirmado:

```text
✔ Nexora consumer: concurrent workers create one lead and publish once
✔ Nexora consumer: repeated delivery is a durable no-op
ℹ tests 2
ℹ pass 2
+ Script exited successfully (code 0)
```

## 7. FASE 30.6 — Idempotencia durable

Resultado confirmado:

```text
✔ event idempotency: concurrent deliveries execute the Firestore effect once
✔ event idempotency: repeated delivery becomes a durable no-op
✔ event idempotency: failed effect does not leave a false processed ledger
ℹ tests 3
ℹ pass 3
+ Script exited successfully (code 0)
```

## 8. Decisiones de seguridad y arquitectura

- No se habilita replay automático de `FAILED`.
- El replay manual requiere autorización explícita.
- El replay nunca cambia `DomainEvent.id`.
- No se agrega scheduler residente al proceso Express.
- No se modifica `reviewService.ts` todavía.
- No se produce todavía `CONEXA_SERVICE_CLOSED`.
- No se cambia todavía el contrato de payload legado de `NEXORA_ORDER_COMPLETED`.
- `processedEvents` sólo garantiza idempotencia de efectos Firestore incluidos en la misma transacción.
- No se deben ejecutar Mercado Pago, HTTP, correo u otros side effects externos dentro de `runEventIdempotently()`.
- El scheduler/worker futuro debe invocar este pipeline, no duplicar la lógica del consumer.
- Los eventos son un modelo de entrega al menos una vez; la idempotencia persistente por ID es necesaria para que los reintentos sean seguros. citeturn0search1turn0search2

## 9. Gates restantes

1. Diseñar autorización administrativa real para replay en runtime, no sólo en el helper.
2. Diseñar e implementar worker/scheduler productivo gestionado.
3. Conectar `CONEXA_SERVICE_CLOSED` a un consumidor real cuando exista un efecto de negocio definido.
4. Sólo después producir `CONEXA_SERVICE_CLOSED` desde `reviewService.ts` dentro de la transacción de cierre.

## 10. Resultado

**FASE 30.2 — PASS 5/5.**  
**FASE 30.3 — PASS 4/4.**  
**FASE 30.4 — PASS 6/6.**  
**FASE 30.5 — AUDITORÍA COMPLETADA; scheduler/worker pendiente.**  
**FASE 30.6 — PASS 3/3.**  
**FASE 30.7 — PASS 2/2.**  
**FASE 30.8 — PASS 2/2.**  
**FASE 30.9 — PASS 3/3.**  
**FASE 31.1 — PASS; inventario de infraestructura cerrado.**  
**Producción de `CONEXA_SERVICE_CLOSED`: BLOQUEADA hasta definir autorización real de replay y consumidor de negocio correspondiente.**