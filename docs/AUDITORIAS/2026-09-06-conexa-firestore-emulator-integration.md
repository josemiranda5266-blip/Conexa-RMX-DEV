# FASE 27.16 — INFRAESTRUCTURA SEGURA PARA FIRESTORE EMULATOR

**Fecha:** 2026-09-06  
**Rama:** `integration/conexa-unified`  
**Estado:** INFRAESTRUCTURA PREPARADA — EJECUCIÓN PENDIENTE

## Objetivo

Habilitar la ejecución reproducible de la prueba de concurrencia de reviews contra Firestore Emulator sin credenciales de producción y sin introducir todavía el writer canónico `CONEXA_SERVICE_CLOSED`.

## Cambios mínimos realizados

### 1. `firebase.json`

Se agregó únicamente la configuración del emulador de Cloud Firestore en el puerto `8080`.

No se agregaron emuladores de Auth, Storage, Functions ni otros servicios porque la prueba actual solo necesita Firestore.

### 2. `src/server/firebaseAdmin.ts`

Se agregó una ruta explícita para tests que requiere simultáneamente:

- `NODE_ENV=test`;
- `FIRESTORE_EMULATOR_HOST` presente;
- `GCLOUD_PROJECT` o `FIREBASE_PROJECT_ID` con formato `demo-*`.

En ese caso se inicializa Firebase Admin con `projectId` y el SDK dirige Firestore al emulator mediante `FIRESTORE_EMULATOR_HOST`.

Si esas condiciones no se cumplen, el flujo anterior de credenciales permanece intacto.

Esto establece un fail-safe importante: la suite de concurrencia no puede saltar silenciosamente desde el entorno de prueba hacia un proyecto Firebase real.

## Base técnica

Firebase documenta que el Admin SDK se conecta automáticamente al Firestore Emulator cuando está definido `FIRESTORE_EMULATOR_HOST`, y que el valor no debe incluir `http://`. Para entornos de prueba, Firebase recomienda proyectos `demo-*` porque no tienen recursos reales ni riesgo de modificar producción. citeturn0search2turn0search0

Firebase también documenta `firebase emulators:exec` como mecanismo para automatizar pruebas con arranque y apagado del emulador. citeturn0search0

## Suite preparada

`tests/conexa-review-concurrency.emulator.test.ts` ya contiene la prueba principal de doble escritura concurrente.

La suite se niega a ejecutarse si:

- no está en `NODE_ENV=test`;
- no existe `FIRESTORE_EMULATOR_HOST`;
- el project ID no comienza con `demo-`.

Además verifica el estado persistido después de las dos operaciones: una sola review, `reviewCount=1`, transaction `SETTLED`, mismo review ID en ambas respuestas y `service_requests.status` todavía en `REVIEW_PENDING`. fileciteturn191file0L2-L2

La política actual exige que el request tenga `clientId`, `assignedProfessionalId` y estado `COMPLETED` o `REVIEW_PENDING`, condiciones que la semilla de la prueba satisface. fileciteturn192file0L2-L2

## Ejecución pendiente

**No se declara PASS de integración todavía.** Desde esta auditoría se preparó la infraestructura y se revisó el código de la prueba, pero no se ejecutó el Firebase Emulator ni la suite en una máquina con Firebase CLI/Java disponible.

La ejecución prevista en el entorno local es:

```text
firebase emulators:exec --project demo-conexa-review "NODE_ENV=test GCLOUD_PROJECT=demo-conexa-review FIRESTORE_EMULATOR_HOST=127.0.0.1:8080 pnpm exec tsx --test tests/conexa-review-concurrency.emulator.test.ts"
```

Si el shell local no acepta la asignación de variables de esa forma, deben establecerse como variables de entorno antes de ejecutar `firebase emulators:exec`.

## Criterio de cierre de FASE 27.16

La fase queda **ABIERTA** hasta obtener evidencia de ejecución real contra el emulator.

El siguiente PASS debe demostrar como mínimo:

1. dos `saveProfessionalReview()` concurrentes;
2. una única review persistida;
3. una única aplicación efectiva de reputación;
4. una única transición de transaction a `SETTLED`;
5. misma review determinista devuelta por ambas operaciones;
6. ausencia de modificación de `service_requests.status` por el writer actual;
7. ausencia de acceso a un proyecto Firebase de producción.

## Decisión arquitectónica

Todavía **no** se implementa el cierre `REVIEW_PENDING -> CLOSED` ni el evento `CONEXA_SERVICE_CLOSED`.

Primero debe cerrarse la evidencia de concurrencia del writer actual. Luego se podrá diseñar la transacción canónica de cierre con idempotencia, reputación, settlement y Outbox en una única unidad atómica.

## Veredicto

**FASE 27.16 — INFRAESTRUCTURA PREPARADA / EJECUCIÓN PENDIENTE.**
