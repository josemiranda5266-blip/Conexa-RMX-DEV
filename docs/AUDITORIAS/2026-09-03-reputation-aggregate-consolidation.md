# Auditoría — consolidación de agregados de reputación

Fecha: 2026-09-03
Rama definitiva: `integration/conexa-unified`

## Hallazgo

Existían varias implementaciones de la misma fórmula de reputación:

- `reputationAggregateService.ts`
- `reputationService.ts`
- `reviewReputationProjection.ts`
- lógica local en `reviewService.ts`

Esto podía provocar divergencia entre la reputación almacenada en el usuario y la proyección pública.

## Corrección aplicada

`reviewService.ts` ahora usa `calculateUpdatedReputation()` de `reputationService.ts` como fuente canónica de la fórmula.

La creación de la Review, el cálculo de reputación y la actualización del usuario/proyección pública permanecen dentro de la misma transacción.

## Pendiente

Todavía quedan helpers históricos que deben revisarse por uso real antes de eliminar archivos. No se eliminaron automáticamente para evitar romper imports no detectados.

La integración del runtime HTTP y la sustitución del escritor legacy del AppContext continúan pendientes.
