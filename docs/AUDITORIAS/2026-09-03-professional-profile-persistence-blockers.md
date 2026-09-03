# Auditoría — bloqueadores de persistencia del perfil profesional

Fecha: 2026-09-03
Rama: `integration/conexa-unified`

## Verificación

Repositorio definitivo: `josemiranda5266-blip/Conexa-RMX-DEV`.

## Hallazgos

1. La política estricta ya admite `professionId`, `servicesOffered` y `portfolioImages`, y normaliza `ServiceItem[]`. Sin embargo, el endpoint histórico `/api/professional-profile/save` todavía debe consumir esa política.
2. La proyección pública ya utiliza `getAdminDb()`, que respeta `firestoreDatabaseId`; por lo tanto es apta para el mismo backend multi-database. fileciteturn899file0
3. El endpoint debe actualizar `/users/{uid}` y, en la misma operación lógica, sincronizar `public_professional_profiles/{uid}`. No debe exponer el documento privado completo como contrato público.
4. La activación/desactivación del perfil profesional debe tener una regla explícita para evitar perfiles públicos huérfanos cuando un usuario deja de ser profesional o es bloqueado.

## Estado

La capa de validación y la proyección están listas de forma independiente. La integración dentro de `server.ts` sigue siendo el último punto de acoplamiento importante y requiere una edición segura del archivo monolítico.

## Criterio de cierre

No considerar terminado el perfil profesional hasta que:

- la entrada del endpoint pase por `normalizeProfessionalProfileWrite`;
- se persistan servicios y portfolio normalizados;
- la proyección pública se sincronice desde datos autoritativos;
- el documento público no contenga campos privados;
- una cuenta bloqueada no pueda publicar/actualizar el catálogo.
