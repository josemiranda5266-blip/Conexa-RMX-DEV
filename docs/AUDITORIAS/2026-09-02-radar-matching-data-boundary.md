# Auditoría — límite de datos del RADAR / matching

Fecha: 2026-09-02
Rama: `integration/conexa-unified`

## Verificación de rama

La rama definitiva auditada es `integration/conexa-unified`, actualmente en `7c601d4c3b5a2563eba2163473a8fffee5785696` al iniciar esta revisión.

## Hallazgo

`src/domain/professionalMatching.ts` ya centraliza la elegibilidad y normalización del candidato profesional y evita candidatos bloqueados. Sin embargo, el motor recibe `UserProfile[]` completos.

Esto mantiene al RADAR acoplado al directorio global de `/users` y, por extensión, a datos que no deberían ser necesarios para una operación de matching del cliente.

El nuevo contrato `PublicUserProfile` no es suficiente para reemplazar directamente al candidato del RADAR: el algoritmo actual también utiliza `professionId`, `specialties` y `trustScore`.

## Decisión arquitectónica

No ampliar `public_profiles` indiscriminadamente para satisfacer al motor actual. Los datos de matching que no sean estrictamente públicos deben mantenerse fuera del directorio público.

La migración correcta queda definida en dos capas:

1. **Perfil público:** nombre, avatar, profesión pública, bio pública, ubicación aproximada, verificaciones públicas y reputación pública necesaria para la UI.
2. **Candidato de matching:** datos normalizados mínimos para calcular compatibilidad, idealmente obtenidos en una consulta acotada y, para reglas sensibles, evaluados en backend.

## Estado

No se modificó `professionalMatching.ts` en esta etapa porque hacerlo compatible con `PublicUserProfile` exigiría decidir qué atributos de matching deben hacerse públicos y cuáles deben permanecer privados. La auditoría deja el límite explícito para evitar una ampliación accidental del contrato público.

No se ejecutaron tests ni build.
