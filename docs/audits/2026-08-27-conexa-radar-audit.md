# Auditoría técnica — CONEXA RADAR

Fecha: 2026-08-27  
Alcance: código del módulo RADAR compartido durante la auditoría.

## Resumen ejecutivo

El módulo presenta una buena intención de separación entre simulación y producción y varias defensas positivas, pero **no está listo para producción**. El riesgo principal es que los endpoints de producción mezclan mecanismos reales con datos mock y no persisten el ciclo de vida de oportunidades.

## Hallazgos críticos

### CR-01 — Fuente mock usada en el flujo de oportunidades de producción
El endpoint `POST /api/radar/opportunity` calcula `dynamicMatches` exclusivamente contra `MASTER_PROFESSIONAL_PROFILES`, incluso cuando la oportunidad no es de prueba.

Impacto:
- una oportunidad real puede recibir profesionales ficticios;
- los datos de disponibilidad, reputación y verificación no representan Firestore;
- el fallback final inventa un profesional cuando no existen coincidencias.

Acción requerida:
- usar un repositorio de profesionales real;
- prohibir fallbacks mock cuando `environment=production`;
- devolver `NO_MATCH_FOUND` cuando no haya candidatos.

### CR-02 — Las oportunidades no se persisten
`/api/radar/opportunity` construye `newOpportunity` y la devuelve, pero el flujo mostrado no guarda el registro en Firestore.

Impacto:
- conversiones y contactos no tienen una fuente de verdad;
- no existe trazabilidad durable;
- no se puede implementar idempotencia correctamente.

Acción requerida:
- persistir en `radarOpportunities/{id}`;
- almacenar estado, timestamps, fuente y auditoría;
- separar datos de contacto/PII del documento analítico.

### CR-03 — ID de oportunidad con alta probabilidad de colisión
`RAD-${Math.floor(100 + Math.random() * 900)}` genera solamente 900 valores posibles.

Acción requerida:
- usar Firestore auto-ID o UUID/ULID;
- conservar `externalReference` como clave de idempotencia cuando corresponda.

### CR-04 — Detección de duplicados solo en memoria
`processedOpportunityHashes` no sobrevive reinicios ni funciona de forma consistente con múltiples instancias.

Acción requerida:
- almacenar el hash en una colección con índice único lógico/transacción;
- definir ventana temporal de deduplicación;
- incluir fuente y referencia externa en la clave.

### CR-05 — Modo de producción inseguro por default
La lógica usa `RADAR_MODE || APP_ENV || "PRODUCTION"`.

Impacto: una configuración ausente puede activar accidentalmente las rutas de producción.

Acción requerida:
- fail-closed;
- usar un enum validado;
- no permitir arranque productivo sin credenciales y proveedores requeridos.

## Hallazgos altos

### HI-01 — Score declarado de 100 puntos suma 110
Los pesos documentados son 30 + 20 + 15 + 15 + 10 + 5 + 5 = 100, pero la reputación, experiencia y tasa de respuesta se agregan después de los bloques anteriores. En el código efectivamente la suma llega a 100 solo porque los componentes son esos, pero el comentario de ponderación debe tratarse como contrato formal y testearse.

Acción:
- centralizar pesos;
- prueba que la suma máxima sea exactamente 100;
- evitar constantes mágicas.

### HI-02 — Matching de categoría basado en includes
La lógica `includes` puede producir coincidencias semánticas incorrectas y depende de texto libre.

Acción:
- usar IDs normalizados de categoría/subcategoría;
- aliases controlados;
- especialidades estructuradas.

### HI-03 — Producción consulta todos los profesionales y filtra en memoria
La consulta Firestore por `role=PROFESSIONAL` trae todos los candidatos antes del filtrado.

Acción:
- diseñar índices y campos normalizados;
- prefiltrar por categoría, provincia/ciudad y estado activo;
- paginar.

### HI-04 — Datos sensibles en mocks
El dataset contiene teléfonos con nombre `phonePrivate`. Aunque el endpoint responde una versión protegida, no deben existir datos personales o realistas innecesarios en fixtures.

Acción:
- fixtures sintéticos sin teléfonos;
- dataset de test separado y marcado explícitamente.

### HI-05 — Contact orchestration confía en consentimiento recibido desde el body
El endpoint evalúa `consentStatus` enviado por el cliente. La autorización y el consentimiento deben provenir de la oportunidad persistida, no de un parámetro manipulable.

Acción:
- cargar oportunidad desde la fuente de verdad;
- registrar evidencia y timestamp del consentimiento;
- verificar estado antes del envío.

## Hallazgos medios

### ME-01 — AI fallback puede clasificar como Electricidad/alto interés
Cuando falla la IA, el objeto inicial presupone una categoría e intención altas.

Acción: usar `ANALYSIS_UNAVAILABLE` o clasificación conservadora pendiente de revisión.

### ME-02 — Sanitización PII limitada
`sanitizePIIForAI` debe ser auditada específicamente. Recortar a 1000 caracteres no garantiza anonimización.

Acción: pruebas para teléfonos, DNI, emails, direcciones y nombres; minimización antes del proveedor de IA.

### ME-03 — Rate limiter genérico
Debe verificarse su configuración por IP/usuario/fuente webhook y su comportamiento detrás de proxy.

### ME-04 — Encoding corrupto
Se observan secuencias como `PlomerÃa`, `producciÃ³n` y emojis corruptos.

Acción:
- normalizar UTF-8;
- revisar editor, Git y encoding del proyecto;
- añadir prueba de smoke para textos críticos.

### ME-05 — Conversion endpoint no persiste conversiones
Actualmente responde éxito sin mostrar escritura durable.

### ME-06 — config-status expone superficie operativa
Aunque no revela secretos, debe quedar protegido o limitarse a administradores en producción.

## Controles positivos encontrados

- verificación administrativa para MATCH en producción;
- protección mediante secreto para webhook;
- ocultación del teléfono en respuestas;
- exclusión de profesionales bloqueados;
- política de verificación opcional;
- rechazo explícito cuando el proveedor de mensajería no está implementado;
- simulación separada conceptualmente.

## Arquitectura objetivo

1. Ingesta segura
2. Normalización + minimización de PII
3. Persistencia de oportunidad
4. Clasificación IA con esquema validado
5. Matching exclusivamente contra datos reales
6. Revisión humana cuando la confianza sea insuficiente
7. Consentimiento persistido y verificable
8. Contacto mediante proveedor implementado
9. Conversión y atribución persistidas
10. Auditoría inmutable de eventos

## Prioridad de ejecución

P0:
- eliminar mocks del flujo productivo;
- persistir oportunidades;
- reemplazar IDs aleatorios;
- deduplicación durable;
- consentimiento server-side.

P1:
- normalizar taxonomía;
- optimizar consulta Firestore;
- validar respuestas IA con schema;
- corregir UTF-8.

P2:
- métricas, dashboards, pruebas de carga y observabilidad.

## Estado

**CONEXA RADAR: NO APTO PARA PRODUCCIÓN todavía.**

La primera iteración recomendada es cerrar P0 antes de ampliar canales o automatizar contactos.
