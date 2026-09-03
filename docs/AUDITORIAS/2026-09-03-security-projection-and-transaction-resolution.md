# Auditoría y corrección — proyección de identidad y resolución transaccional

- Repositorio: `josemiranda5266-blip/Conexa-RMX-DEV`
- Rama: `integration/conexa-unified`
- Fecha: 2026-09-03
- Tests/build: no ejecutados por instrucción operativa.

## Verificación de contexto

La rama objetivo fue verificada antes de esta fase. El último commit observado fue `ce74e3c30414b48c3e9671f651ea04933c87931e`.

## Hallazgos

1. La resolución de transacciones ya está formalizada en `transactionIdentity.ts` y `transactionResolver.ts`, pero las rutas efectivas de `server.ts` todavía consultan por `serviceRequestId` con `limit(1)`. Eso mantiene una ventana de no determinismo si existieran transacciones históricas, reintentos o datos migrados.
2. `AppContext` hidrata correctamente el rol administrativo usando Custom Claims en la carga inicial, pero el listener realtime de `users/{uid}` hace merge directo del documento Firestore sobre `currentUser`. Esto puede volver a exponer en UI un `role` administrativo no respaldado por claims.
3. El problema anterior es principalmente de consistencia de autorización del cliente. No reemplaza la autoridad backend, pero puede producir menús, rutas y acciones visibles de forma incorrecta.

## Corrección aplicada

Se creó `src/security/currentUserProjection.ts`, que centraliza la proyección de un usuario autenticado:

- Mantiene los roles `ADMIN`/`SUPER_ADMIN` únicamente si el Custom Claim también los respalda.
- Impide que Firestore eleve privilegios administrativos por sí solo.
- Mantiene separada la capacidad profesional del modo activo.
- Permite reutilizar la misma regla en hidratación inicial y listeners realtime.

## Estado

- Regla de identidad/autorización frontend: encapsulada y lista para integración.
- Resolución canónica de transacción: encapsulada y lista para adopción por `server.ts`.
- Integración directa en `server.ts` y `AppContext.tsx`: pendiente porque ambos son archivos grandes y una sustitución parcial sin contenido completo presenta riesgo de corrupción.

## Siguiente fase

1. Integrar el proyector en el listener realtime de `AppContext` con reemplazo completo seguro.
2. Persistir `acceptedQuoteId` al aceptar el presupuesto.
3. Migrar `jobs/start`, `jobs/complete` y `reviews/create` a la referencia `txn-{acceptedQuoteId}`.
4. Convertir el webhook modular en la única autoridad efectiva.
5. Hacer idempotente y reentrante la eliminación de cuenta.
