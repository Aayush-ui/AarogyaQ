@echo off
title Stop AarogyaQ Services
echo ===================================================
echo          Stopping AarogyaQ Services
echo ===================================================
echo.
echo Stopping backend on port 8000 and frontend on port 3000...
for /f "tokens=5" %%a in ('netstat -aon ^| findstr ":8000" ^| findstr "LISTENING"') do taskkill /f /pid %%a 2>nul
for /f "tokens=5" %%a in ('netstat -aon ^| findstr ":3000" ^| findstr "LISTENING"') do taskkill /f /pid %%a 2>nul

echo All AarogyaQ processes stopped cleanly.
timeout /t 2 /nobreak >nul
