# Auditoría — Integración backend del perfil profesional

Fecha: 2026-09-03
Rama: `integration/conexa-unified`

## Estado

Se verificó nuevamente que la rama definitiva es `integration/conexa-unified` y que el HEAD auditado corresponde al trabajo activo del flujo profesional.

No se ejecutaron tests ni build, por instrucción del proceso de trabajo actual.

## Hallazgos confirmados

1. `POST /api/professional-profile/save` autentica al usuario mediante Firebase ID token y escribe sobre `/users/{uid}`.
2. El endpoint actualmente utiliza `getAdminFirestore(app)` directamente, mientras que el servidor dispone de un helper `getAdminDb()` que centraliza el acceso a Firestore y contempla la configuración de base de datos. Esto debe unificarse antes de producción.
3. El contrato histórico utiliza `workHours`, mientras el modelo público/profesional objetivo utiliza `workingHours`. La normalización debe ser explícita para evitar que el editor y las vistas trabajen sobre campos distintos.
4. El editor actual no persiste `professionId`, por lo que la profesión queda identificada solamente por nombre. El backend debe validar/resolver un identificador estable cuando exista en el catálogo.
5. `servicesOffered` y `portfolioImages` forman parte de la vista profesional pero no existe todavía un flujo productivo de edición completo.
6. El perfil profesional debe proyectarse posteriormente a una colección pública separada (`public_professional_profiles`) sin exponer datos privados, de autorización, facturación o seguridad.

## Corrección realizada

Se creó `src/server/professionalProfilePolicy.ts` para centralizar normalización y límites del payload profesional.

El contrato contempla:

- `professionId`
- `professionName`
- `businessName`
- `specialties`
- `description`
- `workZoneRadiusKm`
- `workingHours`
- `matriculaOrDegree`
- `hourlyRateArs`
- `servicesOffered`
- `portfolioImages`

Se establecieron límites para listas y longitudes y se agregó validación de URLs HTTP/HTTPS para imágenes de portfolio.

## Próxima integración

La siguiente modificación debe conectar el endpoint existente con esta política y con `getAdminDb()`, manteniendo la autorización basada en el usuario autenticado y evitando que el cliente pueda alterar `role`, `activeMode`, estados administrativos o campos privados.

Después deberá incorporarse la proyección pública profesional y migrarse el directorio para consumir esa proyección en lugar de depender del documento completo `/users`.

## Decisión arquitectónica

```text
/users
  └── fuente privada/full del usuario

/public_profiles
  └── identidad pública mínima

/public_professional_profiles
  └── catálogo profesional público

matching candidates
  └── datos mínimos específicos del motor RADAR
```

No se debe ampliar indiscriminadamente `/public_profiles` para resolver necesidades del matching o del directorio.
