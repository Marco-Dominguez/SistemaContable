-- phpMyAdmin SQL Dump
-- version 5.2.2
-- https://www.phpmyadmin.net/
--
-- Servidor: 127.0.0.1:3306
-- Tiempo de generación: 11-05-2026 a las 13:36:59
-- Versión del servidor: 11.8.6-MariaDB-log
-- Versión de PHP: 7.2.34

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Base de datos: `u126460524_sistema_cont`
--

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `acciones`
--

CREATE TABLE `acciones` (
  `id` int(10) UNSIGNED NOT NULL,
  `nombre` varchar(100) NOT NULL,
  `slug` varchar(100) NOT NULL,
  `descripcion` text DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Volcado de datos para la tabla `acciones`
--

INSERT INTO `acciones` (`id`, `nombre`, `slug`, `descripcion`, `created_at`) VALUES
(1, 'Ver', 'ver', 'Leer / listar registros', '2026-03-25 16:42:19'),
(2, 'Crear', 'crear', 'Agregar nuevos registros', '2026-03-25 16:42:19'),
(3, 'Editar', 'editar', 'Modificar registros existentes', '2026-03-25 16:42:19'),
(4, 'Eliminar', 'eliminar', 'Eliminar registros', '2026-03-25 16:42:19'),
(5, 'Exportar', 'exportar', 'Exportar o descargar datos', '2026-03-25 16:42:19');

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `clientes`
--

CREATE TABLE `clientes` (
  `id` int(10) UNSIGNED NOT NULL,
  `usuario_id` int(10) UNSIGNED DEFAULT NULL,
  `rfc` varchar(13) NOT NULL,
  `razon_social` varchar(250) NOT NULL,
  `email` varchar(200) DEFAULT NULL,
  `telefono` varchar(20) DEFAULT NULL,
  `direccion` text DEFAULT NULL,
  `activo` tinyint(1) NOT NULL DEFAULT 1,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Volcado de datos para la tabla `clientes`
--

INSERT INTO `clientes` (`id`, `usuario_id`, `rfc`, `razon_social`, `email`, `telefono`, `direccion`, `activo`, `created_at`, `updated_at`) VALUES
(1, 2, 'VVWA201124JY5', 'Jose Morales', 'jose@mail.com', '6561112233', 'Calle Belgrado, Colonia Progresista 123', 1, '2026-04-20 22:36:33', '2026-04-20 22:36:33');

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `cliente_regimenes`
--

CREATE TABLE `cliente_regimenes` (
  `id` int(10) UNSIGNED NOT NULL,
  `cliente_id` int(10) UNSIGNED NOT NULL,
  `regimen_id` int(10) UNSIGNED NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Volcado de datos para la tabla `cliente_regimenes`
--

INSERT INTO `cliente_regimenes` (`id`, `cliente_id`, `regimen_id`) VALUES
(1, 1, 3);

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `declaraciones`
--

CREATE TABLE `declaraciones` (
  `id` int(10) UNSIGNED NOT NULL,
  `cliente_id` int(10) UNSIGNED NOT NULL,
  `obligacion_id` int(10) UNSIGNED NOT NULL,
  `periodo_mes` tinyint(3) UNSIGNED NOT NULL,
  `periodo_anio` year(4) NOT NULL,
  `estatus` enum('Pendiente','En Proceso','Para Pago','Pagada','Presentada_Cero') NOT NULL DEFAULT 'Pendiente',
  `fecha_limite` date DEFAULT NULL,
  `fecha_presentacion` date DEFAULT NULL,
  `fecha_pago` date DEFAULT NULL,
  `importe_a_pagar` decimal(12,2) DEFAULT 0.00,
  `saldo_a_favor` decimal(12,2) DEFAULT 0.00,
  `acuse_url` varchar(500) DEFAULT NULL,
  `linea_captura_url` varchar(500) DEFAULT NULL,
  `comprobante_pago_url` varchar(500) DEFAULT NULL,
  `observaciones` text DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Volcado de datos para la tabla `declaraciones`
--

INSERT INTO `declaraciones` (`id`, `cliente_id`, `obligacion_id`, `periodo_mes`, `periodo_anio`, `estatus`, `fecha_limite`, `fecha_presentacion`, `fecha_pago`, `importe_a_pagar`, `saldo_a_favor`, `acuse_url`, `linea_captura_url`, `comprobante_pago_url`, `observaciones`, `created_at`, `updated_at`) VALUES
(1, 1, 6, 3, '2026', 'Pendiente', NULL, NULL, NULL, 0.00, 0.00, NULL, NULL, NULL, NULL, '2026-04-20 22:37:06', '2026-04-20 22:37:06');

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `modulos`
--

CREATE TABLE `modulos` (
  `id` int(10) UNSIGNED NOT NULL,
  `nombre` varchar(100) NOT NULL,
  `slug` varchar(100) NOT NULL,
  `icono` varchar(60) DEFAULT 'bi-grid',
  `descripcion` text DEFAULT NULL,
  `activo` tinyint(1) NOT NULL DEFAULT 1,
  `orden` smallint(6) NOT NULL DEFAULT 0,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Volcado de datos para la tabla `modulos`
--

INSERT INTO `modulos` (`id`, `nombre`, `slug`, `icono`, `descripcion`, `activo`, `orden`, `created_at`, `updated_at`) VALUES
(1, 'Inicio', 'dashboard', 'bi-house-door', 'Panel de inicio', 1, 1, '2026-03-25 16:42:19', '2026-03-25 16:42:19'),
(2, 'Usuarios', 'usuarios', 'bi-people', 'Gestión de usuarios', 1, 2, '2026-03-25 16:42:19', '2026-03-25 16:42:19'),
(3, 'Roles', 'roles', 'bi-shield-lock', 'Gestión de roles y permisos', 1, 3, '2026-03-25 16:42:19', '2026-03-25 16:42:19'),
(4, 'Clientes', 'clientes', 'bi-person-badge', 'Gestión de clientes', 1, 4, '2026-03-25 16:42:19', '2026-03-25 16:42:19'),
(5, 'Declaraciones', 'declaraciones', 'bi-file-earmark', 'Control de declaraciones', 1, 5, '2026-03-25 16:42:19', '2026-03-25 16:42:19'),
(6, 'Analíticas', 'analiticas', 'bi-bar-chart', 'Análisis financiero', 1, 6, '2026-03-25 16:42:19', '2026-03-25 16:42:19'),
(7, 'Perfil', 'perfil', 'bi-person-circle', 'Perfil de usuario', 1, 7, '2026-03-25 16:42:19', '2026-03-25 16:42:19');

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `modulo_acciones`
--

CREATE TABLE `modulo_acciones` (
  `id` int(10) UNSIGNED NOT NULL,
  `modulo_id` int(10) UNSIGNED NOT NULL,
  `accion_id` int(10) UNSIGNED NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Volcado de datos para la tabla `modulo_acciones`
--

INSERT INTO `modulo_acciones` (`id`, `modulo_id`, `accion_id`) VALUES
(15, 1, 1),
(11, 1, 2),
(12, 1, 3),
(13, 1, 4),
(14, 1, 5),
(35, 2, 1),
(31, 2, 2),
(32, 2, 3),
(33, 2, 4),
(34, 2, 5),
(30, 3, 1),
(26, 3, 2),
(27, 3, 3),
(28, 3, 4),
(29, 3, 5),
(10, 4, 1),
(6, 4, 2),
(7, 4, 3),
(8, 4, 4),
(9, 4, 5),
(20, 5, 1),
(16, 5, 2),
(17, 5, 3),
(18, 5, 4),
(19, 5, 5),
(5, 6, 1),
(1, 6, 2),
(2, 6, 3),
(3, 6, 4),
(4, 6, 5),
(25, 7, 1),
(21, 7, 2),
(22, 7, 3),
(23, 7, 4),
(24, 7, 5);

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `notificaciones`
--

CREATE TABLE `notificaciones` (
  `id` int(10) UNSIGNED NOT NULL,
  `usuario_id` int(10) UNSIGNED NOT NULL,
  `titulo` varchar(200) NOT NULL,
  `mensaje` text DEFAULT NULL,
  `tipo` enum('info','success','warning','error') NOT NULL DEFAULT 'info',
  `leido` tinyint(1) NOT NULL DEFAULT 0,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `obligaciones`
--

CREATE TABLE `obligaciones` (
  `id` int(10) UNSIGNED NOT NULL,
  `clave` varchar(20) NOT NULL,
  `nombre` varchar(200) NOT NULL,
  `periodicidad` enum('Mensual','Bimestral','Anual','Informativa') NOT NULL DEFAULT 'Mensual',
  `activo` tinyint(1) NOT NULL DEFAULT 1,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Volcado de datos para la tabla `obligaciones`
--

INSERT INTO `obligaciones` (`id`, `clave`, `nombre`, `periodicidad`, `activo`, `created_at`) VALUES
(1, 'ISR-M', 'ISR Mensual (Pago Provisional)', 'Mensual', 1, '2026-04-20 22:27:18'),
(2, 'IVA-M', 'IVA Mensual', 'Mensual', 1, '2026-04-20 22:27:18'),
(3, 'RET-ISR', 'Retenciones de ISR', 'Mensual', 1, '2026-04-20 22:27:18'),
(4, 'RET-IVA', 'Retenciones de IVA', 'Mensual', 1, '2026-04-20 22:27:18'),
(5, 'DIOT', 'DIOT (Declaración Informativa de Operaciones con Terceros)', 'Mensual', 1, '2026-04-20 22:27:18'),
(6, 'ISR-A', 'ISR Anual (Declaración Anual)', 'Anual', 1, '2026-04-20 22:27:18'),
(7, 'RESICO-M', 'RESICO Mensual', 'Mensual', 1, '2026-04-20 22:27:18'),
(8, 'RESICO-A', 'RESICO Anual', 'Anual', 1, '2026-04-20 22:27:18');

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `regimenes_fiscales`
--

CREATE TABLE `regimenes_fiscales` (
  `id` int(10) UNSIGNED NOT NULL,
  `clave` varchar(10) NOT NULL,
  `nombre` varchar(200) NOT NULL,
  `descripcion` text DEFAULT NULL,
  `activo` tinyint(1) NOT NULL DEFAULT 1,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Volcado de datos para la tabla `regimenes_fiscales`
--

INSERT INTO `regimenes_fiscales` (`id`, `clave`, `nombre`, `descripcion`, `activo`, `created_at`) VALUES
(1, '601', 'General de Ley Personas Morales', NULL, 1, '2026-04-20 22:27:18'),
(2, '603', 'Personas Morales con Fines no Lucrativos', NULL, 1, '2026-04-20 22:27:18'),
(3, '605', 'Sueldos y Salarios e Ingresos Asimilados a Salarios', NULL, 1, '2026-04-20 22:27:18'),
(4, '606', 'Arrendamiento', NULL, 1, '2026-04-20 22:27:18'),
(5, '608', 'Demás Ingresos', NULL, 1, '2026-04-20 22:27:18'),
(6, '610', 'Residentes en el Extranjero sin Est. Permanente en México', NULL, 1, '2026-04-20 22:27:18'),
(7, '611', 'Ingresos por Dividendos (socios y accionistas)', NULL, 1, '2026-04-20 22:27:18'),
(8, '612', 'Personas Físicas con Actividades Empresariales y Profesionales', NULL, 1, '2026-04-20 22:27:18'),
(9, '614', 'Ingresos por Intereses', NULL, 1, '2026-04-20 22:27:18'),
(10, '615', 'Régimen de los ingresos por obtención de premios', NULL, 1, '2026-04-20 22:27:18'),
(11, '616', 'Sin obligaciones fiscales', NULL, 1, '2026-04-20 22:27:18'),
(12, '620', 'Sociedades Cooperativas de Producción', NULL, 1, '2026-04-20 22:27:18'),
(13, '621', 'Incorporación Fiscal', NULL, 1, '2026-04-20 22:27:18'),
(14, '622', 'Actividades Agrícolas, Ganaderas, Silvícolas y Pesqueras', NULL, 1, '2026-04-20 22:27:18'),
(15, '623', 'Opcional para Grupos de Sociedades', NULL, 1, '2026-04-20 22:27:18'),
(16, '624', 'Coordinados', NULL, 1, '2026-04-20 22:27:18'),
(17, '625', 'Régimen de las Actividades Empresariales con Ingresos a través de Plataformas Tecnológicas', NULL, 1, '2026-04-20 22:27:18'),
(18, '626', 'Régimen Simplificado de Confianza (RESICO)', NULL, 1, '2026-04-20 22:27:18');

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `regimen_obligaciones`
--

CREATE TABLE `regimen_obligaciones` (
  `id` int(10) UNSIGNED NOT NULL,
  `regimen_id` int(10) UNSIGNED NOT NULL,
  `obligacion_id` int(10) UNSIGNED NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Volcado de datos para la tabla `regimen_obligaciones`
--

INSERT INTO `regimen_obligaciones` (`id`, `regimen_id`, `obligacion_id`) VALUES
(10, 1, 1),
(11, 1, 2),
(12, 1, 3),
(13, 1, 4),
(8, 1, 5),
(9, 1, 6),
(21, 3, 6),
(19, 4, 1),
(20, 4, 2),
(18, 4, 6),
(23, 5, 1),
(22, 5, 6),
(25, 7, 6),
(3, 8, 1),
(4, 8, 2),
(5, 8, 3),
(6, 8, 4),
(1, 8, 5),
(2, 8, 6),
(26, 9, 6),
(29, 12, 1),
(30, 12, 2),
(31, 12, 3),
(32, 12, 4),
(27, 12, 5),
(28, 12, 6),
(35, 13, 1),
(36, 13, 2),
(34, 13, 6),
(38, 14, 1),
(39, 14, 2),
(37, 14, 6),
(41, 17, 1),
(42, 17, 2),
(40, 17, 6),
(16, 18, 7),
(15, 18, 8);

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `roles`
--

CREATE TABLE `roles` (
  `id` int(10) UNSIGNED NOT NULL,
  `nombre` varchar(100) NOT NULL,
  `descripcion` text DEFAULT NULL,
  `activo` tinyint(1) NOT NULL DEFAULT 1,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Volcado de datos para la tabla `roles`
--

INSERT INTO `roles` (`id`, `nombre`, `descripcion`, `activo`, `created_at`, `updated_at`) VALUES
(1, 'Administrador', 'Acceso total al sistema', 1, '2026-03-25 16:42:19', '2026-03-25 16:42:19'),
(2, 'Contador', 'Acceso a declaraciones e historiales de clientes', 1, '2026-03-25 16:42:19', '2026-03-25 16:42:19'),
(3, 'Cliente', 'Acceso a sus propias declaraciones y análisis', 1, '2026-03-25 16:42:19', '2026-03-25 16:42:19');

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `rol_modulo_acciones`
--

CREATE TABLE `rol_modulo_acciones` (
  `id` int(10) UNSIGNED NOT NULL,
  `rol_id` int(10) UNSIGNED NOT NULL,
  `modulo_accion_id` int(10) UNSIGNED NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Volcado de datos para la tabla `rol_modulo_acciones`
--

INSERT INTO `rol_modulo_acciones` (`id`, `rol_id`, `modulo_accion_id`) VALUES
(8, 1, 1),
(15, 1, 2),
(22, 1, 3),
(29, 1, 4),
(1, 1, 5),
(9, 1, 6),
(16, 1, 7),
(23, 1, 8),
(30, 1, 9),
(2, 1, 10),
(10, 1, 11),
(17, 1, 12),
(24, 1, 13),
(31, 1, 14),
(3, 1, 15),
(11, 1, 16),
(18, 1, 17),
(25, 1, 18),
(32, 1, 19),
(4, 1, 20),
(12, 1, 21),
(19, 1, 22),
(26, 1, 23),
(33, 1, 24),
(5, 1, 25),
(13, 1, 26),
(20, 1, 27),
(27, 1, 28),
(34, 1, 29),
(6, 1, 30),
(14, 1, 31),
(21, 1, 32),
(28, 1, 33),
(35, 1, 34),
(7, 1, 35),
(64, 2, 10),
(65, 2, 15),
(67, 2, 16),
(68, 2, 17),
(69, 2, 18),
(70, 2, 19),
(66, 2, 20),
(72, 2, 21),
(73, 2, 22),
(74, 2, 23),
(75, 2, 24),
(71, 2, 25),
(79, 3, 5),
(80, 3, 15),
(81, 3, 20),
(83, 3, 21),
(84, 3, 22),
(85, 3, 23),
(86, 3, 24),
(82, 3, 25);

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `sesiones`
--

CREATE TABLE `sesiones` (
  `id` int(10) UNSIGNED NOT NULL,
  `usuario_id` int(10) UNSIGNED NOT NULL,
  `token` varchar(255) NOT NULL,
  `ip` varchar(45) DEFAULT NULL,
  `user_agent` text DEFAULT NULL,
  `expires_at` datetime NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `usuarios`
--

CREATE TABLE `usuarios` (
  `id` int(10) UNSIGNED NOT NULL,
  `nombre` varchar(150) NOT NULL,
  `apellidos` varchar(150) NOT NULL,
  `email` varchar(200) NOT NULL,
  `password_hash` varchar(255) NOT NULL,
  `activo` tinyint(1) NOT NULL DEFAULT 1,
  `ultimo_login` datetime DEFAULT NULL,
  `avatar` varchar(255) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Volcado de datos para la tabla `usuarios`
--

INSERT INTO `usuarios` (`id`, `nombre`, `apellidos`, `email`, `password_hash`, `activo`, `ultimo_login`, `avatar`, `created_at`, `updated_at`) VALUES
(1, 'Admin', 'Sistema', 'admin@contable.local', '$2y$10$MK5fvXrVmj.t01FX3kygQO3mJkeWIv8lulm54wXLWICJPP83TD6uy', 1, '2026-05-08 19:41:38', NULL, '2026-03-25 16:42:20', '2026-05-08 19:41:38'),
(2, 'Jose Morales', '', 'jose@mail.com', '$2y$12$DCspLhJL4M3ea5eezy5TU.AK1asr.OWcXSDZK7mgiQuxy9g/oPSBW', 1, '2026-04-22 07:08:30', NULL, '2026-04-20 22:36:33', '2026-04-22 07:08:30');

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `usuario_roles`
--

CREATE TABLE `usuario_roles` (
  `id` int(10) UNSIGNED NOT NULL,
  `usuario_id` int(10) UNSIGNED NOT NULL,
  `rol_id` int(10) UNSIGNED NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Volcado de datos para la tabla `usuario_roles`
--

INSERT INTO `usuario_roles` (`id`, `usuario_id`, `rol_id`) VALUES
(1, 1, 1),
(2, 2, 3);

--
-- Índices para tablas volcadas
--

--
-- Indices de la tabla `acciones`
--
ALTER TABLE `acciones`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `slug` (`slug`);

--
-- Indices de la tabla `clientes`
--
ALTER TABLE `clientes`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `rfc` (`rfc`),
  ADD KEY `fk_cli_usuario` (`usuario_id`);

--
-- Indices de la tabla `cliente_regimenes`
--
ALTER TABLE `cliente_regimenes`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uq_cli_reg` (`cliente_id`,`regimen_id`),
  ADD KEY `fk_cr_regimen` (`regimen_id`);

--
-- Indices de la tabla `declaraciones`
--
ALTER TABLE `declaraciones`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uq_decl_periodo` (`cliente_id`,`obligacion_id`,`periodo_mes`,`periodo_anio`),
  ADD KEY `fk_decl_obligacion` (`obligacion_id`);

--
-- Indices de la tabla `modulos`
--
ALTER TABLE `modulos`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `slug` (`slug`);

--
-- Indices de la tabla `modulo_acciones`
--
ALTER TABLE `modulo_acciones`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uq_modulo_accion` (`modulo_id`,`accion_id`),
  ADD KEY `fk_ma_accion` (`accion_id`);

--
-- Indices de la tabla `notificaciones`
--
ALTER TABLE `notificaciones`
  ADD PRIMARY KEY (`id`),
  ADD KEY `fk_notif_usuario` (`usuario_id`);

--
-- Indices de la tabla `obligaciones`
--
ALTER TABLE `obligaciones`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `clave` (`clave`);

--
-- Indices de la tabla `regimenes_fiscales`
--
ALTER TABLE `regimenes_fiscales`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `clave` (`clave`);

--
-- Indices de la tabla `regimen_obligaciones`
--
ALTER TABLE `regimen_obligaciones`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uq_reg_obl` (`regimen_id`,`obligacion_id`),
  ADD KEY `fk_ro_obligacion` (`obligacion_id`);

--
-- Indices de la tabla `roles`
--
ALTER TABLE `roles`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `nombre` (`nombre`);

--
-- Indices de la tabla `rol_modulo_acciones`
--
ALTER TABLE `rol_modulo_acciones`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uq_rol_ma` (`rol_id`,`modulo_accion_id`),
  ADD KEY `fk_rma_ma` (`modulo_accion_id`);

--
-- Indices de la tabla `sesiones`
--
ALTER TABLE `sesiones`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `token` (`token`),
  ADD KEY `fk_ses_usuario` (`usuario_id`);

--
-- Indices de la tabla `usuarios`
--
ALTER TABLE `usuarios`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `email` (`email`);

--
-- Indices de la tabla `usuario_roles`
--
ALTER TABLE `usuario_roles`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uq_usuario_rol` (`usuario_id`,`rol_id`),
  ADD KEY `fk_ur_rol` (`rol_id`);

--
-- AUTO_INCREMENT de las tablas volcadas
--

--
-- AUTO_INCREMENT de la tabla `acciones`
--
ALTER TABLE `acciones`
  MODIFY `id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=6;

--
-- AUTO_INCREMENT de la tabla `clientes`
--
ALTER TABLE `clientes`
  MODIFY `id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;

--
-- AUTO_INCREMENT de la tabla `cliente_regimenes`
--
ALTER TABLE `cliente_regimenes`
  MODIFY `id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;

--
-- AUTO_INCREMENT de la tabla `declaraciones`
--
ALTER TABLE `declaraciones`
  MODIFY `id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=3;

--
-- AUTO_INCREMENT de la tabla `modulos`
--
ALTER TABLE `modulos`
  MODIFY `id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=8;

--
-- AUTO_INCREMENT de la tabla `modulo_acciones`
--
ALTER TABLE `modulo_acciones`
  MODIFY `id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=36;

--
-- AUTO_INCREMENT de la tabla `notificaciones`
--
ALTER TABLE `notificaciones`
  MODIFY `id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT de la tabla `obligaciones`
--
ALTER TABLE `obligaciones`
  MODIFY `id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=9;

--
-- AUTO_INCREMENT de la tabla `regimenes_fiscales`
--
ALTER TABLE `regimenes_fiscales`
  MODIFY `id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=19;

--
-- AUTO_INCREMENT de la tabla `regimen_obligaciones`
--
ALTER TABLE `regimen_obligaciones`
  MODIFY `id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=43;

--
-- AUTO_INCREMENT de la tabla `roles`
--
ALTER TABLE `roles`
  MODIFY `id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=4;

--
-- AUTO_INCREMENT de la tabla `rol_modulo_acciones`
--
ALTER TABLE `rol_modulo_acciones`
  MODIFY `id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=87;

--
-- AUTO_INCREMENT de la tabla `sesiones`
--
ALTER TABLE `sesiones`
  MODIFY `id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=43;

--
-- AUTO_INCREMENT de la tabla `usuarios`
--
ALTER TABLE `usuarios`
  MODIFY `id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=3;

--
-- AUTO_INCREMENT de la tabla `usuario_roles`
--
ALTER TABLE `usuario_roles`
  MODIFY `id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=3;

--
-- Restricciones para tablas volcadas
--

--
-- Filtros para la tabla `clientes`
--
ALTER TABLE `clientes`
  ADD CONSTRAINT `fk_cli_usuario` FOREIGN KEY (`usuario_id`) REFERENCES `usuarios` (`id`) ON DELETE SET NULL;

--
-- Filtros para la tabla `cliente_regimenes`
--
ALTER TABLE `cliente_regimenes`
  ADD CONSTRAINT `fk_cr_cliente` FOREIGN KEY (`cliente_id`) REFERENCES `clientes` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `fk_cr_regimen` FOREIGN KEY (`regimen_id`) REFERENCES `regimenes_fiscales` (`id`) ON DELETE CASCADE;

--
-- Filtros para la tabla `declaraciones`
--
ALTER TABLE `declaraciones`
  ADD CONSTRAINT `fk_decl_cliente` FOREIGN KEY (`cliente_id`) REFERENCES `clientes` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `fk_decl_obligacion` FOREIGN KEY (`obligacion_id`) REFERENCES `obligaciones` (`id`);

--
-- Filtros para la tabla `modulo_acciones`
--
ALTER TABLE `modulo_acciones`
  ADD CONSTRAINT `fk_ma_accion` FOREIGN KEY (`accion_id`) REFERENCES `acciones` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `fk_ma_modulo` FOREIGN KEY (`modulo_id`) REFERENCES `modulos` (`id`) ON DELETE CASCADE;

--
-- Filtros para la tabla `notificaciones`
--
ALTER TABLE `notificaciones`
  ADD CONSTRAINT `fk_notif_usuario` FOREIGN KEY (`usuario_id`) REFERENCES `usuarios` (`id`) ON DELETE CASCADE;

--
-- Filtros para la tabla `regimen_obligaciones`
--
ALTER TABLE `regimen_obligaciones`
  ADD CONSTRAINT `fk_ro_obligacion` FOREIGN KEY (`obligacion_id`) REFERENCES `obligaciones` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `fk_ro_regimen` FOREIGN KEY (`regimen_id`) REFERENCES `regimenes_fiscales` (`id`) ON DELETE CASCADE;

--
-- Filtros para la tabla `rol_modulo_acciones`
--
ALTER TABLE `rol_modulo_acciones`
  ADD CONSTRAINT `fk_rma_ma` FOREIGN KEY (`modulo_accion_id`) REFERENCES `modulo_acciones` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `fk_rma_rol` FOREIGN KEY (`rol_id`) REFERENCES `roles` (`id`) ON DELETE CASCADE;

--
-- Filtros para la tabla `sesiones`
--
ALTER TABLE `sesiones`
  ADD CONSTRAINT `fk_ses_usuario` FOREIGN KEY (`usuario_id`) REFERENCES `usuarios` (`id`) ON DELETE CASCADE;

--
-- Filtros para la tabla `usuario_roles`
--
ALTER TABLE `usuario_roles`
  ADD CONSTRAINT `fk_ur_rol` FOREIGN KEY (`rol_id`) REFERENCES `roles` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `fk_ur_usuario` FOREIGN KEY (`usuario_id`) REFERENCES `usuarios` (`id`) ON DELETE CASCADE;
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
