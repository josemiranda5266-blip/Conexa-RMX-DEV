# FASE 28 — DISEÑO E IMPLEMENTACIÓN DEL CIERRE ATÓMICO DE SERVICIO

**Proyecto:** CONEXA-RMX-DEV  
**Rama:** `integration/conexa-unified`  
**Fecha:** 2026-09-06  
**Estado:** IMPLEMENTACIÓN REALIZADA — VERIFICACIÓN POST-CAMBIO PENDIENTE

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

## 5. Prueba actualizada

Se amplió `tests/conexa-review-concurrency.emulator.test.ts` para verificar además:

- `REVIEW_PENDING -> CLOSED` tras concurrencia;
- `settlementReason === 'REVIEW_COMPLETED'`;
- retry posterior con `created === false`;
- ausencia de reseñas duplicadas;
- ausencia de doble incremento de reputación;
- transacción permanece `SETTLED`;
- servicio permanece `CLOSED` después del retry.

**La prueba actualizada aún NO fue ejecutada después de este cambio.** Por lo tanto, esta fase no se marca como PASS todavía.

## 6. Evento `CONEXA_SERVICE_CLOSED`

`packages/shared-events` reserva `CONEXA_SERVICE_CLOSED`, pero todavía no existe evidencia suficiente de productor y consumidor operativo con replay/recovery.

Por seguridad de contrato, **no se emite todavía** desde `saveProfessionalReview()`.

## 7. Riesgos pendientes

1. Ejecutar la prueba actualizada contra Firestore Emulator.
2. Añadir casos explícitos para dos cierres concurrentes y `CLOSED` con reseña existente.
3. Definir y probar la anomalía `CLOSED` sin reseña.
4. Auditar el contrato completo de `CONEXA_SERVICE_CLOSED` antes de emitir outbox.
5. Validar el comportamiento de la ruta HTTP completa, además del servicio de dominio.

## 8. Criterio de salida

FASE 28 queda en **VERIFICACIÓN POST-CAMBIO** hasta ejecutar nuevamente:

```bash
pnpm test:conexa-review-emulator
```

No se debe declarar PASS de implementación hasta obtener `pass` y `fail 0` con el código actualizado.
