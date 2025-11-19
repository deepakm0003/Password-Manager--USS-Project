# Kill process using port 5000
Write-Host "Finding process using port 5000..." -ForegroundColor Yellow

$port = 5000
$connections = netstat -ano | Select-String ":$port\s"

if ($connections) {
    $processIds = $connections | ForEach-Object {
        if ($_ -match '\s+(\d+)\s*$') {
            $matches[1]
        }
    } | Select-Object -Unique

    foreach ($processId in $processIds) {
        Write-Host "Killing process PID: $processId" -ForegroundColor Red
        try {
            Stop-Process -Id $processId -Force -ErrorAction Stop
            Write-Host "✅ Process $processId killed successfully" -ForegroundColor Green
        } catch {
            Write-Host "⚠️  Could not kill process $processId: $_" -ForegroundColor Yellow
        }
    }
    
    Start-Sleep -Seconds 1
    
    # Verify port is free
    $stillInUse = netstat -ano | Select-String ":$port\s"
    if (-not $stillInUse) {
        Write-Host "✅ Port $port is now free!" -ForegroundColor Green
    } else {
        Write-Host "⚠️  Port $port is still in use" -ForegroundColor Yellow
        Write-Host "Try running as Administrator or manually kill the process" -ForegroundColor Yellow
    }
} else {
    Write-Host "✅ Port $port is already free!" -ForegroundColor Green
}

Write-Host ""
Write-Host "You can now start the backend: npm run dev" -ForegroundColor Cyan

