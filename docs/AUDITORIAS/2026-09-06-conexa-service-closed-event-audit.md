# FASE 30 — Auditoría de contrato `CONEXA_SERVICE_CLOSED`

**Proyecto:** Conexa-RMX-DEV / Super App  
**Rama:** `integration/conexa-unified`  
**Fecha:** 2026-09-06  
**Estado:** **FASE 30.7 IMPLEMENTADA — CONSUMER DURABLE; EJECUCIÓN LOCAL PENDIENTE**

## 1. Objetivo

Auditar y cerrar el contrato transversal que permitirá que CONEXA publique `CONEXA_SERVICE_CLOSED` hacia el mecanismo de Outbox/Eventos sin conectar todavía el productor al cierre de servicio.

## 2. Hallazgos y estado

### P1 — El evento estaba declarado pero no tenía payload canónico propio

**Resuelto:** `ConexaServiceClosedEvent`, factory y validator compartidos.

### P1 — Duplicación de identidad del evento

**Resuelto para el nuevo evento:** la identidad canónica es exclusivamente `DomainEvent.id`; el payload de `CONEXA_SERVICE_CLOSED` no contiene `eventId`.

**Pendiente en legado Nexora:** `NEXORA_ORDER_COMPLETED` todavía conserva `payload.eventId` por compatibilidad. No se modifica en esta fase; la identidad transversal canónica del envelope sigue siendo `eventOutbox.id`/`DomainEvent.id`.

### P1 — Outbox tenía `FAILED` pero no recuperación formal

**FASE 30.4 implementada:** se añadió `apps/api-conexa/src/outboxRecovery.ts` con:

- clasificación explícita `RETRYABLE | PERMANENT`;
- límite común de cinco intentos;
- transición determinista de error;
- `FAILED` como estado terminal para errores permanentes o agotamiento del límite;
- replay manual únicamente desde `FAILED` y con autorización explícita;
- replay conserva el `DomainEvent.id` y reinicia solamente el presupuesto de intentos de esa entrega;
- `replayCount` permite conservar trazabilidad de cuántos replays manuales tuvo el evento;
- `lastError` se limpia al reencolar;
- el replay no se habilita todavía desde HTTP ni desde un scheduler.

Firebase recomienda que los retries se utilicen para fallos transitorios, que exista una condición de terminación y que el procesamiento sea idempotente. citeturn0search4

### P1 — No existe todavía scheduler/worker productivo demostrado

**Pendiente.** La auditoría 30.5 confirmó que no existe un worker/scheduler gestionado en esta rama y no se agregó `setInterval`, cron en proceso ni scheduler durante esta fase.

Existe un endpoint interno para el consumer legado `NEXORA_ORDER_COMPLETED`, protegido por `INTERNAL_EVENT_SECRET`, pero no existe un mecanismo automático demostrado que lo invoque. El endpoint seguirá aislado hasta completar la migración del dispatcher y la estrategia operacional.

### P1 — Consumer actual especializado

**FASE 30.7 parcialmente resuelta:** el consumer Nexora fue adaptado para usar `processedEvents/{DomainEvent.id}` como ledger durable. La creación de `installationLeads`, el cambio del Outbox a `PUBLISHED` y el ledger se realizan dentro de la misma transacción de Firestore.

Esto elimina la ventana en la que un worker podría crear el efecto y fallar antes de registrar la entrega. La transacción también permite que dos workers concurrentes converjan en un único efecto. Firestore puede reejecutar la callback ante contención, por lo que el código mantiene todos los efectos dentro de la transacción. citeturn0search0turn0search1

La migración todavía no convierte el consumer en un handler genérico del dispatcher; eso queda para 30.8.

### P1 — Validación de runtime insuficiente

**Resuelto para `CONEXA_SERVICE_CLOSED`:** envelope y payload tienen validación compartida antes del routing.

**30.7:** el consumer legado ahora valida mínimamente el envelope Nexora antes de procesarlo (`id`, `type`, `occurredAt`, `producer`, `payload`). La validación completa del contrato legado queda fuera de esta fase.

### P1 — Idempotencia durable

**FASE 30.6 implementada y validada localmente: 3/3 PASS.**

La política es:

1. utilizar `DomainEvent.id` como clave canónica;
2. leer `processedEvents/{eventId}` dentro de una transacción;
3. si existe, devolver `ALREADY_PROCESSED` sin repetir el efecto;
4. si no existe, ejecutar el efecto Firestore dentro de la misma transacción;
5. crear `processedEvents/{eventId}` antes de finalizar la transacción;
6. si el efecto falla, la transacción completa se aborta y no queda un falso positivo en el ledger.

El helper se limita deliberadamente a **efectos Firestore transaccionales**. No debe envolver llamadas HTTP, Mercado Pago, correo, APIs externas u otros side effects no transaccionales. Para esos efectos se requiere una clave idempotente propia o un mecanismo de Outbox/Task Queue adicional. Firebase recomienda precisamente persistir el estado asociado al ID del evento para protegerse de entregas duplicadas. citeturn0search4

## 3. FASE 30.4 — Política de Retry/Replay

Se añadió:

`apps/api-conexa/src/outboxRecovery.ts`

### Clasificación

Códigos considerados transitorios:

- `ABORTED`
- `DEADLINE_EXCEEDED`
- `RESOURCE_EXHAUSTED`
- `UNAVAILABLE`

