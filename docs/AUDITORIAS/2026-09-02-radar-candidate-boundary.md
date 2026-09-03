# Auditoría — frontera de candidatos del RADAR

Fecha: 2026-09-02
Rama definitiva: `integration/conexa-unified`

## Verificación

La rama `integration/conexa-unified` fue verificada antes de esta modificación. El trabajo definitivo continúa exclusivamente sobre esta rama.

## Hallazgo

`src/domain/professionalMatching.ts` ya dispone del contrato `ProfessionalCandidate`, pero su función pública principal `findMatchingProfessionals()` recibe `UserProfile[]` y normaliza el perfil completo antes del matching.

Eso mantiene una dependencia arquitectónica innecesaria con el documento privado `/users` y dificulta trasladar las reglas sensibles de matching al backend.

## Corrección estructural

Se agregó:

`src/domain/professionalMatchingCandidates.ts`

Este módulo introduce `findMatchingProfessionalCandidates()` y `matchCandidateProfiles()`, que trabajan exclusivamente con `ProfessionalCandidate[]`.

El nuevo límite reutiliza las mismas reglas existentes de:

- elegibilidad ya normalizada;
- profesión y especialidades;
- ubicación;
- reputación, experiencia y trust score;
- verificaciones;
- disponibilidad;
- ordenamiento y límite de resultados.

No se amplió `public_profiles` y no se copiaron datos privados al contrato público.

## Estado de migración

Esta es una capa de transición segura. El consumidor actual de RADAR todavía debe migrarse desde `UserProfile[]` hacia `ProfessionalCandidate[]`. Esa integración queda separada deliberadamente porque `AppContext.tsx` es monolítico (83.527 bytes) y una edición parcial no segura podría introducir regresiones.

La siguiente etapa es localizar el punto exacto de construcción de candidatos dentro del flujo RADAR de la rama canónica y migrarlo sin tocar todavía el resto del contexto global.

## Verificación técnica

No se ejecutaron tests ni build, por instrucción del flujo de auditoría actual. La modificación es de aislamiento de contrato y debe entrar en la fase final de verificación junto con las demás correcciones estructurales.
