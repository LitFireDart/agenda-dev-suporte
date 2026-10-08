# DevAgenda 🗓️💻

**DevAgenda** é um sistema web ágil e completo para gestão de compromissos, chamados de suporte técnico, manutenções de servidores e rotinas de desenvolvimento de software.

Projetado especialmente para programadores, analistas de suporte e profissionais de TI que precisam organizar suas demandas com facilidade e segurança.

---

## Principais Funcionalidades

- 📅 **Calendário Interativo:**
  - Visualização em **Mês** (grade mensal com contadores e badges de status coloridos).
  - Visualização em **Semana** (colunas por dia e cronograma de horários).
  - **Clique no Dia/Horário**: clique em qualquer dia ou slot de horário para abrir o modal de inserção de compromisso já pré-preenchido.
  - Navegação rápida: "Hoje", "Anterior", "Próximo".

- 🏷️ **Categorias e Status de TI:**
  - Status: `Pendente` (amarelo), `Em Andamento` (azul), `Aguardando Cliente/Deploy` (roxo), `Concluído` (verde), `Cancelado` (cinza).
  - Tipos de Atividade: *Suporte Técnico*, *Bugfix / Correção*, *Deploy / Implantação*, *Manutenção / Servidor / Backup*, *Desenvolvimento*, *Reunião*.
  - Níveis de Prioridade: *Baixa*, *Normal*, *Alta*, *Urgente / Crítica* (com pulso visual de alerta).

- 🔍 **Pesquisa em Tempo Real & Filtros:**
  - Barra de busca global textual (título, descrição, sistema, solução técnica).
  - Filtros combinados por Status, Sistema/Cliente, Categoria e Prioridade.
  - Visão alternativa em **Tabela / Lista** com ordenação e ações rápidas.

- 📜 **Linha do Tempo & Histórico de Auditoria:**
  - Trilha de auditoria automática: registra quem criou, quem alterou datas, alterações de status e conclusões.
  - Campo específico de **Solução Técnica & Resolução** para registrar comandos, logs ou passos de resolução ao concluir uma tarefa.
  - Linha do tempo visual integrada aos detalhes do compromisso.
  - Aba geral de Histórico para rastreamento de todos os atendimentos passados.

- 🔐 **Autenticação Segura & Acesso Externo:**
  - Tela de login com usuário e senha.
  - Criptografia com hash seguro PBKDF2-HMAC-SHA256 e salts dinâmicos.
  - Sessão com token JWT e cookies protegidos.
  - Usuário administrador inicial criado automaticamente: `admin` / `admin123`.
  - Opção para alterar senha a qualquer momento no perfil.
  - Pronto para rodar em servidores externos (VPS, Cloud, Docker, Nginx).

---

## Como Executar Localmente

### No Windows:
1. Dê um duplo clique no arquivo `run.bat` ou abra o terminal e execute:
   ```cmd
   run.bat
   ```
2. Abra o navegador em: [http://localhost:8000](http://localhost:8000)
3. Credenciais padrão:
   - **Usuário:** `admin`
   - **Senha:** `admin123`

### No Linux / macOS:
```bash
chmod +x run.sh
./run.sh
```

---

## Como Instalar em um Servidor Web Externo (VPS / Nuvem)

Consulte o arquivo completo de instalação:
👉 [GUIA_INSTALACAO_SERVIDOR.md](GUIA_INSTALACAO_SERVIDOR.md)

Com Docker, você sobe o sistema em menos de 1 minuto:
```bash
docker compose -f deploy/docker-compose.yml up -d --build
```

---

## Estrutura do Código

```
agenda_dev_suporte/
├── app/
│   ├── main.py                  # Servidor FastAPI e rotas principais
│   ├── database.py              # Banco SQLite via SQLAlchemy
│   ├── models.py                # Modelos ORM (User, Appointment, HistoryLog)
│   ├── schemas.py               # Schemas Pydantic de validação
│   ├── security.py              # PBKDF2 hash e validação de tokens JWT
│   └── routes/                  # Endpoints REST (auth, appointments, history, stats)
├── static/
│   ├── index.html               # Aplicação SPA (Calendário, Lista, Histórico, Modais)
│   ├── login.html               # Tela de login estilizada
│   ├── css/style.css            # Estilos, badges e temas escuros
│   └── js/                      # api.js, calendar.js e app.js
├── deploy/
│   ├── Dockerfile               # Imagem Docker leve
│   ├── docker-compose.yml       # Orquestração do contêiner e volumes
│   ├── nginx.conf               # Configuração Nginx com SSL
│   └── agenda.service           # Serviço Linux systemd
├── tests/
│   └── test_api.py              # Testes automatizados
├── run.bat                      # Inicializador Windows
├── run.sh                       # Inicializador Linux
└── requirements.txt             # Dependências Python
```
