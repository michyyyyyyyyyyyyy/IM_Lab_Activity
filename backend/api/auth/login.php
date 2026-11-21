<?php

declare(strict_types=1);

require_once __DIR__ . '/../../includes/bootstrap.php';

if (request_method() !== 'POST') {
    json_error('Method not allowed.', 405);
}

$input = request_input();
$errors = require_fields($input, ['identifier', 'password']);

$identifier = clean_string((string) ($input['identifier'] ?? ''));
$identifier = strpos($identifier, '@') !== false ? strtolower($identifier) : $identifier;
if (strpos($identifier, '@') !== false && !validate_hcdc_email($identifier)) {
    $errors['identifier'] = 'Use an @hcdc.edu.ph email address.';
}
$password = (string) ($input['password'] ?? '');

if ($password !== '' && ($pwError = validate_password($password, 6))) {
    $errors['password'] = $pwError;
}

if ($errors) {
    json_error('Please fix the highlighted fields.', 422, $errors);
}

$user = find_user_by_identifier($identifier);
if (!$user || !password_verify($password, $user['password_hash'])) {
    json_error('Invalid email/student ID or password.', 401);
}

$session = login_user($user);
json_ok(['user' => $session], 'Welcome back.');
