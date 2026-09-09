# Auditoría actual — Conexa Unified

**Fecha:** 2026-09-09  
**Repositorio:** `josemiranda5266-blip/Conexa-RMX-DEV`  
**Rama objetivo:** `integration/conexa-unified`  
**HEAD auditado:** `285ac92555733c3e5f04fba3c2e1bd7f2e279d72`

## 1. Verificación de alcance

La rama objetivo existe y apunta al commit `285ac92555733c3e5f04fba3c2e1bd7f2e279d72`, cuyo cambio más reciente corrige la reconciliación de inventario durante la resolución de chargebacks de Nexora. La rama está protegida=false y sin checks obligatorios configurados.

El commit `285ac925` es hijo directo de `8883706`, por lo que desde esa base sólo se incorporó la corrección de inventario de chargeback.

## 2. Estado positivo

- El modelo compartido ya define `CONEXA_SERVICE_CLOSED` y validadores de eventos.
- El dispatcher rechaza eventos inválidos y exige producer/type coherentes.
- Existe outbox con recovery e idempotencia durable para eventos Nexora.
- Existe `apps/event-worker` separado del proceso Express y con scheduler `onSchedule`.
- `reviewService.ts` ya materializa `REVIEW_PENDING → CLOSED` de forma transaccional y puede reparar un retry cuando la review ya existe.
- El último cambio de chargeback incorpora ledger idempotente para restauración de inventario.
- La frontera de perfiles profesionales, perfiles públicos, Radar y reputación ya cuenta con servicios separados.

## 3. P0 — Runtime histórico todavía no unificado

`server.ts` continúa siendo un monolito de aproximadamente 148 KB y conserva implementaciones inline que duplican dominios ya extraídos a `src/server`, `apps/api-nexora` y `apps/api-conexa`.

Se observan al menos dos familias de runtime para pagos/chargebacks y dos capas de API: el servidor raíz y los paquetes `api-nexora`/`api-conexa`. Mientras el runtime efectivo no tenga una única autoridad, existe riesgo de que una corrección aplicada al servicio canónico no afecte al endpoint que realmente atiende tráfico.

**Acción:** terminar la migración de rutas del servidor raíz hacia servicios canónicos y, posteriormente, retirar implementaciones inline duplicadas.

## 4. P0 — Perfil profesional del servidor raíz sigue siendo legacy

`server.ts` mantiene `/api/professional-profile/save` con validación y escritura inline mediante `getAdminFirestore(app)`, mientras existe `professionalProfileService.ts` como frontera canónica.

Esto permite divergencia de contrato y, especialmente, divergencia de base Firestore respecto de `getAdminDb()`.

**Acción:** delegar completamente en `saveProfessionalProfile()` y eliminar la persistencia inline.

## 5. P0 — RADAR legacy todavía permite resultados no persistidos

`server.ts` conserva `/api/radar/opportunity`, `/api/radar/conversion` y webhooks Meta/n8n con construcción de oportunidades en memoria. El endpoint de conversión responde éxito sin materializar una conversión comercial equivalente.

Aunque existe una frontera canónica bajo `src/server/radar`, el runtime raíz todavía contiene caminos alternativos.

**Acción:** hacer que las rutas públicas de RADAR deleguen en los servicios canónicos y que los caminos legacy no puedan ejecutarse como producción paralela.

## 6. P0 — Eliminación de cuenta todavía no es workflow resumible

`/api/user/delete-account` continúa eliminando Firebase Auth antes de completar Firestore, mensajes y Storage. Un fallo intermedio puede dejar un estado parcialmente eliminado. La operación tampoco mantiene un documento de estado que permita reanudar fases.

**Acción:** utilizar `accountDeletionService.ts`/`accountDeletionPolicy.ts` como autoridad, persistir estado por fases y ejecutar Auth al final del workflow.

## 7. P1 — Matching de producción todavía consulta `role == PROFESSIONAL`

La ruta legacy `/api/radar/match` consulta usuarios exclusivamente con `where('role', '==', 'PROFESSIONAL')`. El modelo unificado admite capacidad profesional mediante `hasProfessionalProfile`/`isProfessional` y modos activos, por lo que una cuenta válida con rol primario USER puede quedar fuera.

