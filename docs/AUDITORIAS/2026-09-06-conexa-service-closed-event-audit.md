# FASE 30 — Auditoría de contrato `CONEXA_SERVICE_CLOSED`

**Proyecto:** Conexa-RMX-DEV / Super App  
**Rama:** `integration/conexa-unified`  
**Fecha:** 2026-09-06  
**Estado:** **FASE 30.3 IMPLEMENTADA — DISPATCHER COMÚN; PRODUCCIÓN DEL EVENTO AÚN BLOQUEADA**

## 1. Objetivo

Auditar y cerrar el contrato transversal que permitirá que CONEXA publique `CONEXA_SERVICE_CLOSED` hacia el mecanismo de Outbox/Eventos sin conectar todavía el productor al cierre de servicio.

## 2. Hallazgos iniciales

### P1 — El evento estaba declarado pero no tenía payload canónico propio

`packages/shared-events/src/index.ts` declaraba `CONEXA_SERVICE_CLOSED` dentro de `DomainEventType`, pero no existía una interfaz específica para su payload ni una validación de runtime.

**Resuelto:** se añadió `ConexaServiceClosedEvent`, factory y validator.

### P1 — Duplicación de identidad del evento

El contrato común tiene `DomainEvent.id`, mientras que `NexoraOrderCompletedEvent` también contiene `payload.eventId`.

**Decisión para el nuevo evento:** la identidad canónica será exclusivamente `DomainEvent.id`; `ConexaServiceClosedEvent` no contiene `eventId`.

El contrato legado de Nexora no se modificó todavía para evitar un cambio transversal innecesario antes de cerrar su compatibilidad.

### P1 — Outbox existe y tiene estados, pero la recuperación de `FAILED` no está cerrada

`EventOutboxRecord` contempla `PENDING | PUBLISHED | FAILED` y el consumidor de Nexora mueve el evento a `FAILED` después de cinco intentos. Sin embargo, el consumidor normal solamente consulta `status == PENDING`.

**Pendiente:** política explícita de replay/recovery con autorización, auditoría e idempotencia.

### P1 — No existe scheduler/worker demostrado para procesar automáticamente el Outbox

Existe `POST /internal/events/process-nexora`, protegido mediante `x-internal-event-secret`, pero el `package.json` auditado no contiene un worker/scheduler dedicado que invoque automáticamente este procesamiento.

**Pendiente:** cerrar mecanismo operacional de entrega automática.

### P1 — El consumer actual no es genérico

`apps/api-conexa/src/eventConsumer.ts` está especializado en `NEXORA_ORDER_COMPLETED`.

**FASE 30.3 implementada:** se añadió `apps/api-conexa/src/eventDispatcher.ts`, un dispatcher común que valida el envelope antes del routing y selecciona handlers mediante `DomainEventType`. No se conectó todavía al consumer productivo para evitar modificar el flujo Nexora antes de cerrar la política de retry/replay.

### P1 — Validación de runtime insuficiente

El consumer actual convierte `payload` mediante cast a `NexoraOrderCompletedEvent` y solamente valida manualmente campos mínimos.

**Resuelto para el nuevo contrato:** el contrato compartido valida el envelope completo para `CONEXA_SERVICE_CLOSED`: `id`, `type`, `occurredAt`, `producer` y `payload`. Además, exige `producer === 'CONEXA'` para este evento.

La migración del consumer legado Nexora a validación compartida queda pendiente para una fase específica de compatibilidad.

### P2 — Inconsistencia menor en `lastError`

El consumer escribe `lastError: null` al publicar correctamente.

**Resuelto:** `EventOutboxRecord.lastError` acepta explícitamente `string | null`.

### P1 — Riesgo de semántica de evento descartado

El consumer actual puede marcar `NEXORA_ORDER_COMPLETED` como `PUBLISHED` cuando el pedido no está `COMPLETED`, registrando `EVENT_STALE_ORDER_NOT_COMPLETED`.

**Pendiente:** definir clasificación de errores terminales versus reintentables para el dispatcher común.

## 3. Contrato canónico aprobado

Se mantiene en `packages/shared-events/src/index.ts`:

```ts
interface ConexaServiceClosedEvent {
  serviceRequestId: string;
  clientId: string;
  professionalId: string;
  closedAt: string;
  closeReason: 'REVIEW_COMPLETED';
}
```

El envelope conserva una única identidad de evento:

```ts
interface DomainEvent<TPayload> {
  id: string;
  type: DomainEventType;
  occurredAt: string;
  producer: 'CONEXA' | 'NEXORA';
  payload: TPayload;
}
```

Funciones disponibles:

- `isConexaServiceClosedEvent(value)` — valida payload.
- `createConexaServiceClosedEvent(input)` — construye payload canónico.
- `isDomainEvent(value)` — valida envelope y delega el payload según el tipo.
- `isConexaServiceClosedDomainEvent(value)` — valida específicamente `CONEXA_SERVICE_CLOSED` producido por CONEXA.
- `EventOutboxRecord.lastError?: string | null` — convención normalizada.

