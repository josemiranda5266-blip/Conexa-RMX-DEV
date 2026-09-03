# Estado de consolidación de persistencia RADAR

**Repositorio:** `josemiranda5266-blip/Conexa-RMX-DEV`  
**Rama:** `integration/conexa-unified`  
**Fecha:** 2026-09-03

## Resultado de la revisión

La revisión de `radarPersistenceService.ts`, `radarOpportunityPersistenceBoundary.ts` y `radarOpportunityService.ts` confirma que todavía existen tres capas con responsabilidades parcialmente superpuestas.

No se elimina ninguna de ellas todavía porque usan contratos diferentes y no hay evidencia suficiente para afirmar que `radarPersistenceService.ts` no tenga consumidores runtime adicionales. La consolidación debe hacerse después de identificar todos los consumidores de cada contrato, evitando una eliminación a ciegas.

## Decisión técnica

La frontera nueva `radarOpportunityPersistenceBoundary.ts` queda como candidato a límite canónico de Firestore para la operación create-or-read, pero antes de reemplazar servicios existentes se debe verificar:

- consumidores directos de `persistRadarOpportunity`;
- consumidores de `persistOpportunityDocument`;
- consumidores de `persistRadarConversion`;
- compatibilidad de IDs históricos;
- necesidad de preservar campos existentes en oportunidades ya persistidas.

## Riesgo identificado

`radarOpportunityService.ts` genera el ID a partir de `sourceType + idempotencyKey`, mientras `radarPersistenceService.ts` genera el ID directamente desde `externalReference`. Cambiar este comportamiento sin una migración explícita puede crear duplicados históricos.

Por lo tanto, **no se realiza todavía una migración destructiva de IDs**.

## Próximo paso

Auditar consumidores reales y definir una única función de identidad canónica compatible hacia atrás. Luego migrar las rutas runtime a ese límite, manteniendo los documentos históricos estables.

## Verificación

No se ejecutaron tests ni build. La verificación dinámica queda para la fase final acordada.
