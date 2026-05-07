<?php
require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../config/app.php';
require_once __DIR__ . '/../middleware/auth.php';

setCorsHeaders();

$user   = requireAuth();
$method = $_SERVER['REQUEST_METHOD'];
$action = $_GET['action'] ?? '';
$id     = isset($_GET['id']) ? (int)$_GET['id'] : null;

match (true) {
    // regímenes fiscales
    $method === 'GET' && $action === 'regimenes' && $id          => getRegimen($user, $id),
    $method === 'GET' && $action === 'regimenes' && !$id         => getRegimenes($user),

    // obligaciones
    $method === 'GET' && $action === 'obligaciones'              => getObligaciones($user),

    // obligaciones por régimen
    $method === 'GET' && $action === 'regimen-obligaciones' && $id => getObligacionesByRegimen($user, $id),

    default => jsonResponse(false, 'Ruta no encontrada.', [], 404),
};

// REGÍMENES
function getRegimenes(array $user): void {
    $db   = Database::getInstance();
    $rows = $db->query('SELECT id, clave, nombre, descripcion, activo FROM regimenes_fiscales WHERE activo=1 ORDER BY clave')->fetchAll();
    jsonResponse(true, 'OK', ['regimenes' => $rows]);
}

function getRegimen(array $user, int $id): void {
    $db   = Database::getInstance();
    $stmt = $db->prepare('SELECT id, clave, nombre, descripcion, activo FROM regimenes_fiscales WHERE id = :id');
    $stmt->execute([':id' => $id]);
    $row = $stmt->fetch();
    if (!$row) jsonResponse(false, 'Régimen no encontrado.', [], 404);
    jsonResponse(true, 'OK', ['regimen' => $row]);
}

// OBLIGACIONES

function getObligaciones(array $user): void {
    $db   = Database::getInstance();
    $rows = $db->query('SELECT id, clave, nombre, periodicidad, activo FROM obligaciones WHERE activo=1 ORDER BY id')->fetchAll();
    jsonResponse(true, 'OK', ['obligaciones' => $rows]);
}

// OBLIGACIONES POR RÉGIMEN

function getObligacionesByRegimen(array $user, int $regimenId): void {
    $db   = Database::getInstance();
    $stmt = $db->prepare('
        SELECT o.id, o.clave, o.nombre, o.periodicidad
        FROM regimen_obligaciones ro
        JOIN obligaciones o ON o.id = ro.obligacion_id
        WHERE ro.regimen_id = :rid AND o.activo = 1
        ORDER BY o.id
    ');
    $stmt->execute([':rid' => $regimenId]);
    jsonResponse(true, 'OK', ['obligaciones' => $stmt->fetchAll()]);
}
