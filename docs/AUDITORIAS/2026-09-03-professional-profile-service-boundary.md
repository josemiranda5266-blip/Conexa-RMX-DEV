# Auditoría — límite de persistencia del perfil profesional

Fecha: 2026-09-03
Rama: `integration/conexa-unified`

## Avance

Se creó `src/server/professionalProfileService.ts` como límite de servidor para la escritura autoritativa del perfil profesional.

La nueva capa:

- usa `getAdminDb()` y por lo tanto respeta `firestoreDatabaseId` configurado;
- lee el usuario existente y rechaza cuentas bloqueadas;
- consume `normalizeProfessionalProfileWrite()` para aplicar validación estricta;
- valida `professionId`/`professionName` contra un catálogo estable compartido;
- normaliza y persiste `professionName` canónico;
- persiste `workingHours` y mantiene `workHours` sincronizado durante la migración;
- persiste `servicesOffered` y `portfolioImages` bajo los límites de la política;
- preserva campos de autorización existentes mediante `merge` y no cambia `role` ni `activeMode` de forma implícita;
- sincroniza `public_professional_profiles` después de la escritura de `/users`.

## Catálogo

Se creó `src/domain/professionCatalog.ts` para evitar que el servidor dependa directamente de `mockData.ts`. Incluye los IDs estables actuales y un alias histórico para `Electricista Matriculado`.

## Pendiente crítico

El endpoint `/api/professional-profile/save` de `server.ts` todavía contiene la implementación inline histórica. La nueva capa **aún no está conectada al endpoint**. La integración requiere modificar cuidadosamente el monolito `server.ts`; no se realizó todavía para evitar una sustitución parcial del archivo.

## Criterio de producción

El diseño de persistencia ya tiene un límite único y seguro, pero el flujo HTTP sigue usando la ruta histórica hasta conectar el servicio. Por ello el área de Directorio Profesional no se considera cerrada.
