# FASE 27.9 — DISEÑO DEL WRITER CANÓNICO DE CIERRE CONEXA

**Fecha:** 2026-09-06  
**Rama:** `integration/conexa-unified`  
**Estado:** DISEÑADO — implementación todavía pendiente de pruebas específicas de idempotencia/concurrencia.

## Objetivo

Definir el contrato exacto que debe convertir `REVIEW_PENDING -> CLOSED` sin duplicar reseñas, reputación, liquidación financiera ni `CONEXA_SERVICE_CLOSED`.

## Hallazgo crítico de la implementación actual

`src/server/reviewService.ts` usa un ID determinista para la reseña y realiza la operación dentro de una transacción Firestore. Sin embargo, si `reviewRef` ya existe, actualmente retorna inmediatamente `{ review, created: false }` antes de volver a inspeccionar o modificar `service_requests`. Por lo tanto, una reseña existente con el servicio todavía en `REVIEW_PENDING` **no puede completar actualmente el cierre**. fileciteturn127file0L2-L2

Además, la política acepta `COMPLETED` y `REVIEW_PENDING` como estados válidos para crear una reseña. La máquina de estados, en cambio, define conceptualmente `COMPLETED -> REVIEW_PENDING -> CLOSED`. fileciteturn128file0L2-L2 fileciteturn130file0L2-L2

Esto confirma que el writer futuro debe ser **state-driven**, no simplemente `create review if absent`.

## Contrato canónico propuesto

El endpoint autoritativo seguirá autenticando al usuario mediante Firebase y derivando `clientId` del token. `professionalId` y `serviceRequestId` serán datos de referencia, pero la autorización final se verificará contra el documento `service_requests/{id}`.

La operación completa debe ser una única transacción Firestore:

```text
POST /api/reviews/create
        |
        v
verifyAuthToken()
        |
        v
saveProfessionalReview()
        |
        +-- leer service_request
        +-- leer usuario cliente
        +-- leer profesional
        +-- leer review determinista
        +-- leer transacción financiera aplicable
        +-- leer eventOutbox determinista
        |
        +-- validar identidad/autoridad/estado
        |
        +-- si review NO existe:
        |      crear review
        |      recalcular reputación
        |      actualizar proyección pública/radar
        |
        +-- si review YA existe:
        |      NO recrear review
        |      NO volver a incrementar reputación
        |
        +-- si estado = COMPLETED:
        |      normalizar primero el estado a REVIEW_PENDING
        |      o definir explícitamente compatibilidad heredada
        |
        +-- si estado = REVIEW_PENDING:
        |      service_requests.status = CLOSED
        |
        +-- si estado = CLOSED:
        |      operación idempotente; no duplicar nada
        |
        +-- liquidar SERVICE_COMPLETED -> SETTLED si corresponde
        |
        +-- crear UN SOLO eventOutbox CONEXA_SERVICE_CLOSED
```

## Matriz de estados e idempotencia

| Estado al recibir solicitud | Review | Resultado esperado |
|---|---|---|
| `COMPLETED` | No existe | Compatible con legado; crear review y completar cierre según contrato final. Debe quedar `CLOSED`, sin dejar estado intermedio persistente. |
| `REVIEW_PENDING` | No existe | Crear review + reputación + liquidación + `CLOSED` + outbox. |
| `REVIEW_PENDING` | Ya existe | No duplicar review/reputación; completar `CLOSED` + outbox si todavía falta. |
| `CLOSED` | Ya existe | Idempotent success; no mutar reputación ni crear otro evento. |
| `CLOSED` | No existe | Anomalía de integridad; rechazar y registrar para reparación, no inventar una review. |
| Estado distinto | Cualquiera | Rechazar como estado no elegible. |

### Decisión sobre `COMPLETED`

La política actual acepta `COMPLETED` por compatibilidad. La implementación no debe introducir una secuencia observable `COMPLETED -> REVIEW_PENDING -> CLOSED` mediante dos commits separados. Si se conserva compatibilidad, el mismo writer debe llevar el registro al estado final `CLOSED` dentro de una única transacción, registrando metadatos suficientes para reconstruir el historial si el modelo los soporta.

## Idempotencia de reputación

Este punto requiere especial atención. La reseña tiene ID determinista, lo cual evita crear dos documentos para el mismo cliente/profesional/servicio. Pero la transacción actual recalcula el agregado y ejecuta `tx.update(professionalRef, reputationUpdate)` sólo cuando `reviewSnap` no existe. Eso es favorable para reintentos: cuando la review ya existe, el camino actual no vuelve a actualizar reputación. fileciteturn127file0L2-L2

El writer de cierre debe preservar esta propiedad: **la existencia de la review debe ser la barrera de idempotencia del agregado de reputación**. No se debe recalcular/incrementar reputación simplemente porque llega otro POST.

## Idempotencia del outbox

