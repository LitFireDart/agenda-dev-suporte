from datetime import datetime, timezone
from sqlalchemy import Column, Integer, String, Text, Boolean, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from .database import Base


def utc_now():
    return datetime.now(timezone.utc)


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String(50), unique=True, index=True, nullable=False)
    name = Column(String(100), nullable=False)
    email = Column(String(100), nullable=True)
    hashed_password = Column(String(255), nullable=False)
    role = Column(String(20), default="admin")  # admin, dev, suporte
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=utc_now)

    appointments = relationship(
        "Appointment", back_populates="creator", cascade="all, delete-orphan"
    )
    history_logs = relationship("HistoryLog", back_populates="user")


class Appointment(Base):
    __tablename__ = "appointments"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(200), nullable=False, index=True)
    system_client = Column(String(100), nullable=False, index=True, default="Geral")
    category = Column(String(50), nullable=False, default="Suporte")
    # Categorias: Suporte, Bugfix, Desenvolvimento, Deploy, Manutenção, Reunião

    priority = Column(String(20), nullable=False, default="Normal")
    # Prioridades: Baixa, Normal, Alta, Urgente

    status = Column(String(30), nullable=False, default="Pendente", index=True)
    # Status: Pendente, Em Andamento, Aguardando, Concluído, Cancelado

    start_date = Column(String(10), nullable=False, index=True)  # Formato YYYY-MM-DD
    start_time = Column(String(5), nullable=True, default="09:00")  # Formato HH:MM
    end_date = Column(String(10), nullable=False, index=True)  # Formato YYYY-MM-DD
    end_time = Column(String(5), nullable=True, default="10:00")  # Formato HH:MM
    is_all_day = Column(Boolean, default=False)

    description = Column(Text, nullable=True)
    resolution_notes = Column(Text, nullable=True)
    external_link = Column(String(255), nullable=True)

    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    created_at = Column(DateTime, default=utc_now)
    updated_at = Column(DateTime, default=utc_now, onupdate=utc_now)

    creator = relationship("User", back_populates="appointments")
    history = relationship(
        "HistoryLog",
        back_populates="appointment",
        cascade="all, delete-orphan",
        order_by="desc(HistoryLog.timestamp)",
    )


class HistoryLog(Base):
    __tablename__ = "history_logs"

    id = Column(Integer, primary_key=True, index=True)
    appointment_id = Column(
        Integer, ForeignKey("appointments.id", ondelete="CASCADE"), nullable=True
    )
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    action = Column(
        String(50), nullable=False
    )  # CRIACAO, EDICAO, STATUS, CONCLUSAO, EXCLUSAO
    description = Column(Text, nullable=False)
    timestamp = Column(DateTime, default=utc_now, index=True)

    appointment = relationship("Appointment", back_populates="history")
    user = relationship("User", back_populates="history_logs")


class SystemClient(Base):
    __tablename__ = "systems_clients"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), unique=True, nullable=False)
    description = Column(String(255), nullable=True)
    created_at = Column(DateTime, default=utc_now)
