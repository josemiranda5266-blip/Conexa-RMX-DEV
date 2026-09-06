# FASE 28/29 — CIERRE ATÓMICO E IDEMPOTENCIA DEL SERVICIO

**Proyecto:** CONEXA-RMX-DEV  
**Rama:** `integration/conexa-unified`  
**Fecha:** 2026-09-06  
**Estado:** FASE 28 PASS — FASE 29 VERIFICACIÓN PENDIENTE

## 1. FASE 28 — gate aprobado

La implementación del cierre `REVIEW_PENDING -> CLOSED` quedó desbloqueada después de obtener evidencia local contra Firestore Emulator.

Comando ejecutado después de la implementación:

```bash
pnpm test:conexa-review-emulator
```

Resultado observado:

```text
✔ CONEXA review: two concurrent writes converge to one review
ℹ tests 1
ℹ pass 1
ℹ fail 0
+ Script exited successfully (code 0)
```

El emulador utilizó el proyecto demo `demo-conexa-unified`. La prueba confirmó una sola reseña, un solo incremento de `reviewCount`, una sola liquidación, `settlementReason: 'REVIEW_COMPLETED'`, estado `CLOSED` y `reviewId` determinista ante dos escrituras concurrentes.

La salida incluyó `MetadataLookupWarning`, pero no produjo fallo (`fail 0`, código 0). Se mantiene como observación de entorno.

## 2. Implementación vigente

`saveProfessionalReview()` utiliza una única transacción Firestore y:

- mantiene `reviewId` determinista;
- crea reseña, reputación, proyección pública, Radar y liquidación dentro de la misma transacción;
- registra `settlementReason: 'REVIEW_COMPLETED'` al liquidar por reseña;
- cambia `REVIEW_PENDING -> CLOSED` en la misma transacción;
- si una segunda llamada encuentra la reseña ya creada y el servicio sigue `REVIEW_PENDING`, completa el cierre;
- si la reseña ya existe y `REVIEW_PENDING` persiste, ahora también busca una transacción `SERVICE_COMPLETED` y completa la liquidación antes del cierre. Esto cubre el caso de una interrupción lógica entre creación de reseña y liquidación;
- si el servicio ya está `CLOSED` y la reseña existe, mantiene un no-op idempotente;
- no inventa `COMPLETED -> CLOSED`.

Firestore documenta atomicidad de transacciones y reintentos ante contención. citeturn0search0turn0search1

## 3. FASE 29 — hallazgo y corrección preventiva

Durante la revisión posterior al PASS se detectó un caso de recuperación que la primera prueba no cubría:

```text
REVIEW_PENDING
   + reseña ya existente
   + transaction = SERVICE_COMPLETED
              ↓
        retry de la operación
```

La versión anterior cerraba el servicio pero no liquidaba esa transacción si la reseña ya existía. Eso podía dejar inconsistencia entre servicio cerrado y transacción pendiente.

Se corrigió `src/server/reviewService.ts` para que, únicamente cuando el servicio sigue `REVIEW_PENDING`, el retry busque `SERVICE_COMPLETED`, lo pase a `SETTLED` con `settlementReason: 'REVIEW_COMPLETED'` y cierre el servicio en la misma transacción.

No se modifica la rama `CLOSED`, que continúa siendo un no-op idempotente.

## 4. Prueba FASE 29 agregada

`tests/conexa-review-concurrency.emulator.test.ts` ahora contiene además el escenario:

- reseña existente;
- servicio `REVIEW_PENDING`;
- transacción `SERVICE_COMPLETED`;
- retry de `saveProfessionalReview()`;
- expectativa: `created === false`, una sola reseña, transacción `SETTLED`, `settlementReason === 'REVIEW_COMPLETED'` y servicio `CLOSED`.

**Esta prueba ampliada todavía NO fue ejecutada.** No se declara PASS de FASE 29 hasta ejecutar el comando contra el Emulator.

## 5. Matriz de estados

| Estado | Reseña | Comportamiento objetivo |
|---|---|---|
| `REVIEW_PENDING` | no existe | crear + reputación + liquidación si corresponde + `CLOSED`, atómico |
| `REVIEW_PENDING` | existe | recuperar liquidación pendiente si existe + `CLOSED`, sin duplicar reseña/reputación |
| `CLOSED` | existe | no-op idempotente |
| `CLOSED` | no existe | anomalía; no reparar silenciosamente |
| `COMPLETED` | no existe | compatibilidad histórica; no cerrar directamente |

## 6. Evento `CONEXA_SERVICE_CLOSED`

`packages/shared-events` reserva `CONEXA_SERVICE_CLOSED`, pero todavía no existe evidencia suficiente de productor + consumidor + replay/recovery operativo.

Por seguridad de contrato, **no se emite todavía** desde `saveProfessionalReview()`.

## 7. Próximos gates

1. Ejecutar `pnpm test:conexa-review-emulator` con la prueba FASE 29 ampliada.
2. Añadir y ejecutar dos cierres concurrentes.
3. Añadir y ejecutar `CLOSED + reseña existente` como no-op.
4. Añadir y ejecutar `CLOSED + sin reseña` como anomalía explícita.
5. Auditar contrato completo de `CONEXA_SERVICE_CLOSED` antes de producir outbox.
6. Validar ruta HTTP completa además del servicio de dominio.

Firebase garantiza aislamiento serializable para transacciones, pero el Emulator no sustituye una validación de producción; este proceso conserva el Emulator como gate local de seguridad. citeturn0search1
