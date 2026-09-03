# Auditoría — contrato de datos públicos del profesional

**Fecha:** 2026-09-03  
**Repositorio:** `josemiranda5266-blip/Conexa-RMX-DEV`  
**Rama:** `integration/conexa-unified`  

## Objetivo

Determinar qué información necesita el directorio profesional y qué parte puede salir de `/users` sin exponer datos privados, administrativos o de seguridad.

## Hallazgo principal

`UserProfile` mezcla identidad, catálogo profesional, reputación, autorización, suscripción y datos potencialmente sensibles. El directorio no debe consumir el documento completo como contrato público.

El contrato actual contiene, entre otros, `businessName`, `professionId`, `professionName`, `specialties`, `description`, `workZoneRadiusKm`, `isProfessionalVerified`, `matriculaOrDegree`, `rating`, `reviewCount`, `jobsCompleted`, `trustScore`, `availabilityStatus`, `hourlyRateArs`, `servicesOffered`, `portfolioImages` y `workingHours`.

## Contrato público candidato

### Identidad pública
- `id`
- `name`
- `avatar`
- `professionName`
- `bioPublic`
- `location.city`
- `location.province`
- `location.country`
- `location.approxZone`

### Catálogo profesional público
- `businessName`
- `professionId`
- `professionName`
- `specialties`
- `description`
- `workZoneRadiusKm`
- `servicesOffered`
- `portfolioImages`
- `workingHours`

### Señales públicas de confianza
- `isIdentityVerified`
- `isProfessionalVerified`
- `rating`
- `reviewCount`
- `jobsCompleted`
- `availabilityStatus`

## Campos que NO deben entrar en el perfil público

- `email`
- teléfono privado
- dirección exacta
- `matriculaOrDegree` sin una política explícita de publicación/verificación
- `trustScore` como campo de catálogo general hasta definir si es una señal pública o exclusivamente interna
- `hourlyRateArs` hasta definir política de exposición de precios
- `isProSubscriber`
- `isFeatured` como dato de confianza; puede existir como metadata de ranking/merchandising separada
- `role`
- `activeMode`
- `hasClientProfile`
- `hasProfessionalProfile`
- estados administrativos de verificación
- cualquier dato de autorización, facturación o seguridad

## Evidencia del frontend

`ProfessionalCard` utiliza nombre, avatar, negocio, profesión, verificación, trust score, reputación, trabajos, zona aproximada, descripción y especialidades. `ProfessionalDetailModal` agrega servicios, portfolio, zona de cobertura y horarios. Por lo tanto, `public_profiles` actual es insuficiente para reemplazar directamente a `UserProfile`.

## Estado de backend

Existe un proyector server-only para `public_profiles`, pero su contrato deliberadamente mantiene una representación mínima. La escritura se realiza con Firebase Admin y no desde el cliente.

## Decisión

No ampliar `public_profiles` con todos los campos profesionales. Se mantiene la separación:

```text
/users
  └── fuente completa / privada

/public_profiles
  └── identidad pública mínima

/public_professional_profiles
  └── catálogo profesional público

matching candidates
  └── datos mínimos exclusivos del motor RADAR
```

La creación de `public_professional_profiles` debe hacerse después de localizar todos los escritores reales de los campos profesionales y definir una única política de publicación. No se debe crear una proyección que quede desincronizada de `/users`.

## Riesgo residual

Mientras el directorio siga recibiendo `UserProfile[]`, `/users` continúa siendo una dependencia de lectura global y representa un riesgo de escalabilidad y privacidad. La migración debe hacerse después de establecer el escritor/proyector autoritativo.

## Verificación realizada

Se verificó explícitamente el repositorio y rama antes del análisis. No se ejecutaron tests ni build.
