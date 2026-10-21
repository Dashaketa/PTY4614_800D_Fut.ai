@echo off
cd /d "%~dp0backend"
if not exist .venv\Scripts\python.exe py -3.11 -m venv .venv
if errorlevel 1 goto error
.venv\Scripts\python.exe -c "import fastapi,uvicorn,multipart,dotenv" 2>nul
if errorlevel 1 .venv\Scripts\python.exe -m pip install -r requirements.txt
if errorlevel 1 goto error
.venv\Scripts\python.exe -m uvicorn app:app --host 127.0.0.1 --port 8000 --workers 1
if errorlevel 1 goto error
pause
exit /b 0
:error
echo Error iniciando backend. Verifica Python y acceso a Internet para dependencias.
pause
exit /b 1
