<?php

declare(strict_types=1);

require_once __DIR__ . '/../../includes/bootstrap.php';

if (request_method() !== 'POST') {
    json_error('Method not allowed.', 405);
}

logout_user();
json_ok([], 'Signed out.');
