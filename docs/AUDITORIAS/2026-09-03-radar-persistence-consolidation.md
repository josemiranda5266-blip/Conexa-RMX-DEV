# Auditoría RADAR — consolidación del límite de persistencia

**Fecha:** 2026-09-03  
**Repositorio:** `josemiranda5266-blip/Conexa-RMX-DEV`  
**Rama definitiva:** `integration/conexa-unified`

## Hallazgo

La capa RADAR contenía dos servicios con responsabilidad parcialmente duplicada sobre `radar_opportunities`: `radarPersistenceService.ts` y `radarOpportunityService.ts`. Ambos implementaban creación idempotente mediante identificadores deterministas y tratamiento de carreras `ALREADY_EXISTS`, pero con contratos y límites diferentes.

Esta duplicidad aumenta el riesgo de que futuros cambios corrijan un flujo y dejen otro con semántica distinta.

## Corrección estructural

Se introdujo `src/server/radar/radarOpportunityPersistenceBoundary.ts` como límite canónico de almacenamiento para oportunidades.

La responsabilidad de este límite es deliberadamente pequeña:

- resolver identidad determinista del documento;
- ejecutar `create-or-read` sobre Firestore;
- absorber una carrera concurrente donde otro escritor haya creado el documento;
- devolver una representación consistente del documento existente.

La validación de negocio, normalización de payload, análisis IA y lifecycle permanecen fuera de esta capa.

## Objetivo de integración

Los servicios RADAR existentes deben migrar progresivamente a este límite sin cambiar los IDs de oportunidades ya persistidas. La integración debe preservar compatibilidad con los documentos actuales antes de retirar las implementaciones duplicadas.

## Estado

La frontera canónica ya existe. La siguiente etapa es reemplazar las implementaciones internas duplicadas de los servicios existentes y verificar referencias antes de eliminar código legado.

No se ejecutaron tests ni build.
