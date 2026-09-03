<?php
/**
 * J.A.R.V.I.S. & CHITTI 5.0 — Native System & Device Action Executor
 * Full System Access: File Explorer, Bluetooth, System Diagnostics & Telemetry
 */

header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');
header('Content-Type: application/json');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

$raw = file_get_contents('php://input');
$data = json_decode($raw, true);

if (!$data || !isset($data['action'])) {
    echo json_encode(['status' => 'error', 'message' => 'Invalid request: missing action']);
    exit;
}

$action = $data['action'];
$baseDir = __DIR__;

function runWinCmd($cmd) {
    if (strtoupper(substr(PHP_OS, 0, 3)) === 'WIN') {
        @pclose(@popen("start \"\" " . $cmd, "r"));
        @exec("powershell -Command \"Start-Process {$cmd}\"");
    } else {
        @exec($cmd . " > /dev/null 2>&1 &");
    }
}

switch ($action) {
    case 'launch_app':
        $app = strtolower(trim($data['app'] ?? ''));

        if (in_array($app, ['bluetooth', 'bluetooth_on', 'bluetooth on', 'bt'])) {
            runWinCmd('ms-settings:bluetooth');
            echo json_encode(['status' => 'success', 'message' => 'Bluetooth Device Settings opened on PC']);
        } elseif (in_array($app, ['explorer', 'file explorer', 'file_explorer', 'my computer', 'files', 'c drive'])) {
            runWinCmd('explorer.exe');
            echo json_encode(['status' => 'success', 'message' => 'Windows File Explorer opened (C:\\)']);
        } elseif (in_array($app, ['taskmgr', 'task manager', 'task_manager'])) {
            runWinCmd('taskmgr.exe');
            echo json_encode(['status' => 'success', 'message' => 'Windows Task Manager opened']);
        } elseif (in_array($app, ['control', 'control panel', 'control_panel'])) {
            runWinCmd('control.exe');
            echo json_encode(['status' => 'success', 'message' => 'Windows Control Panel opened']);
        } elseif (in_array($app, ['settings', 'ms-settings'])) {
            runWinCmd('ms-settings:');
            echo json_encode(['status' => 'success', 'message' => 'Windows System Settings opened']);
        } elseif ($app === 'notepad') {
            runWinCmd('notepad.exe');
            echo json_encode(['status' => 'success', 'message' => 'Notepad opened']);
        } elseif ($app === 'calculator' || $app === 'calc') {
            runWinCmd('calc.exe');
            echo json_encode(['status' => 'success', 'message' => 'Calculator opened']);
        } elseif ($app === 'cmd' || $app === 'terminal' || $app === 'command prompt') {
            runWinCmd('cmd.exe');
            echo json_encode(['status' => 'success', 'message' => 'Command Prompt opened']);
        } elseif ($app === 'powershell') {
            runWinCmd('powershell.exe');
            echo json_encode(['status' => 'success', 'message' => 'PowerShell opened']);
        } elseif ($app === 'chatgpt') {
            runWinCmd('https://chatgpt.com');
            echo json_encode(['status' => 'success', 'message' => 'ChatGPT opened on Windows']);
        } elseif ($app === 'whatsapp') {
            runWinCmd('https://web.whatsapp.com');
            echo json_encode(['status' => 'success', 'message' => 'WhatsApp opened on Windows']);
        } elseif ($app === 'instagram') {
            runWinCmd('https://instagram.com');
            echo json_encode(['status' => 'success', 'message' => 'Instagram opened on Windows']);
        } elseif ($app === 'facebook') {
            runWinCmd('https://facebook.com');
            echo json_encode(['status' => 'success', 'message' => 'Facebook opened on Windows']);
        } elseif ($app === 'gmail') {
            runWinCmd('https://mail.google.com');
            echo json_encode(['status' => 'success', 'message' => 'Gmail opened on Windows']);
        } elseif ($app === 'maps') {
            runWinCmd('https://maps.google.com');
            echo json_encode(['status' => 'success', 'message' => 'Google Maps opened on Windows']);
        } elseif ($app === 'youtube') {
            runWinCmd('https://www.youtube.com');
            echo json_encode(['status' => 'success', 'message' => 'YouTube opened in browser']);
        } elseif ($app === 'google' || $app === 'chrome' || $app === 'browser') {
            runWinCmd('https://www.google.com');
            echo json_encode(['status' => 'success', 'message' => 'Google Chrome opened']);
        } elseif (in_array($app, ['close_explorer', 'close_file_explorer', 'close_files', 'close_fileexplorer'])) {
            runWinCmd('taskkill /f /im explorer.exe & start explorer.exe');
            echo json_encode(['status' => 'success', 'message' => 'Windows File Explorer closed/reset']);
        } elseif (strpos($app, 'close_') === 0) {
            $target = str_replace('close_', '', $app);
            runWinCmd("taskkill /f /im {$target}.exe");
            echo json_encode(['status' => 'success', 'message' => "Closed {$target}"]);
        } else {
            runWinCmd(escapeshellcmd($app));
            echo json_encode(['status' => 'success', 'message' => "Application '$app' launch signal sent."]);
        }
        break;

    case 'get_recent_files':
        $files = @scandir($baseDir);
        $recent = [];
        $cutoff = time() - (86400 * 3); // Last 3 days
        if ($files) {
            foreach ($files as $f) {
                if ($f !== '.' && $f !== '..') {
                    $path = $baseDir . DIRECTORY_SEPARATOR . $f;
                    $mtime = @filemtime($path);
                    if ($mtime && $mtime >= $cutoff) {
                        $recent[] = [
                            'name' => $f,
                            'size' => is_file($path) ? round(@filesize($path) / 1024, 1) . ' KB' : 'DIR',
                            'modified' => date('Y-m-d H:i:s', $mtime),
                            'is_yesterday' => (date('Y-m-d', $mtime) === date('Y-m-d', strtotime('-1 day')))
                        ];
                    }
                }
            }
        }
        usort($recent, fn($a, $b) => strcmp($b['modified'], $a['modified']));
        echo json_encode(['status' => 'success', 'count' => count($recent), 'files' => array_slice($recent, 0, 20)]);
        break;

    case 'get_system_telemetry':
        $drives = [];
        if (strtoupper(substr(PHP_OS, 0, 3)) === 'WIN') {
            $psOut = @shell_exec('powershell -Command "Get-PSDrive -PSProvider FileSystem | Select-Object Name, Used, Free | ConvertTo-Json"');
            if ($psOut) $drives = json_decode($psOut, true);
        }
        $files = @scandir($baseDir);
        $fileList = [];
        if ($files) {
            foreach ($files as $f) {
                if ($f !== '.' && $f !== '..') {
                    $fileList[] = $f;
                }
            }
        }
        echo json_encode([
            'status' => 'success',
            'os' => PHP_OS,
            'workspace' => $baseDir,
            'drives' => $drives,
            'files_count' => count($fileList),
            'files' => array_slice($fileList, 0, 30)
        ]);
        break;

    case 'list_files':
        $dir = !empty($data['path']) ? $data['path'] : $baseDir;
        if (!file_exists($dir)) $dir = $baseDir;

        $files = @scandir($dir);
        $result = [];
        if ($files) {
            foreach ($files as $f) {
                if ($f !== '.' && $f !== '..') {
                    $path = $dir . DIRECTORY_SEPARATOR . $f;
                    $result[] = [
                        'name' => $f,
                        'is_dir' => is_dir($path),
                        'size' => is_file($path) ? @filesize($path) : 0,
                        'modified' => date('Y-m-d H:i:s', @filemtime($path))
                    ];
                }
            }
        }
        echo json_encode(['status' => 'success', 'dir' => $dir, 'files' => array_slice($result, 0, 100)]);
        break;

    case 'read_file':
        $fileName = trim($data['filename'] ?? '');
        if (empty($fileName)) {
            echo json_encode(['status' => 'error', 'message' => 'Filename required']);
            exit;
        }
        $filePath = (file_exists($fileName)) ? $fileName : ($baseDir . DIRECTORY_SEPARATOR . basename($fileName));
        if (file_exists($filePath) && is_file($filePath)) {
            $content = file_get_contents($filePath);
            echo json_encode(['status' => 'success', 'filename' => basename($filePath), 'path' => $filePath, 'content' => substr($content, 0, 10000)]);
        } else {
            echo json_encode(['status' => 'error', 'message' => 'File not found: ' . $fileName]);
        }
        break;

    case 'create_file':
    case 'edit_file':
        $fileName = basename($data['filename'] ?? '');
        $content = $data['content'] ?? '';
        if (empty($fileName)) {
            echo json_encode(['status' => 'error', 'message' => 'Filename required']);
            exit;
        }
        $filePath = $baseDir . DIRECTORY_SEPARATOR . $fileName;
        $bytes = file_put_contents($filePath, $content);
        if ($bytes !== false) {
            echo json_encode([
                'status' => 'success',
                'message' => "File '$fileName' written successfully ($bytes bytes).",
                'filename' => $fileName,
                'path' => $filePath
            ]);
        } else {
            echo json_encode(['status' => 'error', 'message' => 'Failed to write file']);
        }
        break;

    case 'run_terminal_cmd':
        $cmd = trim($data['cmd'] ?? '');
        if (empty($cmd)) {
            echo json_encode(['status' => 'error', 'message' => 'No command provided']);
            exit;
        }

        if (strtoupper(substr(PHP_OS, 0, 3)) === 'WIN') {
            $command = "cmd.exe /c " . $cmd . " 2>&1";
        } else {
            $command = $cmd . " 2>&1";
        }

        $output = shell_exec($command);
        if ($output === null || $output === false) {
            $output = "Command executed with no output or error.";
        }

        if (!mb_check_encoding($output, 'UTF-8')) {
            $output = utf8_encode($output);
        }

        echo json_encode([
            'status' => 'success',
            'command' => $cmd,
            'output' => $output
        ]);
        break;

    default:
        echo json_encode(['status' => 'error', 'message' => 'Unknown action: ' . $action]);
        break;
}
