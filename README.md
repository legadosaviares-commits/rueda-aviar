# Agenda de la Experiencia + ALETHIA

Plataforma digital asociada a la **Agenda de la Experiencia**, con la **Rueda Aviar** como primera expresión simbólica y **ALETHIA** como motor de lectura de la experiencia.

## Objetivo

Construir una plataforma web accesible desde un **QR general** impreso en todas las agendas. El QR lleva a un enlace genérico; el acceso a la experiencia personal se controla mediante una cuenta de usuario y un **código de activación único**, entregado en una tarjeta física dentro de cada agenda.

## Principios de acceso

- El QR impreso es general y puede ser idéntico en todas las agendas.
- Cada agenda física incorpora una tarjeta con un código de activación único.
- Cada código de activación puede utilizarse una sola vez.
- La activación vincula una agenda/licencia con la cuenta del usuario.
- El usuario accede posteriormente mediante autenticación a su propia experiencia.
- El código no debe contener datos personales ni información sensible.
- El Super Admin administra la plataforma, pero **no tiene acceso al contenido privado de las experiencias de los usuarios**.

## Roles

### Super Admin

Gestiona la infraestructura administrativa de la plataforma:

- usuarios y estados de cuenta;
- productos/ediciones;
- generación y gestión de códigos de activación;
- generación del QR general para impresión;
- generación de tarjetas de activación para cada agenda/lote;
- métricas administrativas y técnicas de uso;
- configuración general de la plataforma.

**Restricción fundamental:** no puede leer conversaciones, narrativas, registros personales ni devoluciones privadas de los usuarios.

### Usuario

Accede a su espacio personal después de activar su agenda. Puede gestionar sus propios registros y utilizar las funciones digitales asociadas a la Agenda de la Experiencia y ALETHIA.

## Módulos previstos

```text
plataforma/
├── autenticación y cuentas
├── portal del usuario
├── panel Super Admin
├── productos y ediciones
├── activaciones
├── generador de códigos únicos
├── generador de tarjetas de activación
├── QR general
├── privacidad y control de acceso
├── experiencia / registros del usuario
└── ALETHIA
```

## Flujo principal

```text
Agenda física
     │
     ├── QR GENERAL ──→ enlace público de entrada
     │
     └── TARJETA ─────→ código único de activación
                              │
                              ▼
                    registro / inicio de sesión
                              │
                              ▼
                     validación del código
                              │
                              ▼
                    vinculación de la agenda
                              │
                              ▼
                     espacio personal del usuario
                              │
                              ▼
                           ALETHIA
```

## Privacidad

La arquitectura debe mantener una separación estricta entre **administración** y **contenido personal**. Los permisos administrativos no deben permitir consultar conversaciones ni narrativas privadas.

Los detalles internos del modelo PEA y otros materiales reservados no se incorporan a este README ni a la interfaz pública sin autorización expresa.

## Estado

Fase inicial: definición y construcción de la arquitectura de la plataforma.

Próximos componentes: modelo de datos, autenticación, activación de agendas, portal de usuario, panel Super Admin, generador de códigos/tarjetas y QR, y posterior integración de ALETHIA.
