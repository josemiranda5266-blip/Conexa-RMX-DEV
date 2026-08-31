# Auditoría — Quotes / Firestore Rules

Fecha: 2026-08-30
Repositorio: `josemiranda5266-blip/Conexa-RMX-DEV`
Rama: `integration/conexa-unified`

## Hallazgo

La regla de lectura de `/quotes/{quoteId}` dependía de `resource.data.clientId`, pero el endpoint autoritativo `/api/quotes/submit` no persistía `clientId` dentro del documento Quote. Esto dejaba al cliente propietario sin una ruta fiable de lectura autorizada.

## Corrección

La regla ahora deriva la autorización del cliente desde el `ServiceRequest` referenciado por `quote.requestId`, verificando que exista y que su `clientId` coincida con `request.auth.uid`.

Se mantiene:
- `allow create: if false` para que la creación siga siendo exclusivamente backend.
- El profesional propietario puede actualizar únicamente los campos editables mientras el Quote esté `PENDING`.
- `status` no puede ser alterado por el cliente ni por el profesional desde Firestore Rules.

## Commit

`745fee03ebd2d0bbd222fbc56252582222afcd00`

## Estado

**CERRADO — Rules de lectura de Quote corregidas.**

## Pendiente relacionado

La separación `service_requests.status = COMPLETED` vs `transactions.status = SERVICE_COMPLETED` continúa pendiente de materialización en `server.ts` porque requiere actualizar el blob completo del archivo.
