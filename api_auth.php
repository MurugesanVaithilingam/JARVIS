<?php
/* ================================================================
   STARK INDUSTRIES — REAL USER AUTHENTICATION API (api_auth.php)
   ================================================================ */

require_once __DIR__ . '/db_connect.php';

$pdo = getDBConnection();

if (!$pdo) {
    echo json_encode(['status' => 'error', 'message' => 'Database connection failed']);
    exit;
}

$input = json_decode(file_get_contents('php://input'), true);

$username = $input['username'] ?? '';
$pin = $input['pin'] ?? '';

if ($username === '' || $pin === '') {
    echo json_encode([
        'status' => 'error',
        'authenticated' => false,
        'message' => 'Username and PIN are required'
    ]);
    exit;
}

$stmt = $pdo->prepare("SELECT `id`, `username`, `full_name`, `email`, `pin`, `clearance_level`, `role` FROM `users` WHERE `username` = :u OR `email` = :u");
$stmt->execute([':u' => $username]);
$user = $stmt->fetch();

if ($user && hash_equals((string)$user['pin'], (string)$pin)) {
    echo json_encode([
        'status' => 'success',
        'authenticated' => true,
        'user' => [
            'id' => $user['id'],
            'username' => $user['username'],
            'full_name' => $user['full_name'],
            'role' => $user['role'],
            'clearance' => $user['clearance_level']
        ],
        'message' => 'Biometric authentication successful against MySQL user records'
    ]);
} else {
    echo json_encode([
        'status' => 'error',
        'authenticated' => false,
        'message' => 'Invalid Security PIN or User Identity'
    ]);
}
