# Auditoría — listener global `/users` y siguiente migración

**Fecha:** 2026-09-03  
**Repositorio:** `josemiranda5266-blip/Conexa-RMX-DEV`  
**Rama:** `integration/conexa-unified`  

## Verificación

La rama definitiva fue verificada antes de continuar. HEAD auditado: `d4c72dfdb63914a0755a36136f418b80f6a8b765`.

## Hallazgo

`AppContext` todavía inicializa `users[]` desde un snapshot global de Firestore cuando Firebase está configurado. Ese estado ya no es necesario para Messaging ni para la identidad autenticada.

## Consumidores que no deben migrarse a ciegas

El directorio profesional actual utiliza `UserProfile` completo y consume campos que no pertenecen al contrato público mínimo: `description`, `specialties`, `servicesOffered`, `portfolioImages`, `workingHours`, `businessName`, `trustScore`, entre otros.

Por lo tanto, eliminar el listener global sin crear primero una proyección profesional rompería el contrato de esos componentes o forzaría a publicar datos privados.

## Decisión

No se elimina todavía el listener global. La siguiente migración debe crear una frontera específica para el directorio profesional, con un contrato público mínimo definido desde los consumidores reales y sus escritores.

Arquitectura objetivo:

```text
/users
  ↓ privado/completo
/public_profiles
  ↓ identidad pública mínima
/public_professional_profiles
  ↓ catálogo profesional público
matching candidates
  ↓ motor RADAR
```

## Próxima auditoría

Rastrear los puntos que escriben los campos profesionales y clasificar cada campo como:

- público para catálogo;
- privado;
- interno/moderación;
- exclusivo del matching.

Solo después se debe implementar la proyección y migrar `ProfessionalCard`, `ProfessionalDetailModal` y el consumidor de búsqueda.

No se ejecutaron tests ni build.