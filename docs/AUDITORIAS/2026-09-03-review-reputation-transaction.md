# Auditoría — reputación transaccional

Fecha: 2026-09-03
Rama definitiva: `integration/conexa-unified`

## Corrección aplicada

Se endureció `src/server/reviewService.ts`.

La creación autoritativa de una reseña ahora:

- verifica que el profesional exista;
- rechaza profesionales bloqueados;
- calcula `rating` y `reviewCount` dentro de la misma transacción que crea la reseña;
- actualiza la cuenta profesional autoritativa;
- actualiza, si existe, `public_professional_profiles/{professionalId}`;
- no persiste el campo interno `changed` del helper de cálculo.

## Garantía

Una reseña creada mediante el servicio autoritativo no puede dejar separados los agregados de la cuenta profesional y su proyección pública, salvo que la proyección pública no exista, caso en el cual la cuenta canónica sigue siendo la fuente de verdad.

## Pendientes

- Registrar el endpoint en el runtime principal.
- Migrar `ReviewModal` y `AppContext.addReview()`.
- Definir política completa para recalcular reputación ante moderación o eliminación de una reseña.
- Revisar la anonimización de reseñas durante eliminación de cuenta para preservar consistencia histórica de agregados.
