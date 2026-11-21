<?php

declare(strict_types=1);

require_once __DIR__ . '/../includes/bootstrap.php';
require_once __DIR__ . '/../includes/items.php';

$method = request_method();

if ($method === 'GET') {
    handle_items_get();
}

if ($method === 'POST') {
    handle_items_create();
}

if ($method === 'PUT' || $method === 'PATCH') {
    handle_items_update();
}

if ($method === 'DELETE') {
    handle_items_delete();
}

json_error('Method not allowed.', 405);

function handle_items_get(): void
{
    $input = $_GET;
    $itemId = parse_item_id($input['id'] ?? null);

    if ($itemId !== null) {
        $item = fetch_item_by_id($itemId);
        if (!$item) {
            json_error('Item not found.', 404);
        }
        json_ok(['item' => $item]);
    }

    $where = ['i.status <> \'archived\''];
    $params = [];

    $q = clean_string((string) ($input['q'] ?? ''));
    if ($q !== '') {
        $where[] = '(i.item_name LIKE ? OR i.location LIKE ? OR c.category_name LIKE ? OR i.description LIKE ?)';
        $like = '%' . $q . '%';
        array_push($params, $like, $like, $like, $like);
    }

    $type = clean_string((string) ($input['type'] ?? 'all'));
    if ($type !== '' && $type !== 'all') {
        if (!in_array($type, allowed_report_types(), true)) {
            json_error('Invalid report type.', 422, ['type' => 'Must be lost or found.']);
        }
        $where[] = 'i.report_type = ?';
        $params[] = $type;
    }

    $category = clean_string((string) ($input['category'] ?? 'all'));
    if ($category !== '' && $category !== 'all') {
        $categoryId = resolve_category_id($category);
        if (!$categoryId) {
            json_error('Unknown category.', 422, ['category' => 'Category not found.']);
        }
        $where[] = 'i.category_id = ?';
        $params[] = $categoryId;
    }

    $date = clean_string((string) ($input['date'] ?? ''));
    if ($date !== '') {
        if (!validate_date($date)) {
            json_error('Invalid date.', 422, ['date' => 'Use YYYY-MM-DD.']);
        }
        $where[] = 'i.date_lost_found = ?';
        $params[] = $date;
    }

    $mine = filter_var($input['mine'] ?? false, FILTER_VALIDATE_BOOLEAN);
    if ($mine) {
        $user = require_login();
        $where[] = 'i.user_id = ?';
        $params[] = $user['id'];
    }

    $ownerId = $input['ownerId'] ?? null;
    if ($ownerId !== null && $ownerId !== '') {
        $where[] = 'i.user_id = ?';
        $params[] = (int) $ownerId;
    }

    $status = clean_string((string) ($input['status'] ?? ''));
    if ($status !== '' && $status !== 'all') {
        if (!in_array($status, allowed_item_statuses(), true)) {
            json_error('Invalid status.', 422);
        }
        $where[] = 'i.status = ?';
        $params[] = $status;
    }

    // Public browse: only show items staff have approved (plus claimed/returned).
    $public = filter_var($input['public'] ?? false, FILTER_VALIDATE_BOOLEAN);
    if ($public) {
        $where[] = 'i.status IN (\'approved\', \'claimed\', \'returned\')';
    }

    $sort = clean_string((string) ($input['sort'] ?? 'newest'));
    $order = $sort === 'oldest' ? 'ASC' : 'DESC';

    $sql = item_select_sql() . ' WHERE ' . implode(' AND ', $where) . " ORDER BY i.date_lost_found {$order}, i.item_id {$order}";
    $stmt = db()->prepare($sql);
    $stmt->execute($params);
    $items = array_map('map_item_row', $stmt->fetchAll());

    json_ok(['items' => $items, 'count' => count($items)]);
}

function handle_items_create(): void
{
    $user = require_login();
    $input = array_merge($_POST, read_json_body());

    $errors = require_fields($input, ['name', 'category', 'description', 'date', 'location', 'type']);

    $name = clean_string((string) ($input['name'] ?? ''));
    $category = clean_string((string) ($input['category'] ?? ''));
    $description = clean_string((string) ($input['description'] ?? ''));
    $date = clean_string((string) ($input['date'] ?? ''));
    $location = clean_string((string) ($input['location'] ?? ''));
    $type = clean_string((string) ($input['type'] ?? ''));
    if ($description !== '' && strlen($description) < 20) {
        $errors['description'] = 'Please add at least 20 characters so others can recognize the item.';
    }
    if ($date !== '' && !validate_date($date)) {
        $errors['date'] = 'Use a valid date (YYYY-MM-DD).';
    }
    if ($type !== '' && !in_array($type, allowed_report_types(), true)) {
        $errors['type'] = 'Choose lost or found.';
    }

    $categoryId = $category !== '' ? resolve_category_id($category) : null;
    if ($category !== '' && !$categoryId) {
        $errors['category'] = 'Select a valid category.';
    }

    if ($errors) {
        json_error('Please complete the highlighted fields.', 422, $errors);
    }

    $imagePath = save_item_upload($_FILES['photo'] ?? null);
    $status = in_array($user['dbRole'], ['admin', 'staff'], true) ? 'approved' : 'pending';

    try {
        $stmt = db()->prepare(
            'INSERT INTO item_reports
                (user_id, category_id, report_type, item_name, description, location, date_lost_found, image_path, status)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)'
        );
        $stmt->execute([
            $user['id'],
            $categoryId,
            $type,
            $name,
            $description,
            $location,
            $date,
            $imagePath,
            $status,
        ]);
        $newId = (int) db()->lastInsertId();
    } catch (PDOException $e) {
        json_error('Could not save report.', 500, ['detail' => $e->getMessage()]);
    }

    $item = fetch_item_by_id($newId);
    json_ok(['item' => $item], 'Report submitted. Staff will review it shortly.', 201);
}

