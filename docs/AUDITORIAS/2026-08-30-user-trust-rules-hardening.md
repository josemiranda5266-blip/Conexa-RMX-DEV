# Auditoría — User Trust Rules Hardening

## Alcance
Endurecimiento de las escrituras de `/users/{userId}` para impedir que un usuario autenticado modifique campos autoritativos de reputación, verificación, bloqueo, promoción o datos demo.

## Corrección
Las Rules ahora rechazan cambios de cliente sobre:
- isIdentityVerified
- identityVerificationStatus
- isProfessionalVerified
- professionalVerificationStatus
- hasProfessionalProfile
- rating
- reviewCount
- jobsCompleted
- trustScore
- isBlocked
- isFeatured
- isProSubscriber
- isDemoData

La edición por cliente mantiene la protección de PII pública/privada, el rol y la prohibición de activar modo ADMIN. Los cambios administrativos siguen autorizados mediante `isAdmin()`.

## Motivo
Estos campos son datos autoritativos que alimentan verificación, reputación, matching y controles de cuenta. No deben depender de escrituras directas del navegador.

## Commit funcional
2db24a5b1e0fc946bda1f44805965f07926966fd
