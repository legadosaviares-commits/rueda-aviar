# Acceso y activación

## Decisión funcional

El **QR de la Agenda de la Experiencia es general**. No identifica individualmente a una agenda ni contiene el acceso del usuario.

El control individual se realiza mediante una **tarjeta física de activación** incluida con cada agenda.

## Componentes

### 1. QR general

Un único destino público, por ejemplo:

`/acceso`

El QR puede imprimirse en grandes cantidades y reutilizarse en toda una edición.

### 2. Código de activación

Cada agenda recibe un código criptográficamente aleatorio y único.

Características requeridas:

- no reutilizable;
- no secuencial de forma predecible;
- no contiene datos personales;
- almacenado de forma segura en el backend;
- estado inicial: `unused`;
- al activarse pasa a `activated`;
- queda vinculado a una única cuenta;
- debe existir protección contra intentos masivos de prueba de códigos.

### 3. Tarjeta de activación

Cada agenda física incluye una tarjeta con:

- nombre de la Agenda de la Experiencia;
- instrucciones breves;
- código de activación;
- QR general opcional como ayuda para llegar a `/acceso`.

El QR de la tarjeta no necesita ser diferente si apunta al mismo acceso general.

## Flujo de usuario

1. La persona escanea el QR general de la agenda.
2. Llega a la pantalla de acceso.
3. Crea una cuenta o inicia sesión.
4. Selecciona `Activar mi Agenda`.
5. Introduce el código de la tarjeta.
6. El backend valida que el código exista y esté disponible.
7. Si es válido, se vincula la licencia/agenda con la cuenta.
8. El código queda inutilizable para una segunda activación.
9. El usuario entra a su espacio personal.
10. En accesos posteriores, el QR general simplemente lleva al acceso y la autenticación identifica su espacio personal.

## Flujo de administración

El Super Admin dispone de herramientas para:

- crear lotes de códigos;
- generar códigos únicos;
- consultar estados administrativos de códigos (`unused`, `activated`, `revoked`, etc.);
- asociar códigos a producto, edición y lote;
- generar/imprimir tarjetas en lote;
- obtener el QR general de la edición;
- consultar métricas de activación.

## Límite de privilegios del Super Admin

El Super Admin **no puede acceder al contenido privado de las experiencias**.

No debe existir una función administrativa que permita leer:

- conversaciones del usuario;
- narrativas personales;
- registros personales de la agenda;
- devoluciones privadas de ALETHIA.

La administración debe operar sobre metadatos y estados necesarios para la gestión del servicio, no sobre el contenido de la experiencia.

## Modelo conceptual mínimo

```text
Product
  └── Edition
        └── ActivationBatch
              └── ActivationCode
                    └── UserAccount (cuando se activa)

UserAccount
  └── AgendaLicense
        └── PrivateExperience
              ├── Records
              ├── Narratives
              └── ALETHIA interactions
```

## Seguridad

La validación debe ocurrir exclusivamente en servidor. El frontend nunca debe decidir que un código es válido.

La sesión del usuario debe estar autenticada antes de acceder a datos privados. Las consultas de datos deben estar autorizadas por propietario, no únicamente por un identificador enviado desde el navegador.

La interfaz del Super Admin y la API administrativa deben utilizar permisos separados de las APIs de contenido privado.

## Principio rector

**Un QR general abre la puerta; una activación única da derecho a entrar; la cuenta autenticada protege la experiencia personal.**
