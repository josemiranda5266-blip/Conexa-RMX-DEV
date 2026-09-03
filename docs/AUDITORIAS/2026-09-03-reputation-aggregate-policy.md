# Auditoría — agregados de reputación

Fecha: 2026-09-03
Repositorio: `josemiranda5266-blip/Conexa-RMX-DEV`
Rama: `integration/conexa-unified`

## Implementación

Se creó `src/server/reputationPolicy.ts` como capa pura para calcular `rating` y `reviewCount` exclusivamente a partir de Reviews válidas.

Una Review inválida para reputación es aquella que:

- es demo;
- está reportada;
- no tiene `professionalId` válido;
- tiene `overallRating` fuera de 1..5 o no numérico.

El promedio se redondea a dos decimales y el contador representa únicamente Reviews válidas.

## Objetivo

Los campos agregados del perfil profesional no deben ser aceptados como verdad proveniente del navegador. Deben derivarse de Reviews autoritativas o de un agregado mantenido por backend.

## Pendiente

Todavía no se modifica `users.rating` / `users.reviewCount` desde este archivo. Antes de hacerlo hay que cerrar el contrato de agregación con el esquema real de `UserProfile`, las reglas de Firestore y el flujo de reporte/moderación de Reviews. La ruta HTTP también debe estar conectada al runtime principal.

## Criterio de cierre

La reputación estará cerrada cuando:

1. toda Review nueva pase por `reviewService`;
2. el agregado se actualice de forma transaccional o mediante un mecanismo server-side confiable;
3. reportes/moderación puedan invalidar el agregado sin intervención del cliente;
4. la proyección pública consuma el agregado autoritativo;
5. la eliminación de cuenta anonimice referencias y no deje reputación atribuida al usuario eliminado.
