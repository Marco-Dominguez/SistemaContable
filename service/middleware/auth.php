<?php
require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../config/app.php';

// valida el token de sesión enviado en el header Authorization
function requireAuth(): array {
    $headers = getallheaders();
    $authHeader = $headers['Authorization'] ?? $headers['authorization'] ?? '';

    if (!preg_match('/^Bearer\s+(.+)$/i', $authHeader, $matches)) {
        jsonResponse(false, 'Token de autenticación requerido.', [], 401);
    }

    $token = trim($matches[1]);
    $db    = Database::getInstance();

    $stmt = $db->prepare('
        SELECT s.usuario_id, s.expires_at,
               u.nombre, u.apellidos, u.email, u.activo
        FROM sesiones s
        JOIN usuarios u ON u.id = s.usuario_id
        WHERE s.token = :token
    ');
    $stmt->execute([':token' => $token]);
    $session = $stmt->fetch();

    if (!$session) {
        jsonResponse(false, 'Sesión inválida o expirada.', [], 401);
    }

    if (new DateTime() > new DateTime($session['expires_at'])) {
        // borrar la sesión expirada
        $db->prepare('DELETE FROM sesiones WHERE token = :t')->execute([':t' => $token]);
        jsonResponse(false, 'La sesión ha expirado. Por favor inicia sesión nuevamente.', [], 401);
    }

    if (!$session['activo']) {
        jsonResponse(false, 'Tu cuenta está desactivada. Contacta al administrador.', [], 403);
    }

    return [
        'usuario_id' => (int) $session['usuario_id'],
        'nombre'     => $session['nombre'],
        'apellidos'  => $session['apellidos'],
        'email'      => $session['email'],
    ];
}

// valida si el usuario tiene permiso para la accion
function requirePermission(int $usuarioId, string $moduloSlug, string $accionSlug): void {
    $db   = Database::getInstance();
    $stmt = $db->prepare('
        SELECT COUNT(*) AS cnt
        FROM usuario_roles ur
        JOIN rol_modulo_acciones rma ON rma.rol_id     = ur.rol_id
        JOIN modulo_acciones     ma  ON ma.id           = rma.modulo_accion_id
        JOIN modulos             m   ON m.id            = ma.modulo_id  AND m.slug = :modulo
        JOIN acciones            a   ON a.id            = ma.accion_id  AND a.slug = :accion
        WHERE ur.usuario_id = :uid
    ');
    $stmt->execute([':uid' => $usuarioId, ':modulo' => $moduloSlug, ':accion' => $accionSlug]);
    $row = $stmt->fetch();

    if ((int)($row['cnt'] ?? 0) === 0) {
        jsonResponse(false, 'No tienes permiso para realizar esta acción.', [], 403);
    }
}

// retorna todos los permisos asignados a un usuario específico
function getUserPermissions(int $usuarioId): array {
    $db   = Database::getInstance();
    $stmt = $db->prepare('
        SELECT m.slug AS modulo, a.slug AS accion
        FROM usuario_roles ur
        JOIN rol_modulo_acciones rma ON rma.rol_id           = ur.rol_id
        JOIN modulo_acciones     ma  ON ma.id                = rma.modulo_accion_id
        JOIN modulos             m   ON m.id                 = ma.modulo_id
        JOIN acciones            a   ON a.id                 = ma.accion_id
        WHERE ur.usuario_id = :uid
        GROUP BY m.slug, a.slug
    ');
    $stmt->execute([':uid' => $usuarioId]);
    $rows = $stmt->fetchAll();

    $perms = [];
    foreach ($rows as $row) {
        $perms[$row['modulo']][] = $row['accion'];
    }
    return $perms;
}
