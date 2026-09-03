# Auditoría — estrategia de integración de rutas críticas

Fecha: 2026-09-03
Repositorio: `josemiranda5266-blip/Conexa-RMX-DEV`
Rama: `integration/conexa-unified`

## Verificación

Repositorio definitivo: `josemiranda5266-blip/Conexa-RMX-DEV`.
Rama definitiva: `integration/conexa-unified`.

## Hallazgo

`server.ts` continúa concentrando rutas críticas y contiene implementaciones antiguas que duplican servicios ya endurecidos en `src/server/`.

Se verificaron dos casos especialmente relevantes:

### Perfil profesional

Existe `saveProfessionalProfile()` como servicio canónico. El servicio valida catálogo, normaliza datos, sincroniza `users`, `public_professional_profiles` y `radar_candidates` dentro de una transacción. fileciteturn1182file0

La ruta HTTP antigua todavía no delega en este servicio.

### Eliminación de cuenta

Existe `processAccountDeletion()` con checkpoint durable y etapas reintentables. La implementación ya separa Firestore, Storage, auditoría y Firebase Auth. fileciteturn1180file0

La ruta HTTP antigua todavía ejecuta el flujo destructivo inline.

## Decisión técnica

No se realizará una sustitución completa de `server.ts` mientras no exista una copia completa y verificable del archivo actual. El archivo es demasiado grande para una actualización segura basada en contenido truncado.

La siguiente fase debe extraer rutas críticas a módulos independientes y dejar `server.ts` como ensamblador. Esto permite:

- reducir el riesgo de cambios parciales;
- evitar duplicación de lógica;
- usar `getAdminDb()` de forma consistente;
- aislar autenticación, validación y persistencia;
- hacer revisiones y pruebas por dominio.

## Prioridad

1. Ruta de guardado de perfil profesional.
2. Ruta de eliminación de cuenta.
3. `/api/radar/match` y endpoints RADAR productivos.
4. Diagnósticos públicos (`verify-token`, `config-status`).
5. Gemini/moderación y rate limiting.

## Verificación dinámica

No se ejecutaron tests ni build. La validación dinámica permanece para la fase final.
