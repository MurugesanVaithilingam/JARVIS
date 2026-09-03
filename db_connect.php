<?php
/* ================================================================
   STARK INDUSTRIES J.A.R.V.I.S. — DATABASE CONNECTION MANAGER
   ================================================================ */

header('Content-Type: application/json; charset=utf-8');

$host     = '127.0.0.1';
$port     = 3306;
$db_name  = 'jarvis_db';
$username = 'root';
$password = ''; // Default WAMP MySQL password

function getDBConnection() {
    global $host, $port, $db_name, $username, $password;
    try {
        // Connect to MySQL server
        $pdo = new PDO("mysql:host=$host;port=$port;charset=utf8mb4", $username, $password, [
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        ]);
        
        // Auto-create database if not exists
        $pdo->exec("CREATE DATABASE IF NOT EXISTS `$db_name` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci");
        $pdo->exec("USE `$db_name`");
        
        return $pdo;
    } catch (PDOException $e) {
        return null;
    }
}
