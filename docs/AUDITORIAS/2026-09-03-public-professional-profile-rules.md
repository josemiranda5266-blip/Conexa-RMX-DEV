# Auditoría — Reglas de `public_professional_profiles`

Fecha: 2026-09-03
Rama: `integration/conexa-unified`
Commit de la corrección: `3c2037faaf5cac33a05602c4c9d574f9c9a7ffc0`

## Verificación de contexto

Se verificó que el trabajo definitivo continúa en `josemiranda5266-blip/Conexa-RMX-DEV`, rama `integration/conexa-unified`.

## Hallazgo

La nueva proyección `public_professional_profiles` necesita ser consumible por el directorio autenticado, pero nunca debe poder ser modificada directamente desde el cliente. La escritura debe permanecer exclusivamente en el backend mediante Firebase Admin.

## Corrección

Se añadió la regla:

- lectura: permitida únicamente a usuarios autenticados;
- create/update/delete: denegados para clientes.

Esto replica la frontera ya establecida para `public_profiles` y evita que un cliente pueda falsificar profesión, servicios, portfolio, reputación o disponibilidad dentro del catálogo público.

## Estado

La colección ya tiene una frontera de seguridad explícita. El siguiente paso sigue siendo integrar el writer con `/api/professional-profile/save` y después migrar el directorio profesional para leer esta proyección en lugar de `/users`.

No se ejecutaron tests ni build.
