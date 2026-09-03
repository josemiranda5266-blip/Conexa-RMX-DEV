# Auditoría — mapa de escritores del perfil profesional

**Fecha:** 2026-09-03  
**Repositorio:** `josemiranda5266-blip/Conexa-RMX-DEV`  
**Rama:** `integration/conexa-unified`

## Verificación de rama

La rama `integration/conexa-unified` fue verificada antes de continuar. HEAD actual al iniciar esta auditoría: `8d5b8e39708798bb9c53d71ebdca498c0378e0a9`.

## Escritor real identificado

Existe un único flujo de edición profesional visible en frontend:

`src/components/BecomeProfessionalModal.tsx`

El formulario permite modificar:

- `professionName`
- `businessName`
- `specialties`
- `description`
- `workZoneRadiusKm`
- `workHours`
- `matriculaOrDegree`
- `hourlyRateArs`

El frontend envía esos campos a:

`POST /api/professional-profile/save`

El endpoint está implementado en `server.ts` y persiste sobre `/users/{uid}`.

## Gaps confirmados

### 1. El catálogo público candidato está incompleto en el escritor

`ProfessionalDetailModal` consume:

- `servicesOffered`
- `portfolioImages`
- `workingHours`
- `workZoneRadiusKm`
- además de identidad, negocio, profesión, descripción, reputación y verificaciones.

Pero `BecomeProfessionalModal` no permite crear ni editar `servicesOffered` ni `portfolioImages`.

Por lo tanto, esos campos no tienen actualmente un flujo de edición productivo en este frontend.

### 2. Inconsistencia de nombre: `workHours` vs `workingHours`

`UserProfile` contiene ambos campos:

- `workHours?: string`
- `workingHours?: string`

El formulario y el endpoint usan `workHours`.

El `ProfessionalDetailModal` muestra `workingHours`.

Resultado: un profesional que guarda sus horarios mediante el flujo actual puede persistir `workHours`, mientras el directorio busca `workingHours`, dejando los horarios invisibles.

**Conclusión:** debe existir un único campo canónico. La decisión recomendada es `workingHours`.

### 3. `professionId` no se persiste desde el alta/edición profesional

El catálogo de profesiones tiene IDs estables y el motor RADAR soporta `professionId`, pero `BecomeProfessionalModal` envía solamente `professionName`.

Esto no impide actualmente la discoverability porque el motor admite `professionName`, pero debilita la normalización y la correspondencia exacta con `Profession.id`.

La edición debería resolver y persistir `professionId` junto con `professionName` cuando la profesión seleccionada proviene del catálogo.

### 4. El endpoint de perfil utiliza el Firestore por defecto

`server.ts` contiene un helper `getAdminDb()` que conoce `firestoreDatabaseId`, pero `/api/professional-profile/save` usa directamente `getAdminFirestore(app)`.

Si la instalación productiva utiliza una base Firestore nombrada, este endpoint puede escribir en una base diferente de la que usa el resto del backend.

Esto debe corregirse antes de considerar cerrado el flujo de perfil profesional.

### 5. No existe todavía sincronización con una proyección profesional pública

El endpoint actual escribe `/users`, pero no llama a un proyector de `public_professional_profiles`.

Crear la colección sin resolver este punto produciría perfiles públicos desactualizados.

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

Los campos administrativos, privados, de autorización y de suscripción quedan fuera.

## Política de publicación recomendada

La fuente de verdad continúa siendo `/users` mientras no se complete la migración. La proyección pública debe generarse server-side después de una escritura válida del perfil.

No se recomienda que el cliente escriba directamente `public_professional_profiles`.

## Próxima corrección segura

1. Canonicalizar `workingHours`.
2. Resolver `professionId` desde el catálogo.
3. Cambiar el endpoint para utilizar `getAdminDb()`.
4. Añadir un escritor explícito para `servicesOffered` y `portfolioImages` con límites de tamaño y cantidad.
5. Integrar la proyección server-side del catálogo profesional.
6. Recién después migrar el directorio fuera de `users[]`.

## Estado

Este documento es una auditoría de estructura; todavía no se ejecutaron tests ni build.
