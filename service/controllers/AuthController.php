<?php
require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../config/app.php';
require_once __DIR__ . '/../middleware/auth.php';

setCorsHeaders();

$method = $_SERVER['REQUEST_METHOD'];
$action = $_GET['action'] ?? '';

match (true) {
    $method === 'POST' && $action === 'login'   => login(),
    $method === 'POST' && $action === 'logout'  => logout(),
    $method === 'GET'  && $action === 'me'      => me(),
    default => jsonResponse(false, 'Ruta no encontrada.', [], 404),
};

// login con email y password, devuelve token de sesión
function login(): void {
    $body  = getJsonBody();
    $email = trim($body['email'] ?? '');
    $pass  = trim($body['password'] ?? '');

    if (!$email || !$pass) {
        jsonResponse(false, 'El correo y contraseña son requeridos.', [], 422);
    }

    $db   = Database::getInstance();
    $stmt = $db->prepare('SELECT id, nombre, apellidos, email, password_hash, activo FROM usuarios WHERE email = :email');
    $stmt->execute([':email' => $email]);
    $user = $stmt->fetch();

    if (!$user || !password_verify($pass, $user['password_hash'])) {
        jsonResponse(false, 'Credenciales incorrectas.', [], 401);
    }

    if (!$user['activo']) {
        jsonResponse(false, 'Tu cuenta está desactivada. Contacta al administrador.', [], 403);
    }

    // generar token
    $token     = bin2hex(random_bytes(40));
    $expiresAt = (new DateTime())->modify('+' . SESSION_TTL . ' seconds')->format('Y-m-d H:i:s');
    $ip        = $_SERVER['REMOTE_ADDR'] ?? '';
    $ua        = $_SERVER['HTTP_USER_AGENT'] ?? '';

    // elmininar sesiones anteriores del usuario para evitar multi sesion
    $db->prepare('DELETE FROM sesiones WHERE usuario_id = :uid')->execute([':uid' => $user['id']]);

    $ins = $db->prepare('
        INSERT INTO sesiones (usuario_id, token, ip, user_agent, expires_at)
        VALUES (:uid, :token, :ip, :ua, :exp)
    ');
    $ins->execute([
        ':uid'   => $user['id'],
        ':token' => $token,
        ':ip'    => $ip,
        ':ua'    => $ua,
        ':exp'   => $expiresAt,
    ]);

    // actualizar último login
    $db->prepare('UPDATE usuarios SET ultimo_login = NOW() WHERE id = :id')->execute([':id' => $user['id']]);

    // obtener permisos
    $permisos = getUserPermissions((int)$user['id']);

    // obtener roles del usuario
    $roleStmt = $db->prepare('
        SELECT r.nombre FROM roles r
        JOIN usuario_roles ur ON ur.rol_id = r.id
        WHERE ur.usuario_id = :uid
    ');
    $roleStmt->execute([':uid' => $user['id']]);
    $roles = array_column($roleStmt->fetchAll(), 'nombre');

    jsonResponse(true, 'Sesión iniciada correctamente.', [
        'token'      => $token,
        'expires_at' => $expiresAt,
        'usuario'    => [
            'id'       => $user['id'],
            'nombre'   => $user['nombre'],
            'apellidos'=> $user['apellidos'],
            'email'    => $user['email'],
            'roles'    => $roles,
            'permisos' => $permisos,
        ],
    ]);
}

// logout, elimina la sesión activa
function logout(): void {
    $headers    = getallheaders();
    $authHeader = $headers['Authorization'] ?? $headers['authorization'] ?? '';

    if (preg_match('/^Bearer\s+(.+)$/i', $authHeader, $m)) {
        Database::getInstance()
            ->prepare('DELETE FROM sesiones WHERE token = :t')
            ->execute([':t' => trim($m[1])]);
    }
    jsonResponse(true, 'Sesión cerrada correctamente.');
}

// devuelve los datos del usuario autenticado, roles y permisos
function me(): void {
    $user     = requireAuth();
    $db       = Database::getInstance();
    $permisos = getUserPermissions($user['usuario_id']);

    $roleStmt = $db->prepare('
        SELECT r.id, r.nombre FROM roles r
        JOIN usuario_roles ur ON ur.rol_id = r.id
        WHERE ur.usuario_id = :uid
    ');
    $roleStmt->execute([':uid' => $user['usuario_id']]);
    $roles = $roleStmt->fetchAll();

    jsonResponse(true, 'OK', [
        'usuario'  => $user,
        'roles'    => $roles,
        'permisos' => $permisos,
    ]);
}
