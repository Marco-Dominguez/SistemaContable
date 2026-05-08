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
    // specific action routes first
    $method === 'POST'   && $action === 'upload' && $id             => uploadFile($user, $id),
    $method === 'GET'    && $action === 'stats'                     => getStats($user),
    $method === 'POST'   && $action === 'generar'                   => generarObligaciones($user),
    $method === 'GET'    && !$id && !$action                        => getDeclaraciones($user),
    $method === 'GET'    && $id  && !$action                        => getDeclaracion($user, $id),
    $method === 'POST'   && !$action                                => createDeclaracion($user),
    $method === 'PUT'    && $id  && !$action                        => updateDeclaracion($user, $id),
    $method === 'DELETE' && $id  && !$action                        => deleteDeclaracion($user, $id),
    default => jsonResponse(false, 'Ruta no encontrada.', [], 404),
};

// listar declaraciones
function getDeclaraciones(array $user): void {
    requirePermission($user['usuario_id'], 'declaraciones', 'ver');
    $db = Database::getInstance();

    $clienteId = getClienteIdForUser($user['usuario_id']);
    $isClientOnly = !hasPermission($user['usuario_id'], 'declaraciones', 'editar');

    // usuario con rol cliente sin cuenta vinculada
    if ($isClientOnly && !$clienteId) {
        jsonResponse(true, 'OK', ['declaraciones' => []]);
        return;
    }

    $params = [];
    $wheres = [];

    if ($clienteId) {
        $wheres[] = 'd.cliente_id = :cid';
        $params[':cid'] = $clienteId;
    }

    // filtros opcionales del query string
    $estatus = $_GET['estatus'] ?? '';
    $mes     = isset($_GET['mes'])  ? (int)$_GET['mes']  : null;
    $anio    = isset($_GET['anio']) ? (int)$_GET['anio'] : null;
    $cliente = isset($_GET['cliente_id']) ? (int)$_GET['cliente_id'] : null;

    if ($estatus) { $wheres[] = 'd.estatus = :est';       $params[':est']  = $estatus; }
    if ($mes)     { $wheres[] = 'd.periodo_mes = :mes';   $params[':mes']  = $mes;     }
    if ($anio)    { $wheres[] = 'd.periodo_anio = :anio'; $params[':anio'] = $anio;    }
    if ($cliente && !$clienteId) { $wheres[] = 'd.cliente_id = :cid2'; $params[':cid2'] = $cliente; }

    $where = $wheres ? 'WHERE ' . implode(' AND ', $wheres) : '';

    $stmt = $db->prepare("
        SELECT d.*, c.rfc, c.razon_social, o.clave AS obligacion_clave, o.nombre AS obligacion_nombre
        FROM declaraciones d
        JOIN clientes c     ON c.id = d.cliente_id
        JOIN obligaciones o ON o.id = d.obligacion_id
        $where
        ORDER BY d.periodo_anio DESC, d.periodo_mes DESC, c.razon_social ASC
    ");
    $stmt->execute($params);
    jsonResponse(true, 'OK', ['declaraciones' => $stmt->fetchAll()]);
}

// detalle de una declaración
function getDeclaracion(array $user, int $id): void {
    requirePermission($user['usuario_id'], 'declaraciones', 'ver');
    $db   = Database::getInstance();
    $stmt = $db->prepare('
        SELECT d.*, c.rfc, c.razon_social, o.clave AS obligacion_clave, o.nombre AS obligacion_nombre
        FROM declaraciones d
        JOIN clientes c     ON c.id = d.cliente_id
        JOIN obligaciones o ON o.id = d.obligacion_id
        WHERE d.id = :id
    ');
    $stmt->execute([':id' => $id]);
    $decl = $stmt->fetch();
    if (!$decl) jsonResponse(false, 'Declaración no encontrada.', [], 404);

    // si es cliente, verificar que la declaración le pertenece
    $clienteId = getClienteIdForUser($user['usuario_id']);
    $isClientOnly = !hasPermission($user['usuario_id'], 'declaraciones', 'editar');
    if ($isClientOnly) {
        if (!$clienteId || (int)$decl['cliente_id'] !== $clienteId) {
            jsonResponse(false, 'No tienes acceso a esta declaración.', [], 403);
        }
    }

    jsonResponse(true, 'OK', ['declaracion' => $decl]);
}

// crear declaracion
function createDeclaracion(array $user): void {
    requirePermission($user['usuario_id'], 'declaraciones', 'crear');
    $body = getJsonBody();

    $cliente_id    = (int)($body['cliente_id']    ?? 0);
    $obligacion_id = (int)($body['obligacion_id'] ?? 0);
    $periodo_mes   = (int)($body['periodo_mes']   ?? 0);
    $periodo_anio  = (int)($body['periodo_anio']  ?? 0);
    $estatus       = trim($body['estatus']        ?? 'Pendiente');
    $fecha_limite  = trim($body['fecha_limite']   ?? '');
    $importe       = (float)($body['importe_a_pagar'] ?? 0);
    $saldo         = (float)($body['saldo_a_favor']   ?? 0);
    $observaciones = trim($body['observaciones']  ?? '');

    if (!$cliente_id)    jsonResponse(false, 'El cliente es requerido.', [], 422);
    if (!$obligacion_id) jsonResponse(false, 'La obligación es requerida.', [], 422);
    if ($periodo_mes < 1 || $periodo_mes > 12) jsonResponse(false, 'El mes debe estar entre 1 y 12.', [], 422);
    if ($periodo_anio < 2020)                  jsonResponse(false, 'El año no es válido.', [], 422);
    if ($importe < 0)   jsonResponse(false, 'El importe a pagar no puede ser negativo.', [], 422);
    if ($saldo < 0)     jsonResponse(false, 'El saldo a favor no puede ser negativo.', [], 422);

    $db = Database::getInstance();
    try {
        $stmt = $db->prepare('
            INSERT INTO declaraciones (cliente_id, obligacion_id, periodo_mes, periodo_anio, estatus, fecha_limite, importe_a_pagar, saldo_a_favor, observaciones)
            VALUES (:cid, :oid, :mes, :anio, :est, :fl, :imp, :sf, :obs)
        ');
        $stmt->execute([
            ':cid'  => $cliente_id,    ':oid' => $obligacion_id,
            ':mes'  => $periodo_mes,   ':anio'=> $periodo_anio,
            ':est'  => $estatus,       ':fl'  => $fecha_limite ?: null,
            ':imp'  => $importe,       ':sf'  => $saldo,
            ':obs'  => $observaciones,
        ]);
        $newId = (int)$db->lastInsertId();

        // notificar al cliente si tiene usuario
        notifyClienteDeclaracion($db, $cliente_id, $periodo_mes, $periodo_anio, 'creada');

        jsonResponse(true, 'Declaración creada correctamente.', ['id' => $newId], 201);
    } catch (PDOException $e) {
        if ($e->errorInfo[1] === 1062) jsonResponse(false, 'Ya existe una declaración para ese cliente, obligación y periodo.', [], 409);
        throw $e;
    }
}

// actualizar declaracion
function updateDeclaracion(array $user, int $id): void {
    requirePermission($user['usuario_id'], 'declaraciones', 'editar');
    $body = getJsonBody();

    $db    = Database::getInstance();
    $check = $db->prepare('SELECT id, cliente_id, estatus AS old_estatus FROM declaraciones WHERE id = :id');
    $check->execute([':id' => $id]);
    $existing = $check->fetch();
    if (!$existing) jsonResponse(false, 'Declaración no encontrada.', [], 404);

    $sets   = [];
    $params = [':id' => $id];

    $fields = ['estatus','fecha_limite','fecha_presentacion','fecha_pago','importe_a_pagar','saldo_a_favor','observaciones'];
    foreach ($fields as $f) {
        if (isset($body[$f])) {
            $sets[] = "$f = :$f";
            $params[":$f"] = $body[$f] === '' ? null : $body[$f];
        }
    }

    if (empty($sets)) jsonResponse(false, 'No hay datos para actualizar.', [], 422);

    $db->prepare('UPDATE declaraciones SET ' . implode(', ', $sets) . ' WHERE id = :id')->execute($params);

    // notificar cambio de estatus
    $newEstatus = $body['estatus'] ?? null;
    if ($newEstatus && $newEstatus !== $existing['old_estatus']) {
        if ($newEstatus === 'Para Pago') {
            notifyClienteDeclaracion($db, $existing['cliente_id'], 0, 0, 'para_pago', $id);
        }
    }

    jsonResponse(true, 'Declaración actualizada correctamente.');
}

// eliminar declaracion
function deleteDeclaracion(array $user, int $id): void {
    requirePermission($user['usuario_id'], 'declaraciones', 'eliminar');
    $db    = Database::getInstance();
    $check = $db->prepare('SELECT id FROM declaraciones WHERE id = :id');
    $check->execute([':id' => $id]);
    if (!$check->fetch()) jsonResponse(false, 'Declaración no encontrada.', [], 404);

    $db->prepare('DELETE FROM declaraciones WHERE id = :id')->execute([':id' => $id]);
    jsonResponse(true, 'Declaración eliminada correctamente.');
}

// subir archivos
function uploadFile(array $user, int $declId): void {
    $db    = Database::getInstance();
    $check = $db->prepare('SELECT id, cliente_id FROM declaraciones WHERE id = :id');
    $check->execute([':id' => $declId]);
    $decl = $check->fetch();
    if (!$decl) jsonResponse(false, 'Declaración no encontrada.', [], 404);

    $tipo = $_GET['tipo'] ?? ''; // acuse | linea_captura | comprobante_pago
    $validTypes = ['acuse', 'linea_captura', 'comprobante_pago'];
    if (!in_array($tipo, $validTypes)) jsonResponse(false, 'Tipo de archivo no válido (acuse, linea_captura, comprobante_pago).', [], 422);

    // para comprobante_pago permiso "ver" (el cliente), para los demás "editar" (solo el contador)
    if ($tipo === 'comprobante_pago') {
        requirePermission($user['usuario_id'], 'declaraciones', 'ver');
        // si es cliente, verificar que la declaración le pertenece
        $clienteId = getClienteIdForUser($user['usuario_id']);
        if (!hasPermission($user['usuario_id'], 'declaraciones', 'editar')) {
            if (!$clienteId || (int)$decl['cliente_id'] !== $clienteId) {
                jsonResponse(false, 'No tienes acceso a esta declaración.', [], 403);
            }
        }
    } else {
        requirePermission($user['usuario_id'], 'declaraciones', 'editar');
    }

    if (!isset($_FILES['archivo'])) {
        jsonResponse(false, 'No se recibió ningún archivo.', [], 422);
    }
    $uploadError = $_FILES['archivo']['error'];
    if ($uploadError !== UPLOAD_ERR_OK) {
        $phpErrors = [
            UPLOAD_ERR_INI_SIZE   => 'El archivo excede el límite de tamaño configurado en el servidor.',
            UPLOAD_ERR_FORM_SIZE  => 'El archivo excede el límite de tamaño del formulario.',
            UPLOAD_ERR_PARTIAL    => 'El archivo se recibió de forma parcial. Intenta de nuevo.',
            UPLOAD_ERR_NO_FILE    => 'No se seleccionó ningún archivo.',
            UPLOAD_ERR_NO_TMP_DIR => 'Error de configuración del servidor: directorio temporal no disponible.',
            UPLOAD_ERR_CANT_WRITE => 'Error de configuración del servidor: no se pudo escribir el archivo temporal.',
            UPLOAD_ERR_EXTENSION  => 'Una extensión de PHP detuvo la subida del archivo.',
        ];
        jsonResponse(false, $phpErrors[$uploadError] ?? 'Error desconocido al recibir el archivo.', [], 422);
    }

    $file     = $_FILES['archivo'];
    $ext      = strtolower(pathinfo($file['name'], PATHINFO_EXTENSION));
    $allowed  = ['pdf', 'png', 'jpg', 'jpeg'];
    if (!in_array($ext, $allowed)) jsonResponse(false, 'Solo se permiten archivos PDF, PNG o JPG.', [], 422);
    if ($file['size'] > 10 * 1024 * 1024) jsonResponse(false, 'El archivo excede el tamaño máximo de 10 MB.', [], 422);

    $uploadDir = __DIR__ . '/../../uploads/declaraciones/' . $declId;
    if (!is_dir($uploadDir) && !mkdir($uploadDir, 0755, true)) {
        jsonResponse(false, 'No se pudo crear el directorio de almacenamiento. Verifica los permisos del servidor.', [], 500);
    }

    $filename = $tipo . '_' . time() . '.' . $ext;
    $destPath = $uploadDir . '/' . $filename;

    if (!move_uploaded_file($file['tmp_name'], $destPath)) {
        jsonResponse(false, 'Error al guardar el archivo en el servidor.', [], 500);
    }

    $relPath = '/uploads/declaraciones/' . $declId . '/' . $filename;
    $column  = $tipo . '_url';

    $db->prepare("UPDATE declaraciones SET {$column} = :url WHERE id = :id")->execute([':url' => $relPath, ':id' => $declId]);

    // si es comprobante de pago, marcar como "Pagada" y notificar al contador
    if ($tipo === 'comprobante_pago') {
        $db->prepare('UPDATE declaraciones SET estatus = :e, fecha_pago = CURDATE() WHERE id = :id')
           ->execute([':e' => 'Pagada', ':id' => $declId]);

        // notificar contadores (todos con permiso de editar declaraciones)
        notifyContadoresComprobante($db, $decl['cliente_id'], $declId);
    }

    // si se sube línea de captura, cambiar estatus a "Para Pago" y notificar cliente
    if ($tipo === 'linea_captura') {
        $db->prepare('UPDATE declaraciones SET estatus = :e WHERE id = :id AND estatus IN ("Pendiente","En Proceso")')
           ->execute([':e' => 'Para Pago', ':id' => $declId]);
        notifyClienteDeclaracion($db, $decl['cliente_id'], 0, 0, 'para_pago', $declId);
    }

    jsonResponse(true, 'Archivo subido correctamente.', ['url' => $relPath]);
}

// estadísticas para dashboard
function getStats(array $user): void {
    requirePermission($user['usuario_id'], 'declaraciones', 'ver');
    $db = Database::getInstance();

    $clienteId    = getClienteIdForUser($user['usuario_id']);
    $isClientOnly = !hasPermission($user['usuario_id'], 'declaraciones', 'editar');

    if ($isClientOnly && $clienteId) {
        // cliente: solo sus propias estadísticas
        $p = [':cid' => $clienteId];

        $s = $db->prepare("SELECT COUNT(*) AS cnt FROM declaraciones WHERE cliente_id = :cid"); $s->execute($p);
        $totalDecl = (int)$s->fetch()['cnt'];

        $s = $db->prepare("SELECT COUNT(*) AS cnt FROM declaraciones WHERE cliente_id = :cid AND estatus = 'Pendiente'"); $s->execute($p);
        $pendientes = (int)$s->fetch()['cnt'];

        $s = $db->prepare("SELECT COUNT(*) AS cnt FROM declaraciones WHERE cliente_id = :cid AND estatus = 'Para Pago'"); $s->execute($p);
        $paraPago = (int)$s->fetch()['cnt'];

        $s = $db->prepare("
            SELECT d.id, d.estatus, d.periodo_mes, d.periodo_anio, d.importe_a_pagar,
                   c.razon_social, o.nombre AS obligacion_nombre, o.clave AS obligacion_clave
            FROM declaraciones d
            JOIN clientes c     ON c.id = d.cliente_id
            JOIN obligaciones o ON o.id = d.obligacion_id
            WHERE d.cliente_id = :cid
            ORDER BY d.updated_at DESC LIMIT 10
        ");
        $s->execute($p);
        $recientes = $s->fetchAll();

        jsonResponse(true, 'OK', [
            'total_clientes'      => 1,
            'total_declaraciones' => $totalDecl,
            'pendientes'          => $pendientes,
            'para_pago'           => $paraPago,
            'recientes'           => $recientes,
        ]);
        return;
    }

    // admin / contador: datos globales
    $totalClientes = (int)$db->query('SELECT COUNT(*) AS cnt FROM clientes WHERE activo=1')->fetch()['cnt'];
    $totalDecl     = (int)$db->query('SELECT COUNT(*) AS cnt FROM declaraciones')->fetch()['cnt'];
    $pendientes    = (int)$db->query("SELECT COUNT(*) AS cnt FROM declaraciones WHERE estatus = 'Pendiente'")->fetch()['cnt'];
    $paraPago      = (int)$db->query("SELECT COUNT(*) AS cnt FROM declaraciones WHERE estatus = 'Para Pago'")->fetch()['cnt'];

    $recientes = $db->query("
        SELECT d.id, d.estatus, d.periodo_mes, d.periodo_anio, d.importe_a_pagar,
               c.razon_social, o.nombre AS obligacion_nombre, o.clave AS obligacion_clave
        FROM declaraciones d
        JOIN clientes c     ON c.id = d.cliente_id
        JOIN obligaciones o ON o.id = d.obligacion_id
        ORDER BY d.updated_at DESC
        LIMIT 10
    ")->fetchAll();

    jsonResponse(true, 'OK', [
        'total_clientes'      => $totalClientes,
        'total_declaraciones' => $totalDecl,
        'pendientes'          => $pendientes,
        'para_pago'           => $paraPago,
        'recientes'           => $recientes,
    ]);
}

// generar obligaciones del mes
function generarObligaciones(array $user): void {
    requirePermission($user['usuario_id'], 'declaraciones', 'crear');
    $body = getJsonBody();
    $mes  = (int)($body['mes']  ?? date('n'));
    $anio = (int)($body['anio'] ?? date('Y'));

    if ($mes < 1 || $mes > 12) jsonResponse(false, 'Mes no válido.', [], 422);

    $db = Database::getInstance();

    // obtener todos los clientes activos con sus obligaciones
    $stmt = $db->query("
        SELECT c.id AS cliente_id, o.id AS obligacion_id, o.periodicidad
        FROM clientes c
        JOIN cliente_regimenes cr ON cr.cliente_id = c.id
        JOIN regimen_obligaciones ro ON ro.regimen_id = cr.regimen_id
        JOIN obligaciones o ON o.id = ro.obligacion_id AND o.activo = 1
        WHERE c.activo = 1
        GROUP BY c.id, o.id, o.periodicidad
    ");
    $rows = $stmt->fetchAll();

    $created = 0;
    $skipped = 0;
    $ins = $db->prepare('
        INSERT IGNORE INTO declaraciones (cliente_id, obligacion_id, periodo_mes, periodo_anio, estatus)
        VALUES (:cid, :oid, :mes, :anio, "Pendiente")
    ');

    foreach ($rows as $r) {
        // solo generar si la periodicidad corresponde
        if ($r['periodicidad'] === 'Anual' && $mes !== 3) { $skipped++; continue; }
        if ($r['periodicidad'] === 'Bimestral' && $mes % 2 !== 0) { $skipped++; continue; }

        $ins->execute([':cid' => $r['cliente_id'], ':oid' => $r['obligacion_id'], ':mes' => $mes, ':anio' => $anio]);
        if ($ins->rowCount() > 0) $created++;
        else $skipped++;
    }

    jsonResponse(true, "Se generaron $created declaraciones ($skipped ya existían o no aplican).", [
        'creadas' => $created, 'omitidas' => $skipped,
    ]);
}

// helpers
function getClienteIdForUser(int $userId): ?int {
    $db   = Database::getInstance();
    $stmt = $db->prepare('SELECT id FROM clientes WHERE usuario_id = :uid');
    $stmt->execute([':uid' => $userId]);
    $row = $stmt->fetch();
    return $row ? (int)$row['id'] : null;
}

function notifyClienteDeclaracion(PDO $db, int $clienteId, int $mes, int $anio, string $tipo, ?int $declId = null): void {
    $stmt = $db->prepare('SELECT usuario_id FROM clientes WHERE id = :cid AND usuario_id IS NOT NULL');
    $stmt->execute([':cid' => $clienteId]);
    $cli = $stmt->fetch();
    if (!$cli) return;

    $meses = ['','Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
    $mesNombre = $meses[$mes] ?? '';

    switch ($tipo) {
        case 'creada':
            $titulo  = 'Nueva declaración registrada';
            $mensaje = "Se ha registrado una nueva declaración para el periodo $mesNombre $anio.";
            $nTipo   = 'info';
            break;
        case 'para_pago':
            $titulo  = 'Declaración lista para pago';
            $mensaje = "Tu declaración #$declId tiene una línea de captura lista. Por favor realiza el pago y sube tu comprobante.";
            $nTipo   = 'warning';
            break;
        default:
            return;
    }

    $db->prepare('INSERT INTO notificaciones (usuario_id, titulo, mensaje, tipo) VALUES (:uid, :t, :m, :tp)')
       ->execute([':uid' => $cli['usuario_id'], ':t' => $titulo, ':m' => $mensaje, ':tp' => $nTipo]);
}

function notifyContadoresComprobante(PDO $db, int $clienteId, int $declId): void {
    // obtener nombre del cliente
    $cliStmt = $db->prepare('SELECT razon_social FROM clientes WHERE id = :cid');
    $cliStmt->execute([':cid' => $clienteId]);
    $cli = $cliStmt->fetch();
    $nombre = $cli['razon_social'] ?? 'Cliente';

    // contadores = usuarios con permiso editar en declaraciones
    $stmt = $db->query("
        SELECT DISTINCT ur.usuario_id
        FROM usuario_roles ur
        JOIN rol_modulo_acciones rma ON rma.rol_id = ur.rol_id
        JOIN modulo_acciones ma ON ma.id = rma.modulo_accion_id
        JOIN modulos m ON m.id = ma.modulo_id AND m.slug = 'declaraciones'
        JOIN acciones a ON a.id = ma.accion_id AND a.slug = 'editar'
    ");
    foreach ($stmt->fetchAll() as $row) {
        $db->prepare('INSERT INTO notificaciones (usuario_id, titulo, mensaje, tipo) VALUES (:uid, :t, :m, :tp)')
           ->execute([
               ':uid' => $row['usuario_id'],
               ':t'   => 'Comprobante de pago recibido',
               ':m'   => "$nombre subió el comprobante de pago de la declaración #$declId.",
               ':tp'  => 'success',
           ]);
    }
}
