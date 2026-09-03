<?php
/* ================================================================
   STARK INDUSTRIES — REAL CHAT MESSAGES PERSISTENCE API (api_chat.php)
   ================================================================ */

require_once __DIR__ . '/db_connect.php';

$pdo = getDBConnection();

if (!$pdo) {
    echo json_encode(['status' => 'error', 'message' => 'Database connection failed']);
    exit;
}

$method = $_SERVER['REQUEST_METHOD'];

if ($method === 'GET') {
    // Fetch conversation history
    $session_id = $_GET['session_id'] ?? 'default_session';
    $provider = $_GET['provider'] ?? '';

    $sql = "SELECT `id`, `provider_key`, `role`, `content`, `tokens_used`, `created_at` FROM `chat_messages` WHERE `session_id` = :sid";
    $params = [':sid' => $session_id];

    if ($provider) {
        $sql .= " AND `provider_key` = :prov";
        $params[':prov'] = $provider;
    }

    $sql .= " ORDER BY `id` ASC LIMIT 100";

    $stmt = $pdo->prepare($sql);
    $stmt->execute($params);
    $messages = $stmt->fetchAll();

    echo json_encode([
        'status' => 'success',
        'count' => count($messages),
        'messages' => $messages
    ], JSON_PRETTY_PRINT);
    exit;
}

if ($method === 'POST') {
    // Save new chat message to database
    $input = json_decode(file_get_contents('php://input'), true);

    $session_id = $input['session_id'] ?? 'default_session';
    $provider_key = $input['provider_key'] ?? 'pollinations';
    $role = $input['role'] ?? 'user';
    $content = $input['content'] ?? '';
    $tokens = isset($input['tokens_used']) ? intval($input['tokens_used']) : ceil(strlen($content) / 4);

    if (empty($content)) {
        echo json_encode(['status' => 'error', 'message' => 'Message content cannot be empty']);
        exit;
    }

    $stmt = $pdo->prepare("INSERT INTO `chat_messages` (`session_id`, `provider_key`, `role`, `content`, `tokens_used`) VALUES (:sid, :pk, :role, :content, :tokens)");
    $success = $stmt->execute([
        ':sid' => $session_id,
        ':pk' => $provider_key,
        ':role' => $role,
        ':content' => $content,
        ':tokens' => $tokens
    ]);

    echo json_encode([
        'status' => $success ? 'success' : 'error',
        'inserted_id' => $pdo->lastInsertId(),
        'message' => 'Chat message stored in MySQL database'
    ]);
    exit;
}
