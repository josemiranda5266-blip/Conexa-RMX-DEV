# Auditoría — contrato autoritativo de Reviews

Fecha: 2026-09-03
Rama definitiva: `integration/conexa-unified`

## Estado

La política `src/server/reviewPolicy.ts` valida identidad del cliente, profesional asignado, estado del `ServiceRequest`, puntuaciones y comentario. `src/server/reviewService.ts` persiste la reseña con ID determinístico y transacción Firestore, evitando duplicados por reintentos.

## Hallazgo pendiente

El frontend `ReviewModal.tsx` todavía invoca `addReview()` desde `AppContext`. La ruta HTTP que debe exponer `saveProfessionalReview()` todavía no está integrada en el runtime principal. Por lo tanto, la protección implementada en el servicio aún no constituye el único camino de escritura efectivo de producción.

## Decisión arquitectónica

La creación de Reviews debe quedar exclusivamente detrás del backend. El cliente no debe decidir `clientId`, `clientName`, `clientAvatar`, `isVerifiedJob` ni la elegibilidad del trabajo. Esos datos deben derivarse del token autenticado, `users/{clientId}` y `service_requests/{serviceRequestId}`.

## Siguiente cierre

Extraer una ruta `POST /api/reviews` delegada al servicio y posteriormente sustituir `AppContext.addReview()` por el cliente HTTP autenticado. Después se debe cerrar el circuito de agregados de reputación y la proyección pública.
