# Auditoría — boundary HTTP de Reviews

Fecha: 2026-09-03
Rama definitiva: `integration/conexa-unified`

## Implementación

Se creó `src/server/reviewRoute.ts` como adaptador HTTP del contrato autoritativo de Reviews.

La ruta:

- autentica mediante `verifyAuthToken`;
- deriva el `clientId` exclusivamente del token;
- acepta `serviceRequestId` y mantiene `jobId` únicamente como compatibilidad de entrada;
- delega toda validación y persistencia en `saveProfessionalReview()`;
- nunca escribe Firestore directamente;
- asigna códigos HTTP según errores de dominio.

## Estado de integración

El boundary ya está aislado, pero todavía falta conectarlo al runtime principal (`server.ts`) y reemplazar el camino `AppContext.addReview()` del frontend. Hasta completar ambas cosas, el servicio no es todavía el único camino efectivo de escritura.

## Criterio de cierre

La funcionalidad queda cerrada cuando:

1. `POST /api/reviews` esté registrado en el runtime.
2. `ReviewModal` envíe el `serviceRequestId` real al backend.
3. `AppContext.addReview()` deje de escribir directamente `reviews`.
4. El backend actualice los agregados de reputación de forma transaccional y autoritativa.
