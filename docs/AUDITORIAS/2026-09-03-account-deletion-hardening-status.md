# Account deletion — hardening status

Fecha: 2026-09-03
Rama: `integration/conexa-unified`

## Estado auditado

La eliminación de cuenta ya dispone de una máquina de estados durable y reentrante mediante `account_deletions/{userId}`. El servicio conserva registros comerciales y anonimiza ownership de cliente, elimina proyecciones públicas/RADAR, limpia mensajes del usuario y elimina documentos de verificación del Storage.

## Riesgos pendientes

1. `normalizeDeletionUserId()` todavía debe rechazar `/` explícitamente para evitar IDs de documento inválidos.
2. `readOrCreateCheckpoint()` usa `get()` + `create()`, por lo que dos solicitudes concurrentes pueden competir por la creación inicial. Debe hacerse idempotente frente a `ALREADY_EXISTS`.
3. La anonimización actual busca `clientId`; debe auditarse también ownership profesional (`professionalId` y equivalentes) para no dejar referencias personales.
4. La integración del endpoint HTTP legacy de `server.ts` todavía debe delegar al servicio durable. Mientras eso no ocurra, el runtime puede seguir ejecutando la eliminación antigua.

No se ejecutaron tests/build por la política de trabajo actual: primero completar correcciones estructurales.
