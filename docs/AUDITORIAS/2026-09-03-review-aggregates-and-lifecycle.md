# Auditoría — agregados y lifecycle de Reviews

Fecha: 2026-09-03
Repositorio: `josemiranda5266-blip/Conexa-RMX-DEV`
Rama: `integration/conexa-unified`

## Corrección aplicada

La creación de una reseña ahora completa explícitamente los campos de identidad relacional definidos por el modelo:

- `serviceRequestId`
- `authorId`
- `clientId`

La política mantiene compatibilidad con trabajos que aún están en `COMPLETED`, pero reconoce `REVIEW_PENDING` como estado canónico previo a la reseña.

Commit de corrección: `8f17d2c98789734452878456e02c3c33e11b9022`.

## Agregados ya existentes

`saveProfessionalReview()` ya actualiza dentro de la misma transacción:

1. documento de `reviews`;
2. `users/{professionalId}.rating`;
3. `users/{professionalId}.reviewCount`;
4. `public_professional_profiles/{professionalId}` cuando la proyección existe;
5. `radar_candidates/{professionalId}`;
6. `service_requests/{serviceRequestId}` hacia `CLOSED`;
7. la transacción comercial desde `SERVICE_COMPLETED` hacia `REVIEW_COMPLETED` cuando corresponde.

## Hallazgo de lifecycle

El cierre de la reseña no debe inventar una segunda máquina de estados. Debe coordinarse con las máquinas ya definidas:

- ServiceRequest: `COMPLETED → REVIEW_PENDING → CLOSED`
- Transaction: `SERVICE_COMPLETED → REVIEW_COMPLETED → SETTLED`

El servicio de reviews es el punto de coordinación final, pero el flujo que lleva el ServiceRequest desde COMPLETED hasta REVIEW_PENDING todavía debe verificarse en el runtime de finalización.

## Pendientes

- registrar `POST /api/reviews` en el runtime;
- migrar `ReviewModal` fuera de `AppContext.addReview()`;
- verificar el comando backend que avanza `COMPLETED → REVIEW_PENDING`;
- mantener las garantías de anonimización durante eliminación de cuentas.
