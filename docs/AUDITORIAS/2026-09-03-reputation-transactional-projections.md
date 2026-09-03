# Auditoría — sincronización transaccional de reputación

Fecha: 2026-09-03
Rama definitiva: `integration/conexa-unified`

## Corrección aplicada

La creación autoritativa de una Review ahora actualiza dentro de la misma transacción lógica:

1. `reviews/{reviewId}` como fuente del evento reputacional.
2. `users/{professionalId}` con `rating` y `reviewCount`.
3. `public_professional_profiles/{professionalId}` con los mismos agregados y proyección pública reconstruida.
4. `radar_candidates/{professionalId}` mediante la proyección derivada del usuario actualizado.

Esto evita que el perfil público y RADAR queden mostrando una reputación distinta de la cuenta profesional.

## Invariantes

- El ID de Review sigue siendo determinístico por cliente + profesional + ServiceRequest.
- Un reintento que encuentra la Review existente no vuelve a incrementar la reputación.
- La reputación no se calcula desde el frontend.
- La proyección pública nunca incorpora campos privados del usuario.
- Si el profesional deja de ser elegible para RADAR, su proyección se elimina.

## Pendiente

Todavía falta registrar `reviewRoute` en el runtime principal y migrar `ReviewModal/AppContext` al endpoint. También debe resolverse la estrategia de recomputación administrativa para corregir agregados históricos si existieran datos legacy inconsistentes.

No se ejecutaron tests/build en esta fase.
