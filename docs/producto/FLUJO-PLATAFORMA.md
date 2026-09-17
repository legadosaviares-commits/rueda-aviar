# Flujo de la plataforma

## Entrada pública

El usuario llega mediante el QR general impreso en la Agenda de la Experiencia.

Destino conceptual:

```text
QR → /acceso
```

La pantalla debe permitir:

- iniciar sesión;
- crear cuenta;
- activar una agenda.

## Activación

```text
Crear cuenta / Iniciar sesión
          ↓
   Activar mi Agenda
          ↓
 introducir código único
          ↓
 validar en servidor
          ↓
 vincular licencia
          ↓
   entrar a experiencia
```

## Experiencia del usuario

La experiencia digital debe ser independiente del panel administrativo.

Áreas previstas:

- inicio;
- mi agenda;
- registro de experiencia;
- narrativa;
- materiales enviados;
- acceso a ALETHIA;
- configuración de cuenta.

La estructura concreta de cada pantalla se definirá antes de implementar la interfaz definitiva.

## Panel Super Admin

Áreas previstas:

- Dashboard;
- Usuarios;
- Productos/Ediciones;
- Lotes de activación;
- Generador de códigos;
- Generador de tarjetas;
- QR general;
- métricas;
- configuración.

No se incluirá un visor de conversaciones ni un buscador de narrativas privadas.

## Generador de tarjetas

El sistema debe permitir generar un lote de tarjetas listo para impresión, con un código único por agenda.

Ejemplo conceptual:

```text
Lote: EDICIÓN 2027 — 20 agendas

[ Generar 20 códigos ]
[ Generar tarjetas ]
[ Descargar archivo para impresión ]
```

Cada tarjeta representa una activación independiente.

## Generador de QR

El Super Admin puede generar el QR correspondiente al acceso público/general de una edición.

El QR puede descargarse en un formato adecuado para impresión y reutilizarse en las agendas de esa edición.

No debe contener el código privado de activación.

## Regla de diseño

La plataforma debe ser útil desde celular, porque el flujo principal comienza con el escaneo de un QR físico.
