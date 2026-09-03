# RADAR Opportunity Matching Service — 2026-09-03

## Repositorio y rama

- Repositorio definitivo: `josemiranda5266-blip/Conexa-RMX-DEV`
- Rama definitiva: `integration/conexa-unified`
- No se modifican otros repositorios como fuente de implementación.

## Avance

Se agregó `src/server/radar/radarOpportunityMatchingService.ts`.

El servicio establece el flujo backend:

`radar_opportunity input → radar_candidates → professional matching → MatchedProfessional[]`

La fuente server-side es `radar_candidates`, no `/users` ni `public_professional_profiles`.

## Contrato

El servicio recibe únicamente los campos necesarios para matching:

- category
- subcategory
- city
- province
- neighborhood

Carga candidatos mediante `loadRadarCandidates()` y aplica `findMatchingProfessionalCandidates()` con límite controlado.

Los resultados se proyectan como `MatchedProfessional` y reciben ranking determinista según el orden del motor.

## Corrección realizada

Durante la implementación se detectó que `ProfessionalMatch` expone `candidate`, `matchScore` y `matchReasons`; no existe `matchedProfessional` dentro de ese contrato. El servicio quedó corregido para usar el contrato real.

## Identificadores de Opportunity

También se endureció `buildOpportunityId()` para utilizar SHA-256 y no un hash FNV de 32 bits. El identificador mantiene determinismo y reduce sustancialmente el riesgo de colisiones para oportunidades persistidas.

## Estado de integración

El servicio ya está preparado para ser utilizado por el endpoint HTTP, pero `server.ts` todavía contiene la implementación inline del endpoint `/api/radar/opportunity`. La integración runtime completa queda pendiente hasta poder modificar ese archivo grande de forma segura sin reemplazar accidentalmente contenido no relacionado.

## Próximo paso

Integrar la persistencia y matching del servicio en el endpoint HTTP y eliminar la generación de oportunidades mock/aleatoria del flujo productivo. Después continuar con Contact/Conversion persistentes.

## Restricción de verificación

No se ejecutaron tests ni build. La verificación final se realizará cuando terminen las correcciones estructurales.
