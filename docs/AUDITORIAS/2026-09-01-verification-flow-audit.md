# Auditoría de verificación profesional — 2026-09-01

## Repositorio objetivo
- Repositorio: `josemiranda5266-blip/Conexa-RMX-DEV`
- Rama: `integration/conexa-unified`

## Hallazgo crítico
El flujo de UI de `BecomeProfessionalModal` guarda el perfil profesional directamente en `/users/{uid}` mediante `setDoc(..., { merge: true })`. El modelo distingue correctamente `hasProfessionalProfile` / `isProfessional` de `isProfessionalVerified`.

Las reglas actuales protegen los flags de verificación y también bloquean `isProfessional` y `hasProfessionalProfile` en actualizaciones del propietario. Por lo tanto, el flujo de conversión a profesional puede ser rechazado por Firestore aunque la UI intente guardarlo.

## Verificaciones
La colección `/verifications/{verifId}` tiene actualmente `create, update, delete: if false`. Esto impide tanto la creación de una solicitud desde cliente como la actualización de estado desde un administrador mediante cliente. El `AppContext` expone `submitVerification()` y `approveVerification()`, por lo que existe una divergencia entre API de aplicación y autorización de datos.

## Política requerida
1. El propietario puede crear una solicitud de verificación únicamente a través del backend autenticado.
2. El propietario no puede marcarse como `VERIFIED` ni modificar el estado de una solicitud existente.
3. ADMIN/SUPER_ADMIN puede cambiar únicamente el estado de la solicitud mediante el backend administrativo.
4. La aprobación administrativa debe actualizar también los flags derivados del perfil mediante una operación administrativa autorizada.
5. `isProfessionalVerified` y `professionalVerificationStatus` nunca deben ser modificables por el cliente.
6. Los documentos de verificación deben permanecer fuera del perfil público `/users`.

## Hallazgo adicional de matching
`MatchedProfessional.isVerified` actualmente se calcula como identidad verificada **o** perfil profesional verificado. Para una insignia denominada “Profesional Verificado”, la semántica debe depender de `isProfessionalVerified`; la verificación de identidad debe mostrarse como atributo independiente.

## Storage
El bucket de Firebase está configurado, pero el repositorio no tenía una frontera explícita de Storage para documentos de verificación.

Se agregó `storage.rules` con una política deny-by-default y un único namespace autorizado:
`verification-documents/{userId}/{uploadId}`.

La política actual permite al propietario autenticado crear únicamente archivos de hasta 10 MiB y tipos JPEG, PNG, WebP o PDF. No permite overwrite ni delete desde cliente. La revisión administrativa queda reservada al Admin SDK.

También se agregó `src/services/verificationStorage.ts`, que valida autenticación, tipo y tamaño antes de subir el archivo y genera un identificador aleatorio para evitar nombres de archivo controlados por el usuario en la ruta.

`src/lib/firebase.ts` ahora inicializa y exporta Firebase Storage cuando existe `storageBucket` en la configuración.

## Próximo cambio obligatorio
La UI de `BecomeProfessionalModal` todavía contiene la escritura directa del perfil profesional. No debe reabrirse esa escritura en Firestore. Debe reemplazarse por un endpoint backend autenticado que:

- valide el Firebase ID token;
- derive el `userId` exclusivamente del token;
- valide y normalice los datos profesionales;
- preserve el `role` de autorización;
- establezca `hasProfessionalProfile` / `isProfessional` como estado derivado de la operación autorizada;
- impida que `activeMode` por sí solo otorgue capacidad profesional;
- devuelva el perfil persistido al cliente.

Asimismo, el endpoint de verificación debe dejar de aceptar una `documentUrl` arbitraria y recibir una referencia `documentPath` perteneciente al usuario autenticado. El backend deberá comprobar que el objeto existe y que la ruta pertenece al UID antes de registrar la solicitud.

## Estado
- Firestore: capacidad profesional y estados de verificación protegidos contra escritura directa del cliente.
- Verification API: creación y aprobación administrativas existentes y autenticadas.
- Storage: frontera privada creada.
- Cliente Storage: servicio de upload creado.
- Conversión USER → perfil profesional: **pendiente de migración de la UI al endpoint backend**.
- Verificación → Storage: **pendiente de conectar `documentPath` al endpoint backend**.

No se ejecutaron tests/build en esta etapa; la verificación dinámica queda para la fase final, después de completar las correcciones estructurales restantes.
