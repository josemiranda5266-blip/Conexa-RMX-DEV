# Auditoría — formulario de perfil profesional

Fecha: 2026-09-03
Rama: `integration/conexa-unified`

## Corrección aplicada

`BecomeProfessionalModal.tsx` ahora:

- selecciona la profesión por `professionId` estable, no por texto libre;
- envía `professionId` + `professionName` canónicos al backend;
- elimina la opción libre `Otro Oficio / Técnico`, que era incompatible con el catálogo autoritativo del backend;
- usa `workingHours` como campo canónico;
- mantiene `workHours` solo como compatibilidad en el objeto local mientras se completa la migración;
- inicializa perfiles históricos de `Electricista Matriculado` contra `prof-electricista` mediante alias controlado;
- conserva `role` sin intentar elevar privilegios desde el formulario.

## Efecto arquitectónico

El formulario ya habla el mismo contrato que `professionalProfilePolicy` + `professionalProfileService`. El único paso que continúa pendiente es reemplazar la implementación inline del endpoint en `server.ts` por el nuevo servicio.
