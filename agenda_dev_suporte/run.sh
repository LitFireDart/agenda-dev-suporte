#!/usr/bin/env bash

# DevAgenda - Script de inicialização para Linux / macOS
set -e

DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" >/dev/null 2>&1 && pwd )"
cd "$DIR"

if [ ! -f .env ]; then
    echo "Criando .env a partir de .env.example..."
    cp .env.example .env
fi

if [ -d "venv" ]; then
    source venv/bin/activate
fi

echo "========================================================"
echo "        DevAgenda - Gestão de Suporte e Dev             "
echo "========================================================"
echo "Servidor rodando em: http://localhost:8000"
echo "Login inicial: admin / admin123"
echo "========================================================"

uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
