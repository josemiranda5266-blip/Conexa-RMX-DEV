# Conexa RMX — Instrucciones para GitHub Copilot

## Objetivo

Trabajás sobre una aplicación full-stack llamada Conexa RMX.

Antes de modificar código, debés comprender el contexto del proyecto y respetar la arquitectura existente.

## Regla principal

NO realizar cambios destructivos ni refactors amplios sin explicar primero:

1. cuál es el problema;
2. qué archivos están involucrados;
3. qué impacto tendrá el cambio;
4. qué riesgos existen;
5. cómo se verificará la solución.

Cuando la solicitud sea ambigua, analizá primero y pedí aclaración antes de realizar cambios importantes.

## Integridad del proyecto

Nunca:

- eliminar funcionalidades existentes para solucionar un problema sin autorización;
- reemplazar una implementación completa por otra sin justificarlo;
- modificar múltiples módulos no relacionados con el problema;
- eliminar archivos o dependencias sin comprobar sus usos;
- modificar configuraciones críticas sin explicar el impacto.

Preferir siempre cambios pequeños, localizados y reversibles.

## Git

Antes de cambios importantes, revisar el estado del repositorio.

Nunca ejecutar automáticamente:

- git reset --hard
- git clean -fd
- git push --force
- eliminación masiva de archivos
- comandos destructivos

No crear otro repositorio Git si ya existe uno.

Antes de considerar terminado un cambio:

1. revisar git diff;
2. ejecutar las pruebas disponibles;
3. ejecutar el build cuando corresponda;
4. informar cualquier error restante.

## Firebase

Firebase Authentication y Firestore son componentes críticos.

No modificar:

- reglas de Firestore;
- autenticación;
- custom claims;
- roles;
- configuración Firebase;
- inicialización Firebase Admin;

sin analizar primero las dependencias y los riesgos de seguridad.

## Firestore

Mantener el principio de mínimo privilegio.

Las reglas deben mantener aislamiento adecuado entre usuarios y datos privados.

Nunca exponer información privada innecesariamente.

No mover información sensible desde backend hacia frontend sin justificarlo.

## Seguridad

Nunca introducir:

- secretos;
- API keys privadas;
- tokens OAuth;
- credenciales de Service Account;
- passwords;
- tokens de acceso;

en código del frontend, repositorio o archivos públicos.

Las credenciales sensibles deben permanecer en variables de entorno o mecanismos seguros del backend.

## Mercado Pago

Mercado Pago es un componente crítico.

Antes de modificar cualquier integración de pagos:

1. localizar todos los providers, servicios y rutas relacionadas;
2. identificar dónde se manejan credenciales;
3. identificar los flujos OAuth;
4. identificar webhooks;
5. identificar creación y actualización de transacciones;
6. comprobar qué información llega al frontend;
7. comprobar la persistencia en Firestore;
8. verificar manejo de errores y estados.

No asumir que una integración no existe simplemente porque no se encontró un SDK en package.json.

Buscar primero implementaciones propias, providers, llamadas HTTP, rutas backend y servicios relacionados.

## Arquitectura

Respetar la separación frontend/backend.

No mover lógica sensible al frontend.

No duplicar lógica existente.

Antes de crear una nueva función, buscar si ya existe una implementación equivalente.

## Multiusuario

Los roles y permisos son críticos.

No modificar permisos de USER, PROFESSIONAL, MODERATOR, ADMIN o SUPER_ADMIN sin analizar primero todas las reglas y verificaciones relacionadas.

No confiar únicamente en controles de interfaz para seguridad.

## IA

La integración con Google Generative AI debe mantenerse aislada y segura.

No exponer credenciales privadas de IA al cliente.

## Método de trabajo

Para tareas complejas utilizar esta secuencia:

ANÁLISIS
→ PROPUESTA
→ CAMBIO MÍNIMO
→ PRUEBAS
→ REVISIÓN
→ RESUMEN

Cuando se solicite una corrección:

1. localizar la causa raíz;
2. explicar la causa;
3. proponer la solución;
4. modificar solamente lo necesario;
5. ejecutar verificaciones;
6. informar exactamente qué archivos fueron modificados.

## No inventar

No asumir que una función, endpoint, provider, colección o integración existe.

Buscar primero en el repositorio.

Si existe evidencia contradictoria, señalarla.

## Calidad

Priorizar:

- seguridad;
- corrección;
- mantenibilidad;
- compatibilidad;
- cambios mínimos;
- pruebas reproducibles.

No priorizar velocidad sobre seguridad.