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
1. El propietario puede crear una solicitud de verificación con `status == PENDING` y `userId == request.auth.uid`.
2. El propietario no puede marcarse como `VERIFIED` ni modificar el estado de una solicitud existente.
3. ADMIN/SUPER_ADMIN puede cambiar únicamente el estado de la solicitud a `VERIFIED` o `REJECTED`.
4. La aprobación administrativa debe actualizar también los flags derivados del perfil mediante una operación administrativa autorizada.
5. `isProfessionalVerified` y `professionalVerificationStatus` nunca deben ser modificables por el cliente.
6. Los documentos de verificación deben permanecer fuera del perfil público `/users`.

## Hallazgo adicional de matching
`MatchedProfessional.isVerified` actualmente se calcula como identidad verificada **o** perfil profesional verificado. Para una insignia denominada “Profesional Verificado”, la semántica debe depender de `isProfessionalVerified`; la verificación de identidad debe mostrarse como atributo independiente.

## Estado
- Auditoría registrada.
- Se corrigió la divergencia funcional principal: la creación de verificación ya no ocurre en la UI como un “estado local” ni cambia flags del perfil antes de aprobación administrativa.
- La solicitud de verificación se crea mediante `POST /api/verifications/create` con autenticación válida y `status: PENDING`.
- La aprobación administrativa es la única operación autorizada para actualizar `isProfessionalVerified` / `professionalVerificationStatus`.
- El flujo queda alineado con la arquitectura de `hasProfessionalProfile` (capacidad profesional) vs `isProfessionalVerified` (estado verificado por administración).
- La validación de Firestore y servidor ahora se comporta coherentemente con la política de permisos y con la separación de capas.
- Se ejecutó verificación estática del bloque relevante; el repositorio global sigue teniendo errores TypeScript adicionales fuera de este flujo, pero la regresión del flujo de verificación quedó corregida.

## Corrección aplicada

Se consolidó la creación de verificación en un flujo autenticado y administrativo, sin duplicar decisiones entre cliente y servidor.

- Verifica Firebase ID token.
- Valida tipo y metadatos del documento.
- Exige perfil profesional existente para solicitudes profesionales.
- Crea la solicitud con estado `PENDING`.
- Evita mutaciones del perfil antes de aprobación.
- Deja la aprobación administrativa como única vía para actualizar flags de verificación.
