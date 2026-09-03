# Auditoría — lector público del directorio profesional

Fecha: 2026-09-03
Rama: `integration/conexa-unified`

## Objetivo

Preparar la migración del directorio profesional desde la colección privada `/users` hacia la proyección pública `/public_professional_profiles`.

## Cambios registrados

- Se creó `src/domain/publicProfessionalProfile.ts` con el contrato público del catálogo profesional.
- Se creó `src/services/publicProfessionalProfileService.ts` con suscripción realtime a `public_professional_profiles`.
- La lectura queda limitada a la proyección pública; el lector no consulta `/users`.
- El lector normaliza límites de strings, listas, servicios, reputación, disponibilidad y ubicación aproximada.
- Se estableció un límite defensivo de 500 perfiles por snapshot.
- La consulta se ordena por `updatedAt` descendente.
- La consulta realtime ahora aplica `limit(500)` directamente en Firestore, en lugar de recibir todos los documentos y recortarlos posteriormente en memoria. Esto reduce lecturas, transferencia y trabajo del cliente a medida que crezca el catálogo.

## Frontera de privacidad

El contrato público no contiene email, teléfono, domicilio exacto, matrícula/título, tarifa horaria, `trustScore`, rol, `activeMode`, suscripción ni estado administrativo.

## Pendiente de integración

Los consumidores visuales (`ProfessionalCard`, `ProfessionalDetailModal` y el flujo de descubrimiento) todavía reciben `UserProfile` en distintos puntos. La siguiente fase debe reemplazar esa dependencia por `PublicProfessionalProfile` sin romper las acciones que requieren identidad autenticada o backend.

## Riesgo conocido

La colección pública requiere que la proyección backend exista para cada profesional activo. Hasta conectar el escritor autoritativo al endpoint de guardado del perfil, el lector puede devolver un catálogo incompleto.

## Regla de trabajo

No se debe volver a usar `/users` como fuente pública del directorio una vez completada esta migración. `/users` queda reservado para datos privados/autenticados y operaciones backend.
