import os
from datetime import datetime, date, timedelta
from contextlib import asynccontextmanager
from fastapi import FastAPI, Request
from fastapi.responses import FileResponse, RedirectResponse
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv

from .database import engine, Base, SessionLocal
from .models import User, Appointment, HistoryLog, SystemClient
from .security import hash_password, decode_access_token
from .routes import auth_routes, appointment_routes, history_routes, stats_routes

load_dotenv()

INITIAL_ADMIN_USER = os.getenv("INITIAL_ADMIN_USER", "admin")
INITIAL_ADMIN_PASSWORD = os.getenv("INITIAL_ADMIN_PASSWORD", "admin123")
INITIAL_ADMIN_NAME = os.getenv("INITIAL_ADMIN_NAME", "Administrador")


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Inicialização do banco de dados e dados padrão
    Base.metadata.create_all(bind=engine)

    db = SessionLocal()
    try:
        # 1. Criação do usuário administrador inicial se a tabela estiver vazia
        admin_user = db.query(User).filter(User.username == INITIAL_ADMIN_USER).first()
        if not admin_user:
            admin_user = User(
                username=INITIAL_ADMIN_USER,
                name=INITIAL_ADMIN_NAME,
                email="admin@devagenda.local",
                hashed_password=hash_password(INITIAL_ADMIN_PASSWORD),
                role="admin",
                is_active=True,
            )
            db.add(admin_user)
            db.commit()
            db.refresh(admin_user)
            print(
                f"[DevAgenda] Usuário inicial criado: '{INITIAL_ADMIN_USER}' com a senha padrão."
            )

        # 2. Inserção de sistemas padrão se tabela estiver vazia
        if db.query(SystemClient).count() == 0:
            default_systems = [
                SystemClient(
                    name="ERP Corporativo",
                    description="Sistema de gestão empresarial e fiscal",
                ),
                SystemClient(
                    name="Portal Web / E-Commerce",
                    description="Aplicação web de vendas e clientes",
                ),
                SystemClient(
                    name="API Gateway & Microserviços",
                    description="Backend principal e integrações",
                ),
                SystemClient(
                    name="Servidor de Produção Linux",
                    description="Infraestrutura em nuvem e containers",
                ),
                SystemClient(
                    name="Banco de Dados PostgreSQL",
                    description="Instância de dados e rotinas de backup",
                ),
            ]
            db.add_all(default_systems)
            db.commit()

        # 3. Inserção de compromissos de exemplo se a base estiver zerada
        if db.query(Appointment).count() == 0:
            today = date.today()
            sample_events = [
                Appointment(
                    title="Janela de Manutenção e Backup Geral",
                    system_client="Banco de Dados PostgreSQL",
                    category="Manutenção",
                    priority="Alta",
                    status="Pendente",
                    start_date=today.strftime("%Y-%m-%d"),
                    start_time="22:00",
                    end_date=today.strftime("%Y-%m-%d"),
                    end_time="23:30",
                    is_all_day=False,
                    description="Executar snapshot dos volumes, conferir replicação e rotinas de backup em nuvem.",
                    user_id=admin_user.id,
                ),
                Appointment(
                    title="Suporte: Falha na emissão de NF-e",
                    system_client="ERP Corporativo",
                    category="Suporte",
                    priority="Urgente",
                    status="Em Andamento",
                    start_date=today.strftime("%Y-%m-%d"),
                    start_time="10:00",
                    end_date=today.strftime("%Y-%m-%d"),
                    end_time="11:30",
                    is_all_day=False,
                    description="Chamado #4928 - Usuário do setor contábil relatou erro de timeout com a SEFAZ.",
                    user_id=admin_user.id,
                ),
                Appointment(
                    title="Deploy da Versão 2.4.0 (Novas APIs)",
                    system_client="API Gateway & Microserviços",
                    category="Deploy",
                    priority="Normal",
                    status="Pendente",
                    start_date=(today + timedelta(days=2)).strftime("%Y-%m-%d"),
                    start_time="19:00",
                    end_date=(today + timedelta(days=2)).strftime("%Y-%m-%d"),
                    end_time="20:30",
                    is_all_day=False,
                    description="Atualização da imagem docker no cluster e validação dos endpoints de autenticação.",
                    user_id=admin_user.id,
                ),
                Appointment(
                    title="Reunião Semanal de Alinhamento de TI",
                    system_client="Geral",
                    category="Reunião",
                    priority="Normal",
                    status="Concluído",
                    start_date=(today - timedelta(days=1)).strftime("%Y-%m-%d"),
                    start_time="09:00",
                    end_date=(today - timedelta(days=1)).strftime("%Y-%m-%d"),
                    end_time="10:00",
                    is_all_day=False,
                    description="Revisão de prioridades dos chamados de suporte e metas da sprint.",
                    resolution_notes="Alinhadas as prioridades para a semana. Foco no suporte do ERP.",
                    user_id=admin_user.id,
                ),
            ]
            db.add_all(sample_events)
            db.commit()

            # Adicionar logs para os exemplos
            for event in sample_events:
                db.add(
                    HistoryLog(
                        appointment_id=event.id,
                        user_id=admin_user.id,
                        action="CRIACAO",
                        description=f"Atividade inicial criada: {event.title}",
                    )
                )
            db.commit()
    finally:
        db.close()

    yield


app = FastAPI(
    title="DevAgenda - Gestão de Compromissos e Suporte a Sistemas",
    description="Sistema web ágil para desenvolvedores e equipes de suporte a sistemas.",
    version="1.0.0",
    lifespan=lifespan,
)

# CORS para permitir conexões externas e testes locais
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Incluir rotas de API
app.include_router(auth_routes.router)
app.include_router(appointment_routes.router)
app.include_router(history_routes.router)
app.include_router(stats_routes.router)


# Healthcheck para monitoramento externo e Docker
@app.get("/health")
def healthcheck():
    return {"status": "ok", "app": "DevAgenda", "version": "1.0.0"}


# Páginas Web Principais
STATIC_DIR = os.path.join(
    os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "static"
)


@app.get("/")
def serve_index():
    return FileResponse(os.path.join(STATIC_DIR, "index.html"))


@app.get("/login")
def serve_login():
    return FileResponse(os.path.join(STATIC_DIR, "login.html"))


# Montar arquivos estáticos (CSS, JS, assets)
app.mount("/static", StaticFiles(directory=STATIC_DIR), name="static")
