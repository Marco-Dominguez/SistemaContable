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
    $method === 'GET'    && !$id && !$action   => getUsers($user),
    $method === 'GET'    && $id  && !$action   => getUser($user, $id),
    $method === 'POST'   && !$action           => createUser($user),
    $method === 'PUT'    && $id  && !$action   => updateUser($user, $id),
    $method === 'DELETE' && $id                => deleteUser($user, $id),
    $method === 'GET'  && $action === 'roles'  && $id => getUserRoles($user, $id),
    $method === 'POST' && $action === 'roles'  && $id => setUserRoles($user, $id),
    default => jsonResponse(false, 'Ruta no encontrada.', [], 404),
};

// retorna todos los usuarios con sus roles concatenados en un string
function getUsers(array $user): void {
    requirePermission($user['usuario_id'], 'usuarios', 'ver');
    $db   = Database::getInstance();
    $stmt = $db->query('
        SELECT u.id, u.nombre, u.apellidos, u.email, u.activo, u.ultimo_login, u.created_at,
               GROUP_CONCAT(r.nombre ORDER BY r.nombre SEPARATOR ", ") AS roles
        FROM usuarios u
        LEFT JOIN usuario_roles ur ON ur.usuario_id = u.id
        LEFT JOIN roles r          ON r.id          = ur.rol_id
        GROUP BY u.id
        ORDER BY u.id ASC
    ');
    jsonResponse(true, 'OK', ['usuarios' => $stmt->fetchAll()]);
}

// retorna un usuario específico por su ID
function getUser(array $user, int $id): void {
    requirePermission($user['usuario_id'], 'usuarios', 'ver');
    $db   = Database::getInstance();
    $stmt = $db->prepare('
        SELECT u.id, u.nombre, u.apellidos, u.email, u.activo, u.ultimo_login, u.created_at
        FROM usuarios u WHERE u.id = :id
    ');
    $stmt->execute([':id' => $id]);
    $usr = $stmt->fetch();
    if (!$usr) jsonResponse(false, 'Usuario no encontrado.', [], 404);
    jsonResponse(true, 'OK', ['usuario' => $usr]);
}

// crea un nuevo usuario con email y password
function createUser(array $user): void {
    requirePermission($user['usuario_id'], 'usuarios', 'crear');
    $body      = getJsonBody();
    $nombre    = trim($body['nombre']    ?? '');
    $apellidos = trim($body['apellidos'] ?? '');
    $email     = trim($body['email']     ?? '');
    $password  = trim($body['password']  ?? '');

    $errors = [];
    if (!$nombre)    $errors[] = 'El nombre es requerido.';
    if (!$apellidos) $errors[] = 'Los apellidos son requeridos.';
    if (!filter_var($email, FILTER_VALIDATE_EMAIL)) $errors[] = 'El correo no es válido.';
    if (strlen($password) < 8) $errors[] = 'La contraseña debe tener al menos 8 caracteres.';

    if ($errors) jsonResponse(false, implode(' ', $errors), [], 422);

    $hash = password_hash($password, PASSWORD_BCRYPT, ['cost' => 12]);
    $db   = Database::getInstance();

    try {
        $stmt = $db->prepare('INSERT INTO usuarios (nombre, apellidos, email, password_hash) VALUES (:n,:a,:e,:h)');
        $stmt->execute([':n' => $nombre, ':a' => $apellidos, ':e' => $email, ':h' => $hash]);
        jsonResponse(true, 'Usuario creado correctamente.', ['id' => $db->lastInsertId()], 201);
    } catch (PDOException $e) {
        if ($e->errorInfo[1] === 1062) jsonResponse(false, 'Ya existe un usuario con ese correo.', [], 409);
        throw $e;
    }
}

// actualiza un usuario existente
function updateUser(array $user, int $id): void {
    requirePermission($user['usuario_id'], 'usuarios', 'editar');
    $body      = getJsonBody();
    $nombre    = trim($body['nombre']    ?? '');
    $apellidos = trim($body['apellidos'] ?? '');
    $email     = trim($body['email']     ?? '');
    $activo    = isset($body['activo']) ? (int)(bool)$body['activo'] : null;
    $password  = trim($body['password']  ?? '');

    $db    = Database::getInstance();
    $check = $db->prepare('SELECT id FROM usuarios WHERE id = :id');
    $check->execute([':id' => $id]);
    if (!$check->fetch()) jsonResponse(false, 'Usuario no encontrado.', [], 404);

    $sets   = [];
    $params = [':id' => $id];

    if ($nombre)    { $sets[] = 'nombre = :n';    $params[':n'] = $nombre; }
    if ($apellidos) { $sets[] = 'apellidos = :a'; $params[':a'] = $apellidos; }
    if ($email && filter_var($email, FILTER_VALIDATE_EMAIL)) {
        $sets[] = 'email = :e'; $params[':e'] = $email;
    }
    if ($activo !== null) { $sets[] = 'activo = :act'; $params[':act'] = $activo; }
    if ($password && strlen($password) >= 8) {
        $sets[] = 'password_hash = :h';
        $params[':h'] = password_hash($password, PASSWORD_BCRYPT, ['cost' => 12]);
    }

    if (empty($sets)) jsonResponse(false, 'No hay datos para actualizar.', [], 422);

    try {
        $db->prepare('UPDATE usuarios SET ' . implode(', ', $sets) . ' WHERE id = :id')->execute($params);
        jsonResponse(true, 'Usuario actualizado correctamente.');
    } catch (PDOException $e) {
        if ($e->errorInfo[1] === 1062) jsonResponse(false, 'Ya existe un usuario con ese correo.', [], 409);
        throw $e;
    }
}

// elimina un usuario por su ID
function deleteUser(array $user, int $id): void {
    requirePermission($user['usuario_id'], 'usuarios', 'eliminar');
    if ($id === $user['usuario_id']) jsonResponse(false, 'No puedes eliminar tu propia cuenta.', [], 403);
    $db = Database::getInstance();
    $db->prepare('SELECT id FROM usuarios WHERE id = :id')->execute([':id' => $id]);
    $db->prepare('DELETE FROM usuarios WHERE id = :id')->execute([':id' => $id]);
    jsonResponse(true, 'Usuario eliminado correctamente.');
}

// retorna los roles asignados a un usuario especifico
function getUserRoles(array $user, int $uid): void {
    requirePermission($user['usuario_id'], 'usuarios', 'ver');
    $db   = Database::getInstance();
    $all  = $db->query('SELECT id, nombre FROM roles WHERE activo=1 ORDER BY nombre')->fetchAll();
    $stmt = $db->prepare('SELECT rol_id FROM usuario_roles WHERE usuario_id = :uid');
    $stmt->execute([':uid' => $uid]);
    $asignados = array_column($stmt->fetchAll(), 'rol_id');
    jsonResponse(true, 'OK', ['roles' => $all, 'asignados' => $asignados]);
}

// actualiza los roles asignados a un usuario especifico
function setUserRoles(array $user, int $uid): void {
    requirePermission($user['usuario_id'], 'usuarios', 'editar');
    $body   = getJsonBody();
    $roles  = array_map('intval', $body['roles'] ?? []);
    $db     = Database::getInstance();

    $db->beginTransaction();
    try {
        $db->prepare('DELETE FROM usuario_roles WHERE usuario_id = :uid')->execute([':uid' => $uid]);
        if (!empty($roles)) {
            $ins = $db->prepare('INSERT INTO usuario_roles (usuario_id, rol_id) VALUES (:uid, :rid)');
            foreach ($roles as $rid) {
                $ins->execute([':uid' => $uid, ':rid' => $rid]);
            }
        }
        $db->commit();
        jsonResponse(true, 'Roles actualizados correctamente.');
    } catch (Throwable $e) {
        $db->rollBack();
        jsonResponse(false, 'Error al guardar roles.', [], 500);
    }
}