## 4. FASE 30.3 — Dispatcher común

Se añadió:

`apps/api-conexa/src/eventDispatcher.ts`

Responsabilidades actuales:

1. validar que la entrada sea un `DomainEvent` válido;
2. validar específicamente que `CONEXA_SERVICE_CLOSED` tenga productor `CONEXA` y payload válido;
3. enrutar por `DomainEventType` mediante un registry de handlers;
4. rechazar tipos sin handler con `UNSUPPORTED_DOMAIN_EVENT_TYPE`;
5. mantener `DomainEvent.id` como identidad/idempotency key canónica disponible para el consumidor.

**Decisión importante:** el dispatcher es deliberadamente stateless. No marca eventos como procesados ni escribe Firestore. La idempotencia durable debe quedar en el consumer/handler mediante una operación transaccional sobre el `eventOutbox` y/o una clave natural del efecto producido. Esto evita fingir que un dispatcher en memoria resuelve entrega at-least-once.

Tampoco se modificó `reviewService.ts` ni se comenzó todavía a producir `CONEXA_SERVICE_CLOSED`.

## 5. Pruebas agregadas para FASE 30.3

Se creó:

`tests/domain-event-dispatcher.test.ts`

Escenarios:

1. routing de `CONEXA_SERVICE_CLOSED` por `DomainEventType`;
2. rechazo del envelope inválido antes de invocar handler;
3. rechazo de tipo sin handler;
4. repetición del mismo evento conserva exactamente el mismo `DomainEvent.id`, dejando explícito que la deduplicación durable pertenece al consumer.

Script:

`pnpm test:event-dispatcher`

**Ejecución local:** pendiente de confirmación por el entorno de desarrollo después de este commit.

## 6. Evidencia local confirmada de FASE 30.2

El usuario ejecutó en la rama `integration/conexa-unified`:

```text
pnpm test:shared-events-contract

✔ CONEXA_SERVICE_CLOSED contract accepts the canonical payload
✔ CONEXA_SERVICE_CLOSED validator rejects missing identity and invalid close reason
✔ CONEXA_SERVICE_CLOSED validator rejects malformed dates
✔ CONEXA_SERVICE_CLOSED envelope requires canonical identity and producer
✔ CONEXA_SERVICE_CLOSED envelope rejects invalid occurredAt and payload
ℹ tests 5
ℹ pass 5
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
```

Resultado: **FASE 30.2 PASS — 5/5**.

## 7. Aspectos positivos ya demostrados

- El Outbox se crea dentro de la misma transacción que produce `NEXORA_ORDER_COMPLETED`.
- El documento del Outbox tiene ID estable y estado explícito.
- El consumer vuelve a leer transaccionalmente el evento antes de mutarlo.
- La creación de `installationLeads/{orderId}` usa una clave natural que evita duplicación.
- La ruta interna exige secreto y comparación `timingSafeEqual`.
- La implementación de cierre de servicio de CONEXA ya fue validada con 5 escenarios concurrentes en Firestore Emulator.
- El contrato compartido de `CONEXA_SERVICE_CLOSED` tiene validación de payload y envelope.
- El dispatcher común no ejecuta efectos laterales fuera del handler, manteniendo la frontera entre routing y entrega durable.

## 8. Gates restantes de FASE 30.x

1. **Ejecutar `test:event-dispatcher` localmente.**
2. Definir política `PENDING → PUBLISHED` y `PENDING → FAILED` con clasificación terminal/reintentable.
3. Definir replay de `FAILED`, límites y autorización.
4. Definir scheduler/worker de producción.
5. Integrar el dispatcher con el consumer sin romper el flujo Nexora existente.
6. Diseñar/validar idempotencia durable por `DomainEvent.id` y clave natural del efecto.
7. Probar integración Outbox → dispatcher → consumer en emulator.
8. Recién después modificar `reviewService.ts` para producir `CONEXA_SERVICE_CLOSED` dentro de la misma transacción del cierre.

## 9. Decisión de arquitectura

**FASE 30.3 implementada a nivel de routing, pero no habilitada en producción.**

No se agrega todavía el productor `CONEXA_SERVICE_CLOSED`, no se añade scheduler y no se habilita replay hasta cerrar los estados y la política de retry.

Firestore puede reejecutar una función de transacción cuando existe contención; por eso el código dentro de una transacción debe tolerar múltiples ejecuciones y no depender de efectos laterales externos. La documentación oficial también recomienda idempotencia para flujos con reintentos y entrega at-least-once. citeturn0search0turn0search1

## 10. Resultado

**FASE 30.2 — PASS confirmado localmente (5/5).**  
**FASE 30.3 — IMPLEMENTADA; ejecución local pendiente.**  
**Producción de `CONEXA_SERVICE_CLOSED`: BLOQUEADA hasta completar retry/replay, worker e integración.**
