# Auditoría actual — Conexa Unified

**Fecha:** 2026-09-09  
**Repositorio:** `josemiranda5266-blip/Conexa-RMX-DEV`  
**Rama objetivo:** `integration/conexa-unified`  
**Último commit auditado:** `c6e92496ca10a4dbe364b83ce08ecd0de8c03072`

## Estado de la auditoría

La rama objetivo fue verificada antes de modificarla. El repositorio es el único destino de cambios definitivos.

### Correcciones aplicadas durante esta fase

- `src/server/accountDeletionService.ts` fue endurecido para concurrencia: dos solicitudes de baja del mismo usuario ya no convierten un conflicto de checkpoint en un falso error. Si otra ejecución avanza primero, la segunda recarga el checkpoint durable y continúa desde el estado persistido.
- La validación de eventos compartidos fue acotada para limitar identificadores, tamaños de payload y colecciones antes de entrar al procesamiento de dominio.
- La conversión de oportunidades RADAR ahora exige que el profesional solicitado pertenezca realmente al conjunto `matchedProfessionals` de la oportunidad; se evita así convertir una oportunidad hacia un profesional no emparejado.
- La interfaz de solicitudes dejó de duplicar la heurística de capacidad profesional y consume `canUseProfessionalMode()` como autoridad única.

Esto conserva el diseño reentrante de `accountDeletionPolicy.ts`, la idempotencia durable de eventos y la separación entre proyección canónica de RADAR y perfiles privados.

## Pendientes P0

1. **Runtime legacy en `server.ts`:** sigue existiendo una autoridad paralela de gran tamaño frente a `src/server`, `apps/api-nexora` y `apps/api-conexa`.
2. **Professional Profile:** la ruta raíz todavía debe quedar delegada exclusivamente al servicio canónico.
3. **RADAR:** todavía existen rutas/webhooks legacy con construcción de oportunidades en memoria; deben delegarse a persistencia canónica.
4. **Pagos/chargebacks:** debe eliminarse cualquier camino financiero legacy paralelo después de comparar contratos y efectos.

## Pendientes P1

5. Matching legacy debe consumir `RadarCandidate`/proyección canónica y no filtrar únicamente por `role == PROFESSIONAL`.
6. Endpoints diagnósticos deben aislarse o retirarse del runtime público.
7. Rate limiting en memoria debe sustituirse por una política distribuida/infraestructura.
8. Deduplicación de oportunidades RADAR debe ser durable.
9. Moderación Gemini debe evitar fallback fail-open y validar estrictamente el esquema de salida.
10. `CONEXA_SERVICE_CLOSED` necesita consumidor y efecto de negocio antes de habilitar su publicación automática.

## Veredicto

**NO PROD-READY todavía.** El principal riesgo arquitectónico sigue siendo la coexistencia de runtime legacy y servicios canónicos. La siguiente modificación de código debe continuar reduciendo esa duplicación, no crear otra capa paralela.

No se ejecutaron tests ni builds.
