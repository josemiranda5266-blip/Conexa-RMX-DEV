# FASE 27.7 — AUTORIDAD CANÓNICA DE CIERRE CONEXA

**Fecha:** 2026-09-06  
**Rama:** `integration/conexa-unified`  
**Estado:** ABIERTO — no implementar todavía el productor de `CONEXA_SERVICE_CLOSED`.

## Objetivo

Determinar quién tiene hoy autoridad funcional para ejecutar `REVIEW_PENDING -> CLOSED` y si la creación de la reseña ya representa, por contrato, el cierre definitivo del servicio.

## Hallazgos

### 1. La máquina de estados separa explícitamente reseña y cierre

`src/domain/jobStateMachine.ts` define:

`COMPLETED -> REVIEW_PENDING -> CLOSED`

con `SUBMIT_REVIEW` como transición hacia `REVIEW_PENDING` y `CLOSE_JOB` como transición separada hacia `CLOSED`.

Por lo tanto, el modelo de dominio actual **no considera automáticamente que crear una reseña sea equivalente a cerrar el servicio**. Hay una acción de cierre explícita en el contrato de dominio. fileciteturn101file0L2-L6

### 2. La política de reseñas acepta dos estados, pero no transforma ninguno a CLOSED

`assertReviewEligible()` permite crear la reseña cuando `service_requests.status` es `COMPLETED` o `REVIEW_PENDING`. El comentario del código identifica `REVIEW_PENDING` como el estado canónico previo al feedback.

Esto confirma que la reseña funciona como una operación posterior a la finalización, no como un writer de cierre del agregado. fileciteturn100file0L2-L6

### 3. El endpoint de reseñas autentica al cliente, pero no expresa una acción CLOSE_JOB

`reviewRoute.ts` verifica el token del usuario y delega toda la mutación a `saveProfessionalReview()`. El payload contiene ratings, comentario, profesional y solicitud; no existe una acción explícita de `CLOSE_JOB`, ni una comprobación de una autoridad distinta para cerrar el servicio. fileciteturn104file0L2-L6

Esto refuerza que la ruta actual es una **ruta de creación de reseña**, no una ruta de cierre de servicio.

### 4. `reviewService` sí tiene una transacción fuerte, pero su agregado principal no es `service_requests`

La transacción de `saveProfessionalReview()` lee la solicitud, usuario, profesional y reseña; crea la reseña; actualiza reputación/proyecciones; y puede cambiar la transacción financiera de `SERVICE_COMPLETED` a `SETTLED`.

No ejecuta `tx.update(requestRef, { status: 'CLOSED', ... })` ni produce `eventOutbox`. Por lo tanto, la operación actual no puede considerarse el writer canónico de `CLOSE_JOB`. fileciteturn99file0L2-L6

### 5. La idempotencia de la reseña está bien encaminada

La reseña utiliza un ID determinista basado en `clientId + professionalId + serviceRequestId`. Si el documento ya existe, la transacción devuelve la reseña existente con `created: false`.

Esto es una buena base para que una futura operación de cierre pueda reutilizar la reseña sin duplicarla. La transacción de Firestore es atómica y puede reintentarse ante contención, por lo que este patrón debe mantenerse libre de efectos externos dentro del callback. citeturn0search0turn0search1

### 6. No hay evidencia suficiente para declarar que “enviar reseña = cerrar servicio”

La evidencia de dominio contradice esa suposición: existe una acción `CLOSE_JOB` independiente y no se encontró un writer que la ejecute.

Por eso, **no corresponde modificar `reviewService` solamente por intuición** para que marque `CLOSED`. Primero debe definirse el contrato funcional: quién confirma el cierre, en qué momento, y si el cierre depende obligatoriamente de que exista una reseña.

## Decisión de arquitectura

Mantener por ahora dos conceptos separados:

1. **Finalización del trabajo:** `IN_PROGRESS -> REVIEW_PENDING`.
2. **Cierre administrativo del servicio:** `REVIEW_PENDING -> CLOSED`.

El productor de `CONEXA_SERVICE_CLOSED` deberá aparecer únicamente junto con el segundo concepto.

### Writer recomendado cuando se defina el contrato

La futura operación canónica debería ser una única transacción backend que:

1. autentique al actor;
2. determine su autoridad de cierre a partir del backend, no de datos enviados por el cliente;
3. lea `service_requests/{id}`;
4. exija `status == REVIEW_PENDING`;
5. cree o confirme la reseña de forma idempotente si el contrato exige feedback previo;
6. cambie `service_requests.status` a `CLOSED`;
7. registre `closedAt` y `closedBy` si esos campos forman parte del contrato final;
8. cree `eventOutbox` en la misma transacción;
9. mantenga el resultado seguro ante dos solicitudes concurrentes.

Firestore ofrece aislamiento serializable y resuelve la contención entre transacciones, por lo que dos intentos concurrentes deben converger en un único cierre observable. citeturn0search1turn0search0

## Riesgos detectados

- **P1 — contrato de lifecycle:** existe `CLOSE_JOB` en dominio pero no existe writer operativo demostrado.
- **P1 — ambigüedad funcional:** la reseña es idempotente, pero no está definido si constituye requisito o sólo consecuencia del cierre.
- **P1 — evento:** `CONEXA_SERVICE_CLOSED` no debe emitirse desde `saveProfessionalReview()` mientras `service_requests` siga en `REVIEW_PENDING`.
- **Sin P0:** no se encontró una pérdida financiera inmediata derivada de esta discrepancia; la liquidación financiera ya está separada de la transición administrativa de cierre.

## Próximo paso — FASE 27.8

Auditar los consumidores de `service_requests.status`, las pantallas/acciones del cliente que muestran `REVIEW_PENDING` o `CLOSED`, y cualquier referencia a `SUBMIT_REVIEW`/`CLOSE_JOB`. El objetivo será reconstruir el contrato funcional completo antes de escribir el nuevo writer.

No se implementa todavía el cierre ni el evento.
