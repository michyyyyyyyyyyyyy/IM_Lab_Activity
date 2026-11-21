<?php
/**
 * Shared bootstrap: session, PDO connection, helpers.
 */

declare(strict_types=1);

$origin = $_SERVER['HTTP_ORIGIN'] ?? '';
if (preg_match('#^https?://(localhost|127\.0\.0\.1)(:\d+)?$#', $origin)) {
    header('Access-Control-Allow-Origin: ' . $origin);
    header('Access-Control-Allow-Credentials: true');
    header('Access-Control-Allow-Headers: Content-Type, Accept');
    header('Access-Control-Allow-Methods: GET, POST, PUT, PATCH, DELETE, OPTIONS');
    header('Vary: Origin');
}

if (strtoupper($_SERVER['REQUEST_METHOD'] ?? 'GET') === 'OPTIONS') {
    http_response_code(204);
    exit;
}

if (session_status() !== PHP_SESSION_ACTIVE) {
    session_set_cookie_params([
        'lifetime' => 0,
        'path' => '/',
        'httponly' => true,
        'samesite' => 'Lax',
    ]);
    session_start();
}

header('X-Content-Type-Options: nosniff');

function db(): PDO
{
    static $pdo = null;
    if ($pdo instanceof PDO) {
        return $pdo;
    }

    $config = require __DIR__ . '/../config/database.php';
    $dsn = sprintf(
        'mysql:host=%s;port=%s;dbname=%s;charset=%s',
        $config['host'],
        $config['port'],
        $config['name'],
        $config['charset']
    );

    try {
        $pdo = new PDO($dsn, $config['user'], $config['pass'], [
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
            PDO::ATTR_EMULATE_PREPARES => false,
        ]);
    } catch (PDOException $e) {
        json_error('Database connection failed. Check config/database.php and import the SQL schema.', 500, [
            'detail' => $e->getMessage(),
        ]);
    }

    return $pdo;
}

require_once __DIR__ . '/response.php';
require_once __DIR__ . '/validators.php';
require_once __DIR__ . '/auth.php';
