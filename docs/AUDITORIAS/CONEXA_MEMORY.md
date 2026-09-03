# CONEXA — MEMORIA DE TRABAJO AUTORITATIVA

> **Repositorio único:** `josemiranda5266-blip/Conexa-RMX-DEV`
>
> **Rama única de trabajo:** `integration/conexa-unified`
>
> **Regla:** antes de cualquier auditoría o modificación importante se debe leer este archivo y verificar repositorio/rama. Después de cada descubrimiento material, corrección, commit o cambio de prioridad, este archivo debe actualizarse.

## 1. Estado actual

Fecha de consolidación: 2026-09-03

Conexa está en fase de cierre estructural antes de la verificación final. La aplicación contiene mejoras importantes en dominios críticos, pero existen rutas y caminos legacy todavía activos o potencialmente activos en el runtime.

**No ejecutar todavía tests ni build por decisión de trabajo actual.** Primero terminar todas las correcciones que puedan hacerse desde la auditoría técnica.

## 2. Cambios y descubrimientos recientes

### RADAR / Matching
- Extraído boundary HTTP de matching: `src/server/radar/radarMatchRoute.ts`.
- Extraído boundary de conversión de oportunidad.
- El matching y las oportunidades deben resolver identidad profesional canónica y compatibilidad histórica.
- Pendiente principal: integración efectiva de handlers en runtime.

### Perfil profesional
- Existe handler aislado: `src/server/professionalProfileRoute.ts`.
- La escritura autoritativa sincroniza perfil de usuario, perfil público y candidato RADAR.
- Pendiente: confirmar que el runtime principal delegue exclusivamente en este boundary.

### Reviews / reputación
Implementado:
- `src/server/reviewPolicy.ts`
- `src/server/reviewService.ts`
- `src/server/reviewRoute.ts`
- `src/services/publicProfessionalReviewService.ts`

Garantías ya implementadas:
- identidad del cliente derivada del token;
- servicio real requerido;
- profesional debe coincidir con el profesional asignado;
- trabajo elegible/finalizado;
- ratings validados;
- reseña verificada;
- ID determinístico para evitar duplicados;
- boundary HTTP aislado;
- proyección pública sin identidad privada del cliente.

Pendiente:
1. registrar `POST /api/reviews` en el runtime;
2. reemplazar `ReviewModal -> AppContext.addReview()` por API;
3. asegurar agregados autoritativos `rating`, `reviewCount`, `jobsCompleted`;
4. completar tratamiento de referencias de reviews en eliminación de cuenta.

### Eliminación de cuenta
Existe eliminación durable basada en checkpoint `account_deletions/{userId}`.

Riesgos confirmados:
- validar/rechazar `/` en IDs;
- endurecer creación concurrente del checkpoint;
- anonimización actual insuficiente para identidad profesional;
- auditar referencias: `professionalId`, `assignedProfessionalId`, `biddingProfessionalIds`, conversaciones y datos comerciales;
- endpoint runtime legacy debe delegar al servicio durable.

### Runtime / server.ts
Este es el principal bloqueo estructural actual.

- Los handlers nuevos existen.
- El runtime principal todavía debe integrarlos.
- No sobrescribir ni reconstruir `server.ts` a ciegas.
- Recuperar el archivo completo antes de una modificación importante.
- El archivo ha presentado riesgo de truncamiento/recuperación incompleta en sesiones anteriores.

## 3. Prioridades actuales

### P0
1. Integración segura del runtime principal sin dañar `server.ts`.
2. Cerrar eliminación de cuenta para identidad profesional y concurrencia.
3. Asegurar que los caminos legacy de escritura no sigan siendo autoritativos.

### P1
1. Reviews: runtime + frontend + agregados.
2. Pagos / Mercado Pago.
3. Messaging y persistencia real.
4. Reducir responsabilidades de AppContext.

### P2
1. Limpieza adicional de arquitectura.
2. Optimización de listeners globales.
3. Refinamiento de observabilidad.

## 4. Áreas aproximadas

| Área | Estado estimado |
|---|---:|
| RADAR / Matching | 98% |
| Lifecycle RADAR | 100% |
| Conversión RADAR | 99% |
| Persistencia RADAR | 99% |
| Perfil profesional | 98% |
| Directorio | 97% |
| Messaging | 93% |
| Auth | 94% |
| Seguridad | 96% |
| Pagos / Mercado Pago | 87% |
| Eliminación de cuenta | 72% |
| Reviews / reputación | 82% |
| Arquitectura | 99% |
| Observabilidad | 99% |

Estos porcentajes son indicadores de avance técnico, no sustituyen la verificación final.

## 5. Protocolo obligatorio para continuar

Antes de cada trabajo material:

1. Verificar repositorio: `josemiranda5266-blip/Conexa-RMX-DEV`.
2. Verificar rama: `integration/conexa-unified`.
3. Leer este archivo.
4. Leer los documentos de auditoría relacionados con el área.
5. Revisar si existe código o commit previo sobre el mismo problema.
6. No duplicar una solución ya implementada.
7. Modificar únicamente la rama objetivo.
8. Después de cada cambio o descubrimiento material:
   - actualizar este archivo;
   - agregar detalle en `docs/AUDITORIAS/`;
   - registrar commit SHA y efecto real cuando corresponda.
9. Si existe conflicto entre documentos antiguos y código actual, el código actual y el commit más reciente tienen prioridad, pero la discrepancia debe registrarse.

## 6. Regla de continuidad

**Este archivo es el punto de entrada obligatorio para retomar Conexa.**

Cuando una nueva sesión diga simplemente:
- `Sigue`
- `Continúa Conexa`
- `Retomemos Conexa`

la primera acción debe ser revisar `CONEXA_MEMORY.md` antes de continuar con cualquier auditoría o modificación.

## 7. Índice de detalle

La historia completa y las auditorías específicas permanecen en:

`docs/AUDITORIAS/`

El changelog histórico existente no se elimina. Esta memoria funciona como índice operativo condensado y estado actual para evitar pérdida de contexto o duplicación de trabajo.
