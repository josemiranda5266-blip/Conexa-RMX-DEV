# Perfil profesional — extracción del handler HTTP

Fecha: 2026-09-03
Rama: `integration/conexa-unified`

## Avance

Se creó `src/server/professionalProfileRoute.ts` para separar el endpoint HTTP de la persistencia del perfil profesional.

El handler:

- autentica mediante `verifyAuthToken`;
- toma siempre `auth.userId` como identidad efectiva, sin confiar en un userId enviado por el cliente;
- adapta `specialtiesText`/`specialties` y `workHours`/`workingHours` para compatibilidad de clientes;
- delega la validación y persistencia en `saveProfessionalProfile`;
- devuelve errores de validación, inexistencia y bloqueo con códigos HTTP diferenciados;
- no escribe directamente en Firestore.

## Arquitectura resultante

HTTP → `handleProfessionalProfileSave` → `saveProfessionalProfile` → transacción Firestore → `users` + `public_professional_profiles` + `radar_candidates`.

Esto prepara la sustitución de la implementación inline actualmente existente en `server.ts`.

## Integración pendiente

`server.ts` sigue siendo el punto de cableado del runtime. La conexión final no se realizó porque el archivo masivo no está siendo recuperable de forma segura mediante el conector actual; no se debe reconstruir ni sobrescribir a ciegas.

## Verificación

No se ejecutaron tests ni build, de acuerdo con la estrategia de trabajo vigente. La verificación se realizará después de completar las correcciones estructurales.
