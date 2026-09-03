# Auditoría — Proyección pública del perfil profesional

Fecha: 2026-09-03
Rama: `integration/conexa-unified`

## Verificación de contexto

Antes de esta modificación se verificó que el trabajo definitivo continúa en `josemiranda5266-blip/Conexa-RMX-DEV`, rama `integration/conexa-unified`.

## Hallazgo

`UserProfile` mezcla identidad, datos profesionales, reputación, autorización, suscripción y datos sensibles. El directorio profesional y `ProfessionalDetailModal` necesitan más información que la proyección mínima de `public_profiles`, pero no deben leer el documento privado `/users` como contrato público.

El catálogo existente confirma que el modelo profesional contiene `businessName`, `professionId`, `professionName`, `specialties`, `description`, `workZoneRadiusKm`, `workingHours`, `servicesOffered` y `portfolioImages`. Estos campos son necesarios para representar el perfil profesional público; las credenciales, tarifa horaria y datos privados requieren tratamiento separado.

## Corrección realizada

Se creó `src/server/publicProfessionalProfileProjection.ts` como frontera server-side para `public_professional_profiles/{userId}`.

La proyección incluye únicamente:

- identidad pública básica: `id`, `name`, `avatar`, `bioPublic`;
- catálogo profesional: `businessName`, `professionId`, `professionName`, `specialties`, `description`, `workZoneRadiusKm`, `workingHours`, `servicesOffered`, `portfolioImages`;
- ubicación aproximada: ciudad, provincia, país y zona aproximada;
- reputación pública: verificaciones, rating, cantidad de reseñas y trabajos completados;
- disponibilidad.

Se excluyen deliberadamente `email`, teléfonos, dirección exacta, `matriculaOrDegree`, `hourlyRateArs`, `trustScore`, `role`, `activeMode`, suscripción y estado administrativo.

La escritura usa `getAdminDb()`, que respeta `firestoreDatabaseId`, evitando repetir el acceso directo a `getAdminFirestore(app)` que existe actualmente en el endpoint legado.

La proyección también admite temporalmente `workHours` como fallback de lectura para absorber datos históricos mientras `workingHours` se convierte en el campo canónico.

## Estado

Esto establece el contrato y el writer server-side, pero todavía no se conecta al endpoint `/api/professional-profile/save`. Esa integración queda deliberadamente separada porque `server.ts` es monolítico y la integración debe hacerse preservando autenticación, autorización, normalización y respuesta segura en una única modificación controlada.

## Siguiente bloque técnico

1. Integrar `professionalProfilePolicy` en el endpoint real.
2. Cambiar el endpoint a `getAdminDb()`.
3. Persistir `professionId` validado contra el catálogo.
4. Canonicalizar `workingHours` y mantener compatibilidad controlada con `workHours`.
5. Ejecutar la proyección profesional después de una escritura autorizada.
6. Migrar el directorio profesional para consumir la proyección, no `/users`.
7. Auditar reglas Firestore específicas de `public_professional_profiles`.

No se ejecutaron tests ni build, conforme al plan de trabajo vigente.
