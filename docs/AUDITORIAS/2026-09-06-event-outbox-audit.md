# Fase 27 — Auditoría Event Outbox / Integración Nexora → Conexa

**Fecha:** 2026-09-06
**Rama auditada:** `integration/conexa-unified`
**Commit de referencia:** `499c2341`
**Estado:** auditoría, sin cambios funcionales aplicados

## Objetivo

Auditar los productores reales de `eventOutbox`, el contrato compartido de eventos, el consumer de Conexa y la estrategia actual de ejecución/reintentos antes de implementar un scheduler/worker productivo.

## Hallazgos

### 1. `NEXORA_ORDER_COMPLETED` tiene productor en el flujo principal de escrow — OK

`apps/api-nexora/src/escrowService.ts` crea `eventOutbox` dentro de la misma transacción Firestore que:

- cambia la orden a `COMPLETED`;
- cambia el pago a `SETTLED`;
- crea el evento cuando `requiresInstallation === true`.

Esto conserva atomicidad entre estado financiero y outbox.

**Clasificación:** P0/P1 positivo; no requiere corrección inmediata.

### 2. Existe segundo productor legítimo desde resolución favorable de chargeback — OK / requiere cobertura de tests

La resolución favorable de chargeback también puede producir `NEXORA_ORDER_COMPLETED`. Esto es correcto arquitectónicamente porque puede completar una orden desde otro camino de dominio.

**Riesgo residual:** ambos productores deben mantener el mismo contrato y la misma idempotencia.

### 3. Contrato `shared-events` y payload específico presentan duplicación de identificador — P1

`packages/shared-events` define `DomainEvent.id`, mientras `NexoraOrderCompletedEvent` usa `eventId` dentro del payload. Los productores actuales almacenan ambos (`eventOutbox.id` y `payload.eventId`) con el mismo valor.

No es una vulnerabilidad crítica, pero introduce dos representaciones del identificador del evento y riesgo de drift contractual.

**Recomendación:** definir un único identificador canónico de evento y evitar duplicarlo en el payload salvo que una frontera externa lo requiera.

### 4. `CONEXA_SERVICE_CLOSED` está definido como contrato pero no se demostró productor/consumer en las fuentes de aplicación inspeccionadas — P1 pendiente

El tipo existe en `shared-events`/`shared-types`, pero en `apps/api-conexa/src` solamente se observó el consumer de `NEXORA_ORDER_COMPLETED` y en `apps/api-nexora/src` no se observó un productor correspondiente.

Esto debe mantenerse como contrato futuro hasta identificar un flujo real de cierre de servicio que lo necesite. No implementar un productor artificial solamente para completar el catálogo.

### 5. Consumer de Conexa es transaccional e idempotente — OK

`apps/api-conexa/src/eventConsumer.ts`:

- selecciona únicamente eventos `PENDING` de tipo `NEXORA_ORDER_COMPLETED`;
- relee el documento dentro de una transacción;
- abandona si otro worker ya cambió el estado;
- verifica que la orden exista y esté `COMPLETED`;
- verifica coincidencia entre `buyerId` y `event.userId`;
- usa `orderId` como clave natural de `installationLeads`;
- evita duplicar el lead;
- marca el evento `PUBLISHED` dentro de la misma transacción.

La estrategia es adecuada para ejecuciones concurrentes.

### 6. `FAILED` no tiene recuperación automática demostrada — P1

El consumer aumenta `attempts` y marca `FAILED` al llegar a 5 intentos. Sin embargo, la consulta normal sólo selecciona `status == PENDING`, por lo que un evento `FAILED` no vuelve al flujo por sí solo.

**Recomendación:** implementar política explícita de retry/replay para `FAILED`, preferentemente con backoff y operación administrativa controlada.

### 7. Existe endpoint interno para disparar el consumer — OK, pero falta scheduler productivo

`POST /internal/events/process-nexora` está protegido mediante `INTERNAL_EVENT_SECRET` y comparación timing-safe.

No se encontró en la configuración auditada un worker/scheduler desplegable que invoque automáticamente este endpoint.

**Clasificación:** P1 — entrega de eventos incompleta en producción.

### 8. El auto-release de escrow usa `setInterval` dentro de la API Nexora — P1 arquitectura/runtime

`startEscrowAutoReleaseWorker()` ejecuta cada 15 minutos desde el proceso HTTP de Nexora.

Las transacciones Firestore protegen contra carreras de estado, pero el scheduler queda acoplado a la disponibilidad y cantidad de instancias del servidor.

**Recomendación:** migrar tareas programadas de producción a un scheduler gestionado (por ejemplo Cloud Scheduler + Cloud Functions) o a un worker dedicado.

### 9. El scheduler debe tolerar solapamientos — requisito de diseño

La documentación oficial de Firebase indica que una función programada puede ejecutarse de nuevo mientras una instancia anterior sigue activa. Por ello, el worker debe conservar idempotencia y transacciones como mecanismos primarios de seguridad.

## Arquitectura objetivo

```text
NEXORA
  │
  ├── order COMPLETED
  ├── payment SETTLED
  └── eventOutbox PENDING
             │
             ▼
      Managed Scheduler
             │
             ▼
        Event Worker
             │
             ▼
     Conexa Event Consumer
             │
             ▼
 installationLeads/{orderId}
```

## Acciones pendientes

1. Normalizar `id` vs `eventId`.
2. Auditar y tipar todos los productores `eventOutbox`.
3. Definir estrategia de retry/replay de `FAILED`.
4. Añadir pruebas de concurrencia, duplicación, errores y recuperación.
5. Diseñar worker/scheduler productivo sin acoplarlo al servidor HTTP.
6. Auditar cualquier futuro productor de `CONEXA_SERVICE_CLOSED` antes de implementarlo.
7. Mantener esta auditoría como registro antes de realizar cambios funcionales.

## Veredicto de fase

**NO CERRADA.** El patrón Outbox es correcto y el consumer tiene buenas garantías transaccionales, pero la entrega automática y recuperación de eventos todavía requieren hardening antes de producción.
