# Auditoría — alineación del contrato de escritura profesional

Fecha: 2026-09-03
Rama: `integration/conexa-unified`

## Hallazgo

La política de validación ya modelaba `servicesOffered` como objetos con `title`, `description`, `id` y `approxPriceArs`, pero su interfaz pública los declaraba incorrectamente como `string[]`. Eso dejaba una incompatibilidad entre el contrato declarado y el normalizador real.

## Corrección

Se alineó `ProfessionalProfileWriteInput` y `NormalizedProfessionalProfileWrite` con `ServiceItem[]`, y se centralizó la normalización estricta de servicios.

También se eliminó la generación de IDs mediante una dependencia runtime innecesaria: los servicios sin ID reciben un identificador determinista basado en su posición dentro del payload.

## Seguridad

Se conserva la política estricta:

- máximo 30 servicios;
- título obligatorio y máximo 160 caracteres;
- descripción obligatoria y máximo 1000 caracteres;
- precio opcional entre 0 y 100.000.000 ARS;
- máximo 20 imágenes de portfolio;
- únicamente URLs `https:`.

## Pendiente

La política todavía debe ser invocada por `/api/professional-profile/save`. La integración con la escritura de `/users` y la sincronización de `public_professional_profiles` continúa pendiente.

## Nota

No se ejecutaron tests ni build. Esta auditoría es una revisión estructural del contrato y su implementación.
