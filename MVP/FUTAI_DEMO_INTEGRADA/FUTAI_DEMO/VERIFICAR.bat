@echo off
setlocal
cd /d "%~dp0backend"
if not exist .venv\Scripts\python.exe goto error
.venv\Scripts\python.exe -m pip install -r requirements-dev.txt
if errorlevel 1 goto error
.venv\Scripts\python.exe -m unittest discover -s tests -v
if errorlevel 1 goto error
cd /d "%~dp0frontend"
call npm run build
if errorlevel 1 goto error
echo API, contratos y build verificados.
pause
exit /b 0
:error
echo Fallo de verificacion. Revisa el error anterior.
pause
exit /b 1
