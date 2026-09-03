# Implementación — servicio de eliminación de cuenta

Fecha: 2026-09-03
Repositorio: `josemiranda5266-blip/Conexa-RMX-DEV`
Rama: `integration/conexa-unified`

## Avance

Se creó `src/server/accountDeletionService.ts` como capa de dominio/runtime para reemplazar progresivamente la eliminación destructiva inline de `server.ts`.

El servicio:

- normaliza el userId;
- persiste un checkpoint en `account_deletions/{userId}`;
- ejecuta las etapas en el orden definido por `accountDeletionPolicy.ts`;
- elimina datos privados y proyecciones internas/públicas;
- anonimiza mensajes enviados por el usuario;
- preserva la trazabilidad de registros comerciales mediante anonimización de ownership;
- ejecuta Storage como etapa explícita y sin ocultar errores;
- registra auditoría antes de eliminar Firebase Auth;
- elimina Firebase Auth solamente en la etapa `AUTH_ACCOUNT_DELETED`;
- trata `auth/user-not-found` como operación ya satisfecha;
- marca `COMPLETED` únicamente después de completar la eliminación de Auth;
- registra el último error en el checkpoint para facilitar reintentos.

## Limitación actual

El servicio todavía **no está conectado al endpoint `/api/user/delete-account`** de `server.ts`. La integración queda deliberadamente separada porque `server.ts` es monolítico y una sustitución parcial no segura podría afectar otras rutas.

También queda pendiente ampliar la anonimización de ownership a todos los posibles campos profesionales de registros comerciales y diseñar una estrategia de concurrencia más fuerte si el endpoint puede recibir solicitudes simultáneas.

## Estado

La arquitectura de eliminación pasa de una política declarativa a una implementación ejecutable. El P0 runtime continúa abierto hasta integrar el servicio en `server.ts`.

## Verificación dinámica

No se ejecutaron tests ni build. Se mantiene la validación dinámica para la etapa final.
