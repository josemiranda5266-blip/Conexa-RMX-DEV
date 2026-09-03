# Auditoría — validación estricta del perfil profesional

Fecha: 2026-09-03
Rama: `integration/conexa-unified`

## Cambio

Se endureció `src/server/professionalProfilePolicy.ts`.

La política anterior truncaba silenciosamente strings y listas antes de validar sus límites. Eso podía transformar una entrada inválida en una entrada aparentemente válida y ocultar errores del cliente.

La política ahora:

- rechaza strings que superan su longitud máxima;
- rechaza listas que superan su cantidad máxima;
- rechaza elementos que no sean strings cuando corresponde;
- elimina duplicados de especialidades;
- rechaza servicios mal formados;
- valida precios de servicios dentro del rango permitido;
- acepta únicamente URLs HTTPS para portfolio;
- rechaza URLs de portfolio inválidas;
- conserva los límites de radio y tarifa horaria.

## Decisión

La validación pertenece al backend y debe ejecutarse antes de cualquier escritura en `/users` o en `public_professional_profiles`.

## Pendiente

El endpoint `POST /api/professional-profile/save` todavía debe consumir esta política. No se modificó `server.ts` en este paso porque requiere una intervención controlada sobre el archivo monolítico.

No se ejecutaron tests ni build por la etapa actual de saneamiento estructural.
