# Despliegue en Railway

## Variables obligatorias

Configurar en Railway:

- `BASE_URL`: dominio público final, por ejemplo `https://...`
- `JWT_SECRET`: secreto largo y aleatorio
- `ADMIN_EMAIL`: correo del Super Admin
- `ADMIN_PASSWORD`: contraseña inicial del Super Admin
- `DB_PATH`: ruta persistente, por ejemplo `/data/agenda.db`

## Persistencia

La aplicación utiliza SQLite para esta primera versión. En Railway debe existir un **Volume** montado en una ruta persistente y `DB_PATH` debe apuntar al archivo dentro de ese volumen.

Para una escala mayor se podrá migrar la capa de persistencia a PostgreSQL sin cambiar el modelo funcional de acceso.

## QR

El QR general debe apuntar al dominio público de `/acceso`.

No se debe imprimir un QR que contenga códigos de activación individuales.

## Seguridad antes de producción

- Cambiar todos los secretos de ejemplo.
- Usar HTTPS.
- Configurar cookies `secure` en producción.
- Mantener el panel administrativo protegido por autenticación y rol.
- Añadir rate limiting a login y activación antes de abrir el servicio al público.
- Añadir recuperación de cuenta y verificación de correo.
- Evaluar PostgreSQL para producción/escala.
- Revisar política de privacidad y retención de datos antes de almacenar narrativas reales.
- No otorgar al rol Super Admin permisos para leer contenido privado.
