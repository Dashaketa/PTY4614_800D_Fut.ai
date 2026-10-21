@echo off
cd /d "%~dp0frontend"
if not exist node_modules call npm ci
if errorlevel 1 goto error
call npm run dev -- --host 127.0.0.1 --port 5173 --strictPort
if errorlevel 1 goto error
pause
exit /b 0
:error
echo Error iniciando frontend. Verifica Node.js y npm.
pause
exit /b 1
