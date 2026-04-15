# dev.ps1 — Start Protocol backend and frontend in parallel

$root = $PSScriptRoot

Write-Host "Starting Protocol dev servers..." -ForegroundColor Cyan

$backend = Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$root\backend\Protocol.Api'; Write-Host 'Backend starting on http://localhost:5000' -ForegroundColor Green; dotnet run" -PassThru

$frontend = Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$root\frontend'; Write-Host 'Frontend starting on http://localhost:5173' -ForegroundColor Green; npm run dev" -PassThru

Write-Host ""
Write-Host "  Backend : http://localhost:5000" -ForegroundColor Yellow
Write-Host "  Frontend: http://localhost:5173" -ForegroundColor Yellow
Write-Host ""
Write-Host "Close the terminal windows to stop the servers." -ForegroundColor DarkGray
