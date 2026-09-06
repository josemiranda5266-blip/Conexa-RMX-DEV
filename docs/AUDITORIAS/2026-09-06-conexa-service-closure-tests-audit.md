# FASE 27.10 — AUDITORÍA DE COBERTURA DE PRUEBAS DEL CIERRE CONEXA

**Fecha:** 2026-09-06  
**Rama:** `integration/conexa-unified`  
**Estado:** BLOQUEADA — falta una suite específica de lifecycle Reviews antes de implementar el writer canónico.

## Objetivo

Determinar si el repositorio actual contiene una infraestructura y cobertura reproducible suficiente para demostrar la seguridad de `REVIEW_PENDING -> CLOSED`, idempotencia de reviews/reputación/outbox y concurrencia.

## Hallazgo principal — P1

La inspección completa del árbol de `integration/conexa-unified` no muestra un directorio de tests dedicado ni archivos de pruebas específicos para `reviewService`, `reviewRoute`, `jobStateMachine` o el cierre de servicios. La búsqueda de referencias a `tests`, `vitest`, `jest` y `node:test` tampoco produjo resultados útiles.

El árbol sí contiene los módulos productivos de Reviews y la documentación de auditoría, pero no una suite equivalente que permita demostrar los escenarios de concurrencia definidos en FASE 27.9. fileciteturn135file0L2-L2

## Infraestructura actual

El `package.json` raíz no declara Vitest, Jest ni otro runner dedicado. Declara TypeScript/tsx, pero los scripts disponibles son principalmente `dev`, `build`, `lint` y `build:legacy-conexa`. No existe actualmente un script de test raíz específico para este lifecycle. fileciteturn143file0L2-L2

Esto no significa que el proyecto no pueda probarse; significa que **no existe todavía evidencia reproducible en el repositorio para certificar este contrato concreto**.

## Riesgo específico detectado

`reviewService.ts` tiene una barrera de idempotencia útil: el ID determinista de la review y el retorno temprano cuando la review ya existe. Sin embargo, ese mismo retorno temprano actualmente impide reparar/cerrar un `service_request` que permanece en `REVIEW_PENDING`. fileciteturn127file0L2-L2

Por lo tanto, los tests futuros deben probar separadamente:

1. review inexistente + `REVIEW_PENDING`;
2. review existente + `REVIEW_PENDING`;
3. review existente + `CLOSED`;
4. `CLOSED` sin review como anomalía;
5. `COMPLETED` como compatibilidad heredada;
6. estado no elegible;
7. dos solicitudes simultáneas sin review;
8. dos solicitudes simultáneas con review existente;
9. retry después de commit exitoso;
10. outbox ya existente;
11. reputación exactamente una vez;
12. liquidación financiera exactamente una vez.

## Reputación

La implementación actual sólo ejecuta la actualización de reputación cuando la review todavía no existe, lo que es una propiedad positiva que debe conservarse. La proyección matemática también incrementa el contador de reviews en una unidad por aplicación. fileciteturn127file0L2-L2 fileciteturn144file0L2-L2

El test crítico debe demostrar que dos llamadas concurrentes no producen dos reviews ni dos incrementos de `reviewCount`.

## Contrato HTTP

`reviewRoute.ts` ya distingue creación (`201`) de operación idempotente (`200`). La suite debe verificar que ese contrato se mantenga después de incorporar el cierre canónico. fileciteturn129file0L2-L2

También debe cubrirse el drift existente porque `reviewApiService.ts` sigue llamando `/api/reviews`, mientras el flujo activo documentado utiliza `/api/reviews/create`. fileciteturn145file0L2-L2

## Estrategia de pruebas recomendada

### Nivel 1 — unitario puro

Probar sin Firebase:

- matriz de transiciones de `jobStateMachine`;
- normalización de Review;
- elegibilidad;
- generación determinista de `reviewId`;
- generación determinista del `eventOutboxId` futura;
- cálculo de reputación.

### Nivel 2 — integración Firestore emulator

Probar la transacción completa contra Firestore Emulator:

- creación de review;
- transición a `CLOSED`;
- settlement;
- outbox;
- reintentos;
- concurrencia.

### Nivel 3 — HTTP

Probar autenticación, códigos HTTP, payloads inválidos, retry y convergencia de rutas.

No se debe simular únicamente el resultado final; los tests deben inspeccionar el estado persistido después de cada escenario.

## Criterio de aprobación antes de FASE 27.11

No implementar ni activar `CONEXA_SERVICE_CLOSED` hasta conseguir como mínimo:

- **0 duplicados de review** bajo concurrencia;
- **0 doble incremento de reputación**;
- **0 doble settlement**;
- **0 duplicados de outbox**;
- `REVIEW_PENDING -> CLOSED` demostrado atómicamente;
- retry idempotente demostrado;
- `CLOSED` repetido como operación segura;
- anomalías `CLOSED` sin review detectadas y no reparadas silenciosamente.

## Veredicto

**FASE 27.10 — NO CERRADA.** El código productivo tiene algunas propiedades favorables de idempotencia, pero el repositorio no aporta todavía una batería reproducible que demuestre el lifecycle completo bajo concurrencia.

El siguiente paso correcto es crear la infraestructura mínima de tests y probar primero la lógica pura y luego la transacción Firestore. Recién después debe implementarse el writer canónico.
