<?php
require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../config/app.php';
require_once __DIR__ . '/../middleware/auth.php';

setCorsHeaders();

$user   = requireAuth();
$method = $_SERVER['REQUEST_METHOD'];
$id     = isset($_GET['id']) ? (int)$_GET['id'] : null;
$action = $_GET['action'] ?? '';

match (true) {
    $method === 'GET' && !$action                       => getNotificaciones($user),
    $method === 'GET' && $action === 'count'             => getCount($user),
    $method === 'PUT' && $id                             => marcarLeida($user, $id),
    $method === 'PUT' && $action === 'read-all'          => marcarTodasLeidas($user),
    default => jsonResponse(false, 'Ruta no encontrada.', [], 404),
};

// obtener notificaciones
function getNotificaciones(array $user): void {
    $db   = Database::getInstance();
    $stmt = $db->prepare('
        SELECT id, titulo, mensaje, tipo, leido, created_at
        FROM notificaciones
        WHERE usuario_id = :uid
        ORDER BY created_at DESC
        LIMIT 50
    ');
    $stmt->execute([':uid' => $user['usuario_id']]);
    jsonResponse(true, 'OK', ['notificaciones' => $stmt->fetchAll()]);
}

// obtener cantidad de notificaciones no leídas
function getCount(array $user): void {
    $db   = Database::getInstance();
    $stmt = $db->prepare('SELECT COUNT(*) AS cnt FROM notificaciones WHERE usuario_id = :uid AND leido = 0');
    $stmt->execute([':uid' => $user['usuario_id']]);
    jsonResponse(true, 'OK', ['count' => (int)$stmt->fetch()['cnt']]);
}

// marcar como leída
function marcarLeida(array $user, int $id): void {
    $db = Database::getInstance();
    $db->prepare('UPDATE notificaciones SET leido = 1 WHERE id = :id AND usuario_id = :uid')
       ->execute([':id' => $id, ':uid' => $user['usuario_id']]);
    jsonResponse(true, 'Notificación marcada como leída.');
}

// marcar todas como leídas
function marcarTodasLeidas(array $user): void {
    $db = Database::getInstance();
    $db->prepare('UPDATE notificaciones SET leido = 1 WHERE usuario_id = :uid AND leido = 0')
       ->execute([':uid' => $user['usuario_id']]);
    jsonResponse(true, 'Todas las notificaciones marcadas como leídas.');
}
