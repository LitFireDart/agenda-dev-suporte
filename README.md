# DevAgenda

**DevAgenda** é um sistema para organizar compromissos, chamados de suporte técnico, manutenções e tarefas de desenvolvimento.

## Funcionalidades

- Calendário interativo com visualizações mensal e semanal.
- Categorias, prioridades, status, pesquisa e filtros.
- Visualização em lista/tabela e ações rápidas.
- Histórico de auditoria e notas de resolução técnica.
- Login com usuário e senha, além de opção para alterar a senha no perfil.
- Banco de dados local SQLite (`agenda.db`).

## Requisitos

- Windows com Python instalado.
- Dependências listadas em `requirements.txt`.

## Como executar

1. Extraia a pasta do projeto.
2. Abra um terminal nessa pasta.
3. Instale as dependências, caso ainda não estejam instaladas:

   ```powershell
   py -m pip install -r requirements.txt
   ```

4. Execute `run.bat`.
5. Abra `http://127.0.0.1:8000` no navegador.

Na primeira execução, o sistema cria o banco e o usuário administrador inicial, caso ainda não existam.

- **Usuário inicial:** `admin`
- **Senha inicial:** `admin123`

Altere a senha padrão depois de entrar no sistema.

## Erros comuns

Caso tenha dado algum erro na hora da inicialização, confira antes se o Uvicorn ou o Python foi instalado corretamente, pois esses dois são necessários pro sistema funcionar

## Instalando o Uvicorn

Em caso do Uvicorn não ter sido instalado, execute:

```powershell
py -m uvicorn --version
```

---

## Instalando o Python

Procure na web a página oficial de download do Python e siga as instruções para download conforme o registro oficial e confira se ele foi configurado corretamente, se sim, o sistema irá rodar sem problemas tanto no vscode quanto no powershell
