<?php
require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../config/app.php';
require_once __DIR__ . '/../middleware/auth.php';

setCorsHeaders();

$user   = requireAuth();
$method = $_SERVER['REQUEST_METHOD'];
$action = $_GET['action'] ?? 'general';

match (true) {
    $method === 'GET' && $action === 'general'     => getGeneral($user),
    $method === 'GET' && $action === 'por-estatus'  => getPorEstatus($user),
    $method === 'GET' && $action === 'tendencia'    => getTendencia($user),
    $method === 'GET' && $action === 'por-cliente'  => getPorCliente($user),
    default => jsonResponse(false, 'Ruta no encontrada.', [], 404),
};

// kpis generales y distribucion de estatus
function getGeneral(array $user): void {
    requirePermission($user['usuario_id'], 'declaraciones', 'ver');
    $db = Database::getInstance();

    $anio = isset($_GET['anio']) ? (int)$_GET['anio'] : (int)date('Y');

    // kpis del año
    $stmtKpi = $db->prepare("
        SELECT
            COUNT(*)                                                          AS total,
            SUM(CASE WHEN estatus = 'Pendiente' THEN 1 ELSE 0 END)           AS pendientes,
            SUM(CASE WHEN estatus = 'En Proceso' THEN 1 ELSE 0 END)         AS en_proceso,
            SUM(CASE WHEN estatus = 'Para Pago' THEN 1 ELSE 0 END)          AS para_pago,
            SUM(CASE WHEN estatus = 'Pagada' THEN 1 ELSE 0 END)             AS pagadas,
            SUM(CASE WHEN estatus = 'Presentada_Cero' THEN 1 ELSE 0 END)    AS en_cero,
            COALESCE(SUM(importe_a_pagar), 0)                                AS total_importe,
            COALESCE(SUM(saldo_a_favor), 0)                                  AS total_saldo_favor
        FROM declaraciones
        WHERE periodo_anio = :anio
    ");
    $stmtKpi->execute([':anio' => $anio]);
    $kpi = $stmtKpi->fetch();

    // distribucion por estatus
    $stmtEst = $db->prepare("
        SELECT estatus, COUNT(*) AS cantidad
        FROM declaraciones
        WHERE periodo_anio = :anio
        GROUP BY estatus
        ORDER BY FIELD(estatus, 'Pendiente','En Proceso','Para Pago','Pagada','Presentada_Cero')
    ");
    $stmtEst->execute([':anio' => $anio]);
    $porEstatus = $stmtEst->fetchAll();

    // importe vs saldo a favor
    $stmtTend = $db->prepare("
        SELECT
            periodo_mes                          AS mes,
            COALESCE(SUM(importe_a_pagar), 0)    AS importe,
            COALESCE(SUM(saldo_a_favor), 0)      AS saldo_favor,
            COUNT(*)                             AS total_decl
        FROM declaraciones
        WHERE periodo_anio = :anio
        GROUP BY periodo_mes
        ORDER BY periodo_mes
    ");
    $stmtTend->execute([':anio' => $anio]);
    $tendencia = $stmtTend->fetchAll();

    // clientes con mas declaraciones en el año
    $stmtTop = $db->prepare("
        SELECT c.razon_social, COUNT(*) AS cantidad,
               COALESCE(SUM(d.importe_a_pagar), 0) AS total_importe
        FROM declaraciones d
        JOIN clientes c ON c.id = d.cliente_id
        WHERE d.periodo_anio = :anio
        GROUP BY d.cliente_id, c.razon_social
        ORDER BY cantidad DESC
        LIMIT 5
    ");
    $stmtTop->execute([':anio' => $anio]);
    $topClientes = $stmtTop->fetchAll();

    // obligaciones mas frecuentes
    $stmtObl = $db->prepare("
        SELECT o.nombre, o.clave, COUNT(*) AS cantidad
        FROM declaraciones d
        JOIN obligaciones o ON o.id = d.obligacion_id
        WHERE d.periodo_anio = :anio
        GROUP BY d.obligacion_id, o.nombre, o.clave
        ORDER BY cantidad DESC
        LIMIT 6
    ");
    $stmtObl->execute([':anio' => $anio]);
    $obligaciones = $stmtObl->fetchAll();

    jsonResponse(true, 'OK', [
        'anio'           => $anio,
        'kpi'            => [
            'total'          => (int)$kpi['total'],
            'pendientes'     => (int)$kpi['pendientes'],
            'en_proceso'     => (int)$kpi['en_proceso'],
            'para_pago'      => (int)$kpi['para_pago'],
            'pagadas'        => (int)$kpi['pagadas'],
            'en_cero'        => (int)$kpi['en_cero'],
            'total_importe'  => round((float)$kpi['total_importe'], 2),
            'total_saldo'    => round((float)$kpi['total_saldo_favor'], 2),
        ],
        'por_estatus'    => $porEstatus,
        'tendencia'      => $tendencia,
        'top_clientes'   => $topClientes,
        'obligaciones'   => $obligaciones,
    ]);
}

// distribucion por estatus
function getPorEstatus(array $user): void {
    requirePermission($user['usuario_id'], 'declaraciones', 'ver');
    $db   = Database::getInstance();
    $anio = isset($_GET['anio']) ? (int)$_GET['anio'] : (int)date('Y');

    $stmt = $db->prepare("
        SELECT estatus, COUNT(*) AS cantidad
        FROM declaraciones
        WHERE periodo_anio = :anio
        GROUP BY estatus
    ");
    $stmt->execute([':anio' => $anio]);

    jsonResponse(true, 'OK', ['por_estatus' => $stmt->fetchAll()]);
}

// tendencia mensual
function getTendencia(array $user): void {
    requirePermission($user['usuario_id'], 'declaraciones', 'ver');
    $db   = Database::getInstance();
    $anio = isset($_GET['anio']) ? (int)$_GET['anio'] : (int)date('Y');

    $stmt = $db->prepare("
        SELECT periodo_mes AS mes,
               COALESCE(SUM(importe_a_pagar), 0) AS importe,
               COALESCE(SUM(saldo_a_favor), 0)   AS saldo_favor,
               COUNT(*)                           AS total_decl
        FROM declaraciones
        WHERE periodo_anio = :anio
        GROUP BY periodo_mes
        ORDER BY periodo_mes
    ");
    $stmt->execute([':anio' => $anio]);

    jsonResponse(true, 'OK', ['tendencia' => $stmt->fetchAll()]);
}

// distribucion por cliente
function getPorCliente(array $user): void {
    requirePermission($user['usuario_id'], 'declaraciones', 'ver');
    $db   = Database::getInstance();
    $anio = isset($_GET['anio']) ? (int)$_GET['anio'] : (int)date('Y');

    $stmt = $db->prepare("
        SELECT c.razon_social, COUNT(*) AS cantidad,
               COALESCE(SUM(d.importe_a_pagar), 0) AS total_importe,
               COALESCE(SUM(d.saldo_a_favor), 0)   AS total_saldo
        FROM declaraciones d
        JOIN clientes c ON c.id = d.cliente_id
        WHERE d.periodo_anio = :anio
        GROUP BY d.cliente_id, c.razon_social
        ORDER BY cantidad DESC
    ");
    $stmt->execute([':anio' => $anio]);

    jsonResponse(true, 'OK', ['por_cliente' => $stmt->fetchAll()]);
}
