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
    // regímenes del cliente
    $method === 'GET'  && $action === 'regimenes' && $id  => getClienteRegimenes($user, $id),
    $method === 'POST' && $action === 'regimenes' && $id  => setClienteRegimenes($user, $id),
    $method === 'GET'    && !$id && !$action            => getClientes($user),
    $method === 'GET'    && $id  && !$action            => getCliente($user, $id),
    $method === 'POST'   && !$action                    => createCliente($user),
    $method === 'PUT'    && $id  && !$action            => updateCliente($user, $id),
    $method === 'DELETE' && $id  && !$action            => deleteCliente($user, $id),
    default => jsonResponse(false, 'Ruta no encontrada.', [], 404),
};

// obtener clientes
function getClientes(array $user): void {
    requirePermission($user['usuario_id'], 'clientes', 'ver');
    $db   = Database::getInstance();
    $stmt = $db->query('
        SELECT c.id, c.rfc, c.razon_social, c.email, c.telefono, c.activo, c.created_at,
               c.usuario_id,
               GROUP_CONCAT(rf.nombre ORDER BY rf.clave SEPARATOR ", ") AS regimenes
        FROM clientes c
        LEFT JOIN cliente_regimenes cr ON cr.cliente_id = c.id
        LEFT JOIN regimenes_fiscales rf ON rf.id = cr.regimen_id
        GROUP BY c.id
        ORDER BY c.razon_social ASC
    ');
    jsonResponse(true, 'OK', ['clientes' => $stmt->fetchAll()]);
}

// detalles del cliente por id
function getCliente(array $user, int $id): void {
    requirePermission($user['usuario_id'], 'clientes', 'ver');
    $db   = Database::getInstance();
    $stmt = $db->prepare('SELECT * FROM clientes WHERE id = :id');
    $stmt->execute([':id' => $id]);
    $cli = $stmt->fetch();
    if (!$cli) jsonResponse(false, 'Cliente no encontrado.', [], 404);
    jsonResponse(true, 'OK', ['cliente' => $cli]);
}

// crear cliente
function createCliente(array $user): void {
    requirePermission($user['usuario_id'], 'clientes', 'crear');
    $body = getJsonBody();

    $rfc          = strtoupper(trim($body['rfc']           ?? ''));
    $razon_social = trim($body['razon_social']             ?? '');
    $email        = trim($body['email']                    ?? '');
    $telefono     = trim($body['telefono']                 ?? '');
    $direccion    = trim($body['direccion']                ?? '');
    $crearUsuario = !empty($body['crear_usuario']);
    $password     = trim($body['password']                 ?? '');

    $errors = [];
    if (!$rfc || !preg_match('/^[A-ZÑ&]{3,4}\d{6}[A-Z0-9]{3}$/', $rfc)) $errors[] = 'RFC no válido.';
    if (!$razon_social) $errors[] = 'La razón social es requerida.';
    if ($email && !filter_var($email, FILTER_VALIDATE_EMAIL)) $errors[] = 'Correo no válido.';
    if ($crearUsuario && strlen($password) < 8) $errors[] = 'La contraseña debe tener al menos 8 caracteres.';
    if ($crearUsuario && !$email) $errors[] = 'El correo es requerido para crear usuario.';
    if ($errors) jsonResponse(false, implode(' ', $errors), [], 422);

    $db = Database::getInstance();
    $db->beginTransaction();

    try {
        $usuario_id = null;

        // crear usuario ligado al cliente
        if ($crearUsuario) {
            $hash = password_hash($password, PASSWORD_BCRYPT, ['cost' => 12]);
            $ins  = $db->prepare('INSERT INTO usuarios (nombre, apellidos, email, password_hash) VALUES (:n, :a, :e, :h)');
            $ins->execute([':n' => $razon_social, ':a' => '', ':e' => $email, ':h' => $hash]);
            $usuario_id = (int)$db->lastInsertId();

            // asignar rol de cliente
            $rolStmt = $db->prepare('SELECT id FROM roles WHERE nombre = :nombre');
            $rolStmt->execute([':nombre' => 'Cliente']);
            $rolCliente = $rolStmt->fetch();
            if ($rolCliente) {
                $db->prepare('INSERT INTO usuario_roles (usuario_id, rol_id) VALUES (:uid, :rid)')
                   ->execute([':uid' => $usuario_id, ':rid' => $rolCliente['id']]);
            }
        }

        $stmt = $db->prepare('
            INSERT INTO clientes (usuario_id, rfc, razon_social, email, telefono, direccion)
            VALUES (:uid, :rfc, :rs, :em, :tel, :dir)
        ');
        $stmt->execute([
            ':uid' => $usuario_id, ':rfc' => $rfc, ':rs' => $razon_social,
            ':em' => $email, ':tel' => $telefono, ':dir' => $direccion,
        ]);
        $clienteId = (int)$db->lastInsertId();
        $db->commit();
        jsonResponse(true, 'Cliente creado correctamente.', ['id' => $clienteId], 201);
    } catch (PDOException $e) {
        $db->rollBack();
        if ($e->errorInfo[1] === 1062) {
            $msg = str_contains($e->getMessage(), 'rfc') ? 'Ya existe un cliente con ese RFC.' : 'Ya existe un registro duplicado.';
            jsonResponse(false, $msg, [], 409);
        }
        throw $e;
    }
}

// actualizar cliente
function updateCliente(array $user, int $id): void {
    requirePermission($user['usuario_id'], 'clientes', 'editar');
    $body = getJsonBody();

    $db    = Database::getInstance();
    $check = $db->prepare('SELECT id FROM clientes WHERE id = :id');
    $check->execute([':id' => $id]);
    if (!$check->fetch()) jsonResponse(false, 'Cliente no encontrado.', [], 404);

    $rfc          = strtoupper(trim($body['rfc']       ?? ''));
    $razon_social = trim($body['razon_social']         ?? '');
    $email        = trim($body['email']                ?? '');
    $telefono     = trim($body['telefono']             ?? '');
    $direccion    = trim($body['direccion']             ?? '');
    $activo       = isset($body['activo']) ? (int)(bool)$body['activo'] : null;

    if (!$rfc || !preg_match('/^[A-ZÑ&]{3,4}\d{6}[A-Z0-9]{3}$/', $rfc)) jsonResponse(false, 'RFC no válido.', [], 422);
    if (!$razon_social) jsonResponse(false, 'La razón social es requerida.', [], 422);

    $sets   = ['rfc = :rfc', 'razon_social = :rs', 'email = :em', 'telefono = :tel', 'direccion = :dir'];
    $params = [':rfc' => $rfc, ':rs' => $razon_social, ':em' => $email, ':tel' => $telefono, ':dir' => $direccion, ':id' => $id];
    if ($activo !== null) { $sets[] = 'activo = :a'; $params[':a'] = $activo; }

    try {
        $db->prepare('UPDATE clientes SET ' . implode(', ', $sets) . ' WHERE id = :id')->execute($params);
        jsonResponse(true, 'Cliente actualizado correctamente.');
    } catch (PDOException $e) {
        if ($e->errorInfo[1] === 1062) jsonResponse(false, 'Ya existe un cliente con ese RFC.', [], 409);
        throw $e;
    }
}

// eliminar cliente
function deleteCliente(array $user, int $id): void {
    requirePermission($user['usuario_id'], 'clientes', 'eliminar');
    $db    = Database::getInstance();
    $check = $db->prepare('SELECT id FROM clientes WHERE id = :id');
    $check->execute([':id' => $id]);
    if (!$check->fetch()) jsonResponse(false, 'Cliente no encontrado.', [], 404);

    $db->prepare('DELETE FROM clientes WHERE id = :id')->execute([':id' => $id]);
    jsonResponse(true, 'Cliente eliminado correctamente.');
}

// obtener regimenes del cliente
function getClienteRegimenes(array $user, int $clienteId): void {
    requirePermission($user['usuario_id'], 'clientes', 'ver');
    $db   = Database::getInstance();
    $all  = $db->query('SELECT id, clave, nombre FROM regimenes_fiscales WHERE activo=1 ORDER BY clave')->fetchAll();
    $stmt = $db->prepare('SELECT regimen_id FROM cliente_regimenes WHERE cliente_id = :cid');
    $stmt->execute([':cid' => $clienteId]);
    $asignados = array_column($stmt->fetchAll(), 'regimen_id');
    jsonResponse(true, 'OK', ['regimenes' => $all, 'asignados' => $asignados]);
}

// asignar regimenes al cliente
function setClienteRegimenes(array $user, int $clienteId): void {
    requirePermission($user['usuario_id'], 'clientes', 'editar');
    $body     = getJsonBody();
    $regIds   = array_map('intval', $body['regimenes'] ?? []);
    $db       = Database::getInstance();

    $db->beginTransaction();
    try {
        $db->prepare('DELETE FROM cliente_regimenes WHERE cliente_id = :cid')->execute([':cid' => $clienteId]);
        if (!empty($regIds)) {
            $ins = $db->prepare('INSERT INTO cliente_regimenes (cliente_id, regimen_id) VALUES (:cid, :rid)');
            foreach ($regIds as $rid) {
                $ins->execute([':cid' => $clienteId, ':rid' => $rid]);
            }
        }
        $db->commit();
        jsonResponse(true, 'Regímenes actualizados correctamente.');
    } catch (Throwable $e) {
        $db->rollBack();
        jsonResponse(false, 'Error al guardar regímenes.', [], 500);
    }
}
