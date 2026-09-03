# Auditoría RADAR — Proyección segura de candidatos

Fecha: 2026-09-03
Repositorio: `josemiranda5266-blip/Conexa-RMX-DEV`
Rama: `integration/conexa-unified`

## Hallazgo

El motor de matching ya operaba sobre `ProfessionalCandidate`, pero el proveedor transicional partía de `UserProfile` completos de la colección `/users`. La normalización ocurría después de transportar el modelo privado hasta la capa de matching.

## Corrección

Se creó `src/domain/radarCandidate.ts` con el contrato `RadarCandidate` y `toRadarCandidate()`.

La proyección conserva únicamente atributos necesarios para RADAR:

- identidad mínima de presentación;
- profesión y especialidades;
- ciudad, provincia y zona aproximada;
- rating, cantidad de reseñas y trabajos completados;
- `trustScore`, necesario actualmente para el scoring;
- disponibilidad;
- estado de verificación;
- avatar.

No forman parte de la proyección email, teléfono, domicilio exacto, credenciales, estado administrativo, suscripción ni otros campos privados del usuario.

`ProfessionalCandidate` pasó a ser un alias del contrato RADAR, evitando dos modelos equivalentes con riesgo de divergencia. El proveedor `radarCandidateService.ts` ahora utiliza explícitamente `toRadarCandidate()`.

## Estado de migración

Esto cierra la frontera de datos, pero **no elimina todavía la lectura amplia de `/users`**. La fuente seguirá siendo migrada posteriormente a una consulta/proyección RADAR acotada, preferentemente server-side.

No se modificó `server.ts` en esta etapa.

## Regla de arquitectura

`/users` puede seguir siendo una fuente transicional interna, pero ninguna capa de matching debe recibir ni depender de `UserProfile` completo. El contrato estable es `RadarCandidate`/`ProfessionalCandidate`.

## Verificación

No se ejecutaron tests ni build, por instrucción del flujo de trabajo actual. La validación dinámica queda para la etapa final de pruebas.
