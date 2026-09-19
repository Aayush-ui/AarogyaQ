Write-Host "===================================================" -ForegroundColor Cyan
Write-Host "          AarogyaQ One-Click Launcher              " -ForegroundColor Cyan
Write-Host "===================================================" -ForegroundColor Cyan
Write-Host ""

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path

Write-Host "[1/3] Starting FastAPI Backend on port 8000..." -ForegroundColor Yellow
$pythonPath = "$scriptDir\.venv\Scripts\python.exe"
if (-not (Test-Path $pythonPath)) { $pythonPath = "python" }

Start-Process -FilePath $pythonPath -ArgumentList "-m uvicorn aarogyaq.api:app --host 127.0.0.1 --port 8000 --app-dir src" -WorkingDirectory "$scriptDir\backend" -WindowStyle Minimized

Write-Host "[2/3] Starting React Vite Frontend on port 3000..." -ForegroundColor Yellow
Start-Process -FilePath "cmd.exe" -ArgumentList "/c npm run dev" -WorkingDirectory "$scriptDir\frontend" -WindowStyle Minimized

Write-Host "[3/3] Waiting for servers to initialize..." -ForegroundColor Yellow
Start-Sleep -Seconds 3

Write-Host "Opening browser at http://localhost:3000..." -ForegroundColor Green
Start-Process "http://localhost:3000"

Write-Host "AarogyaQ is now running!" -ForegroundColor Cyan
