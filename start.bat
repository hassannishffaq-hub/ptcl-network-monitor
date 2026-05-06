@echo off
echo Starting PTCL Network Monitor...
echo.
echo Backend Server...
cd /d "%~dp0backend"
start /B npm run dev
timeout /t 3 /nobreak >nul
echo Frontend Server...
cd /d "%~dp0frontend"
start /B npm run dev
echo.
echo PTCL Network Monitor is starting...
echo Backend: http://localhost:3001
echo Frontend: http://localhost:5173
echo.
echo Press any key to stop all servers...
pause >nul
taskkill /f /im node.exe
echo All servers stopped.
