# Registro maestro de descubrimientos y pendientes hacia producción

Fecha: 2026-09-03
Repositorio canónico: josemiranda5266-blip/Conexa-RMX-DEV
Rama objetivo: integration/conexa-unified

## Regla de alcance

Todas las correcciones destinadas al Conexa unificado deben terminar exclusivamente en esta rama. Otros repositorios o ramas sólo pueden utilizarse como referencia histórica o comparativa.

## Estado ejecutivo

La aplicación está arquitectónicamente avanzada, pero todavía no debe considerarse lista para producción. El riesgo principal ya no es la ausencia de funcionalidades RADAR, sino la existencia de caminos runtime legacy que todavía no consumen varios servicios autoritativos recientemente extraídos.

Estimación técnica actual:
- preparación estructural: alta;
- preparación para producción: aproximadamente 95-96%;
- tiempo restante estimado de correcciones: 7 a 12 días efectivos de trabajo técnico, sin contar bloqueos externos ni tiempo de publicación en tiendas.

## Descubrimientos cerrados o sustancialmente corregidos

### RADAR y matching

- Se aisló el matching del transporte HTTP.
- Se normalizó la necesidad de soportar cuentas unificadas y perfiles profesionales.
- Se separaron handlers de matching y conversión.
- Se consolidó la resolución de oportunidades y compatibilidad de identificadores.
- El lifecycle RADAR está considerado estructuralmente completo.

Pendiente principal:
- integrar definitivamente los handlers aislados en el runtime principal.

### Perfil profesional

- Existe un servicio autoritativo para guardar el perfil.
- La persistencia sincroniza datos de usuario, proyección pública y candidato RADAR.
- Se aisló un boundary HTTP que utiliza la identidad autenticada.

Pendiente principal:
- sustituir completamente la implementación inline/legacy del runtime por el handler aislado.

### Reviews y reputación

Implementado:
- política de dominio para validar reseñas;
- verificación de que el cliente sea propietario del ServiceRequest;
- verificación del profesional asignado;
- validación de estados elegibles del trabajo;
- validación de puntuaciones y comentario;
- creación transaccional;
- ID determinístico para impedir duplicados por el mismo trabajo;
- boundary HTTP aislado;
- servicio de proyección pública que no expone identificadores privados.

Descubrimientos pendientes:
1. ReviewModal todavía depende del camino legacy AppContext.addReview().
2. El runtime principal todavía debe registrar POST /api/reviews.
3. La actualización de rating y reviewCount debe ser autoritativa y consistente.
4. La proyección pública debe sincronizarse con los agregados.
5. La eliminación de cuenta debe anonimizar referencias de autor y profesional sin destruir información comercial necesaria.

### Eliminación de cuenta

Existe una arquitectura durable con checkpoints y etapas reanudables.

Riesgos pendientes:
1. endurecer la validación del UID para rechazar caracteres incompatibles con IDs de documentos;
2. resolver la carrera concurrente en la creación inicial del checkpoint;
3. cubrir ownership profesional, no solamente clientId;
4. auditar referencias como professionalId, assignedProfessionalId y equivalentes;
5. tratar conversaciones y mensajes como dominio independiente;
6. conectar el endpoint runtime exclusivamente al servicio durable.

### AppContext

El contexto sigue siendo un God Context y concentra:
- usuarios;
- autenticación;
- requests;
- quotes;
- transactions;
- conversations;
- messages;
- reviews;
- pagos;
- verificaciones;
- RADAR.

Dirección de migración:
- nuevos servicios y handlers deben quedar fuera de AppContext;
- AppContext debe convertirse gradualmente en consumidor/adaptador de dominio;
- no agregar nuevas escrituras directas de Firestore al contexto.

### Runtime principal

Este es el principal cuello de botella técnico.

El archivo principal de runtime contiene todavía lógica legacy y debe convertirse progresivamente en composición de rutas:

HTTP
→ handler
→ servicio
→ política/dominio
→ persistencia

Pendientes prioritarios:
- registrar radarMatchRoute;
- registrar radarOpportunityConversionRoute;
- registrar professionalProfileRoute;
- registrar reviewRoute;
- registrar account deletion durable;
- retirar implementaciones duplicadas.

