#!/usr/bin/env python3
"""
===================================================================
J.A.R.V.I.S. DESKTOP LOCAL DAEMON v3.0 (Cross-Platform Software Launcher)
Runs on http://localhost:8765
Supports Windows, macOS, Linux, and Mobile Web launchers for:
- File Explorer / Finder
- Command Prompt / Terminal / PowerShell
- Task Manager / Activity Monitor
- Calculator / Notepad / VS Code / Spotify / Office
- Chrome / WhatsApp / ChatGPT / YouTube / Zoom / Discord / etc.
===================================================================
"""

import os
import sys
import json
import subprocess
import webbrowser
from http.server import HTTPServer, BaseHTTPRequestHandler
from urllib.parse import parse_qs, urlparse

class JarvisDaemonHandler(BaseHTTPRequestHandler):
    def log_message(self, format, *args):
        sys.stderr.write("[%s] %s\n" % (self.log_date_time_string(), format % args))

    def do_OPTIONS(self):
        self.send_response(200)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        self.end_headers()

    def do_GET(self):
        self.send_response(200)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Content-Type', 'application/json')
        self.end_headers()

        parsed = urlparse(self.path)
        params = parse_qs(parsed.query)
        cmd = params.get('cmd', [''])[0].lower().strip()

        response = {'status': 'error', 'message': f'Unknown command: {cmd}'}
        plat = sys.platform  # 'win32', 'darwin', 'linux'

        # ── 1. FILE EXPLORER / FINDER ─────────────────────────────────────
        if cmd in ['explorer', 'file_explorer', 'file explorer', 'files', 'finder', 'c_drive']:
            if plat == 'win32':
                subprocess.Popen('explorer.exe')
            elif plat == 'darwin':
                subprocess.Popen(['open', '-a', 'Finder'])
            else:
                subprocess.Popen(['xdg-open', os.path.expanduser('~')])
            response = {'status': 'success', 'message': 'File Explorer / Finder opened!'}

        # ── 2. BLUETOOTH SETTINGS ─────────────────────────────────────────
        elif cmd in ['bluetooth', 'bluetooth_on', 'bt']:
            if plat == 'win32':
                subprocess.Popen('start ms-settings:bluetooth', shell=True)
                ps_script = os.path.join(os.path.dirname(__file__), 'turn_on_bluetooth.ps1')
                if os.path.exists(ps_script):
                    subprocess.Popen(f'powershell -ExecutionPolicy Bypass -File "{ps_script}"', shell=True)
            elif plat == 'darwin':
                subprocess.Popen(['open', 'x-apple.systempreferences:com.apple.preferences.Bluetooth'])
            else:
                subprocess.Popen(['gnome-control-center', 'bluetooth'])
            response = {'status': 'success', 'message': 'Bluetooth settings opened!'}

        # ── 3. TERMINAL / COMMAND PROMPT / POWERSHELL ────────────────────
        elif cmd in ['cmd', 'command_prompt', 'terminal', 'command prompt']:
            if plat == 'win32':
                subprocess.Popen('cmd.exe /c start cmd.exe', shell=True)
            elif plat == 'darwin':
                subprocess.Popen(['open', '-a', 'Terminal'])
            else:
                subprocess.Popen(['gnome-terminal'])
            response = {'status': 'success', 'message': 'Command Prompt / Terminal opened!'}

        elif cmd in ['powershell', 'ps']:
            if plat == 'win32':
                subprocess.Popen('powershell.exe', shell=True)
            else:
                subprocess.Popen(['pwsh'])
            response = {'status': 'success', 'message': 'PowerShell opened!'}

        # ── 4. TASK MANAGER / ACTIVITY MONITOR ───────────────────────────
        elif cmd in ['taskmgr', 'task_manager', 'task manager', 'activity_monitor']:
            if plat == 'win32':
                subprocess.Popen('taskmgr.exe')
            elif plat == 'darwin':
                subprocess.Popen(['open', '-a', 'Activity Monitor'])
            else:
                subprocess.Popen(['gnome-system-monitor'])
            response = {'status': 'success', 'message': 'Task Manager / Activity Monitor opened!'}

        # ── 5. CONTROL PANEL / SYSTEM SETTINGS ───────────────────────────
        elif cmd in ['control', 'control_panel', 'settings', 'system_settings']:
            if plat == 'win32':
                subprocess.Popen('control.exe')
            elif plat == 'darwin':
                subprocess.Popen(['open', '-a', 'System Settings'])
            else:
                subprocess.Popen(['gnome-control-center'])
            response = {'status': 'success', 'message': 'Control Panel / Settings opened!'}

        # ── 6. NOTEPAD / CALCULATOR / VS CODE ────────────────────────────
        elif cmd in ['notepad', 'editor', 'textedit']:
            if plat == 'win32':
                subprocess.Popen('notepad.exe')
            elif plat == 'darwin':
                subprocess.Popen(['open', '-a', 'TextEdit'])
            else:
                subprocess.Popen(['gedit'])
            response = {'status': 'success', 'message': 'Notepad / Text Editor opened!'}

        elif cmd in ['calc', 'calculator']:
            if plat == 'win32':
                subprocess.Popen('calc.exe')
            elif plat == 'darwin':
                subprocess.Popen(['open', '-a', 'Calculator'])
            else:
                subprocess.Popen(['gnome-calculator'])
            response = {'status': 'success', 'message': 'Calculator opened!'}

        elif cmd in ['vscode', 'code', 'visual_studio_code']:
            if plat == 'win32':
                subprocess.Popen('code', shell=True)
            elif plat == 'darwin':
                subprocess.Popen(['open', '-a', 'Visual Studio Code'])
            else:
                subprocess.Popen(['code'])
            response = {'status': 'success', 'message': 'VS Code opened!'}

        # ── 7. SPOTIFY / MEDIA PLAYERS ────────────────────────────────────
        elif cmd in ['spotify', 'music']:
            if plat == 'win32':
                subprocess.Popen('start spotify', shell=True)
            elif plat == 'darwin':
                subprocess.Popen(['open', '-a', 'Spotify'])
            else:
                webbrowser.open('https://open.spotify.com')
            response = {'status': 'success', 'message': 'Spotify opened!'}

        # ── 8. MS OFFICE (Word, Excel, PowerPoint) ────────────────────────
        elif cmd in ['word', 'msword']:
            if plat == 'win32':
                subprocess.Popen('start winword', shell=True)
            elif plat == 'darwin':
                subprocess.Popen(['open', '-a', 'Microsoft Word'])
            response = {'status': 'success', 'message': 'Microsoft Word opened!'}

        elif cmd in ['excel', 'msexcel']:
            if plat == 'win32':
                subprocess.Popen('start excel', shell=True)
            elif plat == 'darwin':
                subprocess.Popen(['open', '-a', 'Microsoft Excel'])
            response = {'status': 'success', 'message': 'Microsoft Excel opened!'}

        elif cmd in ['powerpoint', 'ppt']:
            if plat == 'win32':
                subprocess.Popen('start powerpnt', shell=True)
            elif plat == 'darwin':
                subprocess.Popen(['open', '-a', 'Microsoft PowerPoint'])
            response = {'status': 'success', 'message': 'Microsoft PowerPoint opened!'}

        # ── 9. WEB & MOBILE APPS (ChatGPT, WhatsApp, YouTube, etc.) ───────
        elif cmd in ['chatgpt', 'whatsapp', 'instagram', 'facebook', 'youtube', 'gmail', 'maps', 'google', 'telegram', 'twitter', 'x', 'linkedin', 'github', 'zoom', 'discord', 'netflix']:
            url_map = {
                'chatgpt': 'https://chatgpt.com',
                'whatsapp': 'https://web.whatsapp.com',
                'instagram': 'https://www.instagram.com',
                'facebook': 'https://www.facebook.com',
                'youtube': 'https://www.youtube.com',
                'gmail': 'https://mail.google.com',
                'maps': 'https://maps.google.com',
                'google': 'https://www.google.com',
                'telegram': 'https://web.telegram.org',
                'twitter': 'https://x.com',
                'x': 'https://x.com',
                'linkedin': 'https://www.linkedin.com',
                'github': 'https://github.com',
                'zoom': 'https://zoom.us',
                'discord': 'https://discord.com',
                'netflix': 'https://www.netflix.com'
            }
            target_url = url_map.get(cmd, 'https://google.com')
            webbrowser.open(target_url)
            response = {'status': 'success', 'message': f'{cmd.capitalize()} opened!'}

        # ── 10. CLOSE COMMANDS ────────────────────────────────────────────
        elif cmd.startswith('close_'):
            target = cmd.replace('close_', '').strip()
            if target in ['explorer', 'file_explorer', 'file explorer', 'files', 'fileexplorer']:
                if plat == 'win32':
                    subprocess.Popen('taskkill /f /im explorer.exe & start explorer.exe', shell=True)
                elif plat == 'darwin':
                    subprocess.Popen(['killall', 'Finder'])
                response = {'status': 'success', 'message': 'File Explorer closed!'}
            else:
                if plat == 'win32':
                    subprocess.Popen(f'taskkill /f /im {target}.exe', shell=True)
                elif plat == 'darwin':
                    subprocess.Popen(['killall', target])
                response = {'status': 'success', 'message': f'Closed {target}'}

        # ── 11. GENERIC SOFTWARE LAUNCH FALLBACK ──────────────────────────
        else:
            try:
                if plat == 'win32':
                    subprocess.Popen(f'start {cmd}', shell=True)
                elif plat == 'darwin':
                    subprocess.Popen(['open', '-a', cmd])
                else:
                    subprocess.Popen(['xdg-open', cmd])
                response = {'status': 'success', 'message': f'Attempted to open {cmd}!'}
            except Exception as e:
                webbrowser.open(f"https://www.google.com/search?q={cmd}")
                response = {'status': 'success', 'message': f'Opened search for {cmd}'}

        self.wfile.write(json.dumps(response).encode('utf-8'))

def run_server(port=8765):
    server_address = ('', port)
    httpd = HTTPServer(server_address, JarvisDaemonHandler)
    print(f"⚡ [JARVIS DESKTOP DAEMON v3.0] Active on http://localhost:{port}")
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        httpd.server_close()

if __name__ == '__main__':
    run_server()
