# Auditoría — servicio de persistencia del perfil profesional

Fecha: 2026-09-03
Rama: `integration/conexa-unified`

## Reconciliación arquitectónica

Durante la revisión se detectó que el repositorio ya disponía de `src/server/professionalProfileService.ts`, con validación contra catálogo, persistencia transaccional y proyección pública. No corresponde mantener una segunda implementación paralela.

Se dejó `src/server/professionalProfilePersistence.ts` únicamente como adaptador de compatibilidad que reexporta el servicio canónico.

## Servicio canónico

`professionalProfileService.ts` es la fuente única para:

1. validar y normalizar el input;
2. comprobar `professionId` / `professionName` contra `professionCatalog`;
3. rechazar usuarios inexistentes o bloqueados;
4. persistir el perfil profesional en `/users/{uid}`;
5. mantener `workHours` como compatibilidad legacy junto a `workingHours`;
6. persistir servicios y portfolio;
7. actualizar `public_professional_profiles/{uid}` dentro de la misma transacción.

## Estado

La capa de servicio queda estructuralmente preparada. El único acoplamiento pendiente es reemplazar el bloque histórico de `/api/professional-profile/save` en `server.ts` para delegar en este servicio.

No se ejecutaron tests ni build.
