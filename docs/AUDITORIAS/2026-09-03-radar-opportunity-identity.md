# Auditoría RADAR — identidad compatible hacia atrás

**Repositorio:** `josemiranda5266-blip/Conexa-RMX-DEV`  
**Rama:** `integration/conexa-unified`  
**Fecha:** 2026-09-03

## Hallazgo

Las capas de persistencia RADAR existentes no utilizaban la misma identidad documental. `radarOpportunityService.ts` usa una identidad derivada de `sourceType + externalReference` mediante `buildOpportunityId`, mientras `radarPersistenceService.ts` usa `externalReference` directamente para construir IDs de la forma `RADAR-<sha256>`. fileciteturn1346file0 fileciteturn1347file0

Eliminar o sustituir una de estas implementaciones sin una estrategia de compatibilidad podría duplicar oportunidades históricas.

## Corrección estructural

Se creó `src/server/radar/radarOpportunityIdentity.ts` como primer límite explícito de identidad.

Se reforzó posteriormente el módulo con `buildLegacyRadarOpportunityId(externalReference)`, que calcula explícitamente el ID histórico `RADAR-<sha256(externalReference)>` sin modificar documentos existentes.

La función `buildRadarOpportunityIdentity` produce:

- `canonicalId`: identidad nueva basada en `sourceType + externalReference` cuando existe referencia externa;
- `idempotencyKey`: SHA-256 del mismo material estable;
- `legacyExternalReferenceId`: ID histórico calculable cuando existe `externalReference`.

Para eventos sin `externalReference`, mantiene una identidad determinista basada en fuente, descripción y ubicación.

## Política de migración

No se migran ni renombran documentos existentes en esta etapa. La compatibilidad se establece a nivel de cálculo de identidad para que la siguiente fase pueda hacer lectura canónica con fallback histórico antes de retirar cualquier servicio redundante.

## Próximo paso

Actualizar `radarOpportunityService` y la nueva frontera de persistencia para consumir este módulo, priorizando el ID canónico y utilizando el ID histórico únicamente como fallback de lectura. Después se podrá retirar gradualmente la lógica duplicada.

## Verificación

No se ejecutaron tests ni build. La verificación dinámica permanece para la fase final.
