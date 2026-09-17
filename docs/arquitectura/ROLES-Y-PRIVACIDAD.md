# Roles y privacidad

## Roles de la plataforma

### SUPER_ADMIN

Puede:

- administrar usuarios a nivel de cuenta y estado;
- administrar productos y ediciones;
- crear lotes de activación;
- generar códigos únicos;
- generar tarjetas de activación para impresión;
- administrar el QR general;
- consultar métricas y estados técnicos/administrativos.

No puede:

- leer conversaciones;
- leer narrativas;
- leer registros personales;
- leer devoluciones de ALETHIA;
- buscar contenido privado de usuarios;
- acceder al espacio personal como si fuera el usuario.

### USER

Puede:

- administrar su propia cuenta;
- activar su agenda mediante un código válido;
- acceder exclusivamente a su experiencia;
- registrar su experiencia;
- aportar narrativas y otros materiales admitidos;
- utilizar ALETHIA según las funciones habilitadas para el producto.

No puede:

- acceder a datos de otros usuarios;
- consultar códigos de activación de otras agendas;
- acceder al panel administrativo.

## Separación técnica

La privacidad no debe depender solamente de ocultar botones en la interfaz.

Debe existir una separación de autorización en backend:

```text
ADMIN API
  └── gestión administrativa

USER API
  └── datos propios del usuario

PRIVATE EXPERIENCE DATA
  └── autorización por ownership

ALETHIA
  └── acceso únicamente al material autorizado de la experiencia
```

Un usuario autenticado no obtiene acceso a otra experiencia modificando un ID en una URL o petición.

El Super Admin tampoco obtiene acceso al contenido privado por el hecho de tener privilegios administrativos.

## Auditoría

Se podrán registrar eventos administrativos no sensibles, por ejemplo:

- creación de lote;
- generación de códigos;
- activación de una licencia;
- desactivación de una cuenta;
- generación de tarjetas;
- acceso administrativo a metadatos.

Los registros de auditoría no deben almacenar el contenido de conversaciones o narrativas.
