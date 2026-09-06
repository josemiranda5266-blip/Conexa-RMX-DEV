# FASE 28 — DISEÑO DEL CIERRE ATÓMICO DE SERVICIO

**Proyecto:** CONEXA-RMX-DEV  
**Rama:** `integration/conexa-unified`  
**Fecha:** 2026-09-06  
**Estado:** GATE DE CONCURRENCIA APROBADO — CIERRE ATÓMICO AÚN NO IMPLEMENTADO

## 1. Gate previo

La implementación del cierre `REVIEW_PENDING -> CLOSED` quedó bloqueada hasta obtener evidencia local de que la prueba de concurrencia contra Firestore Emulator pasa.

Comando ejecutado:

```bash
pnpm test:conexa-review-emulator
```

**Resultado ejecutado el 2026-09-06:** PASS.

Salida relevante:

```text
✔ CONEXA review: two concurrent writes converge to one review (33552.0274ms)
ℹ tests 1
ℹ pass 1
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 60072.7943
+  Script exited successfully (code 0)
```

La ejecución levantó Firestore Emulator con el proyecto demo `demo-conexa-unified` y terminó correctamente con código 0. El CLI informó explícitamente que el proyecto demo utiliza configuración emulada y que los servicios no emulados no pueden ser accedidos para ese proyecto.

La prueba demostró:

- una sola reseña ante dos escrituras concurrentes;
- un solo incremento de `reviewCount`;
- una sola liquidación de la transacción `SERVICE_COMPLETED`;
- mismo `reviewId` determinista en ambas respuestas;
- ejecución contra Firestore Emulator del proyecto `demo-conexa-unified`, no contra el proyecto productivo;
- el estado del servicio continúa `REVIEW_PENDING` mientras el cierre todavía no está implementado.

### Evidencia y límite de la prueba

El PASS es válido para el escenario de concurrencia implementado en `tests/conexa-review-concurrency.emulator.test.ts`. No equivale por sí solo a una certificación de comportamiento idéntico en producción: Firebase documenta que el Emulator no reproduce toda la semántica de transacciones de producción y puede diferir en escenarios de concurrencia. Cloud Firestore de producción sí garantiza aislamiento serializable y sus clientes de servidor reintentan transacciones ante contención. Por lo tanto, la prueba local es un gate necesario, pero no sustituye pruebas posteriores contra un entorno controlado de integración.

La ejecución también mostró un `MetadataLookupWarning` de Node (`code = UNKNOWN`). No provocó fallo: el test terminó con `pass 1`, `fail 0` y código 0. Debe investigarse si vuelve a aparecer en ejecuciones posteriores, pero no bloquea este gate.

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

El gate ejecutado cubre el escenario base de dos escrituras concurrentes del mismo servicio. Antes de declarar la implementación completa y segura se deben cubrir además:

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

Con el gate de concurrencia aprobado:

- mantener el `reviewId` determinista;
- mantener la escritura dentro de una única transacción Firestore;
- leer el `serviceRequest` y la reseña antes de cualquier escritura;
- crear reputación y liquidación solamente cuando la reseña sea nueva o cuando el estado persistido indique que aún corresponde hacerlo;
- cambiar `REVIEW_PENDING -> CLOSED` dentro de la misma transacción;
- hacer repetidos llamados sobre `CLOSED` idempotentes;
- rechazar/anotar `CLOSED` sin reseña como anomalía, sin reparar silenciosamente;
- agregar pruebas de integración para cada caso de la matriz.

## 8. Criterio de salida

El gate de concurrencia de FASE 28 queda **APROBADO**.

FASE 28 completa seguirá requiriendo evidencia ejecutada de:

- 0 reseñas duplicadas;
- 0 doble incremento de reputación;
- 0 doble liquidación;
- 0 doble cierre;
- transición atómica `REVIEW_PENDING -> CLOSED`;
- retry idempotente;
- comportamiento seguro de `CLOSED`;
- sin acceso accidental a Firestore de producción durante las pruebas;
- contrato de `CONEXA_SERVICE_CLOSED` validado antes de emitir el evento.
