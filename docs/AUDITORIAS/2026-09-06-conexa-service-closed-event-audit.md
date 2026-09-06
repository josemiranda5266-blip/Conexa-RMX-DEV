# FASE 30 — Auditoría de contrato `CONEXA_SERVICE_CLOSED`

**Proyecto:** Conexa-RMX-DEV / Super App  
**Rama:** `integration/conexa-unified`  
**Fecha:** 2026-09-06  
**Estado:** **AUDITORÍA COMPLETADA — NO PRODUCIR EVENTO TODAVÍA**

## 1. Objetivo

Auditar el contrato transversal que debe permitir que CONEXA publique `CONEXA_SERVICE_CLOSED` hacia el mecanismo de Outbox/Eventos sin crear todavía el productor. El objetivo es cerrar primero el contrato, la idempotencia, el consumo, los reintentos y la recuperación.

## 2. Hallazgos

### P1 — El evento está declarado pero no tiene payload canónico propio

`packages/shared-events/src/index.ts` declara `CONEXA_SERVICE_CLOSED` dentro de `DomainEventType`, pero no existe una interfaz específica para su payload ni una factory/validator de runtime.

Esto deja el payload como `unknown` a nivel compartido y obliga a consumidores a hacer casts. Para un evento transversal, el contrato debe ser explícito y validable en runtime.

### P1 — Duplicación de identidad del evento

El contrato común tiene `DomainEvent.id`, mientras que `NexoraOrderCompletedEvent` también contiene `payload.eventId`. El productor actual de `NEXORA_ORDER_COMPLETED` escribe ambos valores con el mismo ID.

Para `CONEXA_SERVICE_CLOSED` no debe repetirse este patrón sin una decisión explícita. La identidad canónica debe ser `DomainEvent.id`; el payload no debería duplicarla salvo una razón de compatibilidad documentada.

### P1 — Outbox existe y tiene estados, pero la recuperación de `FAILED` no está cerrada

`EventOutboxRecord` contempla `PENDING | PUBLISHED | FAILED` y el consumidor de Nexora mueve el evento a `FAILED` después de cinco intentos. Sin embargo, el consumidor normal solamente consulta `status == PENDING`.

No se encontró en la superficie auditada un mecanismo de replay/recovery que permita reactivar de forma segura eventos `FAILED`. Antes de declarar producción del nuevo evento, debe existir una política explícita de replay, con autorización, auditoría e idempotencia.

### P1 — No existe scheduler/worker demostrado para procesar automáticamente el Outbox

Existe `POST /internal/events/process-nexora`, protegido mediante `x-internal-event-secret`, pero el `package.json` auditado no contiene un worker/scheduler dedicado que invoque automáticamente este procesamiento.

Por lo tanto, el patrón Outbox está implementado parcialmente: la persistencia existe y el consumer existe, pero la entrega automática no está cerrada operacionalmente.

### P1 — El consumer actual no es un consumer genérico de eventos

`apps/api-conexa/src/eventConsumer.ts` está especializado en `NEXORA_ORDER_COMPLETED`. No existe todavía una interfaz común para enrutar `DomainEventType` a consumidores independientes.

Antes de agregar `CONEXA_SERVICE_CLOSED`, conviene definir el contrato de dispatch para evitar que cada nuevo evento cree un segundo mecanismo paralelo.

### P1 — Validación de runtime insuficiente

El consumer actual convierte `payload` mediante cast a `NexoraOrderCompletedEvent` y solamente valida manualmente `orderId` y `userId`. El contrato compartido no incorpora un schema runtime.

Para `CONEXA_SERVICE_CLOSED` debe existir validación runtime de:
- `id` del evento
- `type`
- `occurredAt`
- `producer`
- `serviceRequestId`
- `clientId`
- `professionalId`
- estado terminal esperado
- cualquier dato mínimo requerido por el consumidor

### P2 — Inconsistencia menor en `lastError`

