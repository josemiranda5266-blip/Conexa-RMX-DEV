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

### 3. `package.json`

Se agregó el runner reproducible:

`pnpm test:conexa-review-emulator`

que utiliza `firebase emulators:exec --project demo-conexa-unified --only firestore` y ejecuta la suite de concurrencia con `tsx`.

### 4. `tests/conexa-review-concurrency.emulator.test.ts`

La prueba ya no depende de que el shell establezca manualmente `NODE_ENV=test`. La barrera de seguridad de ejecución es:

- `FIRESTORE_EMULATOR_HOST` presente;
- `GCLOUD_PROJECT` o `FIREBASE_PROJECT_ID` con formato `demo-*`.

Esto permite que `firebase emulators:exec` proporcione el contexto del emulator sin introducir sintaxis específica de Bash/PowerShell en el test.

## Base técnica

Firebase documenta que el Admin SDK se conecta automáticamente al Firestore Emulator cuando está definido `FIRESTORE_EMULATOR_HOST`, y recomienda proyectos `demo-*` para pruebas. citeturn0search2turn0search0

Firebase también documenta `firebase emulators:exec` como mecanismo para automatizar pruebas con arranque y apagado del emulador. citeturn0search0turn0search5

## Suite preparada

`tests/conexa-review-concurrency.emulator.test.ts` contiene la prueba principal de doble escritura concurrente.

La suite se niega a ejecutarse si:

- no existe `FIRESTORE_EMULATOR_HOST`;
- el project ID no comienza con `demo-`.

Además verifica el estado persistido después de las dos operaciones: una sola review, `reviewCount=1`, transaction `SETTLED`, mismo review ID en ambas respuestas y `service_requests.status` todavía en `REVIEW_PENDING`. fileciteturn200file0L2-L2

## Ejecución pendiente

**No se declara PASS de integración todavía.** Desde esta auditoría se preparó la infraestructura y se revisó el código de la prueba, pero no se ejecutó el Firebase Emulator ni la suite en una máquina con Firebase CLI/Java disponible.

La ejecución prevista es simplemente:

```text
pnpm test:conexa-review-emulator
```

El script fija el proyecto `demo-conexa-unified` y limita la ejecución al emulador Firestore. Firebase documenta que `emulators:exec` inicia los emuladores configurados, ejecuta el script y los detiene al finalizar. citeturn0search5

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
