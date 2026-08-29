# Auditoría CONEXA — 2026-08-29

## Alcance
Auditoría inicial de la rama de consolidación `integration/conexa-unified` de `Conexa-RMX-DEV`, con foco en identificar la fuente real de desarrollo, estado de consolidación, seguridad y próximos puntos de corrección.

## Estado de consolidación

- Rama auditada: `integration/conexa-unified`
- Commit observado al inicio de la auditoría: `a97ac5781118ffbe6a04be13703fa8c8ea744d61`
- Commit observado: 29/08/2026 06:28 UTC.
- La rama está documentada como integración de `Conxa.rmk` y `Conexa-RMX-DEV`.
- El plan de consolidación establece que `main` de producción no debe modificarse durante esta etapa.

## Evidencia funcional y de seguridad existente

La rama ya contiene trabajo de consolidación comercial y de seguridad, incluyendo:

- modelo `Transaction` y creación backend de transacciones;
- comisión calculada en backend;
- bloqueo de escrituras directas de transacciones desde cliente;
- restricciones para `invite_codes` y `beta_config`;
- autenticación Firebase para endpoints Gemini;
- eliminación de secretos fallback hardcodeados en webhook Meta;
- OAuth de Mercado Pago;
- tokens de Mercado Pago cifrados con AES-256-GCM y no expuestos al navegador;
- Checkout Pro y webhook server-side;
- comprobación server-side del estado de pago;
- protección contra crear una contratación pagable si el profesional no tiene Mercado Pago conectado;
- corrección reciente de transiciones obsoletas/stale en webhooks de pagos.

## Pendientes P0/P1 identificados por el plan unificado

1. Implementar operación autoritativa `startJob`.
2. Corregir `completeJob` para exigir `IN_PROGRESS -> COMPLETED` y separar elegibilidad de review.
3. Mover creación de reviews y actualización de agregados profesionales a transacción backend.
4. Restringir updates de solicitudes mediante whitelist.
5. Mantener transacciones protegidas contra escrituras directas del cliente.
6. Validar autoría de mensajes contra membresía de la conversación.
7. Proteger aprobaciones de verificación y mutaciones administrativas detrás de autorización/auditoría backend.
8. Revisar permisos de lectura de `beta_config` e `invite_codes`.
9. Verificar ciclo completo de custom claims antes de producción.
10. Incorporar contexto de tenant/negocio de forma consistente antes de SaaS multi-tenant.

## Criterio de producción

No declarar producción lista hasta verificar: TypeScript/build, tests del flujo request -> quote -> accept -> pay -> start -> complete -> review, rechazo server-side de transiciones inválidas, reglas Firestore, ownership por recurso, imposibilidad de escalar privilegios mediante headers controlados por usuario, webhooks idempotentes y ausencia de fixtures/demo en datos reales.

## Decisión de trabajo

A partir de esta auditoría, `integration/conexa-unified` queda como rama de trabajo principal para la consolidación. No se deben hacer correcciones equivalentes en repositorios paralelos sin una razón explícita.

## Próximo paso

Continuar con la Fase 2: correcciones de autorización/BOLA/IDOR, privacidad de datos, solicitudes, conversaciones/mensajes, reviews y estados comerciales; después ejecutar la batería de validación antes de avanzar a producción.
