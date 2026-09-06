# FASE 27.14 — PLAN DE PRUEBA DE CONCURRENCIA FIRESTORE PARA REVIEW CONEXA

**Fecha:** 2026-09-06  
**Rama:** `integration/conexa-unified`  
**Estado:** DISEÑO — todavía no ejecutada contra Firestore Emulator.

## Objetivo

Probar la transacción actual de `saveProfessionalReview()` bajo concurrencia real antes de modificar el writer canónico de cierre.

La prueba debe validar el estado persistido, no solamente el resultado de las promesas HTTP.

## Evidencia del código actual

`reviewService.ts` obtiene request, cliente, profesional y review determinista dentro de `db.runTransaction()`. Cuando no existe review, también calcula la reputación y localiza una eventual transacción `SERVICE_COMPLETED` dentro de la misma transacción. La review se crea con `tx.create`, la reputación con `tx.update` y el settlement con `tx.update`. fileciteturn176file0L2-L2

`firebaseAdmin.ts` obtiene Firestore mediante Firebase Admin y actualmente no contiene una rama explícita de conexión al Emulator Suite. fileciteturn182file0L2-L2

La política acepta `COMPLETED` por compatibilidad y `REVIEW_PENDING` como estado canónico de feedback. fileciteturn177file0L2-L2

La máquina de estados define `REVIEW_PENDING -> CLOSED` mediante `CLOSE_JOB`, pero esa transición todavía no está materializada por `saveProfessionalReview()`. fileciteturn178file0L2-L2

## Prueba A — doble submit concurrente

Preparar un único `service_requests/{id}` válido, un cliente, un profesional y una transacción `SERVICE_COMPLETED`.

Ejecutar dos llamadas concurrentes a `saveProfessionalReview()` con exactamente los mismos IDs y contenido.

### Invariantes

- exactamente 1 documento `reviews/{deterministicId}`;
- exactamente 1 creación de review;
- `reviewCount` incrementado una sola vez;
- una sola aplicación efectiva de settlement;
- perfil público consistente con la reputación final;
- Radar consistente con la reputación final;
- ninguna escritura parcial después de que una transacción falle.

Firestore documenta que las transacciones pueden reintentarse cuando existe contención y que las funciones transaccionales pueden ejecutarse más de una vez. Por ello la función no debe depender de efectos externos no idempotentes. citeturn0search3turn0search4

## Prueba B — review ya existente + REVIEW_PENDING

Precrear la review determinista y dejar el service request en `REVIEW_PENDING`.

Ejecutar `saveProfessionalReview()`.

### Resultado esperado actual

La implementación actual retorna `created: false` inmediatamente y no cierra el service request. Esto debe quedar documentado como comportamiento previo al cambio canónico, no como PASS funcional del lifecycle. fileciteturn176file0L2-L2

## Prueba C — dos dispositivos con contenido idéntico

Simular dos procesos independientes que envían la misma review al mismo tiempo. El criterio es el mismo que en la Prueba A, verificando especialmente que el `reviewId` determinista impida duplicación.

## Prueba D — retry después de contención

Forzar o provocar contención sobre los documentos leídos por la transacción y verificar que un reintento no produzca una segunda aplicación de reputación ni settlement.

## Prueba E — estado CLOSED

Dejar el request en `CLOSED` y ejecutar el endpoint actual.

Resultado esperado actual: la política de review no considera `CLOSED` elegible y debe rechazar la operación; no debe modificar reputación ni settlement. fileciteturn177file0L2-L2

## Limitación del Emulator Suite

Firebase recomienda el Emulator Suite para pruebas locales sin tocar producción. El emulador permite automatizar suites mediante `emulators:exec`, pero Firebase advierte que no replica absolutamente todo el comportamiento transaccional de producción; las pruebas de concurrencia pueden necesitar timeouts mayores y las consultas/índices tienen diferencias. Por eso un PASS del emulador será evidencia de integración local, no prueba definitiva de comportamiento productivo. citeturn0search0turn0search1

## No modificar todavía

No agregar `firebase-tools`, configuración de emuladores ni cambios en `reviewService.ts` en esta fase. Primero se debe decidir la estrategia mínima de test y confirmar que el proyecto puede conectarse al Emulator Suite sin riesgo de utilizar producción.

## Criterios de salida de FASE 27.14

La fase podrá considerarse aprobada únicamente cuando exista evidencia reproducible de:

1. una sola review bajo doble submit;
2. reputación exactamente una vez;
3. settlement exactamente una vez;
4. consistencia de proyecciones;
5. retry seguro ante contención;
6. comportamiento explícito de review existente;
7. comportamiento explícito de `CLOSED`;
8. ausencia de escritura a `service_requests.status` por parte del código actual, antes de implementar el cierre.

## Veredicto

**FASE 27.14 — PENDIENTE DE EJECUCIÓN.**

El diseño de prueba está cerrado. El siguiente paso es implementar la infraestructura mínima y segura para ejecutar esta suite contra un Firestore Emulator, sin tocar datos de producción y sin introducir todavía el writer `CONEXA_SERVICE_CLOSED`.
