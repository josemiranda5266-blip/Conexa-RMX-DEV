# Corrección — mutadores de activeMode e identidad

**Fecha:** 2026-09-03
**Repositorio:** `josemiranda5266-blip/Conexa-RMX-DEV`
**Rama:** `integration/conexa-unified`

## Hallazgo

Los mutadores `switchUserRole()` y `switchActiveMode()` construían directamente un nuevo `currentUser` mediante spread.

Además, `switchActiveMode()` duplicaba el usuario autenticado dentro de `users[]`.

## Corrección aplicada

Ambos caminos ahora pasan por:

`projectAuthenticatedUser()`

La solicitud de modo se valida primero y después se vuelve a resolver mediante la política centralizada de identidad.

## Cambio adicional

Se eliminó la actualización redundante:

`setUsers(uList => ...)`

de `switchActiveMode()`.

El usuario autenticado ya no necesita propagarse manualmente al directorio global como mecanismo de consistencia.

## Garantía

Un cambio de modo:

- no cambia el rol de autorización;
- no puede activar ADMIN sin claim/rol efectivo autorizado;
- no puede activar PROFESSIONAL sin capacidad profesional;
- vuelve a pasar por la misma frontera de identidad antes de actualizar el estado.

## Pendiente

Aún quedan otros consumidores del listener global `/users` y debe continuarse su inventario antes de retirarlo.

No se ejecutaron tests ni build.
