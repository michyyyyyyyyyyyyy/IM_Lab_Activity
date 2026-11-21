<?php

declare(strict_types=1);

function json_response(array $payload, int $status = 200): void
{
    http_response_code($status);
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode($payload, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

function json_ok(array $data = [], string $message = 'OK', int $status = 200): void
{
    json_response([
        'success' => true,
        'message' => $message,
        'data' => $data,
    ], $status);
}

function json_error(string $message, int $status = 400, array $errors = []): void
{
    $payload = [
        'success' => false,
        'message' => $message,
    ];
    if ($errors) {
        $payload['errors'] = $errors;
    }
    json_response($payload, $status);
}

function request_method(): string
{
    return strtoupper($_SERVER['REQUEST_METHOD'] ?? 'GET');
}

function read_json_body(): array
{
    $raw = file_get_contents('php://input');
    if ($raw === false || trim($raw) === '') {
        return [];
    }
    $decoded = json_decode($raw, true);
    return is_array($decoded) ? $decoded : [];
}

function request_input(): array
{
    $json = read_json_body();
    if ($json) {
        return array_merge($_GET, $json);
    }
    return array_merge($_GET, $_POST);
}
