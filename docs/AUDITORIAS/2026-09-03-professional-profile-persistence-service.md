# Auditoría — servicio de persistencia del perfil profesional

Fecha: 2026-09-03
Rama: `integration/conexa-unified`

## Cambio

Se aisló la persistencia en `src/server/professionalProfilePersistence.ts` para que el endpoint HTTP no concentre validación, acceso Firestore y proyección pública.

## Flujo

1. Recibe `userId` + `ProfessionalProfileWriteInput`.
2. Normaliza y valida mediante `normalizeProfessionalProfileWrite`.
3. Usa `getAdminDb()` como acceso Firestore canónico.
4. Verifica existencia del usuario.
5. Rechaza cuentas bloqueadas.
6. Persiste `professionId`, profesión, especialidades, descripción, radio, horarios, matrícula, tarifa, servicios y portfolio normalizados.
7. Sincroniza `public_professional_profiles` desde el usuario actualizado.
8. Devuelve el usuario actualizado al caller interno.

## Beneficio

La integración futura de `/api/professional-profile/save` queda reducida a autenticación, mapeo del request y manejo de errores; el núcleo de persistencia ya no depende de la implementación monolítica de `server.ts`.

## Pendiente

Conectar el endpoint HTTP existente con este servicio. No se ejecutaron tests ni build por la estrategia acordada: primero completar las correcciones estructurales y luego realizar la verificación final.
