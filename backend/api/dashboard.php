<?php

declare(strict_types=1);

require_once __DIR__ . '/../includes/bootstrap.php';
require_once __DIR__ . '/../includes/items.php';

if (request_method() !== 'GET') {
    json_error('Method not allowed.', 405);
}

$user = require_login();
$pdo = db();
$isStaff = in_array($user['dbRole'], ['admin', 'staff'], true);

if ($isStaff) {
    $total = (int) $pdo->query("SELECT COUNT(*) FROM item_reports WHERE status <> 'archived'")->fetchColumn();
    $lost = (int) $pdo->query("SELECT COUNT(*) FROM item_reports WHERE report_type = 'lost' AND status <> 'archived'")->fetchColumn();
    $found = (int) $pdo->query("SELECT COUNT(*) FROM item_reports WHERE report_type = 'found' AND status <> 'archived'")->fetchColumn();
    $pendingClaims = (int) $pdo->query("SELECT COUNT(*) FROM claim_requests WHERE claim_status = 'pending'")->fetchColumn();

    $recentStmt = $pdo->query(
        item_select_sql() . " WHERE i.status <> 'archived' ORDER BY i.created_at DESC LIMIT 6"
    );
    $recent = array_map('map_item_row', $recentStmt->fetchAll());

    $activityStmt = $pdo->query(
        'SELECT activity_description, activity_date
         FROM activity_logs
         ORDER BY activity_date DESC
         LIMIT 8'
    );
    $activities = array_map(static function (array $row): string {
        return $row['activity_description'];
    }, $activityStmt->fetchAll());

    json_ok([
        'role' => 'admin',
        'stats' => [
            'total' => $total,
            'lost' => $lost,
            'found' => $found,
            'pendingClaims' => $pendingClaims,
        ],
        'recentItems' => $recent,
        'activities' => $activities,
    ]);
}

$uid = $user['id'];

$lostStmt = $pdo->prepare("SELECT COUNT(*) FROM item_reports WHERE user_id = ? AND report_type = 'lost' AND status <> 'archived'");
$lostStmt->execute([$uid]);
$foundStmt = $pdo->prepare("SELECT COUNT(*) FROM item_reports WHERE user_id = ? AND report_type = 'found' AND status <> 'archived'");
$foundStmt->execute([$uid]);
$claimsStmt = $pdo->prepare('SELECT COUNT(*) FROM claim_requests WHERE user_id = ?');
$claimsStmt->execute([$uid]);
$openStmt = $pdo->prepare("SELECT COUNT(*) FROM item_reports WHERE user_id = ? AND status IN ('pending','approved')");
$openStmt->execute([$uid]);

$mineStmt = $pdo->prepare(item_select_sql() . " WHERE i.user_id = ? AND i.status <> 'archived' ORDER BY i.date_lost_found DESC");
$mineStmt->execute([$uid]);
$mine = array_map('map_item_row', $mineStmt->fetchAll());

$recentStmt = $pdo->query(
    item_select_sql() . " WHERE i.status IN ('approved','claimed','pending') ORDER BY i.created_at DESC LIMIT 5"
);
$recent = array_map('map_item_row', $recentStmt->fetchAll());

$myClaimsStmt = $pdo->prepare(
    'SELECT cr.*, u.first_name, u.last_name, u.student_id, u.email, i.item_name
     FROM claim_requests cr
     INNER JOIN users u ON u.user_id = cr.user_id
     INNER JOIN item_reports i ON i.item_id = cr.item_id
     WHERE cr.user_id = ?
     ORDER BY cr.request_date DESC'
);
$myClaimsStmt->execute([$uid]);
$myClaims = array_map(static function (array $row): array {
    return [
        'id' => 'CLM-' . str_pad((string) $row['claim_id'], 4, '0', STR_PAD_LEFT),
        'itemId' => format_item_id((int) $row['item_id']),
        'itemName' => $row['item_name'],
        'status' => $row['claim_status'],
        'note' => $row['claim_message'],
        'date' => substr((string) $row['request_date'], 0, 10),
    ];
}, $myClaimsStmt->fetchAll());

json_ok([
    'role' => 'user',
    'stats' => [
        'lost' => (int) $lostStmt->fetchColumn(),
        'found' => (int) $foundStmt->fetchColumn(),
        'claims' => (int) $claimsStmt->fetchColumn(),
        'open' => (int) $openStmt->fetchColumn(),
    ],
    'myItems' => $mine,
    'recentItems' => $recent,
    'myClaims' => $myClaims,
]);
