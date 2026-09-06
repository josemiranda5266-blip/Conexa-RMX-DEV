# FASE 30 — Auditoría de contrato `CONEXA_SERVICE_CLOSED`

**Proyecto:** Conexa-RMX-DEV / Super App  
**Rama:** `integration/conexa-unified`  
**Fecha:** 2026-09-06  
**Estado:** **FASE 30.6 IMPLEMENTADA — IDEMPOTENCIA DURABLE; EJECUCIÓN LOCAL PENDIENTE**

## 1. Objetivo

Auditar y cerrar el contrato transversal que permitirá que CONEXA publique `CONEXA_SERVICE_CLOSED` hacia el mecanismo de Outbox/Eventos sin conectar todavía el productor al cierre de servicio.

## 2. Hallazgos y estado

### P1 — El evento estaba declarado pero no tenía payload canónico propio

**Resuelto:** `ConexaServiceClosedEvent`, factory y validator compartidos.

### P1 — Duplicación de identidad del evento

**Resuelto para el nuevo evento:** la identidad canónica es exclusivamente `DomainEvent.id`; el payload de `CONEXA_SERVICE_CLOSED` no contiene `eventId`.

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

Se eligió **fail-closed** para códigos desconocidos: un error no clasificado no entra en un bucle automático. Firebase recomienda que los retries se utilicen para fallos transitorios, que exista una condición de terminación y que el procesamiento sea idempotente. citeturn0search4

### P1 — No existe todavía scheduler/worker productivo demostrado

**Pendiente.** La auditoría 30.5 confirmó que no existe un worker/scheduler gestionado en esta rama y no se agregó `setInterval`, cron en proceso ni scheduler durante esta fase.

Existe un endpoint interno para el consumer legado `NEXORA_ORDER_COMPLETED`, protegido por `INTERNAL_EVENT_SECRET`, pero no existe un mecanismo automático demostrado que lo invoque. El endpoint seguirá aislado hasta completar la migración del dispatcher y la estrategia operacional.

### P1 — Consumer actual especializado

**Parcialmente resuelto:** FASE 30.3 añadió dispatcher común. El consumer Nexora legado sigue especializado y todavía no se migra para evitar un cambio transversal antes de validar compatibilidad.

### P1 — Validación de runtime insuficiente

**Resuelto para `CONEXA_SERVICE_CLOSED`:** envelope y payload tienen validación compartida antes del routing.

### P1 — Idempotencia durable

**FASE 30.6 implementada:** se añadió `apps/api-conexa/src/eventIdempotency.ts`.

La política es:

1. utilizar `DomainEvent.id` como clave canónica;
2. leer `processedEvents/{eventId}` dentro de una transacción;
3. si existe, devolver `ALREADY_PROCESSED` sin repetir el efecto;
4. si no existe, ejecutar el efecto Firestore dentro de la misma transacción;
5. crear `processedEvents/{eventId}` antes de finalizar la transacción;
6. si el efecto falla, la transacción completa se aborta y no queda un falso positivo en el ledger.

El helper se limita deliberadamente a **efectos Firestore transaccionales**. No debe envolver llamadas HTTP, Mercado Pago, correo, APIs externas u otros side effects no transaccionales. Para esos efectos se requiere una clave idempotente propia o un mecanismo de Outbox/Task Queue adicional.

Esta decisión es coherente con la semántica de Firestore: las funciones de transacción pueden ejecutarse más de una vez por contención y las escrituras se aplican atómicamente sólo cuando la transacción finalmente confirma. citeturn0search0turn0search1 Firebase además recomienda persistir el estado asociado al ID del evento para protegerse de entregas duplicadas. citeturn0search4

### P1 — Identidad determinista del productor

**Pendiente de integración.** `reviewService.ts` todavía no produce `CONEXA_SERVICE_CLOSED`. Cuando se conecte, el `DomainEvent.id` deberá derivarse de una identidad estable del cierre, no generarse aleatoriamente dentro de la callback de `runTransaction`, porque Firestore puede volver a ejecutar esa callback ante contención. citeturn0search0

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

Los errores desconocidos son terminales por defecto. La clasificación puede recibir además un error con `retryable: true|false`, permitiendo que una capa superior determine explícitamente la semántica sin depender del texto del mensaje.

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

No se implementó todavía un endpoint para ejecutar este replay. Eso se hará cuando exista una política de autorización administrativa y un mecanismo operacional auditado.

## 4. FASE 30.6 — Idempotencia durable

Se creó:

`apps/api-conexa/src/eventIdempotency.ts`

y:

`tests/event-idempotency.emulator.test.ts`

El script es:

```text
pnpm test:event-idempotency-emulator
```

Escenarios cubiertos:

1. dos entregas concurrentes del mismo `DomainEvent.id` ejecutan el efecto Firestore una sola vez;
2. una segunda entrega posterior devuelve `ALREADY_PROCESSED` y no modifica el efecto;
3. si el efecto falla, no queda `processedEvents/{eventId}` persistido.

La prueba utiliza exclusivamente `demo-*` + `FIRESTORE_EMULATOR_HOST` y se niega a ejecutarse contra Firestore real.

**Ejecución local:** pendiente de confirmación por el entorno de desarrollo.

## 5. Decisiones de seguridad y arquitectura

- No se habilita replay automático de `FAILED`.
- No se agrega scheduler todavía.
- No se modifica `reviewService.ts` todavía.
- No se produce todavía `CONEXA_SERVICE_CLOSED`.
- No se cambia el contrato legado de `NEXORA_ORDER_COMPLETED`.
- No se permite que el replay cambie el `DomainEvent.id`; ese ID es la identidad estable del evento y debe seguir siendo la misma durante todas las entregas.
- `replayCount` separa el historial de recuperación del contador de intentos de una entrega concreta.
- El ledger `processedEvents` sólo protege efectos que participan en la misma transacción Firestore. No se considera una garantía de exactly-once para sistemas externos.

Firestore garantiza atomicidad y aislamiento serializable de las transacciones; aun así, las transacciones pueden reintentarse ante contención, por lo que el código debe ser seguro frente a múltiples ejecuciones. citeturn0search0turn0search1

## 6. Gates restantes de FASE 30.x

1. **Ejecutar `pnpm test:event-idempotency-emulator`.**
2. Diseñar autorización administrativa real para replay.
3. Diseñar worker/scheduler productivo, preferentemente gestionado y no dependiente de un proceso web único.
4. Integrar dispatcher + outbox + consumer sin romper Nexora.
5. Conectar el ledger durable al handler real de `CONEXA_SERVICE_CLOSED`.
6. Probar integración Outbox → dispatcher → consumer en Firestore Emulator.
7. Recién después modificar `reviewService.ts` para producir `CONEXA_SERVICE_CLOSED` dentro de la misma transacción del cierre.

## 7. Resultado

**FASE 30.2 — PASS confirmado localmente (5/5).**  
**FASE 30.3 — PASS confirmado localmente (4/4).**  
**FASE 30.4 — PASS confirmado localmente (6/6).**  
**FASE 30.5 — AUDITORÍA COMPLETADA; scheduler/worker productivo pendiente.**  
**FASE 30.6 — IMPLEMENTADA; ejecución local pendiente.**  
**Producción de `CONEXA_SERVICE_CLOSED`: BLOQUEADA hasta validar el ledger en emulator, integrar el consumer y cerrar el diseño del worker.**
