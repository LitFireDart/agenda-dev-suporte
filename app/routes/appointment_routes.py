from typing import List, Optional
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from sqlalchemy import or_, and_

from ..database import get_db
from ..models import Appointment, HistoryLog, User, SystemClient
from ..schemas import (
    AppointmentCreate,
    AppointmentUpdate,
    AppointmentResponse,
    AppointmentStatusUpdate,
    HistoryLogResponse,
)
from ..security import get_current_user

router = APIRouter(prefix="/api/appointments", tags=["Compromissos e Suporte"])


def _format_appointment(app: Appointment) -> dict:
    """Auxiliar para formatar resposta com nome do criador e histórico."""
    history_items = []
    for h in app.history:
        history_items.append(
            {
                "id": h.id,
                "appointment_id": h.appointment_id,
                "appointment_title": app.title,
                "action": h.action,
                "description": h.description,
                "timestamp": h.timestamp,
                "user_name": h.user.name if h.user else "Sistema",
            }
        )

    return {
        "id": app.id,
        "title": app.title,
        "system_client": app.system_client,
        "category": app.category,
        "priority": app.priority,
        "status": app.status,
        "start_date": app.start_date,
        "start_time": app.start_time,
        "end_date": app.end_date,
        "end_time": app.end_time,
        "is_all_day": app.is_all_day,
        "description": app.description,
        "resolution_notes": app.resolution_notes,
        "external_link": app.external_link,
        "user_id": app.user_id,
        "creator_name": app.creator.name if app.creator else "Desconhecido",
        "created_at": app.created_at,
        "updated_at": app.updated_at,
        "history": history_items,
    }


