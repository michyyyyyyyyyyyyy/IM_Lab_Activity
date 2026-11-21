<?php

declare(strict_types=1);

require_once __DIR__ . '/../../includes/bootstrap.php';

if (request_method() !== 'GET') {
    json_error('Method not allowed.', 405);
}

$user = current_user();
if (!$user) {
    json_error('Not authenticated.', 401);
}

json_ok(['user' => $user]);
