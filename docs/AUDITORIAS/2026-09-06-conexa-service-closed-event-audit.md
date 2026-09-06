# FASE 30 — Auditoría de contrato `CONEXA_SERVICE_CLOSED`

**Proyecto:** Conexa-RMX-DEV / Super App  
**Rama:** `integration/conexa-unified`  
**Fecha:** 2026-09-06  
**Estado:** **FASE 30.1 PASS — CONTRATO CANÓNICO DEFINIDO; PRODUCCIÓN DEL EVENTO AÚN BLOQUEADA**

## 1. Objetivo

Auditar y cerrar el contrato transversal que permitirá que CONEXA publique `CONEXA_SERVICE_CLOSED` hacia el mecanismo de Outbox/Eventos sin conectar todavía el productor al cierre de servicio.

## 2. Hallazgos iniciales

### P1 — El evento estaba declarado pero no tenía payload canónico propio

`packages/shared-events/src/index.ts` declaraba `CONEXA_SERVICE_CLOSED` dentro de `DomainEventType`, pero no existía una interfaz específica para su payload ni una validación de runtime.

**Resuelto en FASE 30.1:** se añadió `ConexaServiceClosedEvent`, factory y validator.

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

**Pendiente:** dispatcher común por `DomainEventType` antes de agregar un segundo consumidor.

### P1 — Validación de runtime insuficiente

El consumer actual convierte `payload` mediante cast a `NexoraOrderCompletedEvent` y solamente valida manualmente campos mínimos.

**Parcialmente resuelto en FASE 30.1:** `CONEXA_SERVICE_CLOSED` ya tiene validator de payload. El envelope completo (`id/type/occurredAt/producer/payload`) todavía necesita validación común.

### P2 — Inconsistencia menor en `lastError`

El consumer escribe `lastError: null` al publicar correctamente.

**Resuelto en FASE 30.1:** `EventOutboxRecord.lastError` acepta explícitamente `string | null`.

### P1 — Riesgo de semántica de evento descartado

El consumer actual puede marcar `NEXORA_ORDER_COMPLETED` como `PUBLISHED` cuando el pedido no está `COMPLETED`, registrando `EVENT_STALE_ORDER_NOT_COMPLETED`.

**Pendiente:** definir clasificación de errores terminales versus reintentables para el dispatcher común.

## 3. Contrato canónico aprobado en FASE 30.1

Se incorporó en `packages/shared-events/src/index.ts`:

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

También se incorporaron:

- `isConexaServiceClosedEvent(value)` para validación de runtime.
- `createConexaServiceClosedEvent(input)` para construir el payload canónico.
- `EventOutboxRecord.lastError?: string | null` para normalizar la convención actual.

## 4. Pruebas agregadas

Se creó:

`tests/shared-events-contract.test.ts`

Con tres escenarios:

1. payload canónico válido;
2. identidad/reason inválidos rechazados;
3. fecha inválida rechazada.

Script agregado:

`pnpm test:shared-events-contract`

**Importante:** el código y los tests fueron registrados en GitHub, pero todavía no existe evidencia de ejecución local de estos tres tests en esta fase. La ejecución queda como gate obligatorio antes de continuar.

## 5. Aspectos positivos ya demostrados

- El Outbox se crea dentro de la misma transacción que produce `NEXORA_ORDER_COMPLETED`.
- El documento del Outbox tiene ID estable y estado explícito.
- El consumer vuelve a leer transaccionalmente el evento antes de mutarlo.
- La creación de `installationLeads/{orderId}` usa una clave natural que evita duplicación.
- La ruta interna exige secreto y comparación `timingSafeEqual`.
- La implementación de cierre de servicio de CONEXA ya fue validada con 5 escenarios concurrentes en Firestore Emulator.

## 6. Gates restantes de FASE 30.x

1. Ejecutar `test:shared-events-contract` localmente.
2. Definir validator del envelope completo.
3. Definir dispatcher por `DomainEventType`.
4. Definir idempotencia de productor y consumidor.
5. Definir política `PENDING → PUBLISHED` y `PENDING → FAILED`.
6. Definir replay de `FAILED` y límites de reintento.
7. Definir scheduler/worker de producción.
8. Definir comportamiento ante consumer caído, timeout, evento duplicado y payload inválido.
9. Probar integración Outbox → consumer en emulator.
10. Recién después modificar `reviewService.ts` para producir `CONEXA_SERVICE_CLOSED`.

## 7. Decisión de arquitectura

**FASE 30.1 PASS. No agregar todavía el productor `CONEXA_SERVICE_CLOSED`.**

El contrato del nuevo evento ya está cerrado a nivel de payload y la identidad no se duplica. Sin embargo, la entrega operacional, el dispatcher, el replay y la validación completa del envelope todavía no están cerrados.

Firestore soporta operaciones atómicas y reintenta transacciones cuando existe contención; además, las transacciones tienen aislamiento serializable. Esto respalda mantener el futuro write del Outbox dentro de la misma transacción que el cierre, pero no resuelve por sí solo scheduler, replay ni idempotencia del consumidor. citeturn0search0turn0search6

## 8. Resultado

**FASE 30.1 — PASS.**

**Producción de `CONEXA_SERVICE_CLOSED`: BLOQUEADA hasta completar los gates 30.2–30.5.**
