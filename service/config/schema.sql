-- SISTEMA CONTABLE SCHEMA

CREATE DATABASE IF NOT EXISTS sistema_contable
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE sistema_contable;

-- MODULOS
CREATE TABLE IF NOT EXISTS modulos (
    id         INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    nombre     VARCHAR(100) NOT NULL,
    slug       VARCHAR(100) NOT NULL UNIQUE,
    icono      VARCHAR(60)  DEFAULT 'bi-grid',
    descripcion TEXT,
    activo     TINYINT(1)  NOT NULL DEFAULT 1,
    orden      SMALLINT    NOT NULL DEFAULT 0,
    created_at TIMESTAMP   NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP   NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- ACCIONES
CREATE TABLE IF NOT EXISTS acciones (
    id         INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    nombre     VARCHAR(100) NOT NULL,
    slug       VARCHAR(100) NOT NULL UNIQUE,
    descripcion TEXT,
    created_at TIMESTAMP   NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- MODULO_ACCIONES
CREATE TABLE IF NOT EXISTS modulo_acciones (
    id         INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    modulo_id  INT UNSIGNED NOT NULL,
    accion_id  INT UNSIGNED NOT NULL,
    UNIQUE KEY uq_modulo_accion (modulo_id, accion_id),
    CONSTRAINT fk_ma_modulo FOREIGN KEY (modulo_id) REFERENCES modulos(id)  ON DELETE CASCADE,
    CONSTRAINT fk_ma_accion FOREIGN KEY (accion_id) REFERENCES acciones(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- ROLES
CREATE TABLE IF NOT EXISTS roles (
    id          INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    nombre      VARCHAR(100) NOT NULL UNIQUE,
    descripcion TEXT,
    activo      TINYINT(1)  NOT NULL DEFAULT 1,
    created_at  TIMESTAMP   NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at  TIMESTAMP   NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- ROL_MODULO_ACCIONES
CREATE TABLE IF NOT EXISTS rol_modulo_acciones (
    id               INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    rol_id           INT UNSIGNED NOT NULL,
    modulo_accion_id INT UNSIGNED NOT NULL,
    UNIQUE KEY uq_rol_ma (rol_id, modulo_accion_id),
    CONSTRAINT fk_rma_rol FOREIGN KEY (rol_id)           REFERENCES roles(id)          ON DELETE CASCADE,
    CONSTRAINT fk_rma_ma  FOREIGN KEY (modulo_accion_id) REFERENCES modulo_acciones(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- USUARIOS
CREATE TABLE IF NOT EXISTS usuarios (
    id             INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    nombre         VARCHAR(150) NOT NULL,
    apellidos      VARCHAR(150) NOT NULL,
    email          VARCHAR(200) NOT NULL UNIQUE,
    password_hash  VARCHAR(255) NOT NULL,
    activo         TINYINT(1)  NOT NULL DEFAULT 1,
    ultimo_login   DATETIME    DEFAULT NULL,
    avatar         VARCHAR(255) DEFAULT NULL,
    created_at     TIMESTAMP   NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at     TIMESTAMP   NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- USUARIO_ROLES
CREATE TABLE IF NOT EXISTS usuario_roles (
    id         INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    usuario_id INT UNSIGNED NOT NULL,
    rol_id     INT UNSIGNED NOT NULL,
    UNIQUE KEY uq_usuario_rol (usuario_id, rol_id),
    CONSTRAINT fk_ur_usuario FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE,
    CONSTRAINT fk_ur_rol     FOREIGN KEY (rol_id)     REFERENCES roles(id)    ON DELETE CASCADE
) ENGINE=InnoDB;

-- SESIONES
CREATE TABLE IF NOT EXISTS sesiones (
    id           INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    usuario_id   INT UNSIGNED NOT NULL,
    token        VARCHAR(255) NOT NULL UNIQUE,
    ip           VARCHAR(45)  DEFAULT NULL,
    user_agent   TEXT,
    expires_at   DATETIME     NOT NULL,
    created_at   TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_ses_usuario FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE
) ENGINE=InnoDB;


-- INSERTAR MODULOS
INSERT INTO modulos (nombre, slug, icono, descripcion, orden) VALUES
('Inicio',           'dashboard',          'bi-house-door',     'Panel de inicio',                       1),
('Usuarios',         'usuarios',           'bi-people',         'Gestión de usuarios',                   2),
('Roles',            'roles',              'bi-shield-lock',    'Gestión de roles y permisos',           3),
('Clientes',         'clientes',           'bi-person-badge',   'Gestión de clientes',                   4),
('Declaraciones',    'declaraciones',      'bi-file-earmark',   'Control de declaraciones',              5),
('Analíticas',       'analiticas',         'bi-bar-chart',      'Análisis financiero',                   6),
('Perfil',           'perfil',             'bi-person-circle',  'Perfil de usuario',                     7);

-- INSERTAR ACCIONES
INSERT INTO acciones (nombre, slug, descripcion) VALUES
('Ver',      'ver',      'Leer / listar registros'),
('Crear',    'crear',    'Agregar nuevos registros'),
('Editar',   'editar',   'Modificar registros existentes'),
('Eliminar', 'eliminar', 'Eliminar registros'),
('Exportar', 'exportar', 'Exportar o descargar datos');

-- INSERTAR RELACIONES MODULO-ACCIONES
INSERT INTO modulo_acciones (modulo_id, accion_id)
SELECT m.id, a.id
FROM modulos m
CROSS JOIN acciones a;

-- INSERTAR ROLES
INSERT INTO roles (nombre, descripcion) VALUES
('Administrador', 'Acceso total al sistema'),
('Contador',      'Acceso a declaraciones e historiales de clientes'),
('Cliente',       'Acceso a sus propias declaraciones y análisis');

-- ROL ADMIN: todos los permisos en todos los módulos
INSERT INTO rol_modulo_acciones (rol_id, modulo_accion_id)
SELECT r.id, ma.id
FROM roles r
JOIN modulo_acciones ma ON 1=1
WHERE r.nombre = 'Administrador';

-- ROL CONTADOR: ver declaraciones, clientes, dashboard y perfil
INSERT INTO rol_modulo_acciones (rol_id, modulo_accion_id)
SELECT r.id, ma.id
FROM roles r
JOIN modulo_acciones ma ON 1=1
JOIN modulos m  ON ma.modulo_id = m.id
JOIN acciones a ON ma.accion_id = a.id
WHERE r.nombre = 'Contador'
  AND (
        (m.slug = 'declaraciones')
     OR (m.slug = 'clientes'  AND a.slug = 'ver')
     OR (m.slug = 'dashboard' AND a.slug = 'ver')
     OR (m.slug = 'perfil')
  );

-- ROL CLIENTE: ver sus declaraciones, analíticas y perfil
INSERT INTO rol_modulo_acciones (rol_id, modulo_accion_id)
SELECT r.id, ma.id
FROM roles r
JOIN modulo_acciones ma ON 1=1
JOIN modulos m  ON ma.modulo_id = m.id
JOIN acciones a ON ma.accion_id = a.id
WHERE r.nombre = 'Cliente'
  AND (
        (m.slug = 'declaraciones' AND a.slug IN ('ver'))
     OR (m.slug = 'analiticas'   AND a.slug IN ('ver'))
     OR (m.slug = 'perfil')
     OR (m.slug = 'dashboard'    AND a.slug = 'ver')
  );

-- ADMIN DEFAULT USER
INSERT INTO usuarios (nombre, apellidos, email, password_hash) VALUES
('Admin', 'Sistema', 'admin@contable.local',
 '$2y$10$MK5fvXrVmj.t01FX3kygQO3mJkeWIv8lulm54wXLWICJPP83TD6uy');  -- Admin2026!

-- ASIGNAR ROL DE ADMINISTRADOR AL USUARIO ADMIN
INSERT INTO usuario_roles (usuario_id, rol_id)
SELECT u.id, r.id
FROM usuarios u, roles r
WHERE u.email = 'admin@contable.local' AND r.nombre = 'Administrador';
