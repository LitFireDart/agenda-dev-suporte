@echo off
chcp 65001 > nul
title DevAgenda - Servidor Local

echo ========================================================
echo         DevAgenda - Gestao de Suporte e Dev             
echo ========================================================
echo.

if not exist .env (
    echo Criando arquivo .env a partir de .env.example...
    copy .env.example .env > nul
)

echo Iniciando o servidor DevAgenda...
echo.
echo Acesse no navegador: http://localhost:8000
echo Login padrao: admin / admin123
echo.
echo Pressione Ctrl+C para encerrar o servidor.
echo --------------------------------------------------------

py -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
pause
