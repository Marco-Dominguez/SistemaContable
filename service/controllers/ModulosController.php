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
    // módulos
    $method === 'GET'    && $action === 'modulos'  && !$id => getModulos($user),
    $method === 'GET'    && $action === 'modulos'  && $id  => getModulo($user, $id),
    $method === 'POST'   && $action === 'modulos'           => createModulo($user),
    $method === 'PUT'    && $action === 'modulos'  && $id  => updateModulo($user, $id),
    $method === 'DELETE' && $action === 'modulos'  && $id  => deleteModulo($user, $id),

    // acciones
    $method === 'GET'    && $action === 'acciones' && !$id => getAcciones($user),
    $method === 'GET'    && $action === 'acciones' && $id  => getAccion($user, $id),
    $method === 'POST'   && $action === 'acciones'          => createAccion($user),
    $method === 'PUT'    && $action === 'acciones' && $id  => updateAccion($user, $id),
    $method === 'DELETE' && $action === 'acciones' && $id  => deleteAccion($user, $id),

    // módulo-acciones
    $method === 'GET'    && $action === 'matriz'            => getMatriz($user),
    $method === 'POST'   && $action === 'matriz'            => updateModuloAcciones($user),

    default => jsonResponse(false, 'Ruta no encontrada.', [], 404),
};

// módulos

function getModulos(array $user): void {
    requirePermission($user['usuario_id'], 'roles', 'ver');
    $db   = Database::getInstance();
    $rows = $db->query(
        'SELECT id, nombre, slug, icono, descripcion, activo, orden, created_at FROM modulos ORDER BY orden'
    )->fetchAll();
    jsonResponse(true, 'OK', ['modulos' => $rows]);
}

function getModulo(array $user, int $id): void {
    requirePermission($user['usuario_id'], 'roles', 'ver');
    $db   = Database::getInstance();
    $stmt = $db->prepare(
        'SELECT id, nombre, slug, icono, descripcion, activo, orden FROM modulos WHERE id = :id'
    );
    $stmt->execute([':id' => $id]);
    $row = $stmt->fetch();
    if (!$row) { jsonResponse(false, 'Módulo no encontrado.', [], 404); return; }
    jsonResponse(true, 'OK', ['modulo' => $row]);
}

function createModulo(array $user): void {
    requirePermission($user['usuario_id'], 'roles', 'crear');
    $body = getJsonBody();

    $nombre      = trim($body['nombre']      ?? '');
    $slug        = trim($body['slug']        ?? '');
    $icono       = trim($body['icono']       ?? 'bi-grid');
    $descripcion = trim($body['descripcion'] ?? '');
    $activo      = isset($body['activo']) ? (int)(bool)$body['activo'] : 1;
    $orden       = isset($body['orden'])  ? (int)$body['orden']        : 0;

    if (!$nombre) { jsonResponse(false, 'El nombre es requerido.',              [], 422); return; }
    if (!$slug)   { jsonResponse(false, 'El slug es requerido.',                [], 422); return; }
    if (!preg_match('/^[a-z0-9\-]+$/', $slug)) {
        jsonResponse(false, 'El slug solo puede contener letras minúsculas, números y guiones.', [], 422); return;
    }

    $db  = Database::getInstance();
    $chk = $db->prepare('SELECT id FROM modulos WHERE slug = :slug');
    $chk->execute([':slug' => $slug]);
    if ($chk->fetch()) { jsonResponse(false, 'Ya existe un módulo con ese slug.', [], 409); return; }

    $stmt = $db->prepare(
        'INSERT INTO modulos (nombre, slug, icono, descripcion, activo, orden)
         VALUES (:n, :s, :i, :d, :a, :o)'
    );
    $stmt->execute([':n'=>$nombre,':s'=>$slug,':i'=>$icono,':d'=>$descripcion,':a'=>$activo,':o'=>$orden]);
    jsonResponse(true, 'Módulo creado.', ['id' => (int)$db->lastInsertId()], 201);
}

