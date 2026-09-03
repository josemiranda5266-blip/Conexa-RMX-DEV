# CONEXA — Auditoría de Storage Rules

## Repositorio y rama

- Repositorio: `josemiranda5266-blip/Conexa-RMX-DEV`
- Rama: `integration/conexa-unified`
- Fecha: 2026-09-02

## Hallazgo

`storage.rules` mantiene correctamente cerrado todo Storage salvo `verification-documents/{userId}/{uploadId}`. Ese flujo permite al propio usuario crear su documento, limita el tamaño a 10 MB y restringe el `contentType` declarado a JPEG, PNG, WebP o PDF. La lectura queda limitada al propietario y las operaciones de actualización/eliminación del cliente están bloqueadas.

## Riesgo residual

El `contentType` de una subida es metadata declarada por el cliente y no constituye por sí solo validación del contenido real del archivo. La garantía fuerte de tipo MIME debe quedar en el backend/proceso de verificación si el producto exige aceptar únicamente documentos válidos.

No se amplió Storage para otros recursos. Esto es deliberado: abrir rutas adicionales sin una política de ownership, tamaño, MIME y ciclo de vida aumentaría la superficie de exposición.

## Criterio de producción

- Mantener deny-by-default.
- Mantener documentos de verificación privados.
- Validar contenido real de documentos en el pipeline backend cuando corresponda.
- No permitir overwrite/delete desde cliente.

No se ejecutaron tests ni build en esta etapa.
