# FASE 27.7 — AUTORIDAD FUNCIONAL DEL CIERRE CONEXA

**Fecha:** 2026-09-06  
**Rama:** `integration/conexa-unified`  
**HEAD auditado:** `da4628b69f74de827c72ae6ccc35cbebfe7c9e0c`  
**Estado:** ABIERTO — se confirma el contrato funcional necesario antes de implementar el cierre canónico.

## Objetivo

Determinar quién tiene actualmente autoridad funcional para ejecutar `REVIEW_PENDING -> CLOSED`, cómo participa el cliente en la reseña y si existe algún camino frontend adicional que justifique producir `CONEXA_SERVICE_CLOSED`.

## Hallazgos

### 1. La máquina de estados separa explícitamente reseña y cierre

`src/domain/jobStateMachine.ts` define `COMPLETED -> REVIEW_PENDING -> CLOSED`, con acciones distintas `SUBMIT_REVIEW` y `CLOSE_JOB`. No es correcto inferir por la máquina que publicar una reseña equivale automáticamente al cierre.

### 2. El flujo frontend de reseña termina en `addReview()`

`src/components/ReviewModal.tsx` recopila las seis dimensiones de calificación y el comentario y al enviar llama a `AppContext.addReview()`. No existe en este componente una segunda acción de cierre posterior.

### 3. `AppContext.addReview()` está orientado al backend autoritativo

El método obtiene el ID token de Firebase y realiza `POST /api/reviews/create`. El contrato efectivo se basa en `serviceRequestId` y los datos de la reseña; la identidad efectiva debe seguir derivándose del token y de Firestore.

### 4. El backend de reseñas no materializa `CLOSED`

`reviewRoute` autentica y delega en `saveProfessionalReview()`. `reviewService` realiza la transacción de reseña, reputación y liquidación financiera, pero no actualiza `service_requests.status` a `CLOSED`.

Firestore garantiza atomicidad de la transacción y puede volver a ejecutar la función transaccional ante conflictos, por lo que cualquier futuro cierre debe ser idempotente y tolerante a concurrencia. citeturn0search0turn0search1

### 5. Drift entre clientes HTTP de Reviews

`src/services/reviewApiService.ts` utiliza `POST /api/reviews`, mientras el flujo activo de `AppContext` utiliza `POST /api/reviews/create`.

**Severidad:** P1 — contract/runtime drift.

### 6. `RequestsList` confirma que `REVIEW_PENDING` y `CLOSED` son estados visibles, pero no ofrece un segundo cierre

`src/components/RequestsList.tsx` muestra explícitamente `Esperando reseña` cuando el estado es `REVIEW_PENDING` y `Trabajo cerrado` cuando es `CLOSED`. Para estados posteriores al trabajo no aparece un botón independiente de `CLOSE_JOB`; la acción disponible para el usuario en ese punto es la reseña.

Esto aporta evidencia funcional a favor de que el cierre administrativo debe ocurrir como consecuencia del flujo de reseña, aunque la máquina de estados haya separado ambas acciones conceptualmente.

### 7. El modal de reseña no ejecuta ninguna segunda acción

`ReviewModal` sólo ejecuta `addReview(...)` y luego `onClose()`. No llama a un endpoint de cierre ni dispara una acción `CLOSE_JOB`.

## Conclusión de FASE 27.8

La evidencia frontend disponible refuerza **Opción A — reseña como acto de cierre administrativo**:

```text
COMPLETED
   ↓
REVIEW_PENDING
   ↓
POST /api/reviews/create
   ↓
transacción canónica
   ├── crear/recuperar review
   ├── actualizar reputación
   ├── liquidar estado financiero si corresponde
   ├── service_requests.status = CLOSED
   └── eventOutbox CONEXA_SERVICE_CLOSED
```

No se encontró una UX que requiera que el usuario ejecute un segundo `CLOSE_JOB`.

## Decisión pendiente antes de implementación

La decisión funcional queda suficientemente respaldada para diseñar el writer único, pero antes de producir el evento deben definirse y probarse:

1. qué hacer si la reseña ya existe pero el servicio permanece `REVIEW_PENDING`;
2. qué hacer si el servicio ya está `CLOSED` y llega un reintento;
3. cómo garantizar que el `eventOutbox` se cree una sola vez;
4. cómo resolver el drift `/api/reviews` vs `/api/reviews/create`;
5. cómo cubrir dos envíos concurrentes del mismo cliente.

Firestore serializa transacciones y resuelve la contención mediante reintentos o fallo controlado; el diseño debe depender del estado persistido y no de efectos externos dentro del callback. citeturn0search0turn0search1

## Severidad

- **P1 — lifecycle incompleto:** no existe writer demostrado para `REVIEW_PENDING -> CLOSED`.
- **P1 — contract drift:** existen dos rutas HTTP conceptuales para Reviews.
- **P1 — event readiness:** `CONEXA_SERVICE_CLOSED` continúa reservado hasta implementar y probar el writer.
- **Sin P0:** no se detectó en esta fase una pérdida financiera inmediata.

## Próximo paso — FASE 27.9

Diseñar el contrato exacto del writer canónico de cierre y sus pruebas de idempotencia/concurrencia. Después de validar ese contrato, implementar una única ruta HTTP de Reviews y el productor transaccional `CONEXA_SERVICE_CLOSED`.

## Referencias inspeccionadas

- `src/domain/jobStateMachine.ts`
- `src/components/ReviewModal.tsx`
- `src/components/RequestsList.tsx`
- `src/context/AppContext.tsx`
- `src/services/reviewApiService.ts`
- `src/server/reviewRoute.ts`
- `src/server/reviewService.ts`
- `src/server/reviewPolicy.ts`
- `docs/AUDITORIAS/2026-09-03-review-authoritative-contract.md`
- `docs/AUDITORIAS/2026-09-03-review-api-client.md`
