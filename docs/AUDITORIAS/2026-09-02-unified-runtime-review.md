# Revisión de continuidad del runtime unificado — 2026-09-02

## Repositorio objetivo
- Repositorio: `josemiranda5266-blip/Conexa-RMX-DEV`
- Rama: `integration/conexa-unified`

## Estado verificado
- La rama objetivo avanzó desde la sincronización local del usuario y actualmente contiene el cierre de hardening de Radar y del flujo de verificación.
- `BecomeProfessionalModal` ya invoca `POST /api/professional-profile/save` con Firebase ID token para persistir el perfil profesional.
- El archivo mantiene una construcción local redundante (`updatedUser`) que no debe utilizarse como autoridad; la respuesta del backend es la única fuente persistida.
- El upload del documento usa `verificationStorage` y la solicitud se envía mediante `submitVerification()` después de recibir una ruta generada por Storage.
- `professionalMatching.ts` separa `isIdentityVerified` de `isProfessionalVerified`; la insignia de profesional verificado depende del segundo flag.
- `activeMode` se mantiene como preferencia de sesión/UI y no como fuente de autorización.

## Riesgo residual priorizado
1. La UI del perfil profesional conserva una representación local de usuario que puede inducir futuras regresiones si se reutiliza para persistir datos.
2. La documentación histórica todavía mezcla estados anteriores con el estado actual y debe mantenerse como registro, no como contrato operativo.
3. La siguiente fase debe cerrar el tramo financiero y de contratación: `Quote/Transaction → PAYMENT_PENDING → PAID`, asegurando que la UI invoque comandos backend y no mutaciones directas.

## Regla operativa
No se deben agregar nuevas escrituras cliente directas para:
- `role`;
- `isProfessional`;
- `hasProfessionalProfile`;
- `isProfessionalVerified`;
- `professionalVerificationStatus`;
- estados comerciales de `Quote`, `Transaction` o `ServiceRequest`.

## Próxima fase técnica
Auditar y corregir, en este orden:
1. llamada UI de aceptación de quote y creación transaccional;
2. reconciliación de estados de pago mediante webhook;
3. reviews autoritativas y agregación de reputación;
4. limpieza final de lógica demo restante y documentación operativa.

No se ejecutaron tests ni build, según la directiva de trabajo vigente.