La modificación debe hacerse preservando íntegramente el archivo y evitando reconstrucciones parciales.

### Messaging

Pendientes:
- consolidar persistencia autoritativa de conversaciones y mensajes;
- reducir dependencia del estado global;
- mantener datos privados compartidos como estructura y no como texto libre cuando corresponda;
- revisar escalabilidad de listeners globales.

### Auth y seguridad

Pendientes:
- revisar completamente los caminos runtime legacy;
- confirmar que las mutaciones sensibles derivan identidad del token;
- completar endurecimiento de rate limits y operaciones destructivas;
- consolidar controles de bloqueo y autorización por dominio.

### Pagos y Mercado Pago

Área todavía crítica para producción.

Pendientes:
- auditoría final de webhooks;
- idempotencia end-to-end;
- conciliación de estados de transacción;
- tratamiento de errores/reintentos;
- separación definitiva de secretos por tenant;
- revisión de estados financieros antes de habilitar producción.

### Directorio público

La proyección pública profesional está separada del documento privado de usuario.

Pendientes:
- integrar completamente las reseñas públicas;
- garantizar sincronización de agregados de reputación;
- revisar todas las pantallas que todavía consuman usuarios/reviews globales.

### Observabilidad

Avanzado estructuralmente.

Pendiente:
- validar que los nuevos handlers y servicios críticos emitan contexto suficiente para diagnóstico sin exponer información sensible.

## Orden de cierre recomendado

### P0 — integridad y runtime

1. Integrar handlers aislados en el runtime principal.
2. Eliminar caminos de escritura duplicados.
3. Endurecer eliminación de cuenta.
4. Cerrar Reviews end-to-end.
5. Cerrar estados financieros y pagos.

### P1 — consistencia

6. Sincronizar agregados públicos de reputación.
7. Migrar consumidores legacy del AppContext.
8. Consolidar messaging.
9. Auditar ownership y autorización en todas las mutaciones.

### P2 — preparación final

10. Revisión completa de variables de entorno y secretos.
11. Revisión de reglas Firestore y Storage.
12. Revisión de tamaño de bundles y carga.
13. Verificación completa de build, tipos y pruebas disponibles.
14. Corrección de fallos encontrados.
15. Revisión final de regresión.
16. Checklist de despliegue.

## Estimación de tiempo

### Escenario favorable

7 días efectivos.

Condiciones:
- no aparecen fallos graves al integrar el runtime;
- Mercado Pago no presenta inconsistencias adicionales;
- las migraciones de AppContext pueden hacerse incrementalmente;
- no existen cambios de alcance funcional.

### Escenario realista

10 a 12 días efectivos.

Distribución aproximada:
- 2-3 días: runtime y eliminación de duplicaciones;
- 1-2 días: eliminación de cuenta e identidad;
- 1-2 días: Reviews y agregados;
- 2 días: pagos y estados financieros;
- 1-2 días: integración final, reglas, seguridad y observabilidad;
- 1 día: correcciones derivadas de verificación final.

### Escenario conservador

15 a 20 días si la verificación final descubre fallos sistémicos, problemas de Firebase, inconsistencias de pagos o regresiones en el runtime principal.

## Definición de “listo para producción”

No se considerará listo solamente porque el código compile.

Debe cumplirse:

- una única ruta autoritativa para cada mutación crítica;
- identidad derivada del token;
- autorización por ownership;
- estados financieros coherentes e idempotentes;
- eliminación de cuenta sin referencias personales huérfanas;
- Reviews verificadas contra trabajos reales;
- proyecciones públicas sin datos privados;
- runtime conectado a los nuevos servicios;
- reglas Firestore/Storage coherentes;
- build y chequeos técnicos finales sin bloqueadores;
- revisión de regresión completada;
- configuración productiva de secretos, dominios y webhooks preparada.

## Próxima acción inmediata

Prioridad absoluta: recuperar y modificar de forma segura el runtime principal para registrar los handlers autoritativos ya creados y comenzar a retirar los caminos legacy duplicados.
