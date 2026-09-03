# Auditoría de eliminación de cuenta — runtime

Fecha: 2026-09-03
Repositorio: `josemiranda5266-blip/Conexa-RMX-DEV`
Rama: `integration/conexa-unified`

## Verificación

La implementación definitiva se audita sobre `integration/conexa-unified`. No se ejecutaron tests ni build.

## Hallazgo P0

`server.ts` mantiene una implementación runtime de `/api/user/delete-account` que no utiliza `accountDeletionPolicy.ts`.

El endpoint sí autentica la solicitud y comprueba que el usuario autenticado solo pueda eliminar su propia cuenta, salvo administrador. Sin embargo, la secuencia operativa actual continúa siendo:

1. borrar primero el usuario de Firebase Auth;
2. borrar el documento principal de `/users/{userId}`;
3. intentar borrar `/users/{userId}/private/info`;
4. recorrer y anonimizar mensajes mediante `collectionGroup('messages')`;
5. intentar borrar archivos de verificación en Storage, pero absorbiendo errores individuales/globales;
6. registrar `admin_audit_logs`.

Esto contradice la política nueva de eliminación por etapas, donde la cuenta Auth debe eliminarse **después** de completar las etapas de limpieza de datos y almacenamiento.

## Riesgos concretos

- Si Auth se elimina y posteriormente falla Firestore, Storage o el registro de auditoría, el flujo queda parcialmente completado sin un checkpoint durable.
- El endpoint depende de `userId` enviado por el cliente para la comparación de autorización; debe normalizarse y el identificador efectivo debe derivarse de `auth.userId` para una eliminación propia.
- La eliminación no persiste `AccountDeletionCheckpoint`, por lo que un retry no puede determinar de forma fiable qué etapas ya fueron completadas.
- Los errores de Storage pueden quedar ocultos y el endpoint igualmente responder `DELETED`.
- El borrado físico de `/users/{userId}` antes de conservar/anonymizar referencias comerciales puede romper trazabilidad de transacciones, solicitudes, reseñas y conversaciones.
- El flujo no demuestra idempotencia completa frente a reintentos concurrentes.

## Infraestructura ya preparada

`src/server/accountDeletionPolicy.ts` define las etapas:

`REQUESTED → FIRESTORE_CLEANUP → STORAGE_CLEANUP → AUDIT_RECORDED → AUTH_ACCOUNT_DELETED → COMPLETED`

La política también define normalización del userId, transición secuencial y etapa terminal. La infraestructura está preparada conceptualmente, pero todavía no gobierna el endpoint runtime.

## Corrección estructural pendiente

El endpoint debe delegar en un servicio server-side idempotente que:

- derive el target propio desde `auth.userId`;
- cree/actualice un checkpoint durable por usuario;
- ejecute Firestore cleanup antes de Auth;
- preserve/anonymice registros comerciales necesarios;
- limpie mensajes y datos privados de forma reintentable;
- ejecute Storage cleanup como etapa explícita y verificable;
- registre auditoría antes de eliminar Auth;
- elimine Firebase Auth solamente cuando las etapas previas hayan alcanzado estado terminal;
- marque `COMPLETED` solo después de la eliminación Auth.

No se modifica `server.ts` en esta auditoría porque el archivo es monolítico (~154 KB) y las operaciones disponibles exigen reemplazo completo del contenido; una actualización parcial no segura podría truncar rutas críticas.

## Estado

**P0 abierto.** La política existe, pero la ejecución runtime todavía no está alineada.

## Verificación dinámica

No se ejecutaron tests ni build. Se reserva la validación dinámica para la etapa final.
