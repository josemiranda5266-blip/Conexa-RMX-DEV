# Auditoría — server.ts y bloqueadores de producción

Fecha: 2026-09-03
Rama objetivo: `integration/conexa-unified`

## Verificación de alcance

La rama `integration/conexa-unified` fue verificada antes de esta auditoría. El HEAD auditado es `2b030547008618458e1937480481c6e92d50742f`.

## Hallazgos P0/P1

### P0 — `/api/professional-profile/save` no utiliza el servicio canónico

El endpoint histórico de `server.ts` mantiene validación y persistencia inline, utiliza `getAdminFirestore(app)` y no sincroniza `public_professional_profiles`. El servicio canónico `src/server/professionalProfileService.ts` ya concentra validación, catálogo, transacción y proyección pública.

Consecuencia: el frontend puede enviar `professionId`, `servicesOffered` y `portfolioImages`, pero el endpoint histórico no los persiste; además puede escribir contra la base Firestore por defecto en lugar de la base nombrada configurada por `getAdminDb()`.

Acción requerida: reemplazar la lógica inline por delegación a `saveProfessionalProfile(auth.userId, req.body)` y mapear errores de dominio a HTTP.

### P0 — RADAR production endpoints todavía contienen lógica de simulación/persistencia incompleta

`/api/radar/opportunity` construye la oportunidad en memoria y la devuelve, pero el flujo auditado no persiste de forma canónica el documento de producción. `/api/radar/conversion` devuelve una conversión exitosa sin persistencia comercial equivalente. Los webhooks Meta/n8n también construyen oportunidades localmente.

Acción requerida: unificar la persistencia de oportunidades, estados y conversiones en servicios de dominio/backend; eliminar cualquier camino de simulación que pueda ejecutarse bajo configuración de producción.

### P0 — `/api/user/delete-account` no es resumible ni idempotente

El endpoint elimina primero Firebase Auth y después intenta borrar Firestore, mensajes y Storage. Un fallo intermedio puede dejar datos huérfanos. También depende de `userId` del body, aunque posteriormente valida autorización.

Acción requerida: convertirlo en workflow de eliminación por fases, persistir estado de cleanup, ejecutar Firestore/anónimo comercial primero y borrar Auth al final; cada fase debe poder reintentarse sin duplicar efectos.

### P1 — `/api/radar/match` conserva consulta por `role == PROFESSIONAL`

El modelo unificado permite `hasProfessionalProfile`/`isProfessional` y `activeMode`, por lo que la consulta histórica puede excluir cuentas profesionales válidas con rol primario USER.

Acción requerida: mover la selección a la frontera `ProfessionalCandidate` ya creada y aplicar capacidad profesional unificada.

### P1 — Endpoint diagnóstico `/api/auth/verify-token`

El endpoint acepta un Firebase ID token en el body y devuelve información de identidad. Aunque es diagnóstico, mantiene una superficie innecesaria y separada del flujo Bearer estándar.

Acción requerida: eliminarlo o aislarlo estrictamente para diagnóstico administrativo no público; no debe formar parte del contrato de producción.

### P1 — `/api/auth/config-status`

Expone estado de configuración y project IDs. Aunque no devuelve secretos, debe quedar restringido o eliminarse del contrato público de producción.

### P1 — Rate limiter en memoria

El rate limiter actual es por proceso. No es suficiente para despliegues horizontales y además interpreta directamente cabeceras de proxy sin una política explícita de trust proxy.

Acción requerida: rate limiting distribuido para producción y configuración explícita de proxy trust.

### P1 — IA con validación de salida incompleta

Los endpoints Gemini parsean JSON generado por el modelo, pero no existe una validación de esquema estricta y consistente antes de usar los valores. En moderación existe además fallback fail-open (`isSafe: true`).

Acción requerida: schema validation estricta, límites de valores y fail-closed para decisiones de seguridad/moderación críticas.

## Estado

Esta auditoría no modifica `server.ts` debido a que es un archivo monolítico de aproximadamente 154 KB y el mecanismo de edición disponible exige reemplazar el contenido completo. Se evita deliberadamente una modificación riesgosa que pueda truncar o alterar accidentalmente otras rutas.

La corrección se mantiene como P0 pendiente y no se considera cerrada.

## Prioridad inmediata

1. Integrar el endpoint profesional con el servicio canónico.
2. Corregir persistencia y autoridad de RADAR.
3. Rehacer eliminación de cuenta como workflow resumible/idempotente.
4. Eliminar superficies diagnósticas innecesarias.
5. Sustituir matching histórico por `ProfessionalCandidate`.
6. Endurecer rate limiting y validación de IA.
7. Recién después ejecutar tests/build de verificación final.
