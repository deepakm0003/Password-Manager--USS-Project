@echo off
echo Starting Backend Server...
echo.
cd /d "%~dp0"
if not exist "node_modules" (
    echo Installing dependencies...
    call npm install
)
echo.
echo Starting development server...
echo Backend will be available at: http://localhost:5000
echo.
call npm run dev
pause

