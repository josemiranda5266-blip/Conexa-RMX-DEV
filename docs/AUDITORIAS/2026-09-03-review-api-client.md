# Auditoría — cliente API de Reviews

Fecha: 2026-09-03
Rama definitiva: `integration/conexa-unified`

Se creó `src/services/reviewApiService.ts` para establecer el camino frontend hacia `POST /api/reviews`.

El cliente:

- exige usuario autenticado;
- obtiene un ID token Firebase vigente;
- envía `Authorization: Bearer <token>`;
- envía el `serviceRequestId` real como parte del contrato;
- no envía `clientId`, `clientName`, `clientAvatar` ni `isVerifiedJob` como autoridad;
- propaga códigos de error del backend.

## Estado

La pieza queda lista para que `ReviewModal`/`AppContext` sustituyan su escritura directa. La integración de `server.ts` sigue pendiente por el riesgo de edición parcial del runtime principal.

## Criterio

El frontend no debe tener una segunda implementación de persistencia de Reviews. Una vez migrado el consumidor, Firestore `reviews` debe ser escritura exclusiva del backend.
