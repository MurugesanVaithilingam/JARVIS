const http = require('http');
const { exec } = require('child_process');
const url = require('url');

const PORT = 8765;

const server = http.createServer((req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }

  const reqUrl = url.parse(req.url, true);
  const cmd = (reqUrl.query.cmd || '').toLowerCase().trim();

  res.writeHead(200, { 'Content-Type': 'application/json' });

  if (!cmd) {
    res.end(JSON.stringify({ status: 'error', message: 'No command provided' }));
    return;
  }

  console.log(`⚡ [JARVIS DESKTOP DAEMON] Received Command: ${cmd}`);

  let sysCmd = '';
  let msg = '';

  if (['explorer', 'file_explorer', 'file explorer', 'files', 'c_drive'].includes(cmd)) {
    sysCmd = 'explorer.exe';
    msg = 'Windows File Explorer opened on PC desktop!';
  } else if (['bluetooth', 'bluetooth_on', 'bt'].includes(cmd)) {
    sysCmd = 'start ms-settings:bluetooth';
    msg = 'Bluetooth settings opened on PC desktop!';
  } else if (['taskmgr', 'task_manager', 'task manager'].includes(cmd)) {
    sysCmd = 'taskmgr.exe';
    msg = 'Task Manager opened!';
  } else if (['control', 'control_panel', 'control panel'].includes(cmd)) {
    sysCmd = 'control.exe';
    msg = 'Control Panel opened!';
  } else if (cmd === 'notepad') {
    sysCmd = 'notepad.exe';
    msg = 'Notepad opened!';
  } else if (['calc', 'calculator'].includes(cmd)) {
    sysCmd = 'calc.exe';
    msg = 'Calculator opened!';
  } else if (['cmd', 'command_prompt', 'terminal', 'command prompt'].includes(cmd)) {
    sysCmd = 'start cmd.exe';
    msg = 'Command Prompt opened!';
  } else if (['powershell', 'ps'].includes(cmd)) {
    sysCmd = 'start powershell.exe';
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
    sysCmd = `start ${targetUrl}`;
    msg = `${cmd.toUpperCase()} opened on PC desktop!`;
  } else if (cmd.startsWith('close_')) {
    const target = cmd.replace('close_', '').trim();
    if (['explorer', 'file_explorer', 'file explorer', 'files', 'fileexplorer'].includes(target)) {
      sysCmd = 'taskkill /f /im explorer.exe & start explorer.exe';
      msg = 'Windows File Explorer closed!';
    } else if (['whatsapp', 'chatgpt', 'instagram', 'facebook', 'youtube', 'gmail'].includes(target)) {
      sysCmd = `taskkill /f /im chrome.exe /fi "WINDOWTITLE eq *${target}*" || taskkill /f /im msedge.exe`;
      msg = `Closed ${target}`;
    } else {
      sysCmd = `taskkill /f /im ${target}.exe`;
      msg = `Closed ${target}`;
    }
  } else {
    sysCmd = `start ${cmd}`;
    msg = `Executed ${cmd}`;
  }

  if (sysCmd) {
    exec(sysCmd, (err) => {
      if (err) console.log(`Execution warning: ${err.message}`);
    });
  }

  res.end(JSON.stringify({ status: 'success', message: msg }));
});

server.listen(PORT, () => {
  console.log(`⚡ [JARVIS DESKTOP DAEMON v2.0] Running active on http://localhost:${PORT}`);
});
