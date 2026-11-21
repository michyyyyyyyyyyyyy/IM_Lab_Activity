<?php
/**
 * MySQL connection settings for FINDIT.
 * Update these values to match your local MySQL / XAMPP / WAMP setup.
 */

return [
    'host' => getenv('FINDIT_DB_HOST') ?: '127.0.0.1',
    'port' => getenv('FINDIT_DB_PORT') ?: '3306',
    'name' => getenv('FINDIT_DB_NAME') ?: 'lost_and_found_db',
    'user' => getenv('FINDIT_DB_USER') ?: 'root',
    'pass' => getenv('FINDIT_DB_PASS') !== false ? getenv('FINDIT_DB_PASS') : '',
    'charset' => 'utf8mb4',
];
