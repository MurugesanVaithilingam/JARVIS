<?php
/* ================================================================
   STARK INDUSTRIES — AUTHENTIC NON-DUPLICATE MYSQL DATABASE (setup_database.php)
   ================================================================ */

require_once __DIR__ . '/db_connect.php';

$pdo = getDBConnection();

if (!$pdo) {
    echo json_encode(['status' => 'error', 'message' => 'Failed to connect to MySQL database server']);
    exit;
}

try {
    // 1. Users & Clearance Table
    $pdo->exec("CREATE TABLE IF NOT EXISTS `users` (
        `id` INT AUTO_INCREMENT PRIMARY KEY,
        `username` VARCHAR(50) UNIQUE NOT NULL,
        `full_name` VARCHAR(100) NOT NULL,
        `email` VARCHAR(100) UNIQUE NOT NULL,
        `password_hash` VARCHAR(255) NOT NULL,
        `pin` VARCHAR(10) NOT NULL DEFAULT '1003',
        `clearance_level` INT DEFAULT 5,
        `role` VARCHAR(50) DEFAULT 'Chief Executive Officer',
        `biometric_token` VARCHAR(100) DEFAULT 'STARK-BIO-85-VERIFIED',
        `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB;");

    // Seed default Stark User
    $pdo->exec("INSERT IGNORE INTO `users` (`id`, `username`, `full_name`, `email`, `password_hash`, `pin`, `clearance_level`, `role`) VALUES
    (1, 'tonystark', 'Anthony Edward Stark', 'tony.stark@starkindustries.com', '" . password_hash('jarvis1003', PASSWORD_DEFAULT) . "', '1003', 5, 'Stark Industries Founder & CEO');");

    // 2. AI Providers Table (Truncate duplicates & insert clean authentic list)
    $pdo->exec("CREATE TABLE IF NOT EXISTS `ai_providers` (
        `id` INT AUTO_INCREMENT PRIMARY KEY,
        `provider_key` VARCHAR(50) UNIQUE NOT NULL,
        `name` VARCHAR(100) NOT NULL,
        `icon` VARCHAR(10) NOT NULL,
        `endpoint` VARCHAR(255) NOT NULL,
        `is_free` TINYINT(1) DEFAULT 0,
        `status` VARCHAR(20) DEFAULT 'ACTIVE',
        `latency_ms` INT DEFAULT 35,
        `context_window` VARCHAR(50) DEFAULT '128K'
    ) ENGINE=InnoDB;");

    $pdo->exec("TRUNCATE TABLE `ai_providers`;");

    $pdo->exec("INSERT INTO `ai_providers` (`id`, `provider_key`, `name`, `icon`, `endpoint`, `is_free`, `context_window`) VALUES
    (1, 'openai', 'OpenAI', '🤖', 'https://api.openai.com/v1/chat/completions', 0, '128K'),
    (2, 'claude', 'Anthropic Claude', '🎭', 'https://api.anthropic.com/v1/messages', 0, '200K'),
    (3, 'gemini', 'Google Gemini', '✨', 'https://generativelanguage.googleapis.com/v1beta/models', 1, '2M'),
    (4, 'deepseek', 'DeepSeek AI', '🔍', 'https://api.deepseek.com/v1/chat/completions', 1, '128K'),
    (5, 'grok', 'xAI Grok', '⚡', 'https://api.x.ai/v1/chat/completions', 0, '128K'),
    (6, 'groq', 'Groq LPU Engine', '⚡', 'https://api.groq.com/openai/v1/chat/completions', 1, '128K'),
    (7, 'mistral', 'Mistral AI', '🌪️', 'https://api.mistral.ai/v1/chat/completions', 1, '128K'),
    (8, 'pollinations', 'Pollinations AI Engine', '🌸', 'https://text.pollinations.ai/openai', 1, '128K'),
    (9, 'huggingface', 'Hugging Face Hub', '🤗', 'https://api-inference.huggingface.co/models', 1, '32K'),
    (10, 'cohere', 'Cohere Command', '🧠', 'https://api.cohere.com/v2/chat', 0, '128K'),
    (11, 'together', 'Together AI', '🔥', 'https://api.together.xyz/v1/chat/completions', 1, '128K'),
    (12, 'perplexity', 'Perplexity Sonar', '🌐', 'https://api.perplexity.ai/chat/completions', 0, '128K'),
    (13, 'copilot', 'GitHub Copilot Models', '🐙', 'https://models.inference.ai.azure.com/chat/completions', 1, '128K'),
    (14, 'ollama', 'Ollama Local AI', '🏠', 'http://localhost:11434/api/generate', 1, '32K');");

    // 3. AI Models Table (Truncate duplicates & insert clean authentic model list)
    $pdo->exec("CREATE TABLE IF NOT EXISTS `ai_models` (
        `id` INT AUTO_INCREMENT PRIMARY KEY,
        `model_code` VARCHAR(100) UNIQUE NOT NULL,
        `provider_key` VARCHAR(50) NOT NULL,
        `label` VARCHAR(100) NOT NULL,
        `architecture` VARCHAR(50) DEFAULT 'Transformer',
        `max_tokens` INT DEFAULT 8192,
        `description` TEXT,
        `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB;");

    $pdo->exec("TRUNCATE TABLE `ai_models`;");

    $pdo->exec("INSERT INTO `ai_models` (`model_code`, `provider_key`, `label`, `architecture`, `max_tokens`, `description`) VALUES
    ('gpt-4o', 'openai', 'GPT-4o Omnimodal', 'Multimodal Transformer', 16384, 'OpenAI flagship high-speed reasoning model'),
    ('gpt-4o-mini', 'openai', 'GPT-4o Mini', 'Lightweight Multimodal', 16384, 'Fast and affordable intelligence for everyday tasks'),
    ('o1-preview', 'openai', 'OpenAI o1 Reasoning', 'CoT Reasoning Model', 32768, 'Advanced math, coding, and complex logic model'),
    ('claude-3-5-sonnet-20241022', 'claude', 'Claude 3.5 Sonnet', 'Anthropic Claude 3.5', 8192, 'State-of-the-art model for coding, analysis and agentic tasks'),
    ('claude-3-5-haiku-20241022', 'claude', 'Claude 3.5 Haiku', 'Anthropic Haiku Engine', 8192, 'Ultra-fast lightweight Claude model for sub-second responses'),
    ('gemini-1.5-pro-002', 'gemini', 'Gemini 1.5 Pro (2M)', 'Google Pathways Multimodal', 8192, '2 Million context window for analyzing full codebases and books'),
    ('gemini-1.5-flash-002', 'gemini', 'Gemini 1.5 Flash', 'Google Pathways Flash', 8192, 'High speed low latency multimodal execution model'),
    ('deepseek-chat', 'deepseek', 'DeepSeek V3 (671B)', 'MoE Sparse Architecture', 8192, '671 Billion parameter open MoE model with 37B active parameters'),
    ('deepseek-reasoner', 'deepseek', 'DeepSeek R1 Reasoning', 'CoT Open Reasoning', 8192, 'Open weights reasoning model rivaling OpenAI o1'),
    ('llama-3.3-70b-versatile', 'groq', 'Llama 3.3 70B Instruct', 'Meta Llama 3.3 Engine', 8192, 'Meta 70B instruction-tuned open weight model running on Groq LPU'),
    ('mistral-large-2411', 'mistral', 'Mistral Large 2 (123B)', 'Mistral AI Architecture', 8192, '123 Billion parameter flagship multilingual open model'),
    ('grok-2-1212', 'grok', 'xAI Grok 2', 'xAI Neural Core', 8192, 'xAI flagship model with real-time web knowledge'),
    ('command-r-plus', 'cohere', 'Cohere Command R+', 'Cohere RAG Engine', 8192, 'Optimized for enterprise RAG and multi-step tool use'),
    ('sonar-pro', 'perplexity', 'Perplexity Sonar Pro', 'Search Augmented LLM', 8192, 'Live real-time search engine grounded answers with citations');");

    // 4. Chat Messages History Table
    $pdo->exec("CREATE TABLE IF NOT EXISTS `chat_messages` (
        `id` INT AUTO_INCREMENT PRIMARY KEY,
        `session_id` VARCHAR(100) DEFAULT 'default_session',
        `provider_key` VARCHAR(50) NOT NULL,
        `role` ENUM('user', 'assistant', 'system') NOT NULL,
        `content` LONGTEXT NOT NULL,
        `tokens_used` INT DEFAULT 0,
        `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB;");

    // 5. Suit Telemetry Table
    $pdo->exec("CREATE TABLE IF NOT EXISTS `suit_telemetry` (
        `id` INT AUTO_INCREMENT PRIMARY KEY,
        `suit_mark` VARCHAR(50) DEFAULT 'MARK 85',
        `power_level` INT DEFAULT 100,
        `armor_integrity` INT DEFAULT 100,
        `arc_reactor_output` VARCHAR(50) DEFAULT '1.21 GW',
        `weapons_status` VARCHAR(50) DEFAULT 'ONLINE 100%',
        `thrusters_status` VARCHAR(50) DEFAULT 'NOMINAL',
        `last_updated` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    ) ENGINE=InnoDB;");

    $pdo->exec("TRUNCATE TABLE `suit_telemetry`;");
    $pdo->exec("INSERT INTO `suit_telemetry` (`id`, `suit_mark`, `power_level`, `armor_integrity`, `arc_reactor_output`, `weapons_status`) VALUES
    (1, 'MARK 85', 100, 100, '1.21 GW', 'ONLINE 100%');");

    // 6. Cyber Security Threat Logs Table
    $pdo->exec("CREATE TABLE IF NOT EXISTS `cyber_threats` (
        `id` INT AUTO_INCREMENT PRIMARY KEY,
        `target_ip` VARCHAR(50) NOT NULL,
        `threat_type` VARCHAR(100) NOT NULL,
        `severity` ENUM('LOW', 'MEDIUM', 'HIGH', 'CRITICAL') DEFAULT 'MEDIUM',
        `status` VARCHAR(50) DEFAULT 'NEUTRALIZED',
        `detected_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB;");

    $pdo->exec("TRUNCATE TABLE `cyber_threats`;");
    $pdo->exec("INSERT INTO `cyber_threats` (`id`, `target_ip`, `threat_type`, `severity`, `status`) VALUES
    (1, '192.168.1.104', 'Unauthorized Port Scan (TCP 443)', 'MEDIUM', 'NEUTRALIZED'),
    (2, '10.0.4.88', 'Brute Force SSH Attack (Root)', 'HIGH', 'BLOCKED'),
    (3, '172.16.0.12', 'SQL Injection Attempt (WAF Block)', 'CRITICAL', 'NEUTRALIZED'),
    (4, '192.168.1.210', 'DDoS SYN Flood Vector', 'HIGH', 'MITIGATED');");

    echo json_encode([
        'status' => 'success',
        'database' => 'jarvis_db',
        'message' => 'Clean authentic non-duplicate MySQL data populated successfully for 14 AI Providers and 14 Flagship Models.'
    ], JSON_PRETTY_PRINT);

} catch (PDOException $e) {
    echo json_encode(['status' => 'error', 'message' => $e->getMessage()]);
}
