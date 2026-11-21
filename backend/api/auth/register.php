<?php

declare(strict_types=1);

require_once __DIR__ . '/../../includes/bootstrap.php';

if (request_method() !== 'POST') {
    json_error('Method not allowed.', 405);
}

$input = request_input();
$errors = require_fields($input, ['fullName', 'studentId', 'email', 'password', 'confirmPassword']);

$fullName = clean_string((string) ($input['fullName'] ?? ''));
$studentId = clean_string((string) ($input['studentId'] ?? ''));
$email = strtolower(clean_string((string) ($input['email'] ?? '')));
$password = (string) ($input['password'] ?? '');
$confirm = (string) ($input['confirmPassword'] ?? '');
$contact = clean_string((string) ($input['contact_number'] ?? ''));

if ($fullName !== '' && strlen($fullName) < 3) {
    $errors['fullName'] = 'Please enter your full name.';
}
if ($studentId !== '' && !preg_match('/^[A-Za-z0-9-]{4,}$/', $studentId)) {
    $errors['studentId'] = 'Enter a valid student ID.';
}
if ($email !== '' && !validate_hcdc_email($email)) {
    $errors['email'] = 'Use an @hcdc.edu.ph email address.';
}
if ($password !== '' && ($pwError = validate_password($password, 8))) {
    $errors['password'] = $pwError;
}
if ($password !== $confirm) {
    $errors['confirmPassword'] = 'Passwords do not match.';
}

if ($errors) {
    json_error('Please fix the highlighted fields.', 422, $errors);
}

$pdo = db();

$check = $pdo->prepare('SELECT email, student_id FROM users WHERE email = ? OR student_id = ? LIMIT 1');
$check->execute([$email, $studentId]);
$existing = $check->fetch();
if ($existing) {
    if (strcasecmp((string) $existing['email'], $email) === 0) {
        $errors['email'] = 'This email is already registered.';
    }
    if (strcasecmp((string) $existing['student_id'], $studentId) === 0) {
        $errors['studentId'] = 'This student ID is already registered.';
    }
    json_error('Account already exists.', 409, $errors);
}

[$first, $last] = split_full_name($fullName);
$hash = password_hash($password, PASSWORD_DEFAULT);

try {
    $stmt = $pdo->prepare(
        'INSERT INTO users (first_name, last_name, student_id, email, password_hash, role, contact_number)
         VALUES (?, ?, ?, ?, ?, \'student\', ?)'
    );
    $stmt->execute([$first, $last, $studentId, $email, $hash, $contact !== '' ? $contact : null]);
    $userId = (int) $pdo->lastInsertId();
} catch (PDOException $e) {
    json_error('Could not create account.', 500, ['detail' => $e->getMessage()]);
}

$row = find_user_by_identifier($email);
$session = login_user($row ?: [
    'user_id' => $userId,
    'first_name' => $first,
    'last_name' => $last,
    'student_id' => $studentId,
    'email' => $email,
    'role' => 'student',
    'contact_number' => $contact,
]);

json_ok(['user' => $session], 'Account created.', 201);
