# Auditoría — proyección segura del usuario autenticado

**Fecha:** 2026-09-02  
**Repositorio:** `josemiranda5266-blip/Conexa-RMX-DEV`  
**Rama:** `integration/conexa-unified`

## Hallazgo

`src/domain/effectiveUserIdentity.ts` ya centraliza la resolución de identidad efectiva: los roles `ADMIN`/`SUPER_ADMIN` requieren autoridad de Custom Claims y Firestore no puede elevar privilegios por sí solo.

El problema residual estaba en `AppContext.tsx`: después de esa resolución inicial existe un listener de `/users/{uid}` que mezcla directamente el documento Firestore sobre `currentUser`. Ese merge puede reintroducir un `role` de Firestore sin volver a pasar por la política de autoridad.

## Corrección estructural

Se creó `src/services/authenticatedUserProjection.ts` como frontera reutilizable para construir `UserProfile` autenticado. La función:

1. recibe la identidad autenticada de Firebase;
2. recibe el perfil Firestore como datos de perfil/capacidad;
3. resuelve `role`, `isProfessional`, `hasProfessionalProfile` y `activeMode` mediante `resolveEffectiveUserIdentity()`;
4. solo después mezcla los datos del perfil, reimponiendo los campos sensibles de identidad efectiva.

Esto evita que un consumidor futuro tenga que repetir manualmente la política de autoridad.

## Integración pendiente

La integración directa dentro de `AppContext.tsx` sigue pendiente porque el archivo es monolítico y contiene múltiples listeners interdependientes. La corrección se preparó como frontera pequeña y segura para poder reemplazar el merge directo sin modificar simultáneamente los demás sincronizadores.

## Criterio de producción

El backend y Firestore Rules continúan siendo la autoridad de seguridad. Esta capa corrige la consistencia de identidad del estado frontend y reduce el riesgo de que la UI represente un rol privilegiado que la sesión autenticada no posee.

No se ejecutaron tests ni build.
