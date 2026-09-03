# Auditoría — corrección del servicio de perfiles públicos

**Fecha:** 2026-09-02  
**Repositorio:** `josemiranda5266-blip/Conexa-RMX-DEV`  
**Rama:** `integration/conexa-unified`

## Hallazgo

La primera versión de `src/services/publicProfileService.ts` no respetaba completamente el contrato `PublicUserProfile` definido en `src/domain/publicProfile.ts`: devolvía `profession` en lugar de `professionName` y construía una representación parcial incompatible con el contrato declarado.

## Corrección

Se alineó el servicio con el contrato central mediante `toPublicUserProfile()`.

El servicio ahora:

- consulta únicamente `public_profiles`;
- no utiliza fallback a `users`;
- conserva el límite de 30 IDs por consulta;
- normaliza los datos mediante el único mapper público;
- devuelve la forma completa definida por `PublicUserProfile`.

## Decisión arquitectónica

La fuente pública queda separada explícitamente del documento privado `users/{uid}`. La migración de consumidores y la política de creación/sincronización de `public_profiles` permanecen como próximos pasos.

## Verificación

No se ejecutaron tests ni build, por decisión de la fase actual de trabajo.

**Commit de corrección:** `4c754fc03fb8839c5d312504ba30d5a65f753f1a`