Existe `ProfessionalCandidate` y una frontera canónica de candidatos que debe convertirse en la única fuente de selección.

**Acción:** retirar la consulta histórica y delegar en la proyección/repository de candidatos.

## 8. P1 — Superficie diagnóstica innecesaria

`server.ts` conserva `/api/auth/verify-token` y `/api/auth/config-status`. Ambos exponen información operativa que no forma parte del contrato comercial normal.

**Acción:** eliminar del runtime público o aislar mediante una frontera administrativa/diagnóstica explícita.

## 9. P1 — Rate limiting no distribuido

El rate limiter de `server.ts` utiliza un `Map` en memoria por proceso. No ofrece una política consistente cuando existen múltiples instancias y la interpretación de `x-forwarded-for` no está acompañada por una política explícita de proxy trust.

**Acción:** retirar este mecanismo como control de producción y centralizar rate limiting en infraestructura o almacenamiento distribuido.

## 10. P1 — Moderación IA fail-open

El endpoint `/api/gemini/moderate` devuelve `isSafe: true` cuando no existe Gemini o cuando ocurre una excepción. Para una decisión de seguridad/moderación esto constituye un fallback fail-open.

Además, los resultados de Gemini se parsean como JSON sin validación de esquema estricta y límites de dominio uniformes.

**Acción:** schema validation estricta y política fail-closed para decisiones críticas; el fallback debe diferenciar indisponibilidad del motor de una evaluación segura.

## 11. P1 — Ingesta RADAR con memoria de duplicados

`processedOpportunityHashes` es un `Set` en memoria del proceso. No es durable ni consistente entre instancias, por lo que no constituye una protección de idempotencia de producción.

**Acción:** trasladar deduplicación a Firestore mediante una clave determinista/ledger transaccional o equivalente gestionado.

## 12. P1 — Worker productivo: infraestructura creada, dominio aún parcial

`apps/event-worker` ya existe y el scheduler procesa `NEXORA_ORDER_COMPLETED`. No existe todavía un consumidor de negocio equivalente para `CONEXA_SERVICE_CLOSED` y, por diseño previo, no debe producirse ese evento hasta que exista un efecto de negocio definido.

Por tanto, la infraestructura de worker está disponible, pero no debe considerarse que el pipeline transversal de Conexa esté completamente cerrado.

## 13. P1 — Contrato de cierre de review

`reviewService.ts` ya cierra `REVIEW_PENDING → CLOSED` y repara el caso de review existente. Sin embargo, todavía no genera `CONEXA_SERVICE_CLOSED`.

Esto es coherente con la decisión arquitectónica previa: no publicar un evento de cierre sin consumidor y efecto de negocio definido.

## 14. P1 — Chargeback: corrección reciente y alcance

El último commit añade reconciliación de inventario a la resolución de chargebacks en `apps/api-nexora`. La restauración desfavorable utiliza un ledger determinista `inventory:chargeback:{orderId}:{listingId}` para evitar doble incremento.

Debe mantenerse la revisión de equivalencia entre esta implementación y cualquier flujo legacy de chargeback existente en el servidor raíz antes de declarar el dominio de pagos completamente unificado.

## 15. Backlog de cierre recomendado

1. Migrar `/api/professional-profile/save` al servicio canónico.
2. Migrar todas las rutas RADAR legacy al runtime canónico.
3. Convertir eliminación de cuenta en workflow resumible/idempotente.
4. Sustituir matching legacy por `ProfessionalCandidate`.
5. Eliminar/aislar endpoints diagnósticos.
6. Sustituir deduplicación y rate limiting en memoria.
7. Endurecer validación/fallback de IA.
8. Comparar y consolidar definitivamente los runtimes de pagos/chargebacks.
9. Definir el efecto de negocio de `CONEXA_SERVICE_CLOSED` antes de publicarlo.
10. Recién después ejecutar la verificación final de build/tests.

## Veredicto

**CONEXA UNIFIED todavía no está listo para producción.**

La arquitectura canónica está mucho más avanzada que el runtime legacy, pero los P0 principales siguen concentrados en `server.ts`. El siguiente trabajo debe priorizar eliminación de autoridades duplicadas, no agregar nuevas capas paralelas.

No se ejecutaron tests ni builds durante esta auditoría, conforme a la instrucción operativa vigente.
