<?php
require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../config/app.php';
require_once __DIR__ . '/../middleware/auth.php';

setCorsHeaders();

$user   = requireAuth();
$method = $_SERVER['REQUEST_METHOD'];
$action = $_GET['action'] ?? '';

match (true) {
    $method === 'GET' && $action === 'modulos'  => getModules($user),
    $method === 'GET' && $action === 'acciones' => getActions($user),
    $method === 'GET' && $action === 'matriz'   => getPermissions($user),
    default => jsonResponse(false, 'Ruta no encontrada.', [], 404),
};

// retorna los módulos activos ordenados por el campo orden
function getModules(array $user): void {
    requirePermission($user['usuario_id'], 'roles', 'ver');
    $db   = Database::getInstance();
    $rows = $db->query('SELECT id, nombre, slug, icono, descripcion, activo, orden FROM modulos ORDER BY orden')->fetchAll();
    jsonResponse(true, 'OK', ['modulos' => $rows]);
}

// retorna las acciones disponibles para asignar a los módulos, no las del usuario
function getActions(array $user): void {
    requirePermission($user['usuario_id'], 'roles', 'ver');
    $db   = Database::getInstance();
    $rows = $db->query('SELECT id, nombre, slug, descripcion FROM acciones ORDER BY id')->fetchAll();
    jsonResponse(true, 'OK', ['acciones' => $rows]);
}

// retorna la matriz de permisos para asignar a los roles, no los permisos del usuario
function getPermissions(array $user): void {
    requirePermission($user['usuario_id'], 'roles', 'ver');
    $db      = Database::getInstance();
    $modulos = $db->query('SELECT id, nombre, slug FROM modulos WHERE activo=1 ORDER BY orden')->fetchAll();
    $acciones= $db->query('SELECT id, nombre, slug FROM acciones ORDER BY id')->fetchAll();
    $ma      = $db->query('SELECT id, modulo_id, accion_id FROM modulo_acciones')->fetchAll();
    jsonResponse(true, 'OK', ['modulos' => $modulos, 'acciones' => $acciones, 'modulo_acciones' => $ma]);
}
