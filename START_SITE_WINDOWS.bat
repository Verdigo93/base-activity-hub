@echo off
setlocal
cd /d "%~dp0"
where node >nul 2>&1
if errorlevel 1 (
 echo Node.js is not installed. Please install Node.js 20+ from https://nodejs.org/
 start "" "https://nodejs.org/"
 pause
 exit /b 1
)
echo Starting Base Activity Hub on http://localhost:4173
start "Base Activity Hub - Local Server" /min cmd /k "node api\server.mjs"
timeout /t 3 /nobreak >nul
start "" "http://localhost:4173"
echo.
echo If the browser did not open, go to: http://localhost:4173
echo Keep the Base Activity Hub local server window running.
pause