El tipo compartido declara `lastError?: string`, mientras que el consumer escribe `lastError: null` al publicar correctamente. Debe normalizarse el contrato: ausencia del campo o `string | null`, pero no ambas convenciones.

### P1 — Riesgo de semántica de evento descartado

El consumer actual puede marcar `NEXORA_ORDER_COMPLETED` como `PUBLISHED` cuando el pedido no está `COMPLETED`, registrando `EVENT_STALE_ORDER_NOT_COMPLETED`.

Esto puede ser correcto si el evento es considerado definitivamente inválido, pero es peligroso si representa una inconsistencia transitoria. El nuevo evento debe definir claramente qué errores son terminales y cuáles deben reintentarse.

## 3. Aspectos positivos ya demostrados

- El Outbox se crea dentro de la misma transacción que produce `NEXORA_ORDER_COMPLETED`.
- El documento del Outbox tiene ID estable y estado explícito.
- El consumer vuelve a leer transaccionalmente el evento antes de mutarlo.
- La creación de `installationLeads/{orderId}` usa una clave natural que evita duplicación.
- La ruta interna exige secreto y comparación `timingSafeEqual`.
- La implementación de cierre de servicio de CONEXA ya fue validada con 5 escenarios concurrentes en Firestore Emulator antes de llegar a este contrato.

## 4. Contrato objetivo antes de implementar el productor

Se recomienda que el contrato canónico sea conceptualmente:

```ts
interface ConexaServiceClosedEvent {
  type: 'CONEXA_SERVICE_CLOSED';
  serviceRequestId: string;
  clientId: string;
  professionalId: string;
  closedAt: string;
  closeReason: 'REVIEW_COMPLETED';
}
```

El envelope debe conservar una única identidad de evento:

```ts
interface DomainEvent<TPayload> {
  id: string;
  type: DomainEventType;
  occurredAt: string;
  producer: 'CONEXA' | 'NEXORA';
  payload: TPayload;
}
```

La propuesta anterior es de diseño; **no constituye todavía código aprobado para producción**.

## 5. Orden obligatorio de la FASE 30.x

1. Definir payload canónico de `CONEXA_SERVICE_CLOSED`.
2. Eliminar la ambigüedad `DomainEvent.id` vs `payload.eventId`.
3. Definir schema de runtime y factory segura.
4. Definir dispatcher por `DomainEventType`.
5. Definir idempotencia de productor y consumidor.
6. Definir política `PENDING → PUBLISHED` y `PENDING → FAILED`.
7. Definir replay de `FAILED` y límites de reintento.
8. Definir scheduler/worker de producción.
9. Definir comportamiento ante consumer caído, timeout, evento duplicado y payload inválido.
10. Probar integración Outbox → consumer en emulator.
11. Recién después modificar `reviewService.ts` para producir `CONEXA_SERVICE_CLOSED`.

## 6. Decisión de arquitectura

**NO agregar todavía el productor `CONEXA_SERVICE_CLOSED`.**

La transacción de cierre de servicio está correcta y ya tiene evidencia de concurrencia. El siguiente cambio debe cerrar primero el contrato transversal para evitar introducir deuda estructural o un segundo sistema de eventos.

Firestore soporta transacciones atómicas y reintenta transacciones cuando existe contención; además, las transacciones tienen aislamiento serializable. Esto respalda la estrategia de hacer el cierre y la escritura del Outbox dentro de una misma transacción, pero no resuelve por sí solo el problema operativo de scheduler, replay e idempotencia del consumidor.

## 7. Resultado

**FASE 30 — AUDITORÍA DE CONTRATO: P1 / BLOQUEADA PARA PRODUCCIÓN DEL EVENTO.**

El cierre de servicio no debe publicar todavía `CONEXA_SERVICE_CLOSED`. Primero debe cerrarse el contrato Shared Events + runtime validation + Outbox + dispatcher + replay + worker + pruebas de integración.
