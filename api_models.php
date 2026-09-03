<?php
/* ================================================================
   STARK INDUSTRIES — REAL AI MODELS & PROVIDERS API (api_models.php)
   ================================================================ */

require_once __DIR__ . '/db_connect.php';

$pdo = getDBConnection();

if (!$pdo) {
    echo json_encode(['status' => 'error', 'message' => 'Database connection failed']);
    exit;
}

try {
    // Fetch all providers
    $stmtP = $pdo->query("SELECT * FROM `ai_providers` ORDER BY `id` ASC");
    $providers = $stmtP->fetchAll();

    // Fetch models grouped by provider
    $stmtM = $pdo->query("SELECT * FROM `ai_models` ORDER BY `id` ASC");
    $models = $stmtM->fetchAll();

    $result = [];
    foreach ($providers as $p) {
        $pModels = array_filter($models, fn($m) => $m['provider_key'] === $p['provider_key']);
        $p['models'] = array_values($pModels);
        $result[] = $p;
    }

    echo json_encode([
        'status' => 'success',
        'count' => count($result),
        'providers' => $result
    ], JSON_PRETTY_PRINT);

} catch (PDOException $e) {
    echo json_encode(['status' => 'error', 'message' => $e->getMessage()]);
}
