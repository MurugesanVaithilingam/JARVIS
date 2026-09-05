@echo off
title J.A.R.V.I.S. V1 — Voice Server + Desktop Daemon
color 0A
echo ========================================================
echo   J.A.R.V.I.S. V1 — STABLE VOICE PIPELINE LAUNCHER
echo ========================================================
echo.
cd /d "%~dp0"
echo [1/2] Starting Desktop Daemon (Port 8765)...
start "JARVIS Desktop Daemon" /min cmd /c "py jarvis_desktop_daemon.py"
timeout /t 1 /nobreak >nul
echo [2/2] Starting Voice Server (Port 8000)...
start "JARVIS Voice Server" /min cmd /c "py jarvis_server_v1.py"
timeout /t 2 /nobreak >nul
echo.
echo ========================================================
echo   JARVIS V1 ONLINE
echo   Voice Server:  http://localhost:8000
echo   Desktop Daemon: http://localhost:8765
echo   Web HUD:       http://localhost/jarvis/
echo ========================================================
echo.
echo Test commands:
echo   "Jarvis, are you listening?"
echo   "Open Chrome"
echo.
pause