function updateModulo(array $user, int $id): void {
    requirePermission($user['usuario_id'], 'roles', 'editar');
    $db   = Database::getInstance();
    $chkId = $db->prepare('SELECT id FROM modulos WHERE id = :id');
    $chkId->execute([':id' => $id]);
    if (!$chkId->fetch()) { jsonResponse(false, 'Módulo no encontrado.', [], 404); return; }

    $body = getJsonBody();
    $nombre      = trim($body['nombre']      ?? '');
    $slug        = trim($body['slug']        ?? '');
    $icono       = trim($body['icono']       ?? 'bi-grid');
    $descripcion = trim($body['descripcion'] ?? '');
    $activo      = isset($body['activo']) ? (int)(bool)$body['activo'] : 1;
    $orden       = isset($body['orden'])  ? (int)$body['orden']        : 0;

    if (!$nombre) { jsonResponse(false, 'El nombre es requerido.', [], 422); return; }
    if (!$slug)   { jsonResponse(false, 'El slug es requerido.',   [], 422); return; }
    if (!preg_match('/^[a-z0-9\-]+$/', $slug)) {
        jsonResponse(false, 'El slug solo puede contener letras minúsculas, números y guiones.', [], 422); return;
    }

    $chkSlug = $db->prepare('SELECT id FROM modulos WHERE slug = :slug AND id != :id');
    $chkSlug->execute([':slug' => $slug, ':id' => $id]);
    if ($chkSlug->fetch()) { jsonResponse(false, 'Ya existe un módulo con ese slug.', [], 409); return; }

    $upd = $db->prepare(
        'UPDATE modulos SET nombre=:n, slug=:s, icono=:i, descripcion=:d, activo=:a, orden=:o WHERE id=:id'
    );
    $upd->execute([':n'=>$nombre,':s'=>$slug,':i'=>$icono,':d'=>$descripcion,':a'=>$activo,':o'=>$orden,':id'=>$id]);
    jsonResponse(true, 'Módulo actualizado.');
}

function deleteModulo(array $user, int $id): void {
    requirePermission($user['usuario_id'], 'roles', 'eliminar');
    $db   = Database::getInstance();
    $stmt = $db->prepare('SELECT nombre FROM modulos WHERE id = :id');
    $stmt->execute([':id' => $id]);
    if (!$stmt->fetch()) { jsonResponse(false, 'Módulo no encontrado.', [], 404); return; }

    $db->prepare('DELETE FROM modulos WHERE id = :id')->execute([':id' => $id]);
    jsonResponse(true, 'Módulo eliminado.');
}

// acciones

function getAcciones(array $user): void {
    requirePermission($user['usuario_id'], 'roles', 'ver');
    $db   = Database::getInstance();
    $rows = $db->query(
        'SELECT a.id, a.nombre, a.slug, a.descripcion, a.created_at,
                COUNT(ma.id) AS total_modulos
         FROM acciones a
         LEFT JOIN modulo_acciones ma ON ma.accion_id = a.id
         GROUP BY a.id ORDER BY a.id'
    )->fetchAll();
    jsonResponse(true, 'OK', ['acciones' => $rows]);
}

function getAccion(array $user, int $id): void {
    requirePermission($user['usuario_id'], 'roles', 'ver');
    $db   = Database::getInstance();
    $stmt = $db->prepare('SELECT id, nombre, slug, descripcion FROM acciones WHERE id = :id');
    $stmt->execute([':id' => $id]);
    $row = $stmt->fetch();
    if (!$row) { jsonResponse(false, 'Acción no encontrada.', [], 404); return; }
    jsonResponse(true, 'OK', ['accion' => $row]);
}

function createAccion(array $user): void {
    requirePermission($user['usuario_id'], 'roles', 'crear');
    $body = getJsonBody();

    $nombre      = trim($body['nombre']      ?? '');
    $slug        = trim($body['slug']        ?? '');
    $descripcion = trim($body['descripcion'] ?? '');

    if (!$nombre) { jsonResponse(false, 'El nombre es requerido.', [], 422); return; }
    if (!$slug)   { jsonResponse(false, 'El slug es requerido.',   [], 422); return; }
    if (!preg_match('/^[a-z0-9\-]+$/', $slug)) {
        jsonResponse(false, 'El slug solo puede contener letras minúsculas, números y guiones.', [], 422); return;
    }

    $db  = Database::getInstance();
    $chk = $db->prepare('SELECT id FROM acciones WHERE slug = :slug');
    $chk->execute([':slug' => $slug]);
    if ($chk->fetch()) { jsonResponse(false, 'Ya existe una acción con ese slug.', [], 409); return; }

    $stmt = $db->prepare('INSERT INTO acciones (nombre, slug, descripcion) VALUES (:n, :s, :d)');
    $stmt->execute([':n'=>$nombre,':s'=>$slug,':d'=>$descripcion]);
    jsonResponse(true, 'Acción creada.', ['id' => (int)$db->lastInsertId()], 201);
}

