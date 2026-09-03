# CONEXA — Autoridad de identidad en AppContext

## Repositorio y rama

- Repositorio: `josemiranda5266-blip/Conexa-RMX-DEV`
- Rama: `integration/conexa-unified`
- Fecha: 2026-09-02

## Hallazgo

El flujo de autenticación inicial ya calcula una identidad efectiva con protección contra elevación de `ADMIN`/`SUPER_ADMIN`, pero el listener realtime de `users/{uid}` vuelve a fusionar el documento Firestore directamente sobre `currentUser`. Esto puede reintroducir en el estado visual un `role` privilegiado que no está respaldado por el Firebase Custom Claim.

## Corrección estructural

Se creó `src/domain/effectiveUserIdentity.ts` como política única para resolver la identidad frontend:

- `ADMIN`/`SUPER_ADMIN` solo son válidos cuando proceden del claim autenticado.
- Un rol privilegiado almacenado únicamente en Firestore se degrada a `USER`.
- La capacidad profesional se conserva independientemente del modo activo.
- `PROFESSIONAL` solo puede ser modo activo si existe capacidad profesional.
- Los roles administrativos fuerzan modo `ADMIN`.
- En ausencia de capacidad profesional, el modo activo cae a `CLIENT`.

## Integración pendiente

El listener realtime de `AppContext.tsx` todavía debe utilizar esta política al fusionar cambios de perfil. No se modificó el archivo monolítico sin disponer de una vía segura de parcheo parcial; reemplazarlo completo sin preservar todo su contenido sería un riesgo de corrupción.

## Criterio de producción

La identidad que consume la UI debe derivarse siempre de:

`Firebase ID Token Claims + perfil Firestore no privilegiado`

Nunca de una fusión ciega del documento `users/{uid}`.

No se ejecutaron tests ni builds.
