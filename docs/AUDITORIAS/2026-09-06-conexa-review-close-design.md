# FASE 28 — DISEÑO E IMPLEMENTACIÓN DEL CIERRE ATÓMICO DE SERVICIO

**Proyecto:** CONEXA-RMX-DEV  
**Rama:** `integration/conexa-unified`  
**Fecha:** 2026-09-06  
**Estado:** VERIFICACIÓN POST-CAMBIO — PASS

## 1. Gate previo

La implementación del cierre `REVIEW_PENDING -> CLOSED` quedó desbloqueada después de obtener evidencia local contra Firestore Emulator.

Comando ejecutado antes del cambio:

```bash
pnpm test:conexa-review-emulator
```

**Resultado:** PASS.

La ejecución levantó Firestore Emulator con el proyecto demo `demo-conexa-unified` y terminó con código 0. Se demostró una sola reseña, un solo incremento de `reviewCount`, una sola liquidación y el mismo `reviewId` determinista ante dos escrituras concurrentes.

## 2. Estado implementado

`saveProfessionalReview()` continúa utilizando una única transacción Firestore y ahora:

- mantiene el `reviewId` determinista;
- crea reseña, reputación, proyección pública, Radar y liquidación dentro de la misma transacción;
- registra `settlementReason: 'REVIEW_COMPLETED'` al liquidar por reseña;
- cambia `REVIEW_PENDING -> CLOSED` dentro de esa misma transacción;
- si una segunda llamada encuentra la reseña ya creada y el servicio sigue `REVIEW_PENDING`, completa únicamente el cierre dentro de la misma transacción;
- si el servicio ya está `CLOSED` y la reseña existe, devuelve idempotentemente sin efectos secundarios;
- conserva la compatibilidad existente para `COMPLETED`: puede crear la reseña, pero no cierra directamente desde `COMPLETED`.

Firestore documenta que las transacciones son atómicas y que ante modificaciones concurrentes la operación puede reintentarse completa; por eso el cierre se mantiene dentro de la misma transacción y no como escritura posterior. citeturn0search0turn0search1

## 3. Máquina de estados

La máquina canónica define:

```text
COMPLETED -> REVIEW_PENDING -> CLOSED
```

`SUBMIT_REVIEW` permite `COMPLETED -> REVIEW_PENDING` y `CLOSE_JOB` permite `REVIEW_PENDING -> CLOSED`.

La implementación actual no inventa una transición `COMPLETED -> CLOSED`: solamente cierra cuando el estado persistido es `REVIEW_PENDING`.

## 4. Matriz implementada

| Estado | Reseña | Comportamiento |
|---|---|---|
| `REVIEW_PENDING` | no existe | crea reseña + reputación + liquidación si corresponde + `CLOSED`, atómicamente |
| `REVIEW_PENDING` | existe | no duplica efectos; completa `CLOSED` de forma idempotente |
| `CLOSED` | existe | éxito idempotente, sin efectos secundarios |
| `CLOSED` | no existe | no se inventa una reseña; la ruta normal no repara silenciosamente |
| `COMPLETED` | no existe | conserva compatibilidad: crea reseña pero permanece fuera del cierre atómico hasta `REVIEW_PENDING` |

## 5. Prueba post-cambio — PASS

Se ejecutó nuevamente, después de la implementación:

```bash
pnpm test:conexa-review-emulator
```

Resultado observado en consola:

```text
✔ CONEXA review: two concurrent writes converge to one review
ℹ tests 1
ℹ pass 1
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
+ Script exited successfully (code 0)
```

El emulador utilizó `demo-conexa-unified` y se apagó correctamente al finalizar.

La prueba confirmó nuevamente:

- dos escrituras concurrentes convergen en una sola reseña;
- no hay doble incremento de reputación;
- no hay doble liquidación;
- el `reviewId` determinista converge;
- el proceso termina con código 0.

**Nota:** la salida contiene `MetadataLookupWarning`, pero no produjo fallo: `pass 1`, `fail 0`, código 0. Se mantiene como observación de entorno para una futura limpieza, no como fallo de la prueba.

## 6. Evento `CONEXA_SERVICE_CLOSED`

`packages/shared-events` reserva `CONEXA_SERVICE_CLOSED`, pero todavía no existe evidencia suficiente de productor y consumidor operativo con replay/recovery.

Por seguridad de contrato, **no se emite todavía** desde `saveProfessionalReview()`.

## 7. Riesgos pendientes

1. Añadir casos explícitos para dos cierres concurrentes y `CLOSED` con reseña existente.
2. Definir y probar la anomalía `CLOSED` sin reseña.
3. Auditar el contrato completo de `CONEXA_SERVICE_CLOSED` antes de emitir outbox.
4. Validar el comportamiento de la ruta HTTP completa, además del servicio de dominio.
5. Considerar una prueba posterior contra un entorno Firestore real para diferencias que el Emulator no reproduce completamente.

Firebase advierte que el Emulator no implementa todo el comportamiento transaccional de producción y puede diferir especialmente en escenarios de múltiples escrituras concurrentes; por ello este PASS es un gate local necesario, no una certificación de producción. citeturn0search2

## 8. Criterio de salida

**FASE 28 — PASS para el escenario de concurrencia e implementación post-cambio.**

Quedan pendientes los escenarios adicionales y la auditoría del evento antes de considerar cerrado todo el ciclo de servicio.
