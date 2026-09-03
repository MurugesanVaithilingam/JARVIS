<?php
/**
 * J.A.R.V.I.S. Universal AI Proxy
 * Routes all AI API calls through PHP to bypass CORS & browser restrictions
 * Works on WAMP localhost with no HTTPS required
 */

header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');
header('Content-Type: application/json');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

$raw  = file_get_contents('php://input');
$data = json_decode($raw, true);

if (!$data) {
    echo json_encode(['error' => 'Invalid request body']);
    exit;
}

// ── Direct free fallback mode (used by Pollinations fallback) ──
// If a simple {prompt, system, model} is sent, use Pollinations directly
if (isset($data['prompt']) && !isset($data['endpoint'])) {
    $prompt = $data['prompt'] ?? 'Hello';
    $system = $data['system'] ?? 'You are JARVIS, Tony Stark\'s AI assistant.';
    $model  = $data['model']  ?? 'openai';

    $url = 'https://text.pollinations.ai/' . urlencode($prompt)
         . '?system=' . urlencode($system)
         . '&model='  . urlencode($model)
         . '&seed='   . rand(1, 99999);

    $ch = curl_init($url);
    curl_setopt_array($ch, [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_TIMEOUT        => 45,
        CURLOPT_SSL_VERIFYPEER => false,
        CURLOPT_USERAGENT      => 'Stark-JARVIS-Proxy/2.0',
    ]);
    $resp = curl_exec($ch);
    $code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);

    if ($resp && $code === 200) {
        echo json_encode(['reply' => $resp]);
    } else {
        echo json_encode(['reply' => 'வணக்கம் பாஸ்! J.A.R.V.I.S. ஆன்லைனில் உள்ளது. உங்களுக்கு என்ன உதவி செய்ய வேண்டும்?']);
    }
    exit;
}

// ── Full proxy mode: forward request to any AI endpoint ──
$endpoint = $data['endpoint'] ?? '';
$headers  = $data['headers']  ?? [];
$body     = $data['body']     ?? [];
$variant  = $data['variant']  ?? 'openai';

if (empty($endpoint)) {
    echo json_encode(['error' => 'No endpoint provided']);
    exit;
}

// Build cURL headers
$curlHeaders = ['Content-Type: application/json'];
foreach ($headers as $k => $v) {
    if (strtolower($k) !== 'content-type') {
        $curlHeaders[] = "$k: $v";
    }
}

// Handle Gemini (different URL pattern)
if ($variant === 'gemini' && isset($body['stream'])) {
    $body['stream'] = false; // Gemini streaming through proxy is complex, use non-stream
}

$ch = curl_init($endpoint);
curl_setopt_array($ch, [
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_POST           => true,
    CURLOPT_POSTFIELDS     => json_encode($body),
    CURLOPT_HTTPHEADER     => $curlHeaders,
    CURLOPT_TIMEOUT        => 90,
    CURLOPT_SSL_VERIFYPEER => false,
    CURLOPT_USERAGENT      => 'Stark-JARVIS-Proxy/2.0',
    CURLOPT_FOLLOWLOCATION => true,
]);

$response = curl_exec($ch);
$httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
$curlError = curl_error($ch);
curl_close($ch);

if ($curlError) {
    http_response_code(500);
    echo json_encode(['error' => 'Proxy cURL error: ' . $curlError]);
    exit;
}

// Return the raw response so the browser JS can parse it
http_response_code($httpCode ?: 200);
echo $response;
