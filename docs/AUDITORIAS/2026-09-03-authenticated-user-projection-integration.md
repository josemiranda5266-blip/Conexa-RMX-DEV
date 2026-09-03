# Corrección — proyección autenticada en AppContext

**Fecha:** 2026-09-03
**Repositorio:** `josemiranda5266-blip/Conexa-RMX-DEV`
**Rama:** `integration/conexa-unified`

## Problema

El flujo inicial de autenticación contenía lógica local de resolución de rol y el listener realtime de `/users/{uid}` hacía posteriormente un merge directo del documento Firestore sobre `currentUser`.

Esa segunda ruta podía reintroducir campos de identidad sin pasar por la política centralizada.

## Corrección

Se integró `projectAuthenticatedUser()` en ambos caminos:

1. construcción inicial de `currentUser` después de Firebase Auth;
2. sincronización realtime del documento `/users/{uid}`.

El listener realtime obtiene nuevamente los claims y proyecta el usuario mediante:

`Firebase claims + Firestore profile + fallback authenticated user → projectAuthenticatedUser()`

## Garantía estructural

Los campos sensibles:

- `role`
- `isProfessional`
- `hasProfessionalProfile`
- `activeMode`

ya no son asignados mediante un merge crudo del snapshot Firestore dentro de la ruta corregida.

## Resultado

La política de identidad queda centralizada en:

`effectiveUserIdentity.ts → authenticatedUserProjection.ts`

y AppContext consume esa frontera en vez de duplicar la política.

## Pendientes

Queda auditar:

- otros mutadores de `currentUser`;
- `switchActiveMode()` y su relación con `users[]`;
- dependencias restantes del listener global `/users`.

No se ejecutaron tests ni build.
