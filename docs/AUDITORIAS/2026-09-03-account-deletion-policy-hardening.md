# Hardening — política de eliminación de cuenta

Fecha: 2026-09-03
Rama objetivo: `integration/conexa-unified`

## Verificación de alcance

Se verificó `integration/conexa-unified` antes de la modificación. La política auditada fue `src/server/accountDeletionPolicy.ts`.

## Correcciones realizadas

1. `normalizeDeletionUserId()` ya no convierte silenciosamente valores no-string mediante `String(...)`. Un `userId` numérico, objeto u otro tipo inválido se rechaza.
2. Se agregó `getNextDeletionStage()` para que el futuro workflow pueda avanzar de forma determinista sin duplicar conocimiento de la máquina de estados.
3. Se mantiene la transición estricta de una sola etapa hacia adelante o repetición de la etapa actual, permitiendo reintentos idempotentes.
4. La eliminación de Firebase Auth continúa conceptualmente al final de la secuencia; esta política por sí sola no integra todavía el endpoint monolítico de `server.ts`.

## Estado

La política de dominio quedó más estricta y preparada para integración, pero el P0 de producción permanece abierto porque `/api/user/delete-account` todavía debe adoptar esta máquina de estados y persistir checkpoints antes de eliminar Auth.

No se ejecutaron tests ni build, de acuerdo con la fase actual del proyecto.

## Próximo paso

Integrar el workflow en el backend sin modificar `server.ts` de forma insegura: primero obtener una estrategia de edición quirúrgica que preserve íntegramente el archivo monolítico, y luego conectar las fases Firestore → Storage → auditoría → Auth → COMPLETED.
