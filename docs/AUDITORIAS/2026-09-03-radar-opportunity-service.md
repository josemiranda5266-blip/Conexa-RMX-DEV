# Auditoría — RADAR Opportunity Service

Fecha: 2026-09-03
Repositorio: `josemiranda5266-blip/Conexa-RMX-DEV`
Rama: `integration/conexa-unified`

## Verificación previa

Se verificó que el trabajo definitivo continúa en el repositorio y rama indicados antes de la modificación.

## Avance

Se creó `src/server/radar/radarOpportunityPolicy.ts` como frontera de validación y normalización y `src/server/radar/radarOpportunityService.ts` como primera capa durable de persistencia.

## Correcciones estructurales introducidas

- límites explícitos para descripción, notas y referencias externas;
- validación de `sourceType`, urgencia, estado, consentimiento y método de contacto;
- validación de scores entre 0 y 100;
- normalización estricta de strings;
- clave de idempotencia estable mediante SHA-256;
- ID de oportunidad derivado de identidad estable, no de `Math.random()`;
- persistencia en `radar_opportunities`;
- creación idempotente mediante documento determinista y tolerancia a carrera de `ALREADY_EXISTS`;
- no se agrega ningún profesional ficticio como fallback;
- el servicio queda preparado para recibir los resultados reales del matching como dependencia explícita.

## Estado de integración

Este avance todavía no se considera integración completa del endpoint HTTP. El `server.ts` sigue conteniendo la implementación anterior de `/api/radar/opportunity`, porque es un archivo de aproximadamente 154 KB y reemplazarlo completo sin disponer de una copia íntegra segura puede provocar truncamiento. La extracción de servicio permite completar la integración posteriormente sin duplicar la lógica de dominio.

## Próximo paso técnico

Integrar el endpoint existente con este servicio y sustituir `MASTER_PROFESSIONAL_PROFILES` por `loadRadarCandidates()`, usando `findMatchingProfessionalCandidates()` para obtener candidatos reales y persistiendo el resultado.

## Verificación dinámica

No se ejecutaron tests ni build. Quedan reservados para la fase final, después de completar las correcciones estructurales.
