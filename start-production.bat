@echo off
echo Starting PTCL Network Monitor (Production Mode)...
echo.
echo Building frontend...
cd /d "%~dp0frontend"
call npm run build
echo.
echo Starting backend with built frontend...
cd /d "%~dp0backend"
start /B node server.js
echo.
echo PTCL Network Monitor is running in production mode!
echo Access: http://localhost:3001
echo Mobile Access: http://192.168.1.8:3001
echo.
echo Press any key to stop server...
pause >nul
taskkill /f /im node.exe
echo Server stopped.
