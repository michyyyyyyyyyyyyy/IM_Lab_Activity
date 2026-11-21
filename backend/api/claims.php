<?php

declare(strict_types=1);

require_once __DIR__ . '/../includes/bootstrap.php';
require_once __DIR__ . '/../includes/items.php';

$method = request_method();

if ($method === 'GET') {
    handle_claims_get();
}

if ($method === 'POST') {
    handle_claims_create();
}

if ($method === 'PUT' || $method === 'PATCH') {
    handle_claims_update();
}

json_error('Method not allowed.', 405);

function format_claim_id(int $id): string
{
    return 'CLM-' . str_pad((string) $id, 4, '0', STR_PAD_LEFT);
}

function map_claim_row(array $row): array
{
    return [
        'id' => format_claim_id((int) $row['claim_id']),
        'claim_id' => (int) $row['claim_id'],
        'itemId' => format_item_id((int) $row['item_id']),
        'item_id' => (int) $row['item_id'],
        'itemName' => $row['item_name'] ?? null,
        'claimant' => trim(($row['first_name'] ?? '') . ' ' . ($row['last_name'] ?? '')),
        'studentId' => $row['student_id'] ?? '',
        'email' => $row['email'] ?? '',
        'date' => substr((string) $row['request_date'], 0, 10),
        'status' => $row['claim_status'],
        'note' => $row['claim_message'],
        'reviewed_at' => $row['reviewed_at'],
    ];
}

function claim_select_sql(): string
{
    return 'SELECT cr.*, u.first_name, u.last_name, u.student_id, u.email, i.item_name
            FROM claim_requests cr
            INNER JOIN users u ON u.user_id = cr.user_id
            INNER JOIN item_reports i ON i.item_id = cr.item_id';
}

function parse_claim_id($raw): ?int
{
    if ($raw === null || $raw === '') {
        return null;
    }
    if (is_numeric($raw)) {
        return (int) $raw;
    }
    if (preg_match('/^CLM-0*(\d+)$/i', (string) $raw, $m)) {
        return (int) $m[1];
    }
    return null;
}

function handle_claims_get(): void
{
    $user = require_login();
    $input = $_GET;
    $where = ['1=1'];
    $params = [];

    $isStaff = in_array($user['dbRole'], ['admin', 'staff'], true);
    if (!$isStaff || filter_var($input['mine'] ?? false, FILTER_VALIDATE_BOOLEAN)) {
        $where[] = 'cr.user_id = ?';
        $params[] = $user['id'];
    }

    $status = clean_string((string) ($input['status'] ?? ''));
    if ($status !== '' && $status !== 'all') {
        if (!in_array($status, allowed_claim_statuses(), true)) {
            json_error('Invalid claim status.', 422);
        }
        $where[] = 'cr.claim_status = ?';
        $params[] = $status;
    }

    $sql = claim_select_sql() . ' WHERE ' . implode(' AND ', $where) . ' ORDER BY cr.request_date DESC';
    $stmt = db()->prepare($sql);
    $stmt->execute($params);
    $claims = array_map('map_claim_row', $stmt->fetchAll());

    json_ok(['claims' => $claims, 'count' => count($claims)]);
}

