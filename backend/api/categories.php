<?php

declare(strict_types=1);

require_once __DIR__ . '/../includes/bootstrap.php';

if (request_method() !== 'GET') {
    json_error('Method not allowed.', 405);
}

$stmt = db()->query('SELECT category_id, category_name, description FROM categories ORDER BY category_name');
$rows = $stmt->fetchAll();

json_ok([
    'categories' => array_map(static function (array $row): array {
        return [
            'id' => (int) $row['category_id'],
            'name' => $row['category_name'],
            'description' => $row['description'],
        ];
    }, $rows),
]);
