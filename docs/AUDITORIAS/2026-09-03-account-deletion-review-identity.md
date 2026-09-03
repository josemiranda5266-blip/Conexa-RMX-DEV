# Account deletion — review identity hardening

Fecha: 2026-09-03
Rama: `integration/conexa-unified`

## Corrección aplicada

La limpieza de cuenta ahora anonimiza las dos representaciones de identidad del autor en Reviews:

- `clientId`
- `authorId`

También limpia:

- `clientName`
- `clientAvatar`

Se añadió una segunda consulta por `authorId` para cubrir registros históricos donde esa identidad pudiera no coincidir operativamente con la consulta principal por `clientId`.

## Invariante

Después de la limpieza, una reseña histórica puede conservar su evidencia comercial y puntuaciones, pero no debe conservar un UID eliminando como identidad activa del autor.

## Pendiente

La baja profesional continúa requiriendo decisión de producto sobre conservación de `professionalId` en evidencia histórica versus anonimización completa. La proyección pública y RADAR ya se eliminan.
