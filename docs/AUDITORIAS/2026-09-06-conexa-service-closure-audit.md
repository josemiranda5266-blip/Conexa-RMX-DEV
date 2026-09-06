# FASE 27.7 — AUTORIDAD FUNCIONAL DEL CIERRE CONEXA

**Fecha:** 2026-09-06  
**Rama:** `integration/conexa-unified`  
**HEAD auditado:** `da4628b69f74de827c72ae6ccc35cbebfe7c9e0c`  
**Estado:** ABIERTO — se confirma el contrato funcional necesario antes de implementar el cierre canónico.

## Objetivo

Determinar quién tiene actualmente autoridad funcional para ejecutar `REVIEW_PENDING -> CLOSED`, cómo participa el cliente en la reseña y si existe algún camino frontend adicional que justifique producir `CONEXA_SERVICE_CLOSED`.

## Hallazgos

### 1. La máquina de estados separa explícitamente reseña y cierre

`src/domain/jobStateMachine.ts` define:

`COMPLETED -> REVIEW_PENDING -> CLOSED`

con acciones distintas `SUBMIT_REVIEW` y `CLOSE_JOB`. Por lo tanto, no es correcto inferir que publicar una reseña equivale automáticamente al cierre del servicio.

### 2. El único flujo frontend de reseña auditado termina en `addReview()`

`src/components/ReviewModal.tsx` solicita al cliente las seis dimensiones de calificación y el comentario, y al enviar llama a `AppContext.addReview()`.

El componente entrega algunos campos históricos como `clientId`, `clientName` y `clientAvatar`, pero el `AppContext` no los utiliza para autorizar la operación backend.

### 3. `AppContext.addReview()` ya está orientado al backend autoritativo

El método obtiene el ID token de Firebase y realiza `POST /api/reviews/create`. El cuerpo enviado contiene únicamente `serviceRequestId` y los datos de la reseña; no confía en `clientId`, `clientName`, `clientAvatar` ni `isVerifiedJob` recibidos desde el componente.

Esto es correcto: la identidad efectiva debe derivarse del token y la elegibilidad del servicio debe resolverse contra Firestore.

### 4. El backend de reseñas no materializa `CLOSED`

`src/server/reviewRoute.ts` autentica al usuario y delega en `saveProfessionalReview()`.

`src/server/reviewService.ts` realiza una transacción que:

- verifica solicitud, cliente y profesional;
- evita duplicados mediante ID determinístico de reseña;
- valida elegibilidad;
- crea la reseña;
- actualiza reputación y proyecciones;
- puede pasar la transacción financiera de `SERVICE_COMPLETED` a `SETTLED`;
- pero NO actualiza `service_requests.status` a `CLOSED`.

La transacción es una buena base para el futuro cierre porque Firestore ejecuta las operaciones atómicamente y puede reintentar la función transaccional ante concurrencia. citeturn0search0turn0search1

### 5. Se detectó drift entre dos clientes HTTP de Reviews

Existe `src/services/reviewApiService.ts`, que publica en `POST /api/reviews`, mientras `AppContext.addReview()` publica en `POST /api/reviews/create`.

El flujo activo auditado por `ReviewModal` utiliza `AppContext`, por lo que el camino efectivo es `/api/reviews/create`. El cliente `reviewApiService.ts` queda como contrato alternativo/legacy y debe consolidarse antes del cierre de la migración.

**Severidad:** P1 — contract/runtime drift, no P0.

### 6. No se encontró una acción frontend separada de `CLOSE_JOB`

En el árbol funcional auditado aparecen `ReviewModal`, `reviewApiService`, `reviewRoute`, `reviewService` y la máquina de estados, pero no se demostró una UI activa que ejecute una acción backend independiente `CLOSE_JOB`.

Esto refuerza la conclusión de que actualmente existe un hueco de lifecycle: el usuario puede completar el trabajo y enviar la reseña, pero el agregado `service_requests` no queda materializado en `CLOSED` por el servicio de reseñas.

## Decisión arquitectónica

El cierre canónico debe pertenecer al backend y debe existir **un solo writer** para `REVIEW_PENDING -> CLOSED`.

Antes de implementarlo debemos decidir una de estas dos semánticas:

### Opción A — reseña como acto de cierre

`POST /api/reviews/create` ejecuta una única transacción que crea/recupera la reseña, verifica `REVIEW_PENDING`, actualiza `service_requests.status = CLOSED` y crea `CONEXA_SERVICE_CLOSED` en `eventOutbox`.

Esta opción es coherente si el producto considera que, una vez que el cliente envía su evaluación, el servicio queda administrativamente cerrado.

### Opción B — cierre explícito separado

La reseña sólo crea la evaluación y mantiene `REVIEW_PENDING`. Un endpoint backend separado `CLOSE_JOB` ejecuta el cierre después de una acción explícita del cliente/profesional o de una política automática.

No debe implementarse esta opción sin encontrar primero una necesidad funcional real para un segundo acto del usuario.

## Recomendación de auditoría

Con el estado actual del producto, **Opción A es la candidata más coherente**, pero todavía se clasifica como decisión de arquitectura pendiente hasta revisar el comportamiento de `RequestsList`/historial de trabajos y cualquier UX que dependa de `REVIEW_PENDING`.

No producir `CONEXA_SERVICE_CLOSED` hasta que esa decisión esté fijada y cubierta por pruebas de concurrencia/idempotencia.

## Reglas de implementación futura

El writer canónico deberá:

1. autenticar por Firebase UID;
2. verificar que el UID corresponde al `clientId` de la solicitud;
3. verificar profesional asignado;
4. aceptar sólo `REVIEW_PENDING` como cierre normal;
5. crear o recuperar la reseña mediante su ID determinístico;
6. actualizar `service_requests.status = CLOSED` en la misma transacción;
7. crear `eventOutbox` en esa misma transacción si el evento ya tiene consumidor real;
8. evitar efectos externos dentro del callback transaccional;
9. tolerar reintentos y dos solicitudes concurrentes sin duplicar reseñas, cierres ni eventos.

Firebase documenta que las funciones transaccionales pueden ejecutarse más de una vez y que las operaciones atómicas no aplican parcialmente; por eso la lógica debe depender del estado persistido y ser idempotente. citeturn0search0turn0search6

## Severidad

- **P1 — lifecycle incompleto:** no existe writer demostrado para `REVIEW_PENDING -> CLOSED`.
- **P1 — contract drift:** `reviewApiService.ts` usa `/api/reviews`, mientras el flujo activo de `AppContext` usa `/api/reviews/create`.
- **P1 — event readiness:** `CONEXA_SERVICE_CLOSED` continúa reservado y no debe producirse aún.
- **Sin P0:** no se detectó en esta fase una pérdida financiera inmediata.

## Próximo paso — FASE 27.8

Auditar `RequestsList`, historial de trabajos y cualquier selector de estado para comprobar qué UX espera el producto después de publicar una reseña. Si no existe una necesidad de acción adicional, cerrar el contrato con **reseña = cierre administrativo** y diseñar el writer transaccional único antes de crear el productor `CONEXA_SERVICE_CLOSED`.

## Referencias inspeccionadas

- `src/domain/jobStateMachine.ts`
- `src/components/ReviewModal.tsx`
- `src/context/AppContext.tsx`
- `src/services/reviewApiService.ts`
- `src/server/reviewRoute.ts`
- `src/server/reviewService.ts`
- `src/server/reviewPolicy.ts`
- `docs/AUDITORIAS/2026-09-03-review-authoritative-contract.md`
- `docs/AUDITORIAS/2026-09-03-review-api-client.md`
