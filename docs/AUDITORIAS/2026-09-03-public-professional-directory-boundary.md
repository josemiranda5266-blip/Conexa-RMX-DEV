# Auditoría — frontera del directorio profesional público

Fecha: 2026-09-03
Rama: `integration/conexa-unified`

## Cambio

Se creó `src/services/publicProfessionalDirectoryService.ts` como frontera única para el catálogo público profesional.

El servicio:

- consume exclusivamente `public_professional_profiles` mediante el lector público existente;
- expone `PublicProfessionalProfile` y no `UserProfile`;
- centraliza filtros de búsqueda, profesión, ciudad y verificación;
- mantiene las acciones privadas fuera de la capa de descubrimiento.

## Corrección adicional

La proyección pública ahora acepta únicamente URLs HTTPS para el portfolio. Esto alinea la normalización del escritor con la política estricta de escritura del perfil profesional y evita publicar recursos HTTP inseguros.

## Estado de integración

El flujo público deseado es:

`public_professional_profiles` → `publicProfessionalProfileService` → `publicProfessionalDirectoryService` → componentes públicos

La frontera ya está preparada, pero `App.tsx` todavía contiene el flujo histórico `users → filteredProfessionals` para Inicio, Buscar y Mapa. Esa dependencia debe eliminarse sustituyendo la fuente del directorio por esta frontera, preservando por separado las acciones autenticadas como chat y solicitud de presupuesto.

## Criterio de producción

No se considera cerrado el directorio mientras `users` siga siendo fuente del catálogo público. La proyección pública debe ser la única fuente de datos de descubrimiento profesional.

No se ejecutaron tests ni build durante esta fase, conforme al plan de cierre estructural.
