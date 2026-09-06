# FASE 31.3 — Worker programado mínimo

**Proyecto:** Conexa-RMX-DEV / Super App  
**Rama:** `integration/conexa-unified`  
**Fecha:** 2026-09-06  
**Estado:** **IMPLEMENTACIÓN COMPLETADA — VALIDACIÓN LOCAL PENDIENTE**

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

## Decisión de concurrencia

No se fuerza `maxInstances: 1`. Cloud Scheduler/Functions puede producir ejecuciones solapadas y el pipeline ya posee idempotencia durable por `DomainEvent.id`. Firebase advierte explícitamente que una nueva ejecución puede comenzar mientras otra sigue activa. citeturn0search0

La FASE 31.5 deberá demostrar este comportamiento mediante pruebas de doble ejecución/concurrencia.

## Despliegue

`firebase.json` declara:

- `functions.source = apps/event-worker`;
- predeploy: `pnpm --filter @super-app/event-worker build`.

El build usa esbuild para generar `lib/index.js`, empaquetando el código interno del consumer y dejando las dependencias externas como dependencias de runtime.

## Seguridad

No se reutiliza `INTERNAL_EVENT_SECRET`. La función programada es una entrada gestionada por Cloud Scheduler, y Firebase documenta que al desplegar una scheduled function se crea automáticamente el job de Scheduler y la función HTTP asociada. citeturn0search0

No se agregaron secretos nuevos en esta fase.

## Validación pendiente

El código fue registrado, pero todavía **no se declara PASS** hasta que el usuario ejecute localmente:

```text
pnpm install
pnpm --filter @super-app/event-worker lint
pnpm --filter @super-app/event-worker build
```

La prueba de concurrencia real queda para FASE 31.5.

## Resultado

**FASE 31.3 — IMPLEMENTACIÓN COMPLETADA; PASS BLOQUEADO HASTA VALIDACIÓN LOCAL.**
