<?php

declare(strict_types=1);

function public_user(array $row): array
{
    $role = $row['role'] ?? 'student';
    $frontendRole = in_array($role, ['admin', 'staff'], true) ? 'admin' : 'user';

    return [
        'id' => (int) $row['user_id'],
        'name' => trim(($row['first_name'] ?? '') . ' ' . ($row['last_name'] ?? '')),
        'first_name' => $row['first_name'] ?? '',
        'last_name' => $row['last_name'] ?? '',
        'email' => $row['email'] ?? '',
        'studentId' => $row['student_id'] ?? '',
        'role' => $frontendRole,
        'dbRole' => $role,
        'contact_number' => $row['contact_number'] ?? null,
    ];
}

function current_user(): ?array
{
    if (empty($_SESSION['user_id'])) {
        return null;
    }

    $stmt = db()->prepare(
        'SELECT user_id, first_name, last_name, student_id, email, role, contact_number
         FROM users WHERE user_id = ? LIMIT 1'
    );
    $stmt->execute([(int) $_SESSION['user_id']]);
    $row = $stmt->fetch();
    return $row ? public_user($row) : null;
}

function require_login(): array
{
    $user = current_user();
    if (!$user) {
        json_error('Authentication required. Please log in.', 401);
    }
    return $user;
}

function require_staff(): array
{
    $user = require_login();
    if (!in_array($user['dbRole'], ['admin', 'staff'], true)) {
        json_error('Staff or admin access required.', 403);
    }
    return $user;
}

function login_user(array $row): array
{
    session_regenerate_id(true);
    $_SESSION['user_id'] = (int) $row['user_id'];
    return public_user($row);
}

function logout_user(): void
{
    $_SESSION = [];
    if (ini_get('session.use_cookies')) {
        $params = session_get_cookie_params();
        setcookie(session_name(), '', time() - 42000, $params['path'], $params['domain'], (bool) $params['secure'], (bool) $params['httponly']);
    }
    session_destroy();
}

function find_user_by_identifier(string $identifier): ?array
{
    $stmt = db()->prepare(
        'SELECT * FROM users
         WHERE email = ? OR student_id = ?
         LIMIT 1'
    );
    $stmt->execute([$identifier, $identifier]);
    $row = $stmt->fetch();
    return $row ?: null;
}

function split_full_name(string $fullName): array
{
    $parts = preg_split('/\s+/', trim($fullName), 2);
    $first = $parts[0] ?? 'User';
    $last = $parts[1] ?? '-';
    return [$first, $last];
}
