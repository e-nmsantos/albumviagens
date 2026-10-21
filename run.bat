@echo off
title Memorias - Diario de Viagens
cd /d "%~dp0"

echo ======================================================
echo           MEMORIAS - DIARIO DE VIAGENS
echo ======================================================
echo.

where node >nul 2>nul
if %errorlevel% neq 0 (
    echo [ERRO] O Node.js nao foi encontrado no sistema.
    echo Por favor instala o Node.js em: https://nodejs.org/
    echo.
    pause
    exit /b
)

if not exist "node_modules\" (
    echo [AVISO] Pasta node_modules nao encontrada.
    echo A instalar dependencias pela primeira vez...
    call npm install
    echo.
)

echo A iniciar o servidor da aplicacao...
echo O teu navegador vai abrir automaticamente em http://localhost:8080
echo.
echo (Para parar a app, podes fechar esta janela ou pressionar Ctrl+C)
echo ======================================================
echo.

start "" cmd /c "timeout /t 3 /nobreak >nul & start http://localhost:8080"
call npm run dev

pause

