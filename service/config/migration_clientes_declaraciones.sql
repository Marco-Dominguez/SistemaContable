-- MIGRACION: Clientes, Declaraciones, Catálogos y Notificaciones

USE sistema_contable;

-- CATALOGOS FISCALES
CREATE TABLE IF NOT EXISTS regimenes_fiscales (
    id          INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    clave       VARCHAR(10)  NOT NULL UNIQUE,
    nombre      VARCHAR(200) NOT NULL,
    descripcion TEXT,
    activo      TINYINT(1)   NOT NULL DEFAULT 1,
    created_at  TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS obligaciones (
    id            INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    clave         VARCHAR(20)  NOT NULL UNIQUE,
    nombre        VARCHAR(200) NOT NULL,
    periodicidad  ENUM('Mensual','Bimestral','Anual','Informativa') NOT NULL DEFAULT 'Mensual',
    activo        TINYINT(1)   NOT NULL DEFAULT 1,
    created_at    TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS regimen_obligaciones (
    id            INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    regimen_id    INT UNSIGNED NOT NULL,
    obligacion_id INT UNSIGNED NOT NULL,
    UNIQUE KEY uq_reg_obl (regimen_id, obligacion_id),
    CONSTRAINT fk_ro_regimen     FOREIGN KEY (regimen_id)    REFERENCES regimenes_fiscales(id) ON DELETE CASCADE,
    CONSTRAINT fk_ro_obligacion  FOREIGN KEY (obligacion_id) REFERENCES obligaciones(id)       ON DELETE CASCADE
) ENGINE=InnoDB;

-- CLIENTES
CREATE TABLE IF NOT EXISTS clientes (
    id              INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    usuario_id      INT UNSIGNED DEFAULT NULL,
    rfc             VARCHAR(13)  NOT NULL UNIQUE,
    razon_social    VARCHAR(250) NOT NULL,
    email           VARCHAR(200) DEFAULT NULL,
    telefono        VARCHAR(20)  DEFAULT NULL,
    direccion       TEXT,
    activo          TINYINT(1)   NOT NULL DEFAULT 1,
    created_at      TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_cli_usuario FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE SET NULL
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS cliente_regimenes (
    id          INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    cliente_id  INT UNSIGNED NOT NULL,
    regimen_id  INT UNSIGNED NOT NULL,
    UNIQUE KEY uq_cli_reg (cliente_id, regimen_id),
    CONSTRAINT fk_cr_cliente FOREIGN KEY (cliente_id) REFERENCES clientes(id)          ON DELETE CASCADE,
    CONSTRAINT fk_cr_regimen FOREIGN KEY (regimen_id) REFERENCES regimenes_fiscales(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- DECLARACIONES
CREATE TABLE IF NOT EXISTS declaraciones (
    id                    INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    cliente_id            INT UNSIGNED NOT NULL,
    obligacion_id         INT UNSIGNED NOT NULL,
    periodo_mes           TINYINT UNSIGNED NOT NULL,
    periodo_anio          YEAR    NOT NULL,
    estatus               ENUM('Pendiente','En Proceso','Para Pago','Pagada','Presentada_Cero') NOT NULL DEFAULT 'Pendiente',
    fecha_limite          DATE    DEFAULT NULL,
    fecha_presentacion    DATE    DEFAULT NULL,
    fecha_pago            DATE    DEFAULT NULL,
    importe_a_pagar       DECIMAL(12,2) DEFAULT 0.00,
    saldo_a_favor         DECIMAL(12,2) DEFAULT 0.00,
    acuse_url             VARCHAR(500)  DEFAULT NULL,
    linea_captura_url     VARCHAR(500)  DEFAULT NULL,
    comprobante_pago_url  VARCHAR(500)  DEFAULT NULL,
    observaciones         TEXT,
    created_at            TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at            TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_decl_cliente     FOREIGN KEY (cliente_id)    REFERENCES clientes(id)      ON DELETE CASCADE,
    CONSTRAINT fk_decl_obligacion  FOREIGN KEY (obligacion_id) REFERENCES obligaciones(id)  ON DELETE RESTRICT,
    UNIQUE KEY uq_decl_periodo (cliente_id, obligacion_id, periodo_mes, periodo_anio)
) ENGINE=InnoDB;

-- NOTIFICACIONES
CREATE TABLE IF NOT EXISTS notificaciones (
    id          INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    usuario_id  INT UNSIGNED NOT NULL,
    titulo      VARCHAR(200) NOT NULL,
    mensaje     TEXT,
    tipo        ENUM('info','success','warning','error') NOT NULL DEFAULT 'info',
    leido       TINYINT(1)   NOT NULL DEFAULT 0,
    created_at  TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_notif_usuario FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- REGIMENES FISCALES SAT
INSERT INTO regimenes_fiscales (clave, nombre) VALUES
('601', 'General de Ley Personas Morales'),
('603', 'Personas Morales con Fines no Lucrativos'),
('605', 'Sueldos y Salarios e Ingresos Asimilados a Salarios'),
('606', 'Arrendamiento'),
('608', 'Demás Ingresos'),
('610', 'Residentes en el Extranjero sin Est. Permanente en México'),
('611', 'Ingresos por Dividendos (socios y accionistas)'),
('612', 'Personas Físicas con Actividades Empresariales y Profesionales'),
('614', 'Ingresos por Intereses'),
('615', 'Régimen de los ingresos por obtención de premios'),
('616', 'Sin obligaciones fiscales'),
('620', 'Sociedades Cooperativas de Producción'),
('621', 'Incorporación Fiscal'),
('622', 'Actividades Agrícolas, Ganaderas, Silvícolas y Pesqueras'),
('623', 'Opcional para Grupos de Sociedades'),
('624', 'Coordinados'),
('625', 'Régimen de las Actividades Empresariales con Ingresos a través de Plataformas Tecnológicas'),
('626', 'Régimen Simplificado de Confianza (RESICO)');

-- OBLIGACIONES FISCALES COMUNES
INSERT INTO obligaciones (clave, nombre, periodicidad) VALUES
('ISR-M',     'ISR Mensual (Pago Provisional)',        'Mensual'),
('IVA-M',     'IVA Mensual',                           'Mensual'),
('RET-ISR',   'Retenciones de ISR',                    'Mensual'),
('RET-IVA',   'Retenciones de IVA',                    'Mensual'),
('DIOT',      'DIOT (Declaración Informativa de Operaciones con Terceros)', 'Mensual'),
('ISR-A',     'ISR Anual (Declaración Anual)',          'Anual'),
('RESICO-M',  'RESICO Mensual',                        'Mensual'),
('RESICO-A',  'RESICO Anual',                           'Anual');

-- RELACIONES RÉGIMEN A OBLIGACIONES

-- 612 Personas Físicas con Act. Empresariales: ISR-M, IVA-M, RET-ISR, RET-IVA, DIOT, ISR-A
INSERT INTO regimen_obligaciones (regimen_id, obligacion_id)
SELECT r.id, o.id FROM regimenes_fiscales r, obligaciones o
WHERE r.clave = '612' AND o.clave IN ('ISR-M','IVA-M','RET-ISR','RET-IVA','DIOT','ISR-A');

-- 601 General de Ley PM: ISR-M, IVA-M, RET-ISR, RET-IVA, DIOT, ISR-A
INSERT INTO regimen_obligaciones (regimen_id, obligacion_id)
SELECT r.id, o.id FROM regimenes_fiscales r, obligaciones o
WHERE r.clave = '601' AND o.clave IN ('ISR-M','IVA-M','RET-ISR','RET-IVA','DIOT','ISR-A');

-- 626 RESICO: RESICO-M, RESICO-A
INSERT INTO regimen_obligaciones (regimen_id, obligacion_id)
SELECT r.id, o.id FROM regimenes_fiscales r, obligaciones o
WHERE r.clave = '626' AND o.clave IN ('RESICO-M','RESICO-A');

-- 606 Arrendamiento: ISR-M, IVA-M, ISR-A
INSERT INTO regimen_obligaciones (regimen_id, obligacion_id)
SELECT r.id, o.id FROM regimenes_fiscales r, obligaciones o
WHERE r.clave = '606' AND o.clave IN ('ISR-M','IVA-M','ISR-A');

-- 605 Sueldos y Salarios: ISR-A
INSERT INTO regimen_obligaciones (regimen_id, obligacion_id)
SELECT r.id, o.id FROM regimenes_fiscales r, obligaciones o
WHERE r.clave = '605' AND o.clave IN ('ISR-A');

-- 608 Demás Ingresos: ISR-M, ISR-A
INSERT INTO regimen_obligaciones (regimen_id, obligacion_id)
SELECT r.id, o.id FROM regimenes_fiscales r, obligaciones o
WHERE r.clave = '608' AND o.clave IN ('ISR-M','ISR-A');

-- 611 Ingresos por Dividendos: ISR-A
INSERT INTO regimen_obligaciones (regimen_id, obligacion_id)
SELECT r.id, o.id FROM regimenes_fiscales r, obligaciones o
WHERE r.clave = '611' AND o.clave IN ('ISR-A');

-- 614 Ingresos por Intereses: ISR-A
INSERT INTO regimen_obligaciones (regimen_id, obligacion_id)
SELECT r.id, o.id FROM regimenes_fiscales r, obligaciones o
WHERE r.clave = '614' AND o.clave IN ('ISR-A');

-- 620 Sociedades Cooperativas de Producción: ISR-M, IVA-M, RET-ISR, RET-IVA, DIOT, ISR-A
INSERT INTO regimen_obligaciones (regimen_id, obligacion_id)
SELECT r.id, o.id FROM regimenes_fiscales r, obligaciones o
WHERE r.clave = '620' AND o.clave IN ('ISR-M','IVA-M','RET-ISR','RET-IVA','DIOT','ISR-A');

-- 621 Incorporación Fiscal: ISR-M, IVA-M, ISR-A
INSERT INTO regimen_obligaciones (regimen_id, obligacion_id)
SELECT r.id, o.id FROM regimenes_fiscales r, obligaciones o
WHERE r.clave = '621' AND o.clave IN ('ISR-M','IVA-M','ISR-A');

-- 622 Act. Agrícolas, Ganaderas, Silvícolas y Pesqueras: ISR-M, IVA-M, ISR-A
INSERT INTO regimen_obligaciones (regimen_id, obligacion_id)
SELECT r.id, o.id FROM regimenes_fiscales r, obligaciones o
WHERE r.clave = '622' AND o.clave IN ('ISR-M','IVA-M','ISR-A');

-- 625 Plataformas Tecnológicas: ISR-M, IVA-M, ISR-A
INSERT INTO regimen_obligaciones (regimen_id, obligacion_id)
SELECT r.id, o.id FROM regimenes_fiscales r, obligaciones o
WHERE r.clave = '625' AND o.clave IN ('ISR-M','IVA-M','ISR-A');
