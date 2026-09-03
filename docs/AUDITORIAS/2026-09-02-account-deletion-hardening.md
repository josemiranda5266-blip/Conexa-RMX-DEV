# CONEXA — Auditoría de eliminación de cuenta

## Repositorio y rama

- Repositorio: `josemiranda5266-blip/Conexa-RMX-DEV`
- Rama: `integration/conexa-unified`
- Fecha: 2026-09-02

## Hallazgo

El endpoint efectivo `/api/user/delete-account` ejecuta actualmente la eliminación de Firebase Authentication antes de completar la limpieza de Firestore y Storage. Si una etapa posterior falla, la cuenta puede quedar parcialmente eliminada y con datos residuales.

Además, algunos errores de Storage se absorben y el endpoint puede terminar informando éxito aunque la limpieza no haya sido completa.

## Corrección estructural preparada

Se creó `src/server/accountDeletionPolicy.ts` para formalizar una máquina de estados reentrante:

`REQUESTED → FIRESTORE_CLEANUP → STORAGE_CLEANUP → AUDIT_RECORDED → AUTH_ACCOUNT_DELETED → COMPLETED`

El modelo incluye:

- identificador de usuario normalizado;
- checkpoint durable por etapa;
- transición secuencial explícita;
- posibilidad de repetir la misma etapa después de un error;
- etapa terminal `COMPLETED`;
- separación conceptual entre limpieza de datos y eliminación irreversible de Authentication.

## Integración pendiente

El endpoint grande de `server.ts` todavía debe migrarse a este checkpoint durable. No se modifica automáticamente porque `GitHub.update_file` exige reemplazar el archivo completo y `server.ts` es un archivo monolítico de alto riesgo; una edición incompleta podría corromper rutas no relacionadas.

## Criterio de producción

La eliminación de Authentication debe ser la última operación irreversible. Un reintento después de un fallo debe continuar desde el último checkpoint sin duplicar efectos ni declarar éxito prematuramente.

No se ejecutaron tests ni build, según la política de auditoría vigente.
