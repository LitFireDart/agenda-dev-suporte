from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker

# Banco de dados local SQLite. O DevAgenda não usa PostgreSQL nesta versão.
DATABASE_URL = "sqlite:///./agenda.db"

engine = create_engine(
    DATABASE_URL,
    connect_args={"check_same_thread": False},
)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
