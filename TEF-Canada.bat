@echo off
title TEF Canada ? Expression Ecrite
cd /d "%~dp0"

echo.
echo   TEF Canada - Expression Ecrite
echo.

set PORT=18923
set HOST=127.0.0.1
set NODE_ENV=production
set DATABASE_URL=file:%cd%\prisma\db\custom.db

REM Start server in background
echo   Demarrage du serveur...
start /b "" node server.js

REM Wait for server
echo   Attente du serveur...
timeout /t 5 /nobreak >nul

REM Open browser in maximized window mode
set "URL=http://127.0.0.1:18923"
if exist "C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe" (
    start "" "C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe" --start-maximized --app="%URL%"
    goto :done
)
if exist "C:\Program Files\Google\Chrome\Application\chrome.exe" (
    start "" "C:\Program Files\Google\Chrome\Application\chrome.exe" --start-maximized --app="%URL%"
    goto :done
)
start "" "%URL%"

:done
echo.
echo   Application prete.
echo   Fermez cette fenetre pour arreter le serveur.
echo.

:loop
timeout /t 5 /nobreak >nul
goto :loop
