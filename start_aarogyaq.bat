@echo off
title AarogyaQ One-Click Launcher
echo ===================================================
echo           AarogyaQ Clinical AI Platform
echo ===================================================
echo.
echo [1/3] Starting FastAPI Backend on port 8000...
cd /d "%~dp0backend"
if exist "%~dp0.venv\Scripts\python.exe" (
    start "AarogyaQ Backend" /min "%~dp0.venv\Scripts\python.exe" -m uvicorn aarogyaq.api:app --host 127.0.0.1 --port 8000 --app-dir src
) else if exist "%~dp0backend\venv\Scripts\python.exe" (
    start "AarogyaQ Backend" /min "%~dp0backend\venv\Scripts\python.exe" -m uvicorn aarogyaq.api:app --host 127.0.0.1 --port 8000 --app-dir src
) else (
    start "AarogyaQ Backend" /min python -m uvicorn aarogyaq.api:app --host 127.0.0.1 --port 8000 --app-dir src
)

echo [2/3] Starting React Vite Frontend on port 3000...
cd /d "%~dp0frontend"
start "AarogyaQ Frontend" /min cmd /c "npm run dev"

echo [3/3] Waiting for servers to initialize...
timeout /t 3 /nobreak >nul

echo Opening browser at http://localhost:3000...
start http://localhost:3000

echo.
echo ===================================================
echo AarogyaQ is running!
echo - Web App:   http://localhost:3000
echo - Swagger:   http://localhost:8000/docs
echo.
echo To stop the servers anytime, run stop_aarogyaq.bat
echo ===================================================
timeout /t 5 >nul
