const http = require('http');
const { exec } = require('child_process');
const url = require('url');

const PORT = 8765;

const server = http.createServer((req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-JARVIS-TOKEN');

  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }

  const reqUrl = url.parse(req.url, true);
  const cmd = (reqUrl.query.cmd || '').toLowerCase().trim();
  const master = process.env.JARVIS_ACCESS_TOKEN || '';
  const incoming = (req.headers['x-jarvis-token'] || req.headers['authorization'] || reqUrl.query.token || '').toString().replace(/^Bearer\s+/i, '');
  if (master && incoming !== master && !incoming.includes('.')) {
    res.writeHead(401, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status: 'error', message: 'Desktop daemon authentication required.' }));
    return;
  }

  res.writeHead(200, { 'Content-Type': 'application/json' });

  if (!cmd) {
    res.end(JSON.stringify({ status: 'error', message: 'No command provided' }));
    return;
  }

  console.log(`⚡ [JARVIS DESKTOP DAEMON v2.5] Command Received: ${cmd}`);

  let sysCmd = '';
  let msg = '';

  if (['explorer', 'file_explorer', 'file explorer', 'files', 'c_drive'].includes(cmd)) {
    sysCmd = 'powershell -Command "Start-Process explorer.exe"';
    msg = 'Windows File Explorer opened on PC desktop!';
  } else if (['bluetooth', 'bluetooth_on', 'bt'].includes(cmd)) {
    sysCmd = 'powershell -Command "Start-Process ms-settings:bluetooth"';
    msg = 'Bluetooth settings opened on PC desktop!';
  } else if (['taskmgr', 'task_manager', 'task manager'].includes(cmd)) {
    sysCmd = 'powershell -Command "Start-Process taskmgr.exe"';
    msg = 'Task Manager opened!';
  } else if (['control', 'control_panel', 'control panel'].includes(cmd)) {
    sysCmd = 'powershell -Command "Start-Process control.exe"';
    msg = 'Control Panel opened!';
  } else if (cmd === 'notepad') {
    sysCmd = 'powershell -Command "Start-Process notepad.exe"';
    msg = 'Notepad opened!';
  } else if (['calc', 'calculator'].includes(cmd)) {
    sysCmd = 'powershell -Command "Start-Process calc:"';
    msg = 'Calculator opened!';
  } else if (['cmd', 'command_prompt', 'terminal', 'command prompt'].includes(cmd)) {
    sysCmd = 'powershell -Command "Start-Process cmd.exe"';
    msg = 'Command Prompt opened!';
  } else if (['powershell', 'ps'].includes(cmd)) {
    sysCmd = 'powershell -Command "Start-Process powershell.exe"';
    msg = 'PowerShell opened!';
  } else if (['chatgpt', 'whatsapp', 'instagram', 'facebook', 'youtube', 'gmail', 'maps', 'google'].includes(cmd)) {
    const urlMap = {
      chatgpt: 'https://chatgpt.com',
      whatsapp: 'https://web.whatsapp.com',
      instagram: 'https://www.instagram.com',
      facebook: 'https://www.facebook.com',
      youtube: 'https://www.youtube.com',
      gmail: 'https://mail.google.com',
      maps: 'https://maps.google.com',
      google: 'https://www.google.com'
    };
    const targetUrl = urlMap[cmd] || 'https://google.com';
    sysCmd = `powershell -Command "Start-Process '${targetUrl}'"`;
    msg = `${cmd.toUpperCase()} opened on PC desktop!`;
  } else if (cmd.startsWith('close_')) {
    const target = cmd.replace('close_', '').trim();
    if (['explorer', 'file_explorer', 'file explorer', 'files', 'fileexplorer'].includes(target)) {
      sysCmd = 'powershell -Command "Stop-Process -Name explorer -Force -ErrorAction SilentlyContinue; Start-Process explorer.exe"';
      msg = 'Windows File Explorer closed!';
    } else if (['calc', 'calculator'].includes(target)) {
      sysCmd = 'powershell -Command "Get-Process | Where-Object {$_.ProcessName -like \'*calc*\'} | Stop-Process -Force -ErrorAction SilentlyContinue"';
      msg = 'Calculator closed!';
    } else if (['notepad'].includes(target)) {
      sysCmd = 'powershell -Command "Stop-Process -Name notepad -Force -ErrorAction SilentlyContinue"';
      msg = 'Notepad closed!';
    } else if (['cmd', 'command_prompt', 'terminal'].includes(target)) {
      sysCmd = 'powershell -Command "Stop-Process -Name cmd -Force -ErrorAction SilentlyContinue"';
      msg = 'Command Prompt closed!';
    } else {
      sysCmd = `powershell -Command "Stop-Process -Name ${target} -Force -ErrorAction SilentlyContinue"`;
      msg = `Closed ${target}`;
    }
  } else {
    sysCmd = `powershell -Command "Start-Process '${cmd}'"`;
    msg = `Executed ${cmd}`;
  }

  if (sysCmd) {
    exec(sysCmd, (err) => {
      if (err) console.log(`Execution note: ${err.message}`);
    });
  }

  res.end(JSON.stringify({ status: 'success', message: msg }));
});

server.listen(PORT, () => {
  console.log(`⚡ [JARVIS DESKTOP DAEMON v2.5] PowerShell Execution Engine Active on http://localhost:${PORT}`);
});
