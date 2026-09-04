@echo off
title J.A.R.V.I.S. 2.0 Autonomous Server & Daemon Launcher
color 0A
echo ========================================================
echo   J.A.R.V.I.S. 2.0 — FASTAPI SERVER & DESKTOP DAEMON
echo ========================================================
echo.
echo Launching J.A.R.V.I.S. V1 FastAPI Server (Port 8000)...
start /b py jarvis_server_v1.py || start /b python jarvis_server_v1.py
echo Launching J.A.R.V.I.S. Desktop Daemon (Port 8765)...
start /b py jarvis_desktop_daemon.py || start /b python jarvis_desktop_daemon.py
echo.
echo J.A.R.V.I.S. 2.0 Backend Systems Online!
pause
