# Account deletion — identity hardening applied

Fecha: 2026-09-03
Rama: `integration/conexa-unified`

## Correcciones aplicadas

1. `normalizeDeletionUserId()` ahora rechaza caracteres `/`.
2. La creación del checkpoint inicial pasó a una transacción, eliminando la carrera `get() -> create()`.
3. La limpieza elimina referencias profesionales mutables en:
   - `service_requests.assignedProfessionalId`;
   - `service_requests.biddingProfessionalIds`;
   - `reviews.professionalId`.
4. Las proyecciones públicas del profesional y candidatos RADAR continúan eliminándose.
5. Los registros financieros no se borran para preservar auditoría comercial.

## Pendientes

- Auditar referencias profesionales adicionales antes del cierre total.
- Confirmar que el endpoint runtime usa exclusivamente `processAccountDeletion()`.
- Revisar conversaciones y participantIds como fase separada de identidad conversacional.

No se ejecutaron tests ni build por decisión de fase: primero finalizar correcciones estructurales.