<?php

declare(strict_types=1);

function format_item_id(int $id): string
{
    return 'ITM-' . str_pad((string) $id, 4, '0', STR_PAD_LEFT);
}

function parse_item_id($raw): ?int
{
    if ($raw === null || $raw === '') {
        return null;
    }
    if (is_numeric($raw)) {
        return (int) $raw;
    }
    if (preg_match('/^ITM-0*(\d+)$/i', (string) $raw, $m)) {
        return (int) $m[1];
    }
    return null;
}

function map_item_row(array $row): array
{
    $id = (int) $row['item_id'];
    return [
        'id' => format_item_id($id),
        'item_id' => $id,
        'name' => $row['item_name'],
        'category' => $row['category_name'],
        'category_id' => (int) $row['category_id'],
        'type' => $row['report_type'],
        'status' => $row['status'],
        'date' => $row['date_lost_found'],
        'location' => $row['location'],
        'description' => $row['description'] ?? '',
        'ownerId' => (int) $row['user_id'],
        'ownerName' => trim(($row['first_name'] ?? '') . ' ' . ($row['last_name'] ?? '')),
        'photo' => $row['image_path'] ?: null,
        'created_at' => $row['created_at'] ?? null,
        'updated_at' => $row['updated_at'] ?? null,
    ];
}

function item_select_sql(): string
{
    return 'SELECT i.*, c.category_name, u.first_name, u.last_name
            FROM item_reports i
            INNER JOIN categories c ON c.category_id = i.category_id
            INNER JOIN users u ON u.user_id = i.user_id';
}

function fetch_item_by_id(int $itemId): ?array
{
    $stmt = db()->prepare(item_select_sql() . ' WHERE i.item_id = ? LIMIT 1');
    $stmt->execute([$itemId]);
    $row = $stmt->fetch();
    return $row ? map_item_row($row) : null;
}

function resolve_category_id(string $category): ?int
{
    if (ctype_digit($category)) {
        $stmt = db()->prepare('SELECT category_id FROM categories WHERE category_id = ?');
        $stmt->execute([(int) $category]);
        $id = $stmt->fetchColumn();
        return $id !== false ? (int) $id : null;
    }

    $stmt = db()->prepare('SELECT category_id FROM categories WHERE category_name = ? LIMIT 1');
    $stmt->execute([clean_string($category)]);
    $id = $stmt->fetchColumn();
    return $id !== false ? (int) $id : null;
}

function save_item_upload(?array $file): ?string
{
    if (!$file || ($file['error'] ?? UPLOAD_ERR_NO_FILE) === UPLOAD_ERR_NO_FILE) {
        return null;
    }

    if (($file['error'] ?? UPLOAD_ERR_OK) !== UPLOAD_ERR_OK) {
        json_error('Photo upload failed. Please try another image.', 400);
    }

    if (($file['size'] ?? 0) > 5 * 1024 * 1024) {
        json_error('Photo must be 5 MB or smaller.', 400, ['photo' => 'Max size is 5 MB.']);
    }

    $finfo = new finfo(FILEINFO_MIME_TYPE);
    $mime = $finfo->file($file['tmp_name']);
    $allowed = [
        'image/jpeg' => 'jpg',
        'image/png' => 'png',
        'image/webp' => 'webp',
        'image/gif' => 'gif',
    ];
    if (!isset($allowed[$mime])) {
        json_error('Photo must be JPG, PNG, WEBP, or GIF.', 400, ['photo' => 'Invalid image type.']);
    }

    $dir = __DIR__ . '/../uploads/items';
    if (!is_dir($dir) && !mkdir($dir, 0775, true) && !is_dir($dir)) {
        json_error('Could not create upload directory.', 500);
    }

    $filename = 'item_' . date('YmdHis') . '_' . bin2hex(random_bytes(4)) . '.' . $allowed[$mime];
    $dest = $dir . DIRECTORY_SEPARATOR . $filename;
    if (!move_uploaded_file($file['tmp_name'], $dest)) {
        json_error('Could not save uploaded photo.', 500);
    }

    return 'uploads/items/' . $filename;
}

function archive_item_snapshot(array $item, int $archivedBy, string $reason = 'Deleted by user/staff'): void
{
    $stmt = db()->prepare(
        'INSERT INTO archived_items
            (original_item_id, archived_by, item_name, report_type, category_name,
             description, location, date_lost_found, original_status, archive_reason)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
    );
    $stmt->execute([
        $item['item_id'],
        $archivedBy,
        $item['name'],
        $item['type'],
        $item['category'],
        $item['description'],
        $item['location'],
        $item['date'],
        $item['status'],
        $reason,
    ]);
}
