# Auditoría RADAR — Hardening del ranking

Fecha: 2026-09-03
Repositorio: `josemiranda5266-blip/Conexa-RMX-DEV`
Rama: `integration/conexa-unified`

## Hallazgo

La frontera de candidatos ya estaba aislada en `ProfessionalCandidate`/`RadarCandidate`, pero el límite recibido por el matcher no tenía un máximo operativo y el ordenamiento dependía únicamente del `matchScore`. Ante empates, el resultado podía variar según el orden de entrada de los candidatos.

## Corrección

En `src/domain/professionalMatchingCandidates.ts` se incorporó:

- límite por defecto de 10 resultados;
- límite máximo de 50 resultados para evitar solicitudes excesivas;
- normalización segura de límites no finitos;
- ranking determinista ante empate por `matchScore`, `trustScore`, `rating` y finalmente `candidate.id`.

La corrección no cambia el contrato del motor ni expone datos privados.

## Estado

RADAR queda mejor preparado para recibir candidatos desde una futura consulta server-side acotada. La migración de la fuente todavía queda pendiente: el proveedor transicional continúa partiendo de `/users` antes de proyectar los candidatos.

## Verificación

No se ejecutaron tests ni build. La validación dinámica queda reservada para la etapa final.
