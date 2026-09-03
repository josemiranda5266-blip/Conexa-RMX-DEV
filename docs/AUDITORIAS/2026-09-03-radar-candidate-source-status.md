# Auditoría RADAR — Estado de fuente de candidatos

Fecha: 2026-09-03
Repositorio: `josemiranda5266-blip/Conexa-RMX-DEV`
Rama: `integration/conexa-unified`

## Verificación

El repositorio definitivo es `josemiranda5266-blip/Conexa-RMX-DEV`. La rama de trabajo definitiva es `integration/conexa-unified`.

## Estado técnico

`src/server/radar/radarCandidateRepository.ts` ya define una fuente server-side con un contrato mínimo `RadarCandidate` y un máximo de 500 documentos.

Sin embargo, la implementación actual todavía lee `users`. Por lo tanto, **no debe considerarse una migración completa de la fuente**. La ganancia actual es de encapsulación y reducción de datos hacia el matcher, no de reducción de lectura en Firestore.

## Próximo diseño correcto

La fuente definitiva debe ser una proyección interna específica de RADAR, por ejemplo `radar_candidates`, con solamente:

- identidad pública necesaria para el matching;
- professionId/professionName;
- specialties;
- city/province/approxZone;
- rating/reviewCount/jobsCompleted;
- trustScore interno;
- availabilityStatus;
- verification flags;
- avatar.

`trustScore` debe permanecer fuera de las proyecciones públicas.

La proyección debe actualizarse junto con los cambios relevantes del perfil profesional y de reputación, y el lector RADAR debe consultar esa colección directamente.

## Decisión arquitectónica

No se migrará RADAR directamente a `public_professional_profiles`, porque esa colección está diseñada para consumo público y deliberadamente excluye `trustScore` y otros atributos internos.

No se modifica `server.ts` en esta etapa debido a su tamaño y al riesgo de reemplazo incompleto. La integración del endpoint se hará cuando exista una operación de edición segura y completa.

## Verificación dinámica

No se ejecutaron tests ni build. La validación dinámica queda reservada para la etapa final.
