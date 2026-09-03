# RADAR — Consolidación de identidad de oportunidades

Fecha: 2026-09-03
Rama: `integration/conexa-unified`

## Estado

La identidad de oportunidades RADAR queda centralizada en `radarOpportunityIdentity.ts`.

`radarOpportunityService.ts` ahora resuelve una oportunidad existente mediante esta prioridad:

1. ID canónico (`RAD-...`), derivado de `sourceType + externalReference` o del seed estable de fuente/descripción/ciudad/provincia.
2. ID histórico generado por el servicio anterior (`buildOpportunityId(sourceType, idempotencyKey)`).
3. ID histórico anterior (`RADAR-${sha256(externalReference)}`).

Las nuevas oportunidades se crean con el ID canónico. Los documentos históricos no se renombran ni copian automáticamente.

## Decisión de seguridad

No se elimina todavía `radarPersistenceService.ts`. Sigue existiendo como capa histórica hasta verificar todos sus consumidores y retirar la lógica inline de `server.ts`.

## Bloqueo runtime restante

El endpoint real de `server.ts` continúa conteniendo lógica RADAR inline. Por lo tanto, la arquitectura nueva todavía debe conectarse al runtime HTTP antes de considerar la consolidación completa.

## Próximo paso

Extraer y conectar los endpoints RADAR restantes mediante handlers pequeños que deleguen en las capas de dominio/servicio/persistencia, evitando editar destructivamente el `server.ts` masivo.
