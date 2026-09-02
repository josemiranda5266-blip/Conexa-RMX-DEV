# Conexa — Continuación de hardening de perfil profesional y verificación

Fecha de auditoría: 2026-09-01
Repositorio canónico: `josemiranda5266-blip/Conexa-RMX-DEV`
Branch canónica: `integration/conexa-unified`

## Alcance

Se continuó la corrección del flujo profesional/verificación después de cerrar el límite de seguridad de Firestore y crear la frontera de Firebase Storage.

## Correcciones aplicadas

### 1. Perfil profesional

- Se eliminó la escritura directa desde `BecomeProfessionalModal` sobre `users/{uid}` para `isProfessional` y `hasProfessionalProfile`.
- La activación del perfil profesional pasa por `POST /api/professional-profile/save`.
- El backend deriva el `uid` exclusivamente del token Firebase.
- Se validan profesión, especialidades, descripción, radio de cobertura, horarios, matrícula/título y tarifa.
- El backend no permite que el cliente eleve `isProfessionalVerified` ni cambie el rol administrativo.
- Se mantiene la distinción entre capacidad profesional y `activeMode`.

### 2. Documentos de verificación

- Se eliminó el uso de `documentUrl` como referencia persistente.
- El modelo utiliza `documentPath`, apuntando exclusivamente al objeto privado de Firebase Storage.
- El backend valida que la ruta comience con `verification-documents/{uid}/`, rechaza traversal y comprueba existencia, MIME y tamaño.
- Los documentos permitidos son JPEG, PNG, WebP y PDF, con límite de 10 MiB.
- La UI profesional ahora puede seleccionar el documento y subirlo mediante `verificationStorage.ts` antes de crear la solicitud de verificación.

### 3. Acceso administrativo

- Se agregó un endpoint administrativo para generar un acceso temporal al documento de verificación.
- El endpoint exige privilegios ADMIN/SUPER_ADMIN.
- El acceso se genera bajo demanda y no se persiste como URL pública.
- El panel administrativo incorpora la acción de visualizar el documento.

### 4. Alcance de listeners

- El listener global de `reports` quedó restringido a sesiones con claim administrativo.
- Las verificaciones de usuarios no administrativos se consultan únicamente por `userId` propio.
- Se evita que una sesión normal intente leer colecciones administrativas completas.

### 5. Baja de cuenta

- La eliminación/anominización de mensajes fue alineada con la jerarquía canónica `conversations/{conversationId}/messages` mediante `collectionGroup('messages')`.
- Se procesa por lotes para evitar superar límites de batch.
- Los documentos privados de verificación asociados al usuario se eliminan del bucket durante la baja.

### 6. Configuración Firebase

- Se registró `storage.rules` junto con `firestore.rules` mediante `firebase.json` para que ambas fronteras puedan desplegarse de forma explícita.

## Resultado de esta fase

La ruta queda conceptualmente:

`Usuario → Firebase Auth → backend autorizado → perfil profesional`

`Usuario → Firebase Auth → Storage privado → documentPath → backend de verificación`

`Admin → claim administrativo → backend → acceso temporal al documento`

Se eliminó la dependencia de URLs públicas persistentes para documentación sensible.

## Pendientes que permanecen

1. Verificar con build/typecheck y pruebas funcionales después de cerrar todas las correcciones del repositorio.
2. Confirmar despliegue efectivo de `storage.rules` en el proyecto Firebase productivo.
3. Continuar con la descomposición de `AppContext`.
4. Continuar con la auditoría de Radar, idempotencia y aislamiento simulación/producción.
5. Continuar con la modularización del `server.ts` monolítico.

## Verificación

Por decisión de la fase actual **no se ejecutaron build, tests ni pruebas de runtime**. La validación dinámica queda para la etapa final, una vez cerradas las correcciones pendientes.
