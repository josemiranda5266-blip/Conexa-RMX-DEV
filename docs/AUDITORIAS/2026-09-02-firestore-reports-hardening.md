# CONEXA — Hardening de Firestore para reportes

## Repositorio y rama

- Repositorio: `josemiranda5266-blip/Conexa-RMX-DEV`
- Rama definitiva: `integration/conexa-unified`
- Fecha: 2026-09-02

## Hallazgo

La regla anterior de `reports/{reportId}` únicamente verificaba que `reporterId` coincidiera con el usuario autenticado. El cliente podía intentar enviar campos administrativos o valores de estado no previstos por el modelo `UserReport`.

## Corrección

La creación de reportes ahora:

- restringe el conjunto de campos aceptados;
- exige `reporterId`, `reportedUserId`, `reason`, `description`, `createdAt` y `status`;
- liga `reporterId` al UID autenticado;
- impide denunciarse a sí mismo;
- restringe `reason` al catálogo oficial;
- exige descripción no vacía y limita su longitud a 2000 caracteres;
- obliga `status == 'PENDING'` al crear;
- mantiene lectura, actualización y eliminación exclusivamente para administradores.

## Criterio de producción

La regla queda alineada con el principio de mínimo privilegio: el cliente puede crear únicamente un reporte inicial, mientras que el estado administrativo y su tratamiento posterior permanecen fuera de su control.

No se ejecutaron tests ni build en esta etapa.
