<?php
/* ================================================================
   STARK INDUSTRIES — REAL SUIT & TELEMETRY REST API (api_telemetry.php)
   ================================================================ */

require_once __DIR__ . '/db_connect.php';

$pdo = getDBConnection();

if (!$pdo) {
    echo json_encode(['status' => 'error', 'message' => 'Database connection failed']);
    exit;
}

try {
    // 1. Suit Telemetry
    $stmtSuit = $pdo->query("SELECT * FROM `suit_telemetry` WHERE `id` = 1");
    $suit = $stmtSuit->fetch() ?: [
        'suit_mark' => 'MARK 85', 'power_level' => 100, 'armor_integrity' => 100,
        'arc_reactor_output' => '1.21 GW', 'weapons_status' => 'ONLINE 100%'
    ];

    // 2. Cyber Threat Logs
    $stmtThreats = $pdo->query("SELECT * FROM `cyber_threats` ORDER BY `id` DESC LIMIT 10");
    $threats = $stmtThreats->fetchAll();

    // 3. Overall System Stats
    $stmtMsgCount = $pdo->query("SELECT COUNT(*) AS total_msgs, SUM(`tokens_used`) AS total_tokens FROM `chat_messages`");
    $stats = $stmtMsgCount->fetch();

    echo json_encode([
        'status' => 'success',
        'suit' => $suit,
        'threats' => $threats,
        'stats' => [
            'total_messages' => intval($stats['total_msgs'] ?? 0),
            'total_tokens' => intval($stats['total_tokens'] ?? 0),
            'active_database' => 'jarvis_db'
        ]
    ], JSON_PRETTY_PRINT);

} catch (PDOException $e) {
    echo json_encode(['status' => 'error', 'message' => $e->getMessage()]);
}