Códigos conocidos como terminales incluyen permisos, autenticación, argumentos inválidos, precondiciones, recurso inexistente y errores de contrato/evento.

Los errores desconocidos son terminales por defecto.

### Límite

`OUTBOX_MAX_ATTEMPTS = 5`.

Para un error reintentable:

```text
attempts < 5  → PENDING
attempts >= 5 → FAILED
```

Para un error permanente:

```text
cualquier intento → FAILED
```

### Replay manual

El replay exige:

1. autorización explícita;
2. estado actual `FAILED`;
3. nuevo presupuesto de entrega (`attempts = 0`);
4. `lastError = null`;
5. incremento de `replayCount`;
6. conservación absoluta del `DomainEvent.id`;
7. registro opcional de actor y motivo.

No se implementó todavía un endpoint para ejecutar este replay.

## 4. FASE 30.6 — Idempotencia durable

Se creó:

`apps/api-conexa/src/eventIdempotency.ts`

`tests/event-idempotency.emulator.test.ts`

Script:

```text
pnpm test:event-idempotency-emulator
```

**Resultado local confirmado por el entorno de desarrollo:**

```text
✔ concurrent deliveries execute the Firestore effect once
✔ repeated delivery becomes a durable no-op
✔ failed effect does not leave a false processed ledger
ℹ tests 3
ℹ pass 3
ℹ fail 0
+ Script exited successfully (code 0)
```

El `MetadataLookupWarning` mostrado por Node no afectó la ejecución: el proceso terminó con código 0 y los tres escenarios pasaron.

## 5. FASE 30.7 — Integración del consumer con idempotencia durable

Se modificó:

`apps/api-conexa/src/eventConsumer.ts`

Cambios principales:

1. el consumer obtiene Firestore mediante el inicializador seguro `getAdminDb()`, compatible con el emulator `demo-*`;
2. valida el envelope mínimo de `NEXORA_ORDER_COMPLETED`;
3. usa `DomainEvent.id` como identidad de entrega;
4. delega el efecto a `runEventIdempotently()`;
5. crea `installationLeads/{orderId}` dentro de la misma transacción;
6. marca `eventOutbox/{eventId}` como `PUBLISHED` dentro de esa misma transacción;
7. crea `processedEvents/{eventId}` dentro de la misma transacción;
8. dos workers concurrentes no pueden duplicar el efecto Firestore;
9. se mantiene la protección contra escrituras stale en el camino de error;
10. no se introducen llamadas externas dentro de la transacción.

**Importante:** la implementación mantiene una única transacción de Firestore para ledger + efecto + estado `PUBLISHED`. No se utiliza una transacción anidada.

Se agregó:

`tests/nexora-event-consumer.emulator.test.ts`

con dos escenarios:

- dos workers concurrentes → una instalación + un ledger + un `PUBLISHED`;
- segunda entrega → no-op durable.

Script:

```text
pnpm test:nexora-event-consumer-emulator
```

**Ejecución local:** pendiente de confirmación por el entorno de desarrollo.

## 6. Decisiones de seguridad y arquitectura

- No se habilita replay automático de `FAILED`.
- No se agrega scheduler todavía.
- No se modifica `reviewService.ts` todavía.
- No se produce todavía `CONEXA_SERVICE_CLOSED`.
- No se cambia todavía el contrato de payload legado de `NEXORA_ORDER_COMPLETED`.
- No se permite que el replay cambie el `DomainEvent.id`.
- `replayCount` separa el historial de recuperación del contador de intentos de una entrega concreta.
- El ledger `processedEvents` sólo protege efectos que participan en la misma transacción Firestore. No se considera una garantía de exactly-once para sistemas externos.

Firestore garantiza atomicidad y aislamiento serializable de las transacciones; aun así, las transacciones pueden reintentarse ante contención, por lo que el código debe ser seguro frente a múltiples ejecuciones. citeturn0search0turn0search1

## 7. Gates restantes de FASE 30.x

1. **FASE 30.7:** ejecutar `pnpm test:nexora-event-consumer-emulator`.
2. Revisar el resultado de 30.7 y corregir cualquier incompatibilidad real.
3. Integrar dispatcher + outbox + consumer sin romper Nexora.
4. Conectar el ledger durable al handler real de `CONEXA_SERVICE_CLOSED`.
5. Diseñar autorización administrativa real para replay.
6. Probar integración Outbox → dispatcher → consumer en Firestore Emulator.
7. Diseñar worker/scheduler productivo gestionado.
8. Recién después modificar `reviewService.ts` para producir `CONEXA_SERVICE_CLOSED` dentro de la misma transacción del cierre.

## 8. Resultado

**FASE 30.2 — PASS confirmado localmente (5/5).**  
**FASE 30.3 — PASS confirmado localmente (4/4).**  
**FASE 30.4 — PASS confirmado localmente (6/6).**  
**FASE 30.5 — AUDITORÍA COMPLETADA; scheduler/worker productivo pendiente.**  
**FASE 30.6 — PASS confirmado localmente (3/3).**  
**FASE 30.7 — IMPLEMENTADA; ejecución local pendiente.**  
**Producción de `CONEXA_SERVICE_CLOSED`: BLOQUEADA hasta validar 30.7, integrar dispatcher/consumer y cerrar el diseño operacional del worker.**
