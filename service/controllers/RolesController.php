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
    $method === 'GET'    && !$id && !$action  => getRoles($user),
    $method === 'GET'    && $id               => getRole($user, $id),
    $method === 'POST'   && !$action          => createRole($user),
    $method === 'PUT'    && $id               => updateRole($user, $id),
    $method === 'DELETE' && $id               => deleteRole($user, $id),
    // permisos de un rol
    $method === 'GET'  && $action === 'permisos' && $id => getRolePermissions($user, $id),
    $method === 'POST' && $action === 'permisos' && $id => setRolePermissions($user, $id),
    default => jsonResponse(false, 'Ruta no encontrada.', [], 404),
};


// retorna todos los roles con el total de usuarios asignados a cada uno
function getRoles(array $user): void {
    requirePermission($user['usuario_id'], 'roles', 'ver');
    $db   = Database::getInstance();
    $stmt = $db->query('
        SELECT r.id, r.nombre, r.descripcion, r.activo, r.created_at,
               COUNT(DISTINCT ur.usuario_id) AS total_usuarios
        FROM roles r
        LEFT JOIN usuario_roles ur ON ur.rol_id = r.id
        GROUP BY r.id
        ORDER BY r.id ASC
    ');
    jsonResponse(true, 'OK', ['roles' => $stmt->fetchAll()]);
}

// retorna un rol específico por su ID
function getRole(array $user, int $id): void {
    requirePermission($user['usuario_id'], 'roles', 'ver');
    $db   = Database::getInstance();
    $stmt = $db->prepare('SELECT * FROM roles WHERE id = :id');
    $stmt->execute([':id' => $id]);
    $rol  = $stmt->fetch();
    if (!$rol) jsonResponse(false, 'Rol no encontrado.', [], 404);
    jsonResponse(true, 'OK', ['rol' => $rol]);
}

// crea un nuevo rol
function createRole(array $user): void {
    requirePermission($user['usuario_id'], 'roles', 'crear');
    $body       = getJsonBody();
    $nombre     = trim($body['nombre']      ?? '');
    $descripcion= trim($body['descripcion'] ?? '');

    if (!$nombre) jsonResponse(false, 'El nombre del rol es requerido.', [], 422);

    $db = Database::getInstance();
    try {
        $stmt = $db->prepare('INSERT INTO roles (nombre, descripcion) VALUES (:n, :d)');
        $stmt->execute([':n' => $nombre, ':d' => $descripcion]);
        $newId = $db->lastInsertId();
        jsonResponse(true, 'Rol creado correctamente.', ['id' => $newId], 201);
    } catch (PDOException $e) {
        if ($e->errorInfo[1] === 1062) {
            jsonResponse(false, 'Ya existe un rol con ese nombre.', [], 409);
        }
        throw $e;
    }
}

// actualiza un rol existente
function updateRole(array $user, int $id): void {
    requirePermission($user['usuario_id'], 'roles', 'editar');
    $body        = getJsonBody();
    $nombre      = trim($body['nombre']      ?? '');
    $descripcion = trim($body['descripcion'] ?? '');
    $activo      = isset($body['activo']) ? (int)(bool)$body['activo'] : null;

    if (!$nombre) jsonResponse(false, 'El nombre del rol es requerido.', [], 422);

    $db   = Database::getInstance();
    $check = $db->prepare('SELECT id FROM roles WHERE id = :id');
    $check->execute([':id' => $id]);
    if (!$check->fetch()) jsonResponse(false, 'Rol no encontrado.', [], 404);

    $sets  = ['nombre = :n', 'descripcion = :d'];
    $params= [':n' => $nombre, ':d' => $descripcion, ':id' => $id];
    if ($activo !== null) { $sets[] = 'activo = :a'; $params[':a'] = $activo; }

    try {
        $db->prepare('UPDATE roles SET ' . implode(', ', $sets) . ' WHERE id = :id')
           ->execute($params);
        jsonResponse(true, 'Rol actualizado correctamente.');
    } catch (PDOException $e) {
        if ($e->errorInfo[1] === 1062) jsonResponse(false, 'Ya existe un rol con ese nombre.', [], 409);
        throw $e;
    }
}

// ─────────────────────────────────────────────
function deleteRole(array $user, int $id): void {
    requirePermission($user['usuario_id'], 'roles', 'eliminar');
    $db   = Database::getInstance();
    $check = $db->prepare('SELECT nombre FROM roles WHERE id = :id');
    $check->execute([':id' => $id]);
    $rol = $check->fetch();
    if (!$rol) jsonResponse(false, 'Rol no encontrado.', [], 404);
    if ($rol['nombre'] === 'Administrador') jsonResponse(false, 'No puedes eliminar el rol Administrador.', [], 403);

    $db->prepare('DELETE FROM roles WHERE id = :id')->execute([':id' => $id]);
    jsonResponse(true, 'Rol eliminado correctamente.');
}

// retorna la matriz de permisos asignados a un rol específico, junto con todos los módulos y acciones disponibles para asignar
function getRolePermissions(array $user, int $rolId): void {
    requirePermission($user['usuario_id'], 'roles', 'ver');
    $db   = Database::getInstance();

    $modulos = $db->query('SELECT id, nombre, slug FROM modulos WHERE activo=1 ORDER BY orden')->fetchAll();
    $acciones= $db->query('SELECT id, nombre, slug FROM acciones ORDER BY id')->fetchAll();

    // permisos actuales del rol
    $stmt = $db->prepare('
        SELECT ma.modulo_id, ma.accion_id
        FROM rol_modulo_acciones rma
        JOIN modulo_acciones ma ON ma.id = rma.modulo_accion_id
        WHERE rma.rol_id = :rid
    ');
    $stmt->execute([':rid' => $rolId]);
    $asignados = $stmt->fetchAll();

    $mapaAsignados = [];
    foreach ($asignados as $a) {
        $mapaAsignados[$a['modulo_id']][$a['accion_id']] = true;
    }

    // todos los modulo_acciones
    $maStmt = $db->query('SELECT id, modulo_id, accion_id FROM modulo_acciones');
    $maAll  = $maStmt->fetchAll();

    jsonResponse(true, 'OK', [
        'rol_id'      => $rolId,
        'modulos'     => $modulos,
        'acciones'    => $acciones,
        'modulo_acciones' => $maAll,
        'asignados'   => $mapaAsignados,
    ]);
}

// actualiza los permisos de un rol específico, recibe un array con los IDs de modulo_accion a asignar
function setRolePermissions(array $user, int $rolId): void {
    requirePermission($user['usuario_id'], 'roles', 'editar');
    $body  = getJsonBody();
    // $body['permisos'] = [modulo_accion_id, ...]
    $permisos = array_map('intval', $body['permisos'] ?? []);

    $db = Database::getInstance();
    $check = $db->prepare('SELECT id, nombre FROM roles WHERE id = :id');
    $check->execute([':id' => $rolId]);
    if (!$check->fetch()) jsonResponse(false, 'Rol no encontrado.', [], 404);

    $db->beginTransaction();
    try {
        $db->prepare('DELETE FROM rol_modulo_acciones WHERE rol_id = :rid')->execute([':rid' => $rolId]);

        if (!empty($permisos)) {
            $ins = $db->prepare('INSERT INTO rol_modulo_acciones (rol_id, modulo_accion_id) VALUES (:rid, :mid)');
            foreach ($permisos as $maId) {
                $ins->execute([':rid' => $rolId, ':mid' => $maId]);
            }
        }
        $db->commit();
        jsonResponse(true, 'Permisos actualizados correctamente.');
    } catch (Throwable $e) {
        $db->rollBack();
        jsonResponse(false, 'Error al guardar permisos.', [], 500);
    }
}
