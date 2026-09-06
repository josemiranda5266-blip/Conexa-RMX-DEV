# FASE 31.2 — Diseño de scheduler/worker gestionado

**Proyecto:** Conexa-RMX-DEV / Super App  
**Rama:** `integration/conexa-unified`  
**Fecha:** 2026-09-06  
**Estado:** **FASE 31.2 PASS — DISEÑO CERRADO; IMPLEMENTACIÓN PENDIENTE**

## 1. Objetivo

Definir una arquitectura productiva para ejecutar periódicamente el pipeline existente de `eventOutbox` sin introducir un proceso residente dentro de Express y sin duplicar la lógica del consumer.

## 2. Arquitectura seleccionada

Se selecciona como diseño objetivo:

```text
Cloud Scheduler
      ↓
Cloud Functions for Firebase 2nd gen
      ↓
processNexoraOrderCompleted(limit)
      ↓
eventOutbox PENDING
      ↓
Domain Event Dispatcher
      ↓
Firestore idempotency ledger
      ↓
installationLeads / otros efectos Firestore
      ↓
PUBLISHED / FAILED
```

Firebase documenta `onSchedule` como el mecanismo de Cloud Functions para programar ejecuciones mediante Cloud Scheduler. Las funciones programadas pueden ejecutarse solapadamente, por lo que la función debe asumir ejecuciones concurrentes; el pipeline actual ya cuenta con idempotencia persistente por `DomainEvent.id`. citeturn0search0

## 3. Decisiones

### 3.1 Frecuencia inicial

**Cada 5 minutos.**

Motivo: reduce la latencia de entrega sin crear un polling agresivo. La frecuencia podrá ajustarse posteriormente según volumen real y métricas.

### 3.2 Lote

**20 eventos por ejecución**, coincidiendo con el valor por defecto actual de `processNexoraOrderCompleted()`.

El consumer limita defensivamente el máximo a 50. El scheduler no debe superar ese límite.

### 3.3 Concurrencia

No se requiere un lock global.

Dos ejecuciones simultáneas pueden consultar el mismo conjunto de `PENDING`; `runEventIdempotently()` usa `processedEvents/{event.id}` dentro de la misma transacción que el efecto Firestore, por lo que una entrega concurrente converge en un único efecto durable. Esto ya está validado por las pruebas de FASE 30.6–30.9.

### 3.4 Retry del scheduler

El scheduler no implementará una segunda política de retry de negocio.

La responsabilidad queda separada:

- Scheduler/Function: invoca el pipeline periódicamente.
- `processNexoraOrderCompleted()`: procesa eventos `PENDING`.
- `nextFailureState()`: clasifica errores y controla `PENDING`/`FAILED`.
- Replay administrativo: devuelve explícitamente un evento `FAILED` a `PENDING`.

No se habilita replay automático de `FAILED`.

### 3.5 Idempotencia

La clave canónica sigue siendo `DomainEvent.id`.

El ledger `processedEvents/{event.id}` y el efecto Firestore deben permanecer en la misma transacción. El helper existente está diseñado explícitamente para efectos Firestore y no debe contener HTTP, Mercado Pago, correo ni otros side effects externos. citeturn385file0

### 3.6 Seguridad

La función programada no necesita reutilizar `INTERNAL_EVENT_SECRET`.

El endpoint HTTP interno existente queda como mecanismo operativo/manual separado. La función programada ejecutará directamente el servicio de procesamiento, evitando crear un salto HTTP adicional.

Firebase indica que al desplegar una función programada se crea automáticamente el job de Scheduler y la función HTTP asociada, y que el job de Scheduler es quien tiene permiso para invocar la función. citeturn0search0

### 3.7 Ubicación

La implementación futura debe utilizar una unidad de despliegue independiente de `apps/api-conexa` para el scheduler, pero sin duplicar el consumer.

Estructura objetivo propuesta:

```text
apps/
├── api-conexa/
├── api-nexora/
├── web/
└── event-worker/
    ├── package.json
    └── src/
        └── index.ts
```

El workspace actual ya incluye automáticamente `apps/*`, por lo que `apps/event-worker` encaja en la estructura existente sin convertir el worker en dependencia del frontend. citeturn373file0

## 4. Punto importante de desacoplamiento

Actualmente `processNexoraOrderCompleted()` vive dentro de `apps/api-conexa/src/eventConsumer.ts`. El worker no debe copiar ese código.

Para FASE 31.3 se evaluarán dos opciones mínimas:

1. importar el servicio existente desde el worker como dependencia interna temporal; o
2. extraer el pipeline a un paquete/servicio compartido de infraestructura si el acoplamiento resulta excesivo.

Se elegirá la opción que produzca menor cambio reversible. No se moverá código por anticipado.

## 5. Configuración de Firebase

`firebase.json` actualmente no declara Functions; sólo Firestore/Storage y el emulador Firestore. citeturn380file0

Por tanto, FASE 31.3 deberá agregar únicamente la configuración necesaria para Functions, sin modificar las reglas de Firestore/Storage existentes.

## 6. Compatibilidad del monorepo

El workspace utiliza pnpm y actualmente incluye `apps/*` y `packages/*`. citeturn373file0

El API Conexa utiliza TypeScript estricto, módulos ES y Node types, y mantiene `firebase-admin` como dependencia. citeturn375file0

La función de scheduler tendrá su propio `package.json` y configuración TypeScript/build mínima. No se modificará el `tsconfig.json` raíz salvo que una prueba de integración demuestre que sea estrictamente necesario.

## 7. Pruebas obligatorias antes de considerar PASS

FASE 31.3–31.6 deberá demostrar como mínimo:

1. función arranca y compila;
2. función procesa eventos `PENDING`;
3. ejecución sin eventos devuelve correctamente;
4. dos ejecuciones concurrentes no duplican efectos;
5. un evento fallido pasa por `nextFailureState()`;
6. `FAILED` no se reintenta automáticamente;
7. replay autorizado vuelve a permitir procesamiento;
8. el mismo `DomainEvent.id` se conserva;
9. el worker no crea un segundo ledger para el mismo evento;
10. el API Express continúa funcionando independientemente del scheduler.

## 8. Observabilidad mínima

La función deberá registrar únicamente métricas operativas no sensibles:

- inicio/fin de ejecución;
- cantidad de eventos encontrados;
- cantidad procesada;
- cantidad con error;
- duración;
- identificador de ejecución del scheduler si está disponible.

No se deben registrar payloads completos, tokens, secretos ni datos personales innecesarios.

## 9. Resultado

**FASE 31.1 — PASS; inventario cerrado.**  
**FASE 31.2 — PASS; arquitectura del scheduler cerrada.**

### Próximo paso

**FASE 31.3 — Implementación mínima de `apps/event-worker` + `onSchedule`, sin tocar todavía `reviewService.ts` ni producir `CONEXA_SERVICE_CLOSED`.**

La producción de `CONEXA_SERVICE_CLOSED` continúa bloqueada hasta que exista un consumidor de negocio real y autorización administrativa de replay implementada en runtime.