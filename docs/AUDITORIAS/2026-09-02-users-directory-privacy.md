# CONEXA — Auditoría de directorio de usuarios y minimización de datos

## Repositorio y rama
- Repositorio: `josemiranda5266-blip/Conexa-RMX-DEV`
- Rama: `integration/conexa-unified`
- Fecha: 2026-09-02

## Hallazgo
`src/context/AppContext.tsx` mantiene una suscripción realtime global sobre `users` y carga todos los perfiles en el estado `users`. Las reglas actuales permiten lectura de `users/{userId}` a cualquier usuario autenticado.

## Riesgo
La combinación crea una superficie de minimización de datos deficiente y escala mal. `UserProfile` contiene campos de reputación, estados operativos, verificación y flags de producto que no deben convertirse implícitamente en un directorio global.

## Corrección estructural iniciada
Se creó `src/domain/publicProfile.ts` con un contrato `PublicUserProfile` explícito y una función `toPublicUserProfile()`. El contrato excluye email, teléfono, dirección exacta, documentos, roles administrativos, flags internos y demás datos operativos.

## Pendiente de integración
1. Crear/poblar `public_profiles/{uid}` mediante backend o flujo controlado.
2. Cambiar consumidores de `AppContext` para consultar perfiles públicos según necesidad.
3. Retirar la suscripción global a `users`.
4. Cambiar Rules para que `users` deje de funcionar como directorio público.
5. Mantener `users/{uid}` para el perfil autenticado y operaciones estrictamente necesarias.

No se ejecutaron tests ni builds.
