from typing import List, Optional
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from ..database import get_db
from ..models import HistoryLog, User, Appointment
from ..schemas import HistoryLogResponse
from ..security import get_current_user

router = APIRouter(prefix="/api/history", tags=["Histórico e Auditoria"])


@router.get("", response_model=List[HistoryLogResponse])
def get_history(
    limit: int = Query(100, ge=1, le=500),
    action: Optional[str] = Query(None, description="Filtrar por tipo de ação"),
    search: Optional[str] = Query(None, description="Pesquisa no histórico"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Retorna o histórico geral de auditoria e linha do tempo de atividades."""
    query = db.query(HistoryLog).order_by(HistoryLog.timestamp.desc())

    if action and action != "TODOS":
        query = query.filter(HistoryLog.action == action)

    if search and search.strip():
        term = f"%{search.strip()}%"
        query = query.filter(HistoryLog.description.ilike(term))

    logs = query.limit(limit).all()

    result = []
    for log in logs:
        title = None
        if log.appointment:
            title = log.appointment.title
        
        result.append({
            "id": log.id,
            "appointment_id": log.appointment_id,
            "appointment_title": title,
            "action": log.action,
            "description": log.description,
            "timestamp": log.timestamp,
            "user_name": log.user.name if log.user else "Sistema"
        })

    return result
