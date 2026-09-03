#!/usr/bin/env python3
"""
===================================================================
J.A.R.V.I.S. DESKTOP LOCAL DAEMON v2.0 (Clean JSON Automation Server)
Runs on http://localhost:8765
Executes Windows File Explorer, Bluetooth, Task Manager, Control Panel, etc.
directly on active user desktop with clean CORS JSON responses!
===================================================================
"""

import os
import sys
import json
import subprocess
from http.server import HTTPServer, BaseHTTPRequestHandler
from urllib.parse import parse_qs, urlparse

class JarvisDaemonHandler(BaseHTTPRequestHandler):
    def log_message(self, format, *args):
        # Clean logging format with newline
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

        response = {'status': 'error', 'message': 'Unknown command'}

        if cmd in ['explorer', 'file_explorer', 'file explorer', 'files', 'c_drive']:
            if sys.platform == 'win32':
                subprocess.Popen('explorer.exe')
            response = {'status': 'success', 'message': 'Windows File Explorer opened on PC desktop!'}

        elif cmd in ['bluetooth', 'bluetooth_on', 'bt']:
            if sys.platform == 'win32':
                subprocess.Popen('start ms-settings:bluetooth', shell=True)
                ps_script = os.path.join(os.path.dirname(__file__), 'turn_on_bluetooth.ps1')
                if os.path.exists(ps_script):
                    subprocess.Popen(f'powershell -ExecutionPolicy Bypass -File "{ps_script}"', shell=True)
            response = {'status': 'success', 'message': 'Bluetooth activated and panel opened on PC desktop!'}

        elif cmd in ['taskmgr', 'task_manager', 'task manager']:
            if sys.platform == 'win32':
                subprocess.Popen('taskmgr.exe')
            response = {'status': 'success', 'message': 'Task Manager opened!'}

        elif cmd in ['control', 'control_panel']:
            if sys.platform == 'win32':
                subprocess.Popen('control.exe')
            response = {'status': 'success', 'message': 'Control Panel opened!'}

        elif cmd == 'notepad':
            if sys.platform == 'win32':
                subprocess.Popen('notepad.exe')
            response = {'status': 'success', 'message': 'Notepad opened!'}

        elif cmd in ['calc', 'calculator']:
            if sys.platform == 'win32':
                subprocess.Popen('calc.exe')
            response = {'status': 'success', 'message': 'Calculator opened!'}

        elif cmd in ['chatgpt', 'whatsapp', 'instagram', 'facebook', 'youtube', 'gmail', 'maps', 'google']:
            url_map = {
                'chatgpt': 'https://chatgpt.com',
                'whatsapp': 'https://web.whatsapp.com',
                'instagram': 'https://www.instagram.com',
                'facebook': 'https://www.facebook.com',
                'youtube': 'https://www.youtube.com',
                'gmail': 'https://mail.google.com',
                'maps': 'https://maps.google.com',
                'google': 'https://www.google.com'
            }
            target_url = url_map.get(cmd, 'https://google.com')
            if sys.platform == 'win32':
                subprocess.Popen(f'start {target_url}', shell=True)
            response = {'status': 'success', 'message': f'{cmd.capitalize()} opened on PC desktop!'}

        elif cmd.startswith('close_'):
            target = cmd.replace('close_', '').strip()
            if target in ['explorer', 'file_explorer', 'file explorer', 'files', 'fileexplorer']:
                if sys.platform == 'win32':
                    subprocess.Popen('taskkill /f /im explorer.exe & start explorer.exe', shell=True)
                response = {'status': 'success', 'message': 'Windows File Explorer closed!'}
            else:
                if sys.platform == 'win32':
                    subprocess.Popen(f'taskkill /f /im {target}.exe', shell=True)
                response = {'status': 'success', 'message': f'Closed {target}'}

        self.wfile.write(json.dumps(response).encode('utf-8'))

def run_server(port=8765):
    server_address = ('', port)
    httpd = HTTPServer(server_address, JarvisDaemonHandler)
    print(f"⚡ [JARVIS DESKTOP DAEMON v2.0] Active on http://localhost:{port}")
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        httpd.server_close()

if __name__ == '__main__':
    run_server()
