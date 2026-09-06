# FASE 31.3 — Worker programado mínimo

**Proyecto:** Conexa-RMX-DEV / Super App  
**Rama:** `integration/conexa-unified`  
**Fecha:** 2026-09-06  
**Estado:** **PASS — VALIDACIÓN LOCAL, EMULADA Y REGRESIÓN COMPLETA COMPLETADAS**

## Objetivo

Crear el primer worker gestionado sin introducir un proceso residente dentro de Express ni duplicar la lógica del consumer.

## Implementación

Se agregó `apps/event-worker` como paquete aislado del workspace.

### Entrada programada

`apps/event-worker/src/index.ts` exporta `processNexoraOutbox` mediante `firebase-functions/v2/scheduler` y `onSchedule`.

Configuración inicial:

- frecuencia: `every 5 minutes`;
- región: `us-central1`;
- timeout: 120 segundos;
- memoria: 256 MiB;
- lote máximo: 20 eventos por ejecución.

El worker llama directamente a `processNexoraOrderCompleted(20)` del consumer existente. No replica la consulta del outbox, dispatcher, recovery ni ledger.

El wrapper entregado a `onSchedule` retorna `Promise<void>`; la función de ejecución `runNexoraOutboxWorker()` conserva el retorno numérico para facilitar las pruebas.

## Decisión de concurrencia

No se fuerza `maxInstances: 1`. Cloud Scheduler/Functions puede producir ejecuciones solapadas y el pipeline ya posee idempotencia durable por `DomainEvent.id`. Firebase advierte explícitamente que una nueva ejecución puede comenzar mientras otra sigue activa. citeturn0search0

La prueba emulada ejecutó dos workers concurrentemente sobre el mismo evento. En la validación actual, una ejecución reportó `processed=1` y la otra `processed=0`, mientras el resultado durable fue único: un solo lead de instalación, un solo ledger de idempotencia y el outbox quedó `PUBLISHED` con `attempts=1`.

El contrato importante del worker es la idempotencia de los efectos persistentes. El contador `processed` es local a cada ejecución y no debe interpretarse como contador global de entregas concurrentes.

## Despliegue

`firebase.json` declara:

- `functions.source = apps/event-worker`;
- predeploy: `pnpm --filter @super-app/event-worker build`.

El build usa esbuild para generar `lib/index.js`, empaquetando el código interno del consumer y dejando las dependencias externas como dependencias de runtime.

## Seguridad

No se reutiliza `INTERNAL_EVENT_SECRET`. La función programada es una entrada gestionada por Cloud Scheduler, y Firebase documenta que al desplegar una scheduled function se crea automáticamente el job de Scheduler y la función HTTP asociada. citeturn0search0

No se agregaron secretos nuevos en esta fase.

## Validación ejecutada por el usuario

### Lint

```text
pnpm --filter @super-app/event-worker lint

> @super-app/event-worker@1.0.0 lint
> tsc --noEmit

PASS — 0 errores
```

### Build

```text
pnpm --filter @super-app/event-worker build

lib\\index.js  9.8kb
Done in 90ms

PASS
```

### Consumer Nexora / integración emulada

Comando:

```text
pnpm test:nexora-event-consumer-emulator
```

Resultado real:

```text
✔ Nexora consumer: concurrent workers create one lead and publish once
✔ Nexora consumer: repeated delivery is a durable no-op
ℹ tests 2
ℹ suites 0
ℹ pass 2
ℹ fail 0
```

### Emulator / integración del worker

Comando:

```text
pnpm test:event-worker-emulator
```

Resultado real:

```text
✔ event worker: scheduled pipeline publishes one event and creates one installation lead
✔ event worker: concurrent executions remain idempotent
✔ event worker: empty execution is successful and processes zero events
ℹ tests 3
ℹ suites 0
ℹ pass 3
ℹ fail 0
```

Se utilizó el Firestore Emulator con el proyecto `demo-conexa-unified`.

También apareció un `MetadataLookupWarning` durante las ejecuciones locales, pero no provocó fallo: las pruebas terminaron correctamente con código 0.

## Regresión completa de la cadena de eventos

La regresión solicitada se ejecutó completa, en este orden:

1. `pnpm test:event-idempotency-emulator` — **3/3 PASS**;
2. `pnpm test:nexora-event-consumer-emulator` — **2/2 PASS**;
3. `pnpm test:event-dispatcher-emulator` — **2/2 PASS**;
4. `pnpm test:outbox-recovery-emulator` — **3/3 PASS**;
5. `pnpm test:outbox-recovery` — **6/6 PASS**;
6. `pnpm test:event-worker-emulator` — **3/3 PASS**.

**Total de esta regresión: 19/19 pruebas PASS, 0 FAIL.**

Los casos validados cubren concurrencia, idempotencia durable, delivery repetido, dispatcher E2E, recuperación de outbox, replay autorizado, rechazo de replay no autorizado, preservación de identidad del evento y ejecución vacía del worker.

El `MetadataLookupWarning` volvió a aparecer durante los tests que levantan el emulator, pero no alteró los resultados ni el código de salida.

## Resultado

**FASE 31.3 — PASS DEFINITIVO.**

La implementación mínima del worker programado está compilando y funcionando contra Firestore Emulator, incluyendo ejecución vacía, integración con el consumer, concurrencia/idempotencia y regresión completa de la cadena de eventos.

La evidencia disponible permite avanzar a **FASE 31.4 — readiness de despliegue**, pero esta fase todavía no implica desplegar automáticamente.

## Próximo paso

FASE 31.4 debe limitarse a una revisión de readiness: configuración de proyecto, APIs requeridas, billing/plan, permisos del runtime, variables de entorno, configuración de región/timeout/memoria, estrategia de observabilidad y procedimiento de rollback. El despliegue real debe quedar fuera hasta que sea solicitado explícitamente.
