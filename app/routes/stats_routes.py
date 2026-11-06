from collections import Counter
from datetime import date, datetime, timedelta, timezone
from typing import Optional

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import func

from ..database import get_db
from ..models import Appointment, User
from ..schemas import DashboardStats, ContributionsResponse
from ..security import get_current_user

router = APIRouter(prefix="/api/stats", tags=["Estatísticas"])


@router.get("", response_model=DashboardStats)
def get_dashboard_stats(
    db: Session = Depends(get_db), current_user: User = Depends(get_current_user)
):

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


def _streaks(days: set, today: date):
    """Retorna (maior sequência, sequência atual) de dias seguidos com conclusões.

    A sequência atual ainda conta se hoje não teve conclusão, mas ontem teve
    (o dia de hoje ainda não acabou).
    """
    longest = run = 0
    prev = None
    for d in sorted(days):
        run = run + 1 if prev is not None and (d - prev).days == 1 else 1
        longest = max(longest, run)
        prev = d

    current = 0
    d = today if today in days else today - timedelta(days=1)
    while d in days:
        current += 1
        d -= timedelta(days=1)
    return longest, current


@router.get("/contributions", response_model=ContributionsResponse)
def get_contributions(
    year: Optional[int] = Query(
        None,
        ge=2000,
        le=2100,
        description="Ano do calendário. Sem valor, devolve os últimos 365 dias.",
    ),
    tz_offset: int = Query(
        0,
        ge=-840,
        le=840,
        description="Minutos a oeste do UTC (o valor de Date.getTimezoneOffset() do navegador).",
    ),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Tarefas concluídas por dia, para o gráfico de progresso estilo GitHub."""

    def to_local(dt: datetime) -> datetime:
        # O banco guarda datas em UTC sem fuso; converte para o fuso do usuário.
        return dt.replace(tzinfo=timezone.utc).replace(tzinfo=None) - timedelta(
            minutes=tz_offset
        )

    today = to_local(datetime.now(timezone.utc)).date()

    if year is None:
        start, end = today - timedelta(days=364), today
    else:
        start, end = date(year, 1, 1), date(year, 12, 31)

    completed = (
        db.query(Appointment)
        .filter(Appointment.status == "Concluído", Appointment.completed_at.isnot(None))
        .order_by(Appointment.completed_at.asc())
        .all()
    )

    all_days = set()
    years = {today.year}
    in_window = []
    for app in completed:
        local_day = to_local(app.completed_at).date()
        all_days.add(local_day)
        years.add(local_day.year)
        if start <= local_day <= end:
            in_window.append((local_day, app))

    counts = Counter(day for day, _ in in_window)
    window_days = set(counts)

    longest, _ = _streaks(window_days, today)
    # "Sequência atual" só faz sentido quando a janela inclui hoje.
    current = _streaks(all_days, today)[1] if start <= today <= end else 0

    busiest = None
    if counts:
        best_day, best_count = max(counts.items(), key=lambda kv: (kv[1], kv[0]))
        busiest = {"date": best_day.isoformat(), "count": best_count}

    return {
        "start": start.isoformat(),
        "end": end.isoformat(),
        "today": today.isoformat(),
        "year": year,
        "years": sorted(years, reverse=True),
        "total": len(in_window),
        "active_days": len(window_days),
        "longest_streak": longest,
        "current_streak": current,
        "busiest_day": busiest,
        "days": [
            {"date": d.isoformat(), "count": c} for d, c in sorted(counts.items())
        ],
        "items": [
            {
                "date": day.isoformat(),
                "id": app.id,
                "title": app.title,
                "category": app.category,
                "system_client": app.system_client,
                "priority": app.priority,
                "resolution_notes": app.resolution_notes,
            }
            for day, app in reversed(in_window)
        ],
    }
