Write-Host "Starting Expo with LAN mode..." -ForegroundColor Green
Write-Host ""
Write-Host "NOTE: If connection fails, you may need to:" -ForegroundColor Yellow
Write-Host "1. Allow Node.js through Windows Firewall (run as Administrator):" -ForegroundColor Yellow
Write-Host "   netsh advfirewall firewall add rule name=`"Expo Dev Server`" dir=in action=allow protocol=TCP localport=8081" -ForegroundColor Cyan
Write-Host ""
Write-Host "2. Or use tunnel mode instead: npm run start:tunnel" -ForegroundColor Yellow
Write-Host ""
Write-Host "Press Ctrl+C to stop the server" -ForegroundColor Gray
Write-Host ""

npx expo start --lan --clear