function updateAccion(array $user, int $id): void {
    requirePermission($user['usuario_id'], 'roles', 'editar');
    $db    = Database::getInstance();
    $chkId = $db->prepare('SELECT id FROM acciones WHERE id = :id');
    $chkId->execute([':id' => $id]);
    if (!$chkId->fetch()) { jsonResponse(false, 'Acción no encontrada.', [], 404); return; }

    $body = getJsonBody();
    $nombre      = trim($body['nombre']      ?? '');
    $slug        = trim($body['slug']        ?? '');
    $descripcion = trim($body['descripcion'] ?? '');

    if (!$nombre) { jsonResponse(false, 'El nombre es requerido.', [], 422); return; }
    if (!$slug)   { jsonResponse(false, 'El slug es requerido.',   [], 422); return; }
    if (!preg_match('/^[a-z0-9\-]+$/', $slug)) {
        jsonResponse(false, 'El slug solo puede contener letras minúsculas, números y guiones.', [], 422); return;
    }

    $chkSlug = $db->prepare('SELECT id FROM acciones WHERE slug = :slug AND id != :id');
    $chkSlug->execute([':slug' => $slug, ':id' => $id]);
    if ($chkSlug->fetch()) { jsonResponse(false, 'Ya existe una acción con ese slug.', [], 409); return; }

    $upd = $db->prepare('UPDATE acciones SET nombre=:n, slug=:s, descripcion=:d WHERE id=:id');
    $upd->execute([':n'=>$nombre,':s'=>$slug,':d'=>$descripcion,':id'=>$id]);
    jsonResponse(true, 'Acción actualizada.');
}

function deleteAccion(array $user, int $id): void {
    requirePermission($user['usuario_id'], 'roles', 'eliminar');
    $db   = Database::getInstance();
    $stmt = $db->prepare('SELECT nombre FROM acciones WHERE id = :id');
    $stmt->execute([':id' => $id]);
    if (!$stmt->fetch()) { jsonResponse(false, 'Acción no encontrada.', [], 404); return; }

    $db->prepare('DELETE FROM acciones WHERE id = :id')->execute([':id' => $id]);
    jsonResponse(true, 'Acción eliminada.');
}

// módulo-acciones

function getMatriz(array $user): void {
    requirePermission($user['usuario_id'], 'roles', 'ver');
    $db       = Database::getInstance();
    $modulos  = $db->query('SELECT id, nombre, slug, icono FROM modulos ORDER BY orden')->fetchAll();
    $acciones = $db->query('SELECT id, nombre, slug FROM acciones ORDER BY id')->fetchAll();
    $ma       = $db->query('SELECT id, modulo_id, accion_id FROM modulo_acciones')->fetchAll();
    jsonResponse(true, 'OK', ['modulos' => $modulos, 'acciones' => $acciones, 'modulo_acciones' => $ma]);
}

function updateModuloAcciones(array $user): void {
    requirePermission($user['usuario_id'], 'roles', 'editar');
    $body      = getJsonBody();
    $moduloId  = isset($body['modulo_id'])  ? (int)$body['modulo_id'] : null;
    $accionIds = $body['accion_ids'] ?? [];

    if (!$moduloId)         { jsonResponse(false, 'modulo_id es requerido.',         [], 422); return; }
    if (!is_array($accionIds)) { jsonResponse(false, 'accion_ids debe ser un arreglo.', [], 422); return; }

    $db    = Database::getInstance();
    $chkId = $db->prepare('SELECT id FROM modulos WHERE id = :id');
    $chkId->execute([':id' => $moduloId]);
    if (!$chkId->fetch()) { jsonResponse(false, 'Módulo no encontrado.', [], 404); return; }

    $db->prepare('DELETE FROM modulo_acciones WHERE modulo_id = :mid')->execute([':mid' => $moduloId]);

    if (!empty($accionIds)) {
        $ins = $db->prepare('INSERT IGNORE INTO modulo_acciones (modulo_id, accion_id) VALUES (:mid, :aid)');
        foreach ($accionIds as $aid) {
            $aid = (int)$aid;
            if ($aid > 0) $ins->execute([':mid' => $moduloId, ':aid' => $aid]);
        }
    }

    jsonResponse(true, 'Acciones del módulo actualizadas.');
}
