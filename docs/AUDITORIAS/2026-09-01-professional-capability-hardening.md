# Auditoría de capacidad profesional — 2026-09-01

## Alcance

Repositorio canónico: `josemiranda5266-blip/Conexa-RMX-DEV`
Rama: `integration/conexa-unified`

## Hallazgo

`UserProfile` mantiene varias señales relacionadas con la capacidad profesional: `role`, `activeMode`, `isProfessional` y `hasProfessionalProfile`.

El motor de matching ya separa correctamente `activeMode` de la capacidad de dominio: el modo de interfaz no puede otorgar capacidad profesional por sí solo.

Sin embargo, las reglas de Firestore permitían que el propietario del documento modificara directamente `isProfessional` y `hasProfessionalProfile`. Como el matching reconoce esas señales como evidencia de capacidad, esto constituía una posible autoelevación funcional.

## Corrección aplicada

Se endureció `firestore.rules` para que los clientes no puedan crear ni modificar directamente:

- `isProfessional`
- `hasProfessionalProfile`
- `isProfessionalVerified`
- `professionalVerificationStatus`
- `isIdentityVerified`
- `identityVerificationStatus`
- métricas de reputación y confianza
- flags administrativos/comerciales protegidos

La concesión de capacidad profesional queda reservada al backend/control administrativo.

Commit: `e572dece775a3b9ec74ba2f24fcc991d4859a2eb`

## Consecuencia arquitectónica

Ahora falta implementar explícitamente el flujo legítimo de alta profesional. No se debe reabrir la escritura directa en Firestore para resolverlo.

Flujo objetivo:

`USER` → solicitud de alta profesional → validación backend → perfil profesional habilitado → documentación → verificación → elegibilidad para descubrimiento/Radar según política.

## Punto pendiente

Debe definirse una única política de elegibilidad que diferencie:

1. capacidad profesional;
2. perfil profesional completo;
3. identidad verificada;
4. credencial profesional verificada;
5. profesional descubrible en Matching/Radar.

Hasta que esa política exista, no se debe usar `isProfessionalVerified` como sustituto implícito de `hasProfessionalProfile` ni viceversa.

## Storage

La auditoría del árbol canónico no encontró `storage.rules` ni código cliente dedicado a Firebase Storage. Por tanto, los documentos de verificación todavía están modelados como `documentUrl` y el backend no demuestra control de pertenencia sobre el objeto almacenado.

El siguiente paso debe ser diseñar Storage a partir de los usos reales de archivos, sin crear reglas genéricas que puedan bloquear funcionalidades existentes o exponer documentos sensibles.
