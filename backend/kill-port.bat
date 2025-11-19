@echo off
echo Finding process using port 5000...
echo.

for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":5000"') do (
    echo Killing process PID: %%a
    taskkill /PID %%a /F >nul 2>&1
)

timeout /t 2 /nobreak >nul

echo.
echo Port 5000 should now be free.
echo You can now start the backend: npm run dev
pause

