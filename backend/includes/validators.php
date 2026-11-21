<?php

declare(strict_types=1);

function clean_string(?string $value): string
{
    return trim((string) $value);
}

function require_fields(array $input, array $fields): array
{
    $errors = [];
    foreach ($fields as $field) {
        if (!isset($input[$field]) || clean_string((string) $input[$field]) === '') {
            $errors[$field] = 'This field is required.';
        }
    }
    return $errors;
}

function validate_email(string $email): bool
{
    return (bool) filter_var($email, FILTER_VALIDATE_EMAIL);
}

function validate_hcdc_email(string $email): bool
{
    if (!validate_email($email)) {
        return false;
    }
    $parts = explode('@', strtolower($email));
    return count($parts) === 2 && $parts[1] === 'hcdc.edu.ph';
}

function validate_password(string $password, int $min = 6): ?string
{
    if (strlen($password) < $min) {
        return "Password must be at least {$min} characters.";
    }
    return null;
}

function validate_date(string $date): bool
{
    $dt = DateTime::createFromFormat('Y-m-d', $date);
    return $dt && $dt->format('Y-m-d') === $date;
}

function allowed_item_statuses(): array
{
    return ['pending', 'approved', 'claimed', 'returned', 'archived'];
}

function allowed_report_types(): array
{
    return ['lost', 'found'];
}

function allowed_claim_statuses(): array
{
    return ['pending', 'approved', 'rejected'];
}
