# Auditoría — persistencia del perfil profesional

Fecha: 2026-09-03
Rama: `integration/conexa-unified`

## Verificación

Repositorio definitivo: `josemiranda5266-blip/Conexa-RMX-DEV`.

## Hallazgo corregido durante esta revisión

El repositorio ya contenía `src/server/professionalProfileService.ts`, que es la implementación canónica de persistencia. La creación de un segundo servicio fue detectada y convertida en un adaptador de compatibilidad (`professionalProfilePersistence.ts`) para evitar duplicación de lógica.

El servicio canónico:

- valida con `normalizeProfessionalProfileWrite(input, existingName)`;
- valida la profesión contra `professionCatalog`;
- detecta inconsistencias entre `professionId` y `professionName`;
- usa `getAdminDb()`;
- rechaza usuarios inexistentes o bloqueados;
- persiste `professionId`, profesión, especialidades, descripción, radio, horarios, matrícula, tarifa, servicios y portfolio;
- mantiene `workHours` sincronizado como compatibilidad legacy;
- escribe `/users/{uid}` y `public_professional_profiles/{uid}` dentro de una transacción.

## Bloqueador restante

El endpoint HTTP `/api/professional-profile/save` de `server.ts` todavía ejecuta la implementación histórica y no llama al servicio canónico.

Por seguridad, no se modificó todavía el archivo monolítico de 154 KB mediante reemplazo completo. La integración requiere una edición controlada del bloque del endpoint.

## Criterio de cierre

El perfil profesional estará cerrado estructuralmente cuando `/api/professional-profile/save` delegue exclusivamente en el servicio canónico y traduzca sus códigos de error a respuestas HTTP, sin duplicar validación ni persistencia.

No se ejecutaron tests ni build.
