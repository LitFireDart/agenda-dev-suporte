from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, Field


# --- Schemas de Usuário e Autenticação ---
class UserLogin(BaseModel):
    username: str = Field(..., description="Nome de usuário")
    password: str = Field(..., description="Senha")


class UserResponse(BaseModel):
    id: int
    username: str
    name: str
    email: Optional[str] = None
    role: str
    is_active: bool

    class Config:
        from_attributes = True


class UserChangePassword(BaseModel):
    current_password: str
    new_password: str = Field(
        ..., min_length=6, description="Nova senha com no mínimo 6 caracteres"
    )


class UserProfileUpdate(BaseModel):
    name: str = Field(
        ..., min_length=2, max_length=100, description="Nome de exibição do usuário"
    )
    email: Optional[str] = Field(None, max_length=100, description="E-mail do usuário")


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse


# --- Schemas de Histórico ---
class HistoryLogResponse(BaseModel):
    id: int
    appointment_id: Optional[int] = None
    appointment_title: Optional[str] = None
    action: str
    description: str
    timestamp: datetime
    user_name: Optional[str] = None

    class Config:
        from_attributes = True


# --- Schemas de Compromissos ---
class AppointmentBase(BaseModel):
    title: str = Field(..., min_length=2, max_length=200)
    system_client: str = Field(default="Geral", max_length=100)
    category: str = Field(default="Suporte")
    priority: str = Field(default="Normal")
    status: str = Field(default="Pendente")
    start_date: str = Field(..., pattern=r"^\d{4}-\d{2}-\d{2}$")
    start_time: Optional[str] = "09:00"
    end_date: Optional[str] = None
    end_time: Optional[str] = "10:00"
    is_all_day: bool = False
    description: Optional[str] = None
    resolution_notes: Optional[str] = None
    external_link: Optional[str] = None


class AppointmentCreate(AppointmentBase):
    pass


class AppointmentUpdate(BaseModel):
    title: Optional[str] = None
    system_client: Optional[str] = None
    category: Optional[str] = None
    priority: Optional[str] = None
    status: Optional[str] = None
    start_date: Optional[str] = None
    start_time: Optional[str] = None
    end_date: Optional[str] = None
    end_time: Optional[str] = None
    is_all_day: Optional[bool] = None
    description: Optional[str] = None
    resolution_notes: Optional[str] = None
    external_link: Optional[str] = None


class AppointmentStatusUpdate(BaseModel):
    status: str
    resolution_notes: Optional[str] = None


class AppointmentResponse(AppointmentBase):
    id: int
    user_id: int
    creator_name: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    history: List[HistoryLogResponse] = []

    class Config:
        from_attributes = True


# --- Schemas de Estatísticas / Dashboard ---
class DashboardStats(BaseModel):
    total_appointments: int
    pending: int
    in_progress: int
    awaiting: int
    completed: int
    canceled: int
    urgent: int
    today_count: int
