# Sistema Contable — Guía de instalación (XAMPP)

## Requisitos

- XAMPP con Apache y MySQL activos
- PHP 8.1+
- Navegador

---

## 1. Copiar el proyecto

Copia el proyecto dentro de la carpeta:

```
C:\xampp\htdocs\
```

Estructura del proyecto:

```
C:\xampp\htdocs\SistemaContable\
├── index.php
├── .htaccess
├── service\
│   ├── .htaccess
│   ├── config\
│   │   ├── database.php
│   │   ├── app.php
│   │   └── schema.sql
│   ├── middleware\
│   │   └── auth.php
│   └── controllers\
│       ├── AuthController.php
│       ├── RolesController.php
│       ├── UsuariosController.php
│       └── ModulosController.php
└── view\
    ├── .htaccess
    ├── assets\
    │   ├── css\
    │   │   └── app.css
    │   └── js\
    │       └── app.js
    ├── components\
    │   └── templates\
    │       └── layout.html
    └── pages\
        ├── auth\
        │   ├── login.html
        │   └── login.js
        ├── dashboard\
        │   └── index.html
        └── security\
            ├── usuarios\
            │   ├── index.html
            │   └── usuarios.js
            └── roles\
                ├── index.html
                └── roles.js
```

---

## 2. Habilitar mod_rewrite en Apache

Abre `C:\xampp\apache\conf\httpd.conf` y verifica que esta línea NO esté comentada:

```
LoadModule rewrite_module modules/mod_rewrite.so
```

Busca la sección `<Directory "C:/xampp/htdocs">` o `<Directory "/Applications/XAMPP/xamppfiles/htdocs">` y asegúrate de que diga:

```
AllowOverride All
```

Reinicia Apache en el Panel de XAMPP.

---

## 3. Crear la base de datos

1. Abre **phpMyAdmin**: http://localhost/phpmyadmin
2. Ve a **SQL**.
3. Copia y ejecuta:

   ```
   service/config/schema.sql
   ```

Esto creará la base de datos `sistema_contable` con todas las tablas, módulos, acciones, roles y el usuario administrador por defecto.

---

## 4. Configurar la conexión (si es necesario)

Si tu XAMPP tiene contraseña en MySQL, edita:

```
service/config/database.php
```

```php
define('DB_PASS', 'tu_contraseña');
```

---

## 5. Acceder al sistema

Abre el navegador en:

```
http://localhost/SistemaContable/
```

### Credenciales por defecto

| Campo      | Valor                  |
|------------|------------------------|
| Correo     | admin@contable.local   |
| Contraseña | Admin2026!             |

> **Importante:** Puedes cambiar la contraseña del administracion por seguridad.

---

## Estructura de la API

Todas las APIs estan en `/SistemaContable/service/api/`:

| Endpoint                            | Método | Descripción                        |
|-------------------------------------|--------|------------------------------------|
| `api/auth?action=login`             | POST   | Iniciar sesión                     |
| `api/auth?action=logout`            | POST   | Cerrar sesión                      |
| `api/auth?action=me`                | GET    | Datos del usuario actual           |
| `api/roles`                         | GET    | Listar todos los roles             |
| `api/roles?id={id}`                 | GET    | Obtener un rol                     |
| `api/roles`                         | POST   | Crear rol                          |
| `api/roles?id={id}`                 | PUT    | Actualizar rol                     |
| `api/roles?id={id}`                 | DELETE | Eliminar rol                       |
| `api/roles?id={id}&action=permisos` | GET    | Ver permisos de un rol             |
| `api/roles?id={id}&action=permisos` | POST   | Guardar permisos de un rol         |
| `api/usuarios`                      | GET    | Listar usuarios                    |
| `api/usuarios?id={id}`              | GET    | Obtener usuario                    |
| `api/usuarios`                      | POST   | Crear usuario                      |
| `api/usuarios?id={id}`              | PUT    | Actualizar usuario                 |
| `api/usuarios?id={id}`              | DELETE | Eliminar usuario                   |
| `api/usuarios?id={id}&action=roles` | GET    | Ver roles de un usuario            |
| `api/usuarios?id={id}&action=roles` | POST   | Asignar roles a un usuario         |
| `api/modulos?action=modulos`        | GET    | Listar módulos del sistema         |
| `api/modulos?action=acciones`       | GET    | Listar acciones disponibles        |
| `api/modulos?action=matriz`         | GET    | Matriz módulo × acción             |

---

## Autenticación

Todas las APIs (excepto login) requieren el header:

```
Authorization: Bearer {token}
```

El token se obtiene al hacer login y se almacena en `localStorage`.

---

## Roles por defecto

| Rol           | Acceso                                              |
|---------------|-----------------------------------------------------|
| Administrador | Todo el sistema                                     |
| Contador      | Declaraciones (CRUD), Clientes (ver), Dashboard     |
| Cliente       | Sus declaraciones (ver), Analíticas (ver), Dashboard|

---

## Notas de seguridad

- Las contraseñas se almacenan como hash bcrypt.
- Los tokens de sesión son de 80 caracteres hex aleatorios.
- La sesión expira a las 8 horas por defecto (ajustable en `app.php`).
- Todas las rutas de API validan autenticación y permisos antes de ejecutar.
