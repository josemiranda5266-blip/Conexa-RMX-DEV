# Public professional reviews boundary

Fecha: 2026-09-03
Rama: `integration/conexa-unified`

## Cambio

Se crea `src/services/publicProfessionalReviewService.ts` como límite específico para la lectura pública de reseñas asociadas a un profesional.

La pantalla pública ya no necesita depender del array global `reviews` del `AppContext` para determinar las reseñas de un profesional.

## Garantías

- Consulta exclusivamente `reviews` por `professionalId`.
- Límite de 100 documentos por profesional para evitar lecturas ilimitadas.
- Ordenamiento por `createdAt` después de la consulta, evitando exigir un índice compuesto adicional.
- Excluye reseñas marcadas como demo o reportadas.
- Expone un contrato público sin `clientId`, `authorId`, `serviceRequestId` ni `jobId`.
- Conserva las puntuaciones necesarias para la presentación pública.

## Pendiente de integración

`ProfessionalDetailModal.tsx` todavía consume `reviews` desde `AppContext`. La siguiente integración debe sustituir ese acoplamiento por este servicio sin modificar la semántica del resto del contexto.

No se ejecutaron tests/build: la fase actual continúa centrada en correcciones estructurales.