function handle_claims_create(): void
{
    $user = require_login();
    $input = request_input();
    $errors = require_fields($input, ['itemId', 'note']);

    $itemId = parse_item_id($input['itemId'] ?? ($input['item_id'] ?? null));
    $note = clean_string((string) ($input['note'] ?? ($input['claim_message'] ?? '')));

    if ($itemId === null) {
        $errors['itemId'] = 'Valid item id is required.';
    }
    if ($note !== '' && strlen($note) < 12) {
        $errors['note'] = 'Please add more detail so staff can verify ownership.';
    }

    if ($errors) {
        json_error('Please fix the claim form.', 422, $errors);
    }

    $item = fetch_item_by_id($itemId);
    if (!$item) {
        json_error('Item not found.', 404);
    }
    if ($item['type'] !== 'found') {
        json_error('Claims can only be submitted for found items.', 400);
    }
    if (in_array($item['status'], ['returned', 'archived'], true)) {
        json_error('This item is no longer available for claims.', 400);
    }
    if ($item['ownerId'] === $user['id']) {
        json_error('You cannot claim an item you reported.', 400);
    }

    $dup = db()->prepare(
        'SELECT claim_id FROM claim_requests
         WHERE item_id = ? AND user_id = ? AND claim_status = \'pending\' LIMIT 1'
    );
    $dup->execute([$itemId, $user['id']]);
    if ($dup->fetch()) {
        json_error('You already have a pending claim for this item.', 409);
    }

    try {
        $stmt = db()->prepare(
            'INSERT INTO claim_requests (item_id, user_id, claim_message, claim_status)
             VALUES (?, ?, ?, \'pending\')'
        );
        $stmt->execute([$itemId, $user['id'], $note]);
        $claimId = (int) db()->lastInsertId();
    } catch (PDOException $e) {
        json_error('Could not submit claim.', 500, ['detail' => $e->getMessage()]);
    }

    $stmt = db()->prepare(claim_select_sql() . ' WHERE cr.claim_id = ?');
    $stmt->execute([$claimId]);
    $claim = map_claim_row($stmt->fetch());

    json_ok(['claim' => $claim], 'Claim submitted for review.', 201);
}

function handle_claims_update(): void
{
    $staff = require_staff();
    $input = request_input();
    $claimId = parse_claim_id($input['id'] ?? null);
    $status = clean_string((string) ($input['status'] ?? ($input['action'] ?? '')));

    if ($status === 'approve') {
        $status = 'approved';
    }
    if ($status === 'reject') {
        $status = 'rejected';
    }

    if ($claimId === null) {
        json_error('Claim id is required.', 422, ['id' => 'Required.']);
    }
    if (!in_array($status, ['approved', 'rejected'], true)) {
        json_error('Status must be approved or rejected.', 422, ['status' => 'Invalid.']);
    }

    $stmt = db()->prepare(claim_select_sql() . ' WHERE cr.claim_id = ? LIMIT 1');
    $stmt->execute([$claimId]);
    $row = $stmt->fetch();
    if (!$row) {
        json_error('Claim not found.', 404);
    }
    if ($row['claim_status'] !== 'pending') {
        json_error('This claim was already reviewed.', 400);
    }

    try {
        $pdo = db();
        $pdo->beginTransaction();

        $update = $pdo->prepare(
            'UPDATE claim_requests
             SET claim_status = ?, reviewed_by = ?, reviewed_at = NOW()
             WHERE claim_id = ?'
        );
        $update->execute([$status, $staff['id'], $claimId]);

        if ($status === 'approved') {
            $itemUpdate = $pdo->prepare(
                'UPDATE item_reports SET status = \'claimed\' WHERE item_id = ?'
            );
            $itemUpdate->execute([(int) $row['item_id']]);

            $rejectOthers = $pdo->prepare(
                'UPDATE claim_requests
                 SET claim_status = \'rejected\', reviewed_by = ?, reviewed_at = NOW()
                 WHERE item_id = ? AND claim_id <> ? AND claim_status = \'pending\''
            );
            $rejectOthers->execute([$staff['id'], (int) $row['item_id'], $claimId]);
        }

        $pdo->commit();
    } catch (PDOException $e) {
        if (db()->inTransaction()) {
            db()->rollBack();
        }
        json_error('Could not update claim.', 500, ['detail' => $e->getMessage()]);
    }

    $stmt = db()->prepare(claim_select_sql() . ' WHERE cr.claim_id = ?');
    $stmt->execute([$claimId]);
    $claim = map_claim_row($stmt->fetch());

    json_ok(
        ['claim' => $claim],
        $status === 'approved' ? 'Claim approved.' : 'Claim rejected.'
    );
}
