# Auditoría — consumidor real del RADAR

Fecha: 2026-09-02
Rama definitiva: `integration/conexa-unified`

## Verificación

Antes de esta etapa se verificó que la rama `integration/conexa-unified` existe y que el trabajo definitivo continúa exclusivamente sobre ella.

## Hallazgo confirmado

El consumidor efectivo del matching RADAR está dentro de `src/context/AppContext.tsx`.

En `addRadarOpportunity()` se ejecuta actualmente:

`matchOpportunityWithProfessionals(users, opp)`

La llamada usa el estado global `users`, que contiene `UserProfile[]` completos. Por lo tanto, aunque ya existe la nueva frontera `ProfessionalCandidate[]`, el flujo productivo todavía no la utiliza.

## Consecuencia arquitectónica

La dependencia real es:

`AppContext -> users globales -> UserProfile[] -> professionalMatching -> normalizeProfessionalCandidate`

La arquitectura objetivo es:

`fuente de candidatos -> ProfessionalCandidate[] -> professionalMatchingCandidates -> resultado RADAR`

Esto confirma que el problema pendiente no está en el algoritmo de scoring, sino en la construcción y suministro del conjunto de candidatos al consumidor RADAR.

## Decisión

No se modifica `AppContext.tsx` en esta etapa. El archivo tiene aproximadamente 83 KB y concentra autenticación, usuarios, solicitudes, presupuestos, conversaciones, mensajes, moderación, pagos y RADAR. Una sustitución completa sin disponer de un parche seguro por rangos introduce un riesgo de regresión desproporcionado.

La nueva capa `src/domain/professionalMatchingCandidates.ts` queda como frontera estable para la futura migración.

## Próximo paso técnico

Crear un proveedor de candidatos RADAR independiente de `AppContext`, capaz de entregar únicamente `ProfessionalCandidate[]` al motor. Después se realizará una modificación mínima del consumidor `addRadarOpportunity()` para reemplazar la dependencia directa de `users`.

La eliminación del listener global de `/users` se hará únicamente después de migrar los demás consumidores que todavía dependan de ese estado.

## Verificación

No se ejecutaron tests ni build. Esta etapa es de auditoría y definición de integración.
