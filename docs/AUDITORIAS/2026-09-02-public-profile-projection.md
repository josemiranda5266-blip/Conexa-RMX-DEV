# Auditoría — proyección server-side de perfiles públicos

**Repositorio:** `josemiranda5266-blip/Conexa-RMX-DEV`  
**Rama:** `integration/conexa-unified`  
**Fecha:** 2026-09-02

## Hallazgo

El contrato `PublicUserProfile` y el consumidor `publicProfileService.ts` ya existían, pero no había una vía backend explícita para mantener `public_profiles/{uid}` sincronizado con el perfil autoritativo `users/{uid}`.

Cambiar el frontend antes de resolver esto habría creado una nueva fuente de datos sin garantía de consistencia.

## Corrección estructural

Se agregó `src/server/publicProfileProjection.ts`.

El módulo:

- acepta únicamente un contrato explícito de campos públicos;
- construye una proyección mínima y acotada;
- excluye teléfono, dirección exacta, documentos, credenciales y campos administrativos;
- limita longitudes y rangos numéricos;
- normaliza `availabilityStatus`;
- escribe exclusivamente mediante Firebase Admin SDK;
- permite eliminar la proyección al eliminar una cuenta.

La colección destino es `public_profiles/{uid}`.

## Estado de integración

La función de proyección está preparada pero todavía no fue conectada a todas las mutaciones de `users`, porque el perfil se modifica actualmente desde distintos puntos del frontend/servidor y `server.ts` es monolítico. La integración completa se hará antes de retirar el listener global de `users`.

## Verificación

No se ejecutaron tests ni build en esta fase.

**Commit:** `0ed75047685dd5fd00405a0bb00a44fa30ff2783`
