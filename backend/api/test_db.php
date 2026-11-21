<?php
/**
 * Quick connection check for XAMPP / phpMyAdmin setup.
 * Open: http://localhost/IM_Lab_Activity/backend/api/test_db.php
 */

declare(strict_types=1);

header('Content-Type: application/json; charset=utf-8');

try {
    $config = require __DIR__ . '/../config/database.php';
    $dsn = sprintf(
        'mysql:host=%s;port=%s;dbname=%s;charset=%s',
        $config['host'],
        $config['port'],
        $config['name'],
        $config['charset']
    );
    $pdo = new PDO($dsn, $config['user'], $config['pass'], [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
    ]);

    $tables = $pdo->query('SHOW TABLES')->fetchAll(PDO::FETCH_COLUMN);
    $users = (int) $pdo->query('SELECT COUNT(*) FROM users')->fetchColumn();
    $items = (int) $pdo->query('SELECT COUNT(*) FROM item_reports')->fetchColumn();
    $hash = $pdo->query("SELECT password_hash FROM users WHERE email = 'admin@hcdc.edu.ph'")->fetchColumn();

    echo json_encode([
        'success' => true,
        'message' => 'Connected to MySQL via XAMPP.',
        'database' => $config['name'],
        'tables' => $tables,
        'users' => $users,
        'items' => $items,
        'demo_password_ok' => password_verify('Password123', (string) $hash),
    ], JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES);
} catch (Throwable $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => $e->getMessage(),
    ], JSON_PRETTY_PRINT);
}
