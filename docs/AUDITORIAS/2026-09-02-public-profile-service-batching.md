# Auditoría — escalabilidad del servicio de perfiles públicos

**Repositorio:** `josemiranda5266-blip/Conexa-RMX-DEV`  
**Rama:** `integration/conexa-unified`

## Hallazgo

`subscribeToPublicProfiles()` tenía un rechazo completo cuando recibía más de 30 IDs. Eso podía convertir un límite de Firestore en un límite funcional de CONEXA: una vista que necesitara más participantes/perfiles públicos fallaría aunque el modelo permitiera resolverlos.

## Corrección

El servicio ahora:

- normaliza y deduplica IDs;
- divide automáticamente los IDs en lotes de hasta 30;
- mantiene una suscripción realtime por lote;
- combina los resultados en un único mapa por UID;
- conserva el orden solicitado por el consumidor;
- elimina correctamente los perfiles que desaparecen de un lote;
- devuelve un único `Unsubscribe` que cierra todas las suscripciones;
- mantiene prohibido cualquier fallback a `users`.

## Resultado arquitectónico

La capa pública deja de depender de una consulta monolítica y queda preparada para consumidores que crezcan por encima del límite de operandos de una consulta `in`.

## Verificación

No se ejecutaron tests ni build en esta fase.

**Commit:** `2701d129b69bac46a26e6e54b17a410bad5c4024`
