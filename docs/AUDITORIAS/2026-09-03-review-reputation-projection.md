# Auditoría — proyección de reputación desde Reviews

Fecha: 2026-09-03
Rama definitiva: `integration/conexa-unified`

## Problema

La creación autoritativa de una Review no puede considerarse completa si los agregados públicos `rating` y `reviewCount` quedan desacoplados de la transacción de escritura.

## Implementación preparada

Se creó `src/server/reviewReputationProjection.ts`.

El módulo:

- normaliza agregados existentes;
- calcula el siguiente promedio de manera incremental;
- incrementa `reviewCount`;
- redondea el rating público a dos decimales;
- no depende de AppContext ni del frontend.

## Estado

La proyección todavía debe conectarse dentro de la transacción de `saveProfessionalReview()` sobre las representaciones autoritativas del profesional.

No se asumió el nombre final de todas las colecciones de proyección porque debe preservarse el contrato actual del repositorio y evitar duplicar perfiles públicos.

## Criterio

La transacción final debe actualizar Review + agregados de reputación de forma atómica. Si una de las operaciones falla, ninguna debe dejar el sistema parcialmente actualizado.
