@echo off
chcp 65001 > nul
title DevAgenda - Servidor Local

cd /d "%~dp0"

echo ========================================================
echo         DevAgenda - Gestao de Suporte e Dev
echo ========================================================
echo.
echo Iniciando o servidor local do DevAgenda...
echo.
echo Acesse no navegador: http://127.0.0.1:8000
echo Login padrao: admin / admin123
echo.
echo Pressione Ctrl+C para encerrar o servidor.
echo --------------------------------------------------------

py -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
pause
