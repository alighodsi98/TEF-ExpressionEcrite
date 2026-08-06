@echo off
setlocal
echo.
echo  ===================================
echo   TEF Canada - Build Portable
echo  ===================================
echo.

set DIR=dist-portable

REM Generer le build standalone si absent
if not exist ".next\standalone\server.js" (
    echo [INFO] Build standalone introuvable. Generation du build...
    call npm run build
    if errorlevel 1 goto :error
)

echo [1/5] Nettoyage...
if exist %DIR% rmdir /s /q %DIR%
mkdir %DIR%

echo [2/5] Copie du serveur standalone...
xcopy /s /e /q /y .next\standalone\* %DIR%\
if errorlevel 1 goto :error

echo [3/5] Copie des fichiers statiques et publics...
mkdir %DIR%\.next\static 2>nul
xcopy /s /e /q /y .next\static\* %DIR%\.next\static\
if errorlevel 1 goto :error
mkdir %DIR%\public 2>nul
xcopy /s /e /q /y public\* %DIR%\public\
if errorlevel 1 goto :error

echo [4/5] Copie de la base de donnees (une seule DB : banc de sujets + cle API)...
mkdir %DIR%\prisma\db 2>nul
copy /y prisma\db\custom.db %DIR%\prisma\db\custom.db
if errorlevel 1 goto :error
copy /y prisma\schema.prisma %DIR%\prisma\schema.prisma 2>nul

echo [5/5] Ecriture du .env et du lanceur...
REM Prisma resout le chemin SQLite relativement au repertoire du schema.prisma
REM (dist-portable/prisma/), donc "./db/custom.db" => dist-portable/prisma/db/custom.db
> %DIR%\.env (
    echo DATABASE_URL=file:./db/custom.db
    REM Preserve OPENROUTER_API_KEY from the environment (CI) or from .env (local)
    if defined OPENROUTER_API_KEY (
        echo OPENROUTER_API_KEY=%OPENROUTER_API_KEY%
    ) else if exist .env (
        for /f "tokens=1,* delims==" %%a in (.env) do (
            if /i "%%a"=="OPENROUTER_API_KEY" echo %%a=%%b
        )
    )
)
copy /y TEF-Canada.bat %DIR%\TEF-Canada.bat

echo.
echo  ===================================
echo   Build termine : %DIR%
echo   Lancez: TEF-Canada.bat
echo  ===================================
echo.
pause
exit /b 0

:error
echo.
echo  ===================================
echo   [ERREUR] Echec de la generation du build portable.
echo  ===================================
echo.
pause
exit /b 1