El productor `NEXORA_ORDER_COMPLETED` actual crea documentos `eventOutbox` con ID automático y por lo tanto no demuestra una convención de ID determinista para eventos de dominio. fileciteturn133file0L2-L2

Para `CONEXA_SERVICE_CLOSED`, el contrato recomendado es usar un documento determinista basado en el `serviceRequestId`, por ejemplo conceptualmente:

```text
CONEXA_SERVICE_CLOSED:{serviceRequestId}
```

El nombre exacto debe centralizarse en una función/factory compartida y no repetirse como string literal en distintos módulos.

La creación debe ser `tx.create()` o equivalente de creación exclusiva, no `set(..., {merge:true})`, para que una segunda ejecución no genere un segundo evento. Si el documento ya existe, la transacción debe tratarlo como evento ya materializado y continuar de forma idempotente.

## Concurrencia

Casos obligatorios antes de implementar:

1. doble click del mismo cliente;
2. dos dispositivos del mismo cliente;
3. retry HTTP después de timeout, cuando el primer commit sí ocurrió;
4. review creada pero cierre todavía pendiente por datos heredados;
5. dos solicitudes concurrentes cuando ninguna review existe;
6. dos solicitudes concurrentes cuando la review ya existe;
7. retry cuando el servicio ya está `CLOSED`;
8. outbox ya creado pero la respuesta HTTP original se perdió.

Firestore puede volver a ejecutar una función transaccional cuando un documento leído cambia por concurrencia; las transacciones son serializables y sus escrituras se aplican atómicamente. Por eso el callback no debe depender de efectos externos y toda decisión debe derivarse del estado persistido. citeturn1search0turn1search2

## Regla de no efectos externos dentro de la transacción

El writer no debe enviar mensajes, llamar APIs externas, publicar eventos fuera de Firestore ni ejecutar efectos irreversibles dentro del callback transaccional. Debe persistir el estado y el outbox, y otro proceso debe encargarse de la entrega. Firebase documenta explícitamente que una función transaccional puede ejecutarse varias veces y no debe modificar estado de aplicación directamente fuera de las operaciones de la transacción. citeturn1search0

## Drift HTTP

`reviewRoute.ts` expone el handler que actualmente utiliza `saveProfessionalReview()`. El handler autentica y devuelve `201` cuando crea una review y `200` cuando la operación es idempotente. fileciteturn129file0L2-L2

Debe existir **una sola ruta canónica** para la operación. El cliente activo utiliza `/api/reviews/create`, mientras existe otro cliente/servicio que referencia `/api/reviews`. Antes del cierre productivo se debe eliminar el drift o convertir explícitamente la ruta antigua en un wrapper compatible que delegue al mismo writer, sin duplicar lógica.

## Contrato de respuesta recomendado

```text
201 CREATED
  review creada + servicio cerrado en la misma operación

200 OK
  review ya existente y/o servicio ya cerrado; operación idempotente

400
  payload inválido

401
  token ausente/inválido

403
  identidad bloqueada/no autorizada

404
  servicio/usuario/profesional inexistente

409
  servicio en estado no elegible o inconsistencia de integridad
```

No se debe devolver `201` si la review ya existía.

## Puntos que NO deben resolverse todavía

- No producir todavía `CONEXA_SERVICE_CLOSED` hasta tener consumer/recovery real.
- No añadir un segundo botón `CLOSE_JOB` al frontend sin evidencia funcional adicional.
- No introducir un scheduler sólo para este evento antes de terminar el inventario de todos los eventos/outbox.
- No modificar reglas Firestore para permitir al cliente escribir `CLOSED`; el backend sigue siendo la autoridad.

## Severidad actual

- **P1 — lifecycle:** `REVIEW_PENDING -> CLOSED` todavía no tiene writer.
- **P1 — idempotencia heredada:** una review existente puede dejar el servicio en `REVIEW_PENDING` indefinidamente.
- **P1 — event contract:** el productor `CONEXA_SERVICE_CLOSED` todavía no debe activarse hasta disponer de consumer/recovery.
- **P1 — HTTP contract drift:** `/api/reviews` y `/api/reviews/create` deben converger.
- **Sin P0 confirmado en esta fase.**

## Siguiente fase — FASE 27.10

Antes de tocar producción del código:

1. localizar/crear la suite específica de lifecycle reviews;
2. implementar tests de doble envío y concurrencia;
3. definir factory determinista para `CONEXA_SERVICE_CLOSED`;
4. definir exactamente cómo se reparan registros heredados `COMPLETED`/`REVIEW_PENDING` con review existente;
5. recién entonces implementar el writer único y registrar los resultados de las pruebas.

## Referencias inspeccionadas

- `src/server/reviewService.ts`
- `src/server/reviewPolicy.ts`
- `src/server/reviewRoute.ts`
- `src/domain/jobStateMachine.ts`
- `apps/api-nexora/src/escrowService.ts`
- `docs/AUDITORIAS/2026-09-06-conexa-service-closure-audit.md`
