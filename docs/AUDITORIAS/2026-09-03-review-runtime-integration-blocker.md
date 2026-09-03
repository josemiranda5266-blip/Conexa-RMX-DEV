# Auditoría — bloqueo de integración runtime de Reviews

Fecha: 2026-09-03
Rama definitiva: `integration/conexa-unified`

## Verificación

El boundary `src/server/reviewRoute.ts` existe y delega en `saveProfessionalReview()`. El servicio y la política son autoritativos.

La búsqueda/fetch de `src/server/reviewRoute.ts` confirma el contrato HTTP aislado. Sin embargo, el runtime principal sigue concentrado en `src/server/server.ts`, un archivo grande y de alto riesgo de edición. La ruta aislada no puede considerarse efectiva hasta quedar registrada allí.

## Bloqueo técnico actual

No se ejecuta una edición parcial de `server.ts`. El siguiente cambio debe incorporar el import de `handleProfessionalReviewSave` y registrar `POST /api/reviews` junto a las demás rutas, preservando íntegramente el archivo existente.

## Frontend

También permanece el camino legacy `AppContext.addReview()`. Debe migrarse para llamar al endpoint autenticado y dejar de ser escritor directo de la colección `reviews`.

## Criterio de cierre

Reviews no debe marcarse 100% hasta que:

- la ruta esté registrada en runtime;
- el frontend use el endpoint;
- la creación quede condicionada al ServiceRequest elegible;
- los agregados de reputación se actualicen de forma autoritativa;
- la eliminación de cuenta cubra referencias de reviews.
