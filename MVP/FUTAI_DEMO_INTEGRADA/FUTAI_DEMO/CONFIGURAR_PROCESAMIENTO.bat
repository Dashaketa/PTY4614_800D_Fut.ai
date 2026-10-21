@echo off
setlocal
cd /d "%~dp0backend"
if not exist .venv\Scripts\python.exe py -3.11 -m venv .venv
if errorlevel 1 goto error
.venv\Scripts\python.exe -m pip install -r requirements.txt
if errorlevel 1 goto error
.venv\Scripts\python.exe configure_processing.py %*
if errorlevel 1 goto error
echo Configuracion lista. Inicia backend y frontend en sus terminales.
pause
exit /b 0
:error
echo No se pudo configurar el motor. Revisa el error anterior; la importacion JSON sigue disponible.
pause
exit /b 1
