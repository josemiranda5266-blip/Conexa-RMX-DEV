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
- Corrección de reglas de verificación pendiente de aplicación porque requiere reemplazar el archivo completo de reglas sin perder las restricciones ya endurecidas.
- No se ejecutaron tests.
