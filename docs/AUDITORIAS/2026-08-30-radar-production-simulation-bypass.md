# Auditoría — RADAR production simulation bypass

Fecha: 2026-08-30
Repositorio: josemiranda5266-blip/Conexa-RMX-DEV
Rama: integration/conexa-unified

## Hallazgo P0

`POST /api/radar/opportunity` decide si omite la autenticación por secreto mediante valores controlados por el request:

- `is_test`
- `source === "radar_test"`
- `environment === "simulation"`

En producción, estos valores no deben poder activar por sí solos el modo de simulación. Un cliente externo podría enviar uno de ellos y evitar la comprobación de `RADAR_WEBHOOK_SECRET` / `N8N_WEBHOOK_SECRET`.

## Corrección requerida

El modo de simulación debe depender de una condición de servidor (`RADAR_MODE`/entorno no productivo) y, si se necesita habilitar simulación remotamente, de una credencial interna separada. Los campos `is_test`, `source` y `environment` del payload nunca deben ser suficientes para saltar la autenticación de producción.

## Estado

Detectado y registrado. La modificación de `server.ts` queda pendiente de aplicación mediante una operación que preserve el archivo completo; no se sobrescribe parcialmente un archivo de 131 KB.

## Regla de cierre

Producción => siempre requiere autenticación del webhook.
Simulación => solo habilitada por configuración del servidor o credencial interna autorizada.
