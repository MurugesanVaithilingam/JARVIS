<?php
/* ================================================================
   STARK INDUSTRIES — REAL MYSQL DATABASE INITIALIZER (setup_database.php)
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
    $pdo->exec("INSERT IGNORE INTO `users` (`username`, `full_name`, `email`, `password_hash`, `pin`, `clearance_level`, `role`) VALUES
    ('tonystark', 'Anthony Edward Stark', 'tony.stark@starkindustries.com', '" . password_hash('jarvis1003', PASSWORD_DEFAULT) . "', '1003', 5, 'Stark Industries Founder & CEO');");

    // 2. AI Providers Table
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

    // Seed AI Providers
    $pdo->exec("INSERT IGNORE INTO `ai_providers` (`provider_key`, `name`, `icon`, `endpoint`, `is_free`, `context_window`) VALUES
    ('pollinations', 'Pollinations AI', '🌸', 'https://text.pollinations.ai/openai', 1, '128K'),
    ('openai', 'OpenAI ChatGPT', '🤖', 'https://api.openai.com/v1/chat/completions', 0, '128K'),
    ('claude', 'Anthropic Claude', '🎭', 'https://api.anthropic.com/v1/messages', 0, '200K'),
    ('gemini', 'Google Gemini', '✨', 'https://generativelanguage.googleapis.com/v1beta/models', 1, '1M'),
    ('deepseek', 'DeepSeek AI', '🔍', 'https://api.deepseek.com/v1/chat/completions', 1, '128K'),
    ('grok', 'xAI Grok', '⚡', 'https://api.x.ai/v1/chat/completions', 0, '128K'),
    ('groq', 'Groq LPU Engine', '⚡', 'https://api.groq.com/openai/v1/chat/completions', 1, '128K'),
    ('mistral', 'Mistral AI', '🌪️', 'https://api.mistral.ai/v1/chat/completions', 1, '128K'),
    ('huggingface', 'Hugging Face', '🤗', 'https://api-inference.huggingface.co/models', 1, '32K'),
    ('ollama', 'Ollama Local AI', '🏠', 'http://localhost:11434/api/generate', 1, '32K');");

    // 3. AI Models Table
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

    // Seed Real AI Models
    $pdo->exec("INSERT IGNORE INTO `ai_models` (`model_code`, `provider_key`, `label`, `architecture`, `description`) VALUES
    ('gpt-4o', 'openai', 'GPT-4o Omnimodal', 'Multimodal Transformer', 'Flagship reasoning and multimodal capabilities by OpenAI'),
    ('claude-3-5-sonnet-20241022', 'claude', 'Claude 3.5 Sonnet', 'Anthropic Claude Engine', 'Highest intelligence code and text synthesis model'),
    ('gemini-1.5-pro', 'gemini', 'Gemini 1.5 Pro', 'Google Pathways', '1M token long-context multimodal model'),
    ('deepseek-chat', 'deepseek', 'DeepSeek V3 / R1', 'MoE DeepSeek Sparse', 'DeepSeek MoE open architecture with fast inference'),
    ('llama-3.3-70b-versatile', 'groq', 'Llama 3.3 70B', 'Meta Llama Engine', 'Groq LPU ultra-fast token execution engine'),
    ('mistral-large-latest', 'mistral', 'Mistral Large 2', 'Mistral AI', 'Top tier open weight flagship model');");

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

    // Seed initial welcome message in database
    $pdo->exec("INSERT IGNORE INTO `chat_messages` (`session_id`, `provider_key`, `role`, `content`, `tokens_used`) VALUES
    ('default_session', 'pollinations', 'assistant', '👋 **Welcome back, Mr. Stark. All J.A.R.V.I.S. systems and MySQL databases are 100% connected and operational!**', 28);");

    // 5. Suit Telemetry Table
    $pdo->exec("CREATE TABLE IF NOT EXISTS `suit_telemetry` (
        `id` INT AUTO_INCREMENT PRIMARY KEY,
        `suit_mark` VARCHAR(50) DEFAULT 'MARK 85',
        `power_level` INT DEFAULT 100,
        `armor_integrity` INT DEFAULT 100,
        `arc_reactor_output` VARCHAR(50) DEFAULT '1.2 GJ/s',
        `weapons_status` VARCHAR(50) DEFAULT 'ONLINE 100%',
        `thrusters_status` VARCHAR(50) DEFAULT 'NOMINAL',
        `last_updated` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    ) ENGINE=InnoDB;");

    $pdo->exec("INSERT IGNORE INTO `suit_telemetry` (`id`, `suit_mark`, `power_level`, `armor_integrity`, `arc_reactor_output`) VALUES
    (1, 'MARK 85', 100, 100, '1.21 GW');");

    // 6. Cyber Security Threats & System Logs Table
    $pdo->exec("CREATE TABLE IF NOT EXISTS `cyber_threats` (
        `id` INT AUTO_INCREMENT PRIMARY KEY,
        `target_ip` VARCHAR(50) NOT NULL,
        `threat_type` VARCHAR(100) NOT NULL,
        `severity` ENUM('LOW', 'MEDIUM', 'HIGH', 'CRITICAL') DEFAULT 'MEDIUM',
        `status` VARCHAR(50) DEFAULT 'NEUTRALIZED',
        `detected_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB;");

    $pdo->exec("INSERT IGNORE INTO `cyber_threats` (`target_ip`, `threat_type`, `severity`, `status`) VALUES
    ('192.168.1.104', 'Unauthorized Port Scan', 'MEDIUM', 'NEUTRALIZED'),
    ('10.0.4.88', 'Brute Force SSH Attack', 'HIGH', 'BLOCKED'),
    ('172.16.0.12', 'SQL Injection Attempt', 'CRITICAL', 'NEUTRALIZED');");

    echo json_encode([
        'status' => 'success',
        'database' => 'jarvis_db',
        'message' => 'J.A.R.V.I.S. MySQL database setup completed successfully! Real tables populated with live data.'
    ], JSON_PRETTY_PRINT);

} catch (PDOException $e) {
    echo json_encode(['status' => 'error', 'message' => $e->getMessage()]);
}
