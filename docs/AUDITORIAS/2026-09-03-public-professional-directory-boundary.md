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

## Objetivo arquitectónico

El flujo público debe ser:

`public_professional_profiles` → `publicProfessionalProfileService` → `publicProfessionalDirectoryService` → componentes públicos

`users` no debe volver a utilizarse como fuente del catálogo público.

## Pendiente

`App.tsx` todavía contiene lógica histórica de filtrado sobre `users`. Esa dependencia debe eliminarse sustituyendo la fuente del directorio por esta frontera, preservando por separado las acciones autenticadas como chat y solicitud de presupuesto.

## Criterio de producción

La existencia de esta frontera evita que nuevos componentes públicos vuelvan a acoplarse accidentalmente al modelo privado `UserProfile`.
