from datetime import date
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func

from ..database import get_db
from ..models import Appointment, User
from ..schemas import DashboardStats
from ..security import get_current_user

router = APIRouter(prefix="/api/stats", tags=["Estatísticas"])


@router.get("", response_model=DashboardStats)
def get_dashboard_stats(
    db: Session = Depends(get_db), current_user: User = Depends(get_current_user)
):
    """Retorna contadores consolidados para os cards superiores do dashboard."""
    today_str = date.today().strftime("%Y-%m-%d")

    total = db.query(Appointment).count()
    pending = db.query(Appointment).filter(Appointment.status == "Pendente").count()
    in_progress = (
        db.query(Appointment).filter(Appointment.status == "Em Andamento").count()
    )
    awaiting = db.query(Appointment).filter(Appointment.status == "Aguardando").count()
    completed = db.query(Appointment).filter(Appointment.status == "Concluído").count()
    canceled = db.query(Appointment).filter(Appointment.status == "Cancelado").count()
    urgent = (
        db.query(Appointment)
        .filter(
            Appointment.priority == "Urgente",
            Appointment.status.in_(["Pendente", "Em Andamento", "Aguardando"]),
        )
        .count()
    )

    today_count = (
        db.query(Appointment)
        .filter(Appointment.start_date <= today_str, Appointment.end_date >= today_str)
        .count()
    )

    return {
        "total_appointments": total,
        "pending": pending,
        "in_progress": in_progress,
        "awaiting": awaiting,
        "completed": completed,
        "canceled": canceled,
        "urgent": urgent,
        "today_count": today_count,
    }
