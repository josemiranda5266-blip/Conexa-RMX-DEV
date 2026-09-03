# Auditoría RADAR — Estado de fuente de candidatos

Fecha: 2026-09-03
Repositorio: `josemiranda5266-blip/Conexa-RMX-DEV`
Rama: `integration/conexa-unified`

## Verificación

El repositorio definitivo es `josemiranda5266-blip/Conexa-RMX-DEV`. La rama de trabajo definitiva es `integration/conexa-unified`.

## Estado técnico actual

La fuente server-side de RADAR está migrada a una proyección interna dedicada:

- `src/server/radar/radarCandidateRepository.ts` consulta `radar_candidates`, no `/users`.
- El lector mantiene un contrato mínimo `RadarCandidate` y un límite defensivo de 500 documentos.
- `radar_candidates/{userId}` se sincroniza desde `professionalProfileService.ts` dentro de la misma transacción que actualiza el perfil y la proyección pública.
- La proyección se construye mediante `toRadarCandidate`, por lo que quedan fuera credenciales, contacto privado, dirección exacta y otros campos ajenos al matching.
- `trustScore` permanece en la proyección interna y no se expone mediante `public_professional_profiles`.
- Las reglas de Firestore mantienen `radar_candidates` cerrado al cliente; el acceso queda reservado al backend.

## Resultado de la migración

La afirmación anterior de que el repositorio todavía leía `users` quedó obsoleta. La migración de **fuente de lectura** ya está implementada.

Esto elimina una de las principales lecturas innecesarias de `/users` para el RADAR server-side y establece una frontera de datos explícita entre perfil privado, proyección pública y candidato interno de matching.

## Riesgo residual

El lector todavía aplica `limit(500)` sin filtros específicos de oportunidad. Esto es una barrera de carga, no una estrategia definitiva de escalabilidad. Antes de producción a gran volumen, el matching server-side debe pasar a consultas acotadas por ubicación/profesión/estado o a una estrategia de particionado/paginación compatible con Firestore.

También queda pendiente integrar esta infraestructura con el endpoint productivo de `/api/radar/match` dentro de `server.ts`, que continúa siendo el principal punto de integración monolítico pendiente.

## Decisión arquitectónica

No se utiliza `public_professional_profiles` como fuente de RADAR porque esa colección está diseñada para consumo público y deliberadamente excluye `trustScore` y otros atributos internos.

La fuente interna `radar_candidates` es la frontera canónica para descubrimiento y scoring server-side.

## Verificación dinámica

No se ejecutaron tests ni build. La validación dinámica queda reservada para la etapa final, después de completar las correcciones estructurales pendientes.
