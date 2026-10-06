from datetime import timedelta
from fastapi import APIRouter, Depends, HTTPException, status, Response
from sqlalchemy.orm import Session

from ..database import get_db
from ..models import User, HistoryLog
from ..schemas import UserLogin, UserResponse, UserChangePassword, UserProfileUpdate, TokenResponse
from ..security import verify_password, hash_password, create_access_token, get_current_user

router = APIRouter(prefix="/api/auth", tags=["Autenticação"])


@router.post("/login", response_model=TokenResponse)
def login(login_data: UserLogin, response: Response, db: Session = Depends(get_db)):
    """Autentica o usuário e retorna o token de acesso + cookie."""
    user = db.query(User).filter(User.username == login_data.username.strip()).first()
    if not user or not verify_password(login_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Usuário ou senha incorretos."
        )
    
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Esta conta de usuário está desativada."
        )
    
    # Gerar token
    access_token = create_access_token(data={"sub": user.username, "user_id": user.id, "role": user.role})
    
    # Definir cookie de autenticação para requisições do navegador
    response.set_cookie(
        key="devagenda_token",
        value=access_token,
        httponly=True,
        samesite="lax",
        max_age=72 * 3600,
        secure=False  # Pode ser True em HTTPS
    )

    # Registrar log de login
    log = HistoryLog(
        user_id=user.id,
        action="LOGIN",
        description=f"Usuário '{user.username}' realizou login no sistema."
    )
    db.add(log)
    db.commit()

    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": user
    }


@router.post("/logout")
def logout(response: Response, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Desconecta o usuário removendo o cookie da sessão."""
    response.delete_cookie(key="devagenda_token")
    log = HistoryLog(
        user_id=current_user.id,
        action="LOGOUT",
        description=f"Usuário '{current_user.username}' encerrou a sessão."
    )
    db.add(log)
    db.commit()
    return {"message": "Sessão encerrada com sucesso."}


@router.get("/me", response_model=UserResponse)
def get_me(current_user: User = Depends(get_current_user)):
    """Retorna dados do usuário atualmente logado."""
    return current_user


@router.put("/change-password")
def change_password(
    pwd_data: UserChangePassword,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Altera a senha do usuário atual."""
    if not verify_password(pwd_data.current_password, current_user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="A senha atual informada está incorreta."
        )
    
    current_user.hashed_password = hash_password(pwd_data.new_password)
    
    log = HistoryLog(
        user_id=current_user.id,
        action="SENHA_ALTERADA",
        description=f"Usuário '{current_user.username}' alterou sua senha de acesso."
    )
    db.add(log)
    db.commit()
    return {"message": "Senha alterada com sucesso."}


@router.put("/profile", response_model=UserResponse)
def update_profile(
    profile_data: UserProfileUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Atualiza o nome de exibição e e-mail do usuário autenticado."""
    old_name = current_user.name
    new_name = profile_data.name.strip()
    
    current_user.name = new_name
    if profile_data.email is not None:
        current_user.email = profile_data.email.strip() if profile_data.email.strip() else None

    log = HistoryLog(
        user_id=current_user.id,
        action="EDICAO",
        description=f"Usuário '{current_user.username}' alterou o nome de exibição de '{old_name}' para '{new_name}'."
    )
    db.add(log)
    db.commit()
    db.refresh(current_user)
    return current_user
