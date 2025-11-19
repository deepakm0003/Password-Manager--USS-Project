Write-Host "=== Starting Backend Server ===" -ForegroundColor Green
Write-Host ""

# Navigate to backend directory
$scriptPath = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $scriptPath

# Check if node_modules exists
if (-not (Test-Path "node_modules")) {
    Write-Host "Installing dependencies..." -ForegroundColor Yellow
    npm install
    Write-Host ""
}

Write-Host "Starting development server..." -ForegroundColor Cyan
Write-Host "Backend will be available at: http://localhost:5000" -ForegroundColor Cyan
Write-Host "Press Ctrl+C to stop the server" -ForegroundColor Yellow
Write-Host ""

# Start the server
npm run dev

