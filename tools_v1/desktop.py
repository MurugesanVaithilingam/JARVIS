"""
===================================================================
J.A.R.V.I.S. V1 — DESKTOP & WINDOWS CONTROLLER MODULE
===================================================================
Handles native cross-platform application launching, focus, window
maximization, minimization, and closure.
"""

import sys
import os
import subprocess
import logging

logger = logging.getLogger("JarvisDesktop")
logger.setLevel(logging.INFO)

class DesktopController:
    @staticmethod
    def launch_app(app_name: str) -> dict:
        app_clean = app_name.lower().strip()
        plat = sys.platform

        logger.info(f"Launching desktop application: '{app_clean}' on OS: '{plat}'")

        try:
            if app_clean in ['explorer', 'file explorer', 'finder', 'files']:
                if plat == 'win32': subprocess.Popen('explorer.exe')
                elif plat == 'darwin': subprocess.Popen(['open', '-a', 'Finder'])
                else: subprocess.Popen(['xdg-open', os.path.expanduser('~')])

            elif app_clean in ['cmd', 'terminal', 'command prompt']:
                if plat == 'win32': subprocess.Popen('cmd.exe /c start cmd.exe', shell=True)
                elif plat == 'darwin': subprocess.Popen(['open', '-a', 'Terminal'])
                else: subprocess.Popen(['gnome-terminal'])

            elif app_clean in ['vscode', 'vs code', 'code']:
                if plat == 'win32': subprocess.Popen('code', shell=True)
                elif plat == 'darwin': subprocess.Popen(['open', '-a', 'Visual Studio Code'])
                else: subprocess.Popen(['code'])

            elif app_clean in ['taskmgr', 'task manager', 'activity monitor']:
                if plat == 'win32': subprocess.Popen('taskmgr.exe')
                elif plat == 'darwin': subprocess.Popen(['open', '-a', 'Activity Monitor'])
                else: subprocess.Popen(['gnome-system-monitor'])

            elif app_clean in ['notepad', 'textedit']:
                if plat == 'win32': subprocess.Popen('notepad.exe')
                elif plat == 'darwin': subprocess.Popen(['open', '-a', 'TextEdit'])
                else: subprocess.Popen(['gedit'])

            elif app_clean in ['calc', 'calculator']:
                if plat == 'win32': subprocess.Popen('calc.exe')
                elif plat == 'darwin': subprocess.Popen(['open', '-a', 'Calculator'])
                else: subprocess.Popen(['gnome-calculator'])

            else:
                # Fallback: shell execution
                if plat == 'win32':
                    subprocess.Popen(f'start {app_clean}', shell=True)
                elif plat == 'darwin':
                    subprocess.Popen(['open', '-a', app_name])
                else:
                    subprocess.Popen([app_clean])

            return {"status": "success", "message": f"Successfully launched {app_name}"}

        except Exception as e:
            logger.error(f"Error launching app '{app_name}': {e}")
            return {"status": "error", "message": f"Failed to launch {app_name}: {str(e)}"}

    @staticmethod
    def close_app(app_name: str) -> dict:
        app_clean = app_name.lower().strip()
        plat = sys.platform

        try:
            if plat == 'win32':
                exe = app_clean if app_clean.endswith('.exe') else f"{app_clean}.exe"
                subprocess.Popen(f'taskkill /F /IM {exe}', shell=True)
            elif plat == 'darwin':
                subprocess.Popen(['killall', app_name])
            else:
                subprocess.Popen(['killall', app_clean])

            return {"status": "success", "message": f"Closed application {app_name}"}
        except Exception as e:
            return {"status": "error", "message": f"Could not close {app_name}: {str(e)}"}

    @staticmethod
    def maximize_window(app_name: str) -> dict:
        if sys.platform == 'win32':
            try:
                import win32gui, win32con
                def enum_windows_callback(hwnd, extra):
                    title = win32gui.GetWindowText(hwnd)
                    if app_name.lower() in title.lower():
                        win32gui.ShowWindow(hwnd, win32con.SW_MAXIMIZE)
                        win32gui.SetForegroundWindow(hwnd)
                win32gui.EnumWindows(enum_windows_callback, None)
                return {"status": "success", "message": f"Maximized window matching '{app_name}'"}
            except Exception as e:
                return {"status": "error", "message": f"Window maximize failed: {e}"}
        return {"status": "info", "message": "Window maximize supported natively on Windows"}