@router.get("", response_model=List[AppointmentResponse])
def get_appointments(
    search: Optional[str] = Query(
        None, description="Busca textual em título, descrição, sistema e notas"
    ),
    status: Optional[str] = Query(None, description="Filtro por status"),
    category: Optional[str] = Query(None, description="Filtro por categoria"),
    priority: Optional[str] = Query(None, description="Filtro por prioridade"),
    system_client: Optional[str] = Query(
        None, description="Filtro por sistema/cliente"
    ),
    start_date: Optional[str] = Query(None, description="Data inicial YYYY-MM-DD"),
    end_date: Optional[str] = Query(None, description="Data final YYYY-MM-DD"),
    month: Optional[str] = Query(None, description="Mês no formato YYYY-MM"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Retorna lista de compromissos com suporte a filtros e busca avançada."""
    query = db.query(Appointment)

    # Filtro de Mês específico (para renderização rápida de calendário)
    if month:
        query = query.filter(
            or_(
                Appointment.start_date.like(f"{month}%"),
                Appointment.end_date.like(f"{month}%"),
            )
        )

    # Filtro de intervalo de datas
    if start_date:
        query = query.filter(Appointment.end_date >= start_date)
    if end_date:
        query = query.filter(Appointment.start_date <= end_date)

    # Filtros exatos
    if status and status != "Todos":
        query = query.filter(Appointment.status == status)
    if category and category != "Todas":
        query = query.filter(Appointment.category == category)
    if priority and priority != "Todas":
        query = query.filter(Appointment.priority == priority)
    if system_client and system_client != "Todos":
        query = query.filter(Appointment.system_client == system_client)

    # Busca textual (título, descrição, sistema_client, resolution_notes)
    if search and search.strip():
        term = f"%{search.strip()}%"
        query = query.filter(
            or_(
                Appointment.title.ilike(term),
                Appointment.description.ilike(term),
                Appointment.system_client.ilike(term),
                Appointment.resolution_notes.ilike(term),
            )
        )

    # Ordenação por data de início e horário
    appointments = query.order_by(
        Appointment.start_date.asc(), Appointment.start_time.asc()
    ).all()
    return [_format_appointment(app) for app in appointments]


@router.post(
    "", response_model=AppointmentResponse, status_code=status.HTTP_201_CREATED
)
def create_appointment(
    payload: AppointmentCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Cria um novo compromisso/chamado e gera histórico automático."""
    end_date = payload.end_date if payload.end_date else payload.start_date

    app = Appointment(
        title=payload.title.strip(),
        system_client=(
            payload.system_client.strip() if payload.system_client else "Geral"
        ),
        category=payload.category,
        priority=payload.priority,
        status=payload.status,
        start_date=payload.start_date,
        start_time=payload.start_time,
        end_date=end_date,
        end_time=payload.end_time,
        is_all_day=payload.is_all_day,
        description=payload.description,
        resolution_notes=payload.resolution_notes,
        external_link=payload.external_link,
        user_id=current_user.id,
    )
    db.add(app)
    db.flush()

    # Registrar sistema se ainda não constar
    if app.system_client:
        existing_sys = (
            db.query(SystemClient)
            .filter(SystemClient.name == app.system_client)
            .first()
        )
        if not existing_sys:
            new_sys = SystemClient(name=app.system_client)
            db.add(new_sys)

    # Histórico de criação
    desc = f"Atividade '{app.title}' agendada para {app.start_date} às {app.start_time or 'Dia todo'} (Sistema: {app.system_client}, Prioridade: {app.priority})."
    log = HistoryLog(
        appointment_id=app.id,
        user_id=current_user.id,
        action="CRIACAO",
        description=desc,
    )
    db.add(log)
    db.commit()
    db.refresh(app)

    return _format_appointment(app)


@router.get("/{appointment_id}", response_model=AppointmentResponse)
def get_appointment(
    appointment_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Busca detalhes de um compromisso por ID com histórico."""
    app = db.query(Appointment).filter(Appointment.id == appointment_id).first()
    if not app:
        raise HTTPException(status_code=404, detail="Compromisso não encontrado.")
    return _format_appointment(app)


@router.put("/{appointment_id}", response_model=AppointmentResponse)
def update_appointment(
    appointment_id: int,
    payload: AppointmentUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Atualiza dados do compromisso e audita as alterações no histórico."""
    app = db.query(Appointment).filter(Appointment.id == appointment_id).first()
    if not app:
        raise HTTPException(status_code=404, detail="Compromisso não encontrado.")

    changes = []
    data = payload.model_dump(exclude_unset=True)

    for field, new_val in data.items():
        old_val = getattr(app, field)
        if new_val != old_val:
            if field == "status":
                changes.append(f"Status: '{old_val}' ➔ '{new_val}'")
            elif field == "start_date":
                changes.append(f"Data início: {old_val} ➔ {new_val}")
            elif field == "priority":
                changes.append(f"Prioridade: {old_val} ➔ {new_val}")
            elif field == "title":
                changes.append(f"Título alterado de '{old_val}' para '{new_val}'")
            else:
                changes.append(f"Campo '{field}' modificado")
            setattr(app, field, new_val)

    app.updated_at = datetime.now(timezone.utc)

    if changes:
        log_desc = f"Atualizações por {current_user.name}: " + "; ".join(changes)
        action_name = "CONCLUSAO" if app.status == "Concluído" else "EDICAO"
        log = HistoryLog(
            appointment_id=app.id,
            user_id=current_user.id,
            action=action_name,
            description=log_desc,
        )
        db.add(log)

    db.commit()
    db.refresh(app)
    return _format_appointment(app)


@router.patch("/{appointment_id}/status", response_model=AppointmentResponse)
def update_appointment_status(
    appointment_id: int,
    payload: AppointmentStatusUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Atualização rápida de status (Pendente, Em Andamento, Concluído, etc.) com notas."""
    app = db.query(Appointment).filter(Appointment.id == appointment_id).first()
    if not app:
        raise HTTPException(status_code=404, detail="Compromisso não encontrado.")

    old_status = app.status
    app.status = payload.status
    if payload.resolution_notes:
        app.resolution_notes = payload.resolution_notes
    app.updated_at = datetime.now(timezone.utc)

    log_action = "CONCLUSAO" if payload.status == "Concluído" else "STATUS"
    desc = f"Status alterado de '{old_status}' para '{payload.status}' por {current_user.name}."
    if payload.resolution_notes:
        desc += f" Solução/Nota: {payload.resolution_notes}"

    log = HistoryLog(
        appointment_id=app.id,
        user_id=current_user.id,
        action=log_action,
        description=desc,
    )
    db.add(log)
    db.commit()
    db.refresh(app)
    return _format_appointment(app)


@router.delete("/{appointment_id}")
def delete_appointment(
    appointment_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Exclui um compromisso e registra a exclusão no histórico geral."""
    app = db.query(Appointment).filter(Appointment.id == appointment_id).first()
    if not app:
        raise HTTPException(status_code=404, detail="Compromisso não encontrado.")

    title = app.title
    sys = app.system_client

    # Registra no histórico geral (sem vínculo com o appointment_id que será excluído)
    log = HistoryLog(
        appointment_id=None,
        user_id=current_user.id,
        action="EXCLUSAO",
        description=f"Atividade '{title}' (Sistema: {sys}) foi removida por {current_user.name}.",
    )
    db.add(log)

    db.delete(app)
    db.commit()
    return {"message": f"Compromisso '{title}' excluído com sucesso."}


@router.get("/meta/systems", response_model=List[str])
def get_systems(
    db: Session = Depends(get_db), current_user: User = Depends(get_current_user)
):
    """Retorna lista distinta de sistemas/clientes cadastrados para filtros e autocompletar."""
    systems = db.query(SystemClient.name).order_by(SystemClient.name.asc()).all()
    names = [s[0] for s in systems]

    # Também pegar dos appointments existentes
    app_systems = db.query(Appointment.system_client).distinct().all()
    for s in app_systems:
        if s[0] and s[0] not in names:
            names.append(s[0])

    names.sort()
    return names
