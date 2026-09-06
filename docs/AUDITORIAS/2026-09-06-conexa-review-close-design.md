# FASE 28/29 — CIERRE ATÓMICO E IDEMPOTENCIA DEL SERVICIO

**Proyecto:** CONEXA-RMX-DEV  
**Rama:** `integration/conexa-unified`  
**Fecha:** 2026-09-06  
**Estado:** **FASE 28 PASS — FASE 29 PASS**

## 1. FASE 28 — cierre atómico aprobado

La implementación del cierre `REVIEW_PENDING -> CLOSED` quedó validada contra Firestore Emulator.

Comando ejecutado:

```bash
pnpm test:conexa-review-emulator
```

La prueba base confirmó una sola reseña, un solo incremento de `reviewCount`, una sola liquidación, `settlementReason: 'REVIEW_COMPLETED'`, estado `CLOSED` y `reviewId` determinista ante escrituras concurrentes.

## 2. Implementación vigente

`saveProfessionalReview()` utiliza una única transacción Firestore y:

- mantiene `reviewId` determinista;
- crea reseña, reputación, proyección pública, Radar y liquidación dentro de la misma transacción;
- registra `settlementReason: 'REVIEW_COMPLETED'` al liquidar por reseña;
- cambia `REVIEW_PENDING -> CLOSED` en la misma transacción;
- si una segunda llamada encuentra la reseña ya creada y el servicio sigue `REVIEW_PENDING`, completa el cierre;
- si una reseña ya existe y `REVIEW_PENDING` persiste, también recupera una transacción `SERVICE_COMPLETED` y la pasa a `SETTLED` antes del cierre;
- si el servicio ya está `CLOSED` y la reseña existe, mantiene un no-op idempotente;
- no inventa `COMPLETED -> CLOSED`;
- `CLOSED` sin reseña se rechaza y no se repara silenciosamente.

Firestore documenta que las transacciones son atómicas y que, ante contención concurrente, pueden reintentarse hasta obtener un estado consistente. citeturn0search0turn0search1

## 3. FASE 29 — verificación completa

Se ejecutó nuevamente el test después de sincronizar la rama `integration/conexa-unified` hasta el commit `ea913fd3f0dee45a60449980fc18d9b472d6ed7b`.

Comando ejecutado localmente:

```bash
pnpm test:conexa-review-emulator
```

Entorno:

- Firestore Emulator
- proyecto demo `demo-conexa-unified`
- sin acceso a una base Firestore de producción

Resultado observado:

```text
✔ CONEXA review: concurrent writes converge to one review and atomically close service
✔ CONEXA review: existing review plus REVIEW_PENDING repairs interrupted settlement and closes atomically
✔ CONEXA review: CLOSED with existing review is a safe no-op under concurrent retries
✔ CONEXA review: two concurrent retries against an existing pending review produce one terminal close
✔ CONEXA review: CLOSED without review is rejected instead of silently repaired

ℹ tests 5
ℹ pass 5
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 35370.8267
+ Script exited successfully (code 0)
```

### Escenarios cubiertos

1. **Creación concurrente + cierre:** dos escrituras convergen en una sola reseña y un único cierre/liquidación.
2. **Reseña existente + `REVIEW_PENDING` + `SERVICE_COMPLETED`:** el retry recupera la liquidación y cierra el servicio sin duplicar reseña ni reputación.
3. **`CLOSED` + reseña existente:** dos retries concurrentes son no-op idempotentes.
4. **Dos retries concurrentes sobre reseña pendiente:** convergen en un único estado terminal `CLOSED` y una única liquidación.
5. **`CLOSED` sin reseña:** se rechaza con `REVIEW_SERVICE_NOT_COMPLETED` y no se inventa una reseña ni una reparación silenciosa.

El warning `MetadataLookupWarning` de Node apareció durante la ejecución, pero no afectó el resultado: `5 pass`, `0 fail`, código de salida `0`.

## 4. Decisión de cierre FASE 29

**FASE 29 = PASS.**

La evidencia local disponible demuestra atomicidad e idempotencia en los escenarios de concurrencia definidos para el servicio de reseñas. Firestore garantiza aislamiento serializable de transacciones y las bibliotecas cliente reintentan ante contención transitoria. citeturn0search1turn0search7

Esto no equivale todavía a una prueba contra el proyecto Firestore de producción ni a una prueba HTTP end-to-end.

## 5. Evento `CONEXA_SERVICE_CLOSED`

`packages/shared-events` reserva `CONEXA_SERVICE_CLOSED`, pero todavía no existe evidencia suficiente de productor + consumidor + replay/recovery operativo.

Por seguridad de contrato, **no se emite todavía** desde `saveProfessionalReview()`.

## 6. Próximo gate — FASE 30

Antes de producir `CONEXA_SERVICE_CLOSED` se realizará una auditoría específica de:

1. `packages/shared-events/src/index.ts` y contratos relacionados;
2. todos los productores y consumidores reales del evento;
3. formato de payload y validación runtime;
4. duplicación entre `DomainEvent.id` y `eventId` dentro del payload;
5. idempotencia del outbox;
6. estados `PENDING/PUBLISHED/FAILED` y recuperación/replay de fallos;
7. scheduler/worker que dispara el procesamiento;
8. comportamiento ante consumidor caído, reintentos y eventos duplicados;
9. ruta HTTP completa de creación de reseña/cierre;
10. compatibilidad con la arquitectura Shared + Events + Outbox.

**No se agregará el productor hasta cerrar este contrato.**
