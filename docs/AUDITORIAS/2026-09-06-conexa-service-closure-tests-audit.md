# FASE 27.10 — AUDITORÍA DE COBERTURA DE PRUEBAS DEL CIERRE CONEXA

**Fecha:** 2026-09-06  
**Rama:** `integration/conexa-unified`  
**Estado:** SUPERADA PARCIALMENTE — infraestructura mínima y pruebas puras agregadas; integración Firestore aún pendiente.

## Objetivo

Determinar si el repositorio actual contiene una infraestructura y cobertura reproducible suficiente para demostrar la seguridad de `REVIEW_PENDING -> CLOSED`, idempotencia de reviews/reputación/outbox y concurrencia.

## Hallazgo principal — P1

La inspección inicial no mostraba una suite específica para `reviewService`, `reviewRoute`, `jobStateMachine` o el cierre de servicios. El `package.json` raíz tampoco tenía un script específico para este lifecycle. Esto impedía certificar el contrato completo.

## Infraestructura actual — FASE 27.11

Se eligió la infraestructura mínima ya disponible en el repositorio, evitando introducir Vitest/Jest como dependencia adicional:

- Node `node:test` como runner estándar;
- `tsx` ya presente como devDependency para ejecutar TypeScript;
- nuevo script raíz `test:conexa-closure`;
- nueva suite `tests/conexa-service-closure.test.ts`.

Node mantiene `node:test` como test runner estable desde Node 20. citeturn0search0

El proyecto ya declara `tsx` y TypeScript en `devDependencies`, por lo que esta fase no agrega un framework de testing innecesario. fileciteturn152file0L2-L2

## Cobertura incorporada

La suite nueva cubre lógica pura, sin Firebase:

1. `REVIEW_PENDING -> CLOSED` mediante `CLOSE_JOB`;
2. `CLOSED` como estado sin acciones permitidas en la máquina actual;
3. compatibilidad de reviews desde `COMPLETED`;
4. elegibilidad desde `REVIEW_PENDING`;
5. rechazo de `CLOSED` como estado no elegible para crear una nueva review;
6. mismatch de cliente/profesional;
7. normalización de IDs, comentario y ratings;
8. rechazo de rating fuera de rango y comentario inválido.

La máquina de estados productiva confirma que `CLOSE_JOB` sólo permite `REVIEW_PENDING -> CLOSED`. fileciteturn153file0L2-L2

La política productiva acepta `COMPLETED` y `REVIEW_PENDING` para compatibilidad, pero rechaza otros estados, incluyendo `CLOSED`. fileciteturn154file0L2-L2

## Cambio de package

Se agregó únicamente:

```text
"test:conexa-closure": "tsx --test tests/conexa-service-closure.test.ts"
```

No se modificó todavía el runtime productivo ni se implementó `CLOSED` dentro de `reviewService`.

## Limitación importante

Los tests fueron **registrados en el repositorio pero no ejecutados desde esta auditoría remota**. Por lo tanto, no se debe declarar todavía `PASS` de ejecución ni afirmar que el código compila en el entorno local hasta ejecutar el comando en el checkout real.

## Próximo nivel — Firestore Emulator

La siguiente fase debe probar la transacción real con Firestore Emulator. Firebase documenta el Emulator Suite como mecanismo para pruebas locales y automatizadas sin tocar datos de producción. citeturn0search1turn0search3

Debe cubrir como mínimo:

- creación de review + cierre;
- review ya existente + `REVIEW_PENDING`;
- `CLOSED` + review existente;
- `CLOSED` sin review como anomalía;
- dos solicitudes concurrentes;
- retry después de commit exitoso;
- settlement exactamente una vez;
- reputación exactamente una vez;
- outbox exactamente una vez.

Firebase advierte que las transacciones pueden ejecutarse nuevamente ante conflictos concurrentes, por lo que el callback no debe depender de efectos secundarios no idempotentes. citeturn0search5

También debe considerarse que el Emulator no reproduce absolutamente todos los comportamientos de producción, especialmente algunos aspectos de concurrencia y límites; por ello una prueba verde del emulator será evidencia fuerte de integración, pero no reemplazará la revisión de diseño. citeturn0search4

## Criterio de aprobación antes del writer canónico

No implementar ni activar `CONEXA_SERVICE_CLOSED` hasta conseguir como mínimo:

- **0 duplicados de review** bajo concurrencia;
- **0 doble incremento de reputación**;
- **0 doble settlement**;
- **0 duplicados de outbox**;
- `REVIEW_PENDING -> CLOSED` demostrado atómicamente;
- retry idempotente demostrado;
- `CLOSED` repetido como operación segura;
- anomalías `CLOSED` sin review detectadas y no reparadas silenciosamente.

## Veredicto FASE 27.11

**INFRAESTRUCTURA MÍNIMA CREADA — INTEGRACIÓN AÚN BLOQUEADA.**

Ya existe una primera batería reproducible de lógica pura y un comando explícito para ejecutarla. Esto elimina el bloqueo de infraestructura básica, pero todavía falta la prueba de persistencia/concurrencia con Firestore Emulator antes de tocar el writer canónico.
