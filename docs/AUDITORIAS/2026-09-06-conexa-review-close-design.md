# FASE 28 — DISEÑO DEL CIERRE ATÓMICO DE SERVICIO

**Proyecto:** CONEXA-RMX-DEV  
**Rama:** `integration/conexa-unified`  
**Fecha:** 2026-09-06  
**Estado:** DISEÑO PREVIO — NO IMPLEMENTADO

## 1. Gate previo

La implementación del cierre `REVIEW_PENDING -> CLOSED` queda bloqueada hasta obtener evidencia local de que la prueba de concurrencia contra Firestore Emulator pasa.

Comando preparado:

```bash
pnpm test:conexa-review-emulator
```

La prueba debe demostrar como mínimo:

- una sola reseña para dos escrituras concurrentes;
- un solo incremento de `reviewCount`;
- una sola liquidación de la transacción `SERVICE_COMPLETED`;
- mismo `reviewId` determinista en ambas respuestas;
- ausencia de acceso a producción;
- el estado del servicio continúa `REVIEW_PENDING` mientras el cierre todavía no está implementado.

No se registra PASS hasta ejecutar realmente el comando.

## 2. Estado actual auditado

`saveProfessionalReview()` ejecuta una transacción Firestore y lee request, cliente, profesional y reseña determinista. Si la reseña ya existe, retorna inmediatamente con `created: false`. Si no existe, crea la reseña, recalcula reputación, actualiza la proyección pública, actualiza Radar y liquida una transacción `SERVICE_COMPLETED` encontrada para el servicio.

Actualmente **no** actualiza `service_requests.status` a `CLOSED` y **no** crea un `CONEXA_SERVICE_CLOSED` en `eventOutbox`.

## 3. Máquina de estados

La máquina canónica define:

```text
COMPLETED -> REVIEW_PENDING -> CLOSED
```

`SUBMIT_REVIEW` permite `COMPLETED -> REVIEW_PENDING` y `CLOSE_JOB` permite `REVIEW_PENDING -> CLOSED`.

El objetivo de FASE 28 es que el cierre efectivo se produzca de forma atómica con la operación de reseña, sin introducir una segunda escritura independiente susceptible a carreras.

## 4. Matriz objetivo

| Estado | Reseña | Acción esperada |
|---|---|---|
| `REVIEW_PENDING` | no existe | crear reseña + reputación una vez + liquidación una vez + cerrar |
| `REVIEW_PENDING` | existe | no duplicar reseña/reputación/liquidación + cerrar de forma idempotente |
| `CLOSED` | existe | éxito idempotente, sin efectos secundarios |
| `CLOSED` | no existe | detectar anomalía; no inventar una reseña ni reparar silenciosamente |
| `COMPLETED` | no existe | conservar compatibilidad actual o avanzar explícitamente según el contrato vigente; no cerrar directamente |

## 5. Concurrencia requerida

Antes de declarar la implementación segura se deben cubrir al menos:

1. doble click del mismo cliente;
2. dos dispositivos simultáneos;
3. retry HTTP después de timeout;
4. reseña ya creada pero servicio aún `REVIEW_PENDING`;
5. servicio ya `CLOSED` con reseña existente;
6. dos cierres concurrentes;
7. exactamente una actualización de reputación;
8. exactamente una liquidación;
9. exactamente un evento de outbox cuando exista un consumidor real del evento.

## 6. Evento `CONEXA_SERVICE_CLOSED`

`packages/shared-events` ya reserva `CONEXA_SERVICE_CLOSED`, pero no se ha demostrado todavía un productor y consumidor operativo para este evento.

Por eso **no se debe emitir todavía** desde el writer de reseñas solamente para completar el contrato. Primero debe auditarse el consumidor y el mecanismo de replay/outbox.

## 7. Cambio mínimo propuesto

Una vez aprobado el gate de concurrencia:

- mantener el `reviewId` determinista;
- mantener la escritura dentro de una única transacción Firestore;
- leer el `serviceRequest` y la reseña antes de cualquier escritura;
- crear reputación y liquidación solamente cuando la reseña sea nueva o cuando el estado persistido indique que aún corresponde hacerlo;
- cambiar `REVIEW_PENDING -> CLOSED` dentro de la misma transacción;
- hacer repetidos llamados sobre `CLOSED` idempotentes;
- rechazar/anotar `CLOSED` sin reseña como anomalía, sin reparar silenciosamente;
- agregar pruebas de integración para cada caso de la matriz.

## 8. Criterio de salida

FASE 28 no se considera cerrada hasta contar con evidencia ejecutada de:

- 0 reseñas duplicadas;
- 0 doble incremento de reputación;
- 0 doble liquidación;
- 0 doble cierre;
- transición atómica `REVIEW_PENDING -> CLOSED`;
- retry idempotente;
- comportamiento seguro de `CLOSED`;
- sin acceso accidental a Firestore de producción durante las pruebas.
