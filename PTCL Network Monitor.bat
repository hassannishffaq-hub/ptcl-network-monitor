@echo off
title PTCL Network Monitor
color 0A
echo.
echo  ========================================
echo     PTCL NETWORK MONITOR v1.0
echo  ========================================
echo.
echo  Choose an option:
echo  1. Start Development Mode (Backend + Frontend)
echo  2. Start Production Mode (Single Server)
echo  3. Stop All Servers
echo  4. Exit
echo.
set /p choice="Enter your choice (1-4): "

if "%choice%"=="1" goto dev
if "%choice%"=="2" goto production
if "%choice%"=="3" goto stop
if "%choice%"=="4" goto exit

:dev
echo.
echo Starting Development Mode...
cd /d "%~dp0backend"
start "PTCL Backend" cmd /k "npm run dev"
timeout /t 3 /nobreak >nul
cd /d "%~dp0frontend"
start "PTCL Frontend" cmd /k "npm run dev"
timeout /t 5 /nobreak >nul
echo.
echo Development servers started!
echo Backend: http://localhost:3001
echo Frontend: http://localhost:5173
echo.
echo Launching browser...
start http://localhost:5173
echo.
goto menu

:production
echo.
echo Starting Production Mode...
cd /d "%~dp0frontend"
call npm run build
cd /d "%~dp0backend"
start "PTCL Monitor" cmd /k "node server.js"
timeout /t 5 /nobreak >nul
echo.
echo Production server started!
echo Access: http://localhost:3001
echo Mobile: http://192.168.1.8:3001
echo.
echo Launching browser...
start http://localhost:3001
echo.
goto menu

:stop
echo.
echo Stopping all servers...
taskkill /f /im node.exe
echo All servers stopped.
echo.
goto menu

:exit
echo Goodbye!
exit

:menu
echo.
echo Press any key to return to menu...
pause >nul
goto :eof
