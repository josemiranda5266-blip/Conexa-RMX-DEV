# CONEXA — Plan de Seguridad Unificado (CONEXA Unified Security Plan)

**Versión:** 1.0  
**Fecha:** 2026-08-29  
**Rama objetivo:** `integration/conexa-unified`  
**Estado:** Activo / Producción-Ready Candidate  

---

## 1. Objetivos del Plan de Seguridad

El presente documento establece los requisitos, la arquitectura de control de acceso y las políticas de mitigación de vulnerabilidades para la plataforma **CONEXA**. Su propósito es garantizar la confidencialidad, integridad y disponibilidad de la plataforma durante y después de la consolidación de repositorios.

---

## 2. Principios de Arquitectura de Seguridad

1. **Defensa en Profundidad:** Control de acceso en la capa de interfaz cliente (React AppContext), validación estricta de tokens de autenticación en la capa HTTP/API (Express) y reglas de acceso atómico en la base de datos (Cloud Firestore Transactions).
2. **Principio de Menor Privilegio (PoLP):** Ningún usuario puede interactuar con recursos que no le pertenezcan directamente ni asumir roles que no hayan sido verificados por el proveedor de identidad.
3. **Validación Autoritativa en Servidor:** Las decisiones de negocio (creación de presupuestos, cambio de estado de trabajos, liberación de transacciones) se procesan exclusivamente en el backend y no en el cliente.
4. **Cero Secretos en Repositorio:** Prohibición absoluta de credenciales, claves privadas o archivos de entorno `.env` dentro del repositorio de código.

---

## 3. Controles de Autenticación y Autorización (RBAC)

### 3.1 Autenticación (Firebase Auth)
- Todo endpoint de API sensible (`/api/*`) exige un encabezado de autorización `Authorization: Bearer <ID_TOKEN>`.
- Los tokens son validados mediante `verifyAuthToken(req)`. Solicitudes sin token válido retornan `401 UNAUTHORIZED`.

### 3.2 Control de Acceso Basado en Roles (RBAC)
- **Rol `PROFESSIONAL`:** Requerido para publicar propuestas y cotizaciones (`/api/quotes/submit`). Verificado contra las propiedades del usuario en Firestore (`role === 'PROFESSIONAL'` o `isProfessional === true`).
- **Rol `CLIENT`:** Emisor de solicitudes de servicio (`service_requests`). 
- **Regla Anticorrupción / Prohibición de Autocotización:** Un usuario cliente **no puede enviarse cotizaciones a sí mismo** (`SELF_QUOTE_FORBIDDEN`). Intentos de autocotización retornan `403 FORBIDDEN`.

### 3.3 Aislamiento por Recurso y Asignación de Trabajos
- La finalización de un trabajo (`/api/jobs/complete`) está restringida:
  - El cliente creador **no puede invocar arbitrariamente** la finalización desde el endpoint del profesional (`CLIENT_CANNOT_COMPLETE_JOB`).
  - Solamente un profesional **previamente asignado al trabajo** (verificado vía transacción vinculada en `transactions`) puede marcar la solicitud como completada (`ASSIGNED_PROFESSIONAL_REQUIRED`).

---

## 4. Integridad Transaccional y Sanitización de Datos

### 4.1 Firestore Transactions (`db.runTransaction`)
Para evitar condiciones de carrera, doble gasto o manipulación concurrentes:
- La creación de cotizaciones incrementa atómicamente `quotesCount` en la solicitud y cambia el estado a `QUOTES_RECEIVED`.
- La finalización de trabajos requiere un bloqueo transaccional que valida el estado actual de la solicitud (`PROFESSIONAL_SELECTED`, `IN_PROGRESS`, `REVIEW_PENDING`) y actualiza la transacción a `SERVICE_COMPLETED`.

### 4.2 Sanitización y Limites de Entrada
- **Monto de cotización (`priceArs`):** Numérico finito, mayor a `0` y menor a `1,000,000,000` ARS. Retorna `422 INVALID_QUOTE_AMOUNT` si falla.
- **Descripción:** Longitud entre `3` y `4000` caracteres. Retorna `422 INVALID_QUOTE_DESCRIPTION`.
- **Sanitización de cadenas:** Recorte (`trim()`) y truncamiento seguro en servidor para campos como `professionalName` (160 caracteres max), `materialsIncluded` (1000 max), `termsAndConditions` (2000 max).

---

## 5. Higiene del Repositorio e Integración Continua (CI/CD)

### 5.1 Pipeline de Validación (`.github/workflows/unify-conexa.yml`)
El flujo de trabajo automatizado ejecuta las siguientes verificaciones en cada push/PR hacia `unification/conexa-unified`:
1. **Comprobación de tipos TypeScript:** `npm run lint`
2. **Compilación de Producción:** `npm run build`
3. **Escaneo de Secretos:** RegEx para detectar claves RSA, EC, OpenSSH, AWS Access Keys (`AKIA...`), GitHub Tokens (`ghp_...`) y OpenAI Keys (`sk-...`).
4. **Higiene de Archivos:** Rechazo de archivos `.env` o carpetas residuales (`Conxa.rmk-main`, `Conexa.rmk-main`).

---

## 6. Hoja de Ruta de Cumplimiento de Seguridad

| Fase | Tarea | Estado |
| :--- | :--- | :--- |
| **Fase 1: Hardening Backend** | Endpoint `/api/quotes/submit` con RBAC y anti-self-quote | **COMPLETADO** |
| **Fase 2: Finalización Transaccional** | Endpoint `/api/jobs/complete` con validación de asignación | **COMPLETADO** |
| **Fase 3: Contrato de Datos Unificado** | Incorporación de `clientId` en interfaz `Quote` | **COMPLETADO** |
| **Fase 4: CI/CD & Secret Scanning** | Workflow `unify-conexa.yml` configurado | **COMPLETADO** |
| Fase 5: Reglas de Seguridad Firestore | Auditoría y despliegue de `firestore.rules` finales | Pendiente de despliegue |
