# Runtime — estado de extracción de rutas

Fecha: 2026-09-03
Rama: `integration/conexa-unified`

## Avance

Se verificaron nuevamente el repositorio y la rama antes de continuar.

El runtime dispone actualmente de handlers aislados para:

- RADAR matching: `src/server/radar/radarMatchRoute.ts`
- RADAR conversión: `src/server/radar/radarOpportunityConversionRoute.ts`
- guardado de perfil profesional: `src/server/professionalProfileRoute.ts`

Los handlers delegan en servicios de dominio/servidor y evitan duplicar acceso directo a Firestore.

## Bloqueador actual

`src/server.ts` no pudo ser recuperado de forma segura mediante las rutas de contenido disponibles en esta sesión. Por tratarse de un archivo grande y crítico, no se debe reconstruir ni sobrescribir parcialmente.

La integración final requiere recuperar el contenido completo o un mecanismo seguro de edición del archivo antes de reemplazar las rutas inline.

## Regla operativa

No se ejecutan tests/build mientras continúe la fase de correcciones estructurales.
