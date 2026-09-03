# RADAR — Extracción del handler de matching

Fecha: 2026-09-03
Rama: `integration/conexa-unified`

## Avance

Se creó `src/server/radar/radarMatchRoute.ts` como handler HTTP aislado.

El handler:

- autentica mediante `verifyAuthToken`;
- valida los campos mínimos de la oportunidad;
- limita `limit` al rango 1..50;
- delega el matching exclusivamente a `matchRadarOpportunity`;
- no consulta Firestore directamente;
- no implementa una segunda lógica de scoring.

Esto elimina conceptualmente la dependencia del endpoint HTTP respecto de la consulta legacy `users.where(role == PROFESSIONAL)` cuando el runtime sea conectado al handler.

## Estado de integración

El handler ya existe, pero todavía no está cableado en `server.ts`. La conexión final debe hacerse sobre el runtime existente sin duplicar rutas ni eliminar accidentalmente middleware/configuración.

## No ejecutado

Tests y build continúan deliberadamente pendientes hasta finalizar las correcciones estructurales.