function handle_items_update(): void
{
    $user = require_login();
    $input = request_input();
    $itemId = parse_item_id($input['id'] ?? null);

    if ($itemId === null) {
        json_error('Item id is required.', 422, ['id' => 'Required.']);
    }

    $existing = fetch_item_by_id($itemId);
    if (!$existing) {
        json_error('Item not found.', 404);
    }

    $isStaff = in_array($user['dbRole'], ['admin', 'staff'], true);
    if (!$isStaff && $existing['ownerId'] !== $user['id']) {
        json_error('You can only edit your own reports.', 403);
    }

    $fields = [];
    $params = [];
    $errors = [];

    if (isset($input['name'])) {
        $name = clean_string((string) $input['name']);
        if ($name === '') {
            $errors['name'] = 'Item name is required.';
        } else {
            $fields[] = 'item_name = ?';
            $params[] = $name;
        }
    }

    if (isset($input['description'])) {
        $description = clean_string((string) $input['description']);
        if (strlen($description) < 20) {
            $errors['description'] = 'Description must be at least 20 characters.';
        } else {
            $fields[] = 'description = ?';
            $params[] = $description;
        }
    }

    if (isset($input['location'])) {
        $location = clean_string((string) $input['location']);
        if ($location === '') {
            $errors['location'] = 'Location is required.';
        } else {
            $fields[] = 'location = ?';
            $params[] = $location;
        }
    }

    if (isset($input['date'])) {
        $date = clean_string((string) $input['date']);
        if (!validate_date($date)) {
            $errors['date'] = 'Use YYYY-MM-DD.';
        } else {
            $fields[] = 'date_lost_found = ?';
            $params[] = $date;
        }
    }

    if (isset($input['type'])) {
        $type = clean_string((string) $input['type']);
        if (!in_array($type, allowed_report_types(), true)) {
            $errors['type'] = 'Must be lost or found.';
        } else {
            $fields[] = 'report_type = ?';
            $params[] = $type;
        }
    }

    if (isset($input['category'])) {
        $categoryId = resolve_category_id(clean_string((string) $input['category']));
        if (!$categoryId) {
            $errors['category'] = 'Unknown category.';
        } else {
            $fields[] = 'category_id = ?';
            $params[] = $categoryId;
        }
    }

    if (isset($input['status'])) {
        if (!$isStaff) {
            json_error('Only staff can change item status.', 403);
        }
        $status = clean_string((string) $input['status']);
        if (!in_array($status, allowed_item_statuses(), true)) {
            $errors['status'] = 'Invalid status.';
        } else {
            $fields[] = 'status = ?';
            $params[] = $status;
        }
    }

    if ($errors) {
        json_error('Validation failed.', 422, $errors);
    }

    if (!$fields) {
        json_error('No fields to update.', 400);
    }

    $params[] = $itemId;
    $sql = 'UPDATE item_reports SET ' . implode(', ', $fields) . ' WHERE item_id = ?';

    try {
        $stmt = db()->prepare($sql);
        $stmt->execute($params);
    } catch (PDOException $e) {
        json_error('Could not update item.', 500, ['detail' => $e->getMessage()]);
    }

    json_ok(['item' => fetch_item_by_id($itemId)], 'Item updated.');
}

function handle_items_delete(): void
{
    $user = require_login();
    $input = request_input();
    $itemId = parse_item_id($input['id'] ?? null);

    if ($itemId === null) {
        json_error('Item id is required.', 422, ['id' => 'Required.']);
    }

    $existing = fetch_item_by_id($itemId);
    if (!$existing) {
        json_error('Item not found.', 404);
    }

    $isStaff = in_array($user['dbRole'], ['admin', 'staff'], true);
    if (!$isStaff && $existing['ownerId'] !== $user['id']) {
        json_error('You can only delete your own reports.', 403);
    }

    // Soft-delete via archive status + snapshot so FK claim history can remain.
    try {
        $pdo = db();
        $pdo->beginTransaction();
        archive_item_snapshot($existing, $user['id'], 'Archived via delete');
        $stmt = $pdo->prepare('UPDATE item_reports SET status = \'archived\' WHERE item_id = ?');
        $stmt->execute([$itemId]);
        $pdo->commit();
    } catch (PDOException $e) {
        if (db()->inTransaction()) {
            db()->rollBack();
        }
        json_error('Could not delete item.', 500, ['detail' => $e->getMessage()]);
    }

    json_ok(['id' => format_item_id($itemId)], 'Item deleted.');
}
