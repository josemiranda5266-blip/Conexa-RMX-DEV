# Auditoría — mapa de escritores del perfil profesional

**Fecha:** 2026-09-03  
**Repositorio:** `josemiranda5266-blip/Conexa-RMX-DEV`  
**Rama:** `integration/conexa-unified`

## Verificación de rama

La rama `integration/conexa-unified` fue verificada antes de continuar. El análisis se realizó sobre el estado actual de esa rama.

## Escritor real identificado

El único flujo de edición profesional visible en frontend es:

`src/components/BecomeProfessionalModal.tsx`

El formulario modifica `professionName`, `businessName`, `specialties`, `description`, `workZoneRadiusKm`, `workHours`, `matriculaOrDegree` y `hourlyRateArs`, y envía esos datos a `POST /api/professional-profile/save`.

## Gaps confirmados

### 1. El catálogo público candidato está incompleto en el escritor

`ProfessionalDetailModal` consume `servicesOffered`, `portfolioImages`, `workingHours` y `workZoneRadiusKm`, además de identidad, negocio, profesión, descripción, reputación y verificaciones.

`BecomeProfessionalModal` no permite crear ni editar `servicesOffered` ni `portfolioImages`. Por lo tanto, esos campos no tienen actualmente un flujo de edición productivo en este frontend.

### 2. Inconsistencia `workHours` vs `workingHours`

`UserProfile` contiene ambos campos. El formulario actual escribe `workHours`, mientras el detalle profesional lee `workingHours`.

Esto permite que los horarios guardados por el profesional queden invisibles en el detalle. La decisión recomendada es canonicalizar `workingHours` y mantener una migración de compatibilidad controlada para datos históricos.

### 3. `professionId` no se persiste desde el alta/edición profesional

El catálogo tiene IDs estables y RADAR soporta `professionId`, pero el selector trabaja por nombre y el payload no incluye el ID. Debe resolverse el ID a partir de `INITIAL_PROFESSIONS` para profesiones catalogadas y conservar `professionName` como representación visible.

### 4. El endpoint de perfil utiliza el Firestore por defecto

`server.ts` contiene un helper `getAdminDb()` que conoce `firestoreDatabaseId`, pero el flujo de guardado profesional utiliza directamente `getAdminFirestore(app)`. Si producción utiliza una base Firestore nombrada, el escritor puede quedar desacoplado de la base real.

Este es un gap de producción que debe corregirse antes de cerrar el flujo.

### 5. No existe sincronización con una proyección profesional pública

El endpoint actual escribe `/users`, pero no integra una proyección `public_professional_profiles`. Crear esa colección antes de resolver el escritor autoritativo produciría datos potencialmente obsoletos.

## Contrato de escritura recomendado

El escritor profesional debe producir un único objeto de catálogo profesional con:

```text
businessName
professionId
professionName
specialties[]
description
workZoneRadiusKm
servicesOffered[]
portfolioImages[]
workingHours
```

Los campos privados, administrativos, de autorización, suscripción y seguridad quedan fuera.

## Próxima corrección segura

1. Canonicalizar `workingHours` con compatibilidad histórica.
2. Resolver `professionId` desde el catálogo.
3. Cambiar el endpoint para utilizar el helper de base Firestore canónico.
4. Añadir un escritor explícito para `servicesOffered` y `portfolioImages` con límites de tamaño y cantidad.
5. Integrar la proyección server-side del catálogo profesional.
6. Migrar el directorio fuera de `users[]`.

## Estado

Auditoría estructural actualizada. No se ejecutaron tests ni build.
