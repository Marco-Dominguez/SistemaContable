<?php
define('APP_NAME',    'Sistema Contable');
define('APP_VERSION', '1.0.0');
define('APP_ENV',     'development'); // 'production' subido en host

// duracion de sesion 8 horas
define('SESSION_TTL', 28800);

// headers CORS y JSON para todas las respuestas
function setCorsHeaders(): void {
    header('Content-Type: application/json; charset=utf-8');
    header('Access-Control-Allow-Origin: *');
    header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
    header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With');

    if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
        http_response_code(204);
        exit;
    }
}

// Respuesta JSON
function jsonResponse(bool $success, string $message, array $data = [], int $code = 200): never {
    http_response_code($code);
    echo json_encode([
        'success' => $success,
        'message' => $message,
        'data'    => $data,
    ], JSON_UNESCAPED_UNICODE);
    exit;
}

// obtener el cuerpo de la solicitud
function getJsonBody(): array {
    $raw = file_get_contents('php://input');
    return json_decode($raw, true) ?? [];
}
