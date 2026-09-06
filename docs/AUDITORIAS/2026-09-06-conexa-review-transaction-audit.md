# FASE 27.13 — AUDITORÍA PROFUNDA DE LA TRANSACCIÓN DE REVIEW CONEXA

**Fecha:** 2026-09-06  
**Rama:** `integration/conexa-unified`  
**Estado:** BLOQUEADA — el writer canónico de cierre todavía no debe activarse.

## Objetivo

Determinar exactamente qué efectos secundarios ejecuta `saveProfessionalReview()` dentro de la transacción Firestore y cuáles todavía faltan para convertir `POST /api/reviews/create` en el cierre canónico del servicio.

## Hallazgo crítico P1 — la transacción todavía NO cierra `service_requests`

`src/server/reviewService.ts` ejecuta un `db.runTransaction()` y dentro de ella lee request, cliente, profesional y review determinista. Si la review ya existe, retorna inmediatamente con `created: false`.

Cuando la review es nueva, la transacción crea la review, actualiza reputación del profesional, actualiza la proyección pública, actualiza/elimina la proyección Radar y, si encuentra una transacción financiera `SERVICE_COMPLETED`, la pasa a `SETTLED`.

Pero no existe dentro de esta transacción un `tx.update(requestRef, { status: 'CLOSED', ... })`.

Por lo tanto, el flujo actual puede completar review + reputación + settlement y dejar `service_requests/{id}` en `REVIEW_PENDING`.

## Hallazgo crítico P1 — el retorno temprano de review existente no repara el lifecycle

El código consulta `reviewSnap` antes de validar nuevamente el estado del servicio y antes de ejecutar cualquier cierre. Si la review ya existe, devuelve `{ created: false }` inmediatamente.

Esto confirma el riesgo identificado en FASE 27.9/27.10: un servicio que quedó `REVIEW_PENDING` con una review ya persistida no converge automáticamente a `CLOSED` mediante el endpoint actual.

## Hallazgo P1 — no hay todavía writer de `CONEXA_SERVICE_CLOSED`

La transacción actual no escribe `eventOutbox` para `CONEXA_SERVICE_CLOSED`.

No debe agregarse todavía porque el contrato de cierre y su consumidor no están cerrados. Activarlo ahora produciría un evento que declararía un estado que la transacción no materializa realmente.

## Propiedades positivas

1. El `reviewId` es determinista a partir de `clientId + professionalId + serviceRequestId`.
2. La review se crea mediante `tx.create`, evitando sobrescritura silenciosa.
3. Reputación y settlement están dentro de la misma transacción que la creación de review.
4. Los documentos derivados de perfil público y Radar también participan en la misma transacción.
5. Firestore garantiza atomicidad y puede reejecutar la función de transacción cuando existe contención; por ello estos efectos deben permanecer idempotentes. citeturn0search0turn0search1

## Riesgo de concurrencia que debe probarse

Dos llamadas simultáneas para la misma review leen inicialmente una review inexistente. Una puede ganar el commit y la otra debe reintentarse sobre el nuevo estado y converger sin duplicar review, reputación o settlement.

La suite Firestore deberá inspeccionar el estado persistido después de ambas operaciones y no limitarse a comprobar respuestas HTTP.

## Diseño objetivo de FASE 27.14

Antes de implementar el writer canónico, la transacción deberá evolucionar conceptualmente a:

```text
POST /api/reviews/create
        ↓
verify Firebase UID
        ↓
ONE Firestore transaction
        ├─ read service request
        ├─ read deterministic review
        ├─ validate client/professional/state
        ├─ create review if absent
        ├─ reputation only if review is new
        ├─ settlement only if SERVICE_COMPLETED
        ├─ REVIEW_PENDING → CLOSED
        └─ eventOutbox only once, after real closure contract exists
```

## Regla para review existente

Si existe review + `REVIEW_PENDING`, el futuro writer debe poder cerrar el servicio de forma idempotente sin volver a incrementar reputación ni liquidar nuevamente.

Si existe review + `CLOSED`, la operación debe ser un no-op seguro.

Si `CLOSED` no tiene review, debe tratarse como anomalía; no debe inventarse una review ni repararse silenciosamente.

## Veredicto

**FASE 27.13 — NO CERRADA.**

La transacción actual es sólida en cuanto a atomicidad de review/reputación/proyección/settlement, pero todavía no representa el lifecycle completo del servicio. El cierre `REVIEW_PENDING → CLOSED` y el outbox correspondiente faltan.

**No implementar `CONEXA_SERVICE_CLOSED` todavía.** El siguiente paso es construir la prueba Firestore de concurrencia contra la transacción actual y, con esa evidencia, diseñar el cambio mínimo del writer canónico.
