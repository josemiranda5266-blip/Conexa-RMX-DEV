# Corrección de auditoría — estado real de Reviews y eliminación de cuenta

Fecha: 2026-09-03
Rama definitiva: `integration/conexa-unified`

## Corrección del registro anterior

Una revisión posterior del código efectivo mostró que varias correcciones que figuraban como pendientes ya fueron implementadas en la rama.

### Reviews

`reviewService.ts` ya realiza en una única transacción:

- creación idempotente de la Review mediante ID determinístico;
- validación de cliente, profesional y ServiceRequest;
- actualización de `rating` y `reviewCount` del usuario profesional;
- sincronización de la proyección `public_professional_profiles` cuando existe;
- sincronización de `radar_candidates`;
- cierre del ServiceRequest después de la reseña;
- avance controlado del estado financiero `SERVICE_COMPLETED -> REVIEW_COMPLETED`.

Por lo tanto, el principal pendiente de Reviews ya no es la consistencia de agregados, sino la integración efectiva del boundary HTTP en el runtime y la eliminación del escritor legacy del frontend.

### Eliminación de cuenta

`accountDeletionPolicy.ts` ya rechaza IDs con `/`.

`accountDeletionService.ts` ya usa transacción para crear/leer el checkpoint inicial, anonimiza autoría de reviews y limpia referencias profesionales en:

- `assignedProfessionalId`;
- `biddingProfessionalIds`;
- `professionalId` dentro de Reviews;
- proyecciones públicas y RADAR.

El riesgo principal restante es de cobertura semántica: antes de producción debe completarse un inventario final de referencias de identidad por colección y conectar el flujo durable al endpoint runtime.

## Conclusión

Las estimaciones anteriores de Reviews y eliminación de cuenta eran conservadoras porque fueron hechas antes de recuperar el contenido más reciente de los servicios. La siguiente auditoría debe tomar el código efectivo de la rama como fuente de verdad antes de abrir nuevos hallazgos.
