# app/crud/user.py
import secrets # Nicht mehr nötig für Token
from typing import Optional
from pydantic import EmailStr
from sqlalchemy.orm import Session

from app.models.user import User
from app.schemas.user import UserCreate
from app import security # NEU: Importiere security für Passwort-Hashing

# --- User abrufen (bleibt gleich) ---
def get_user(db: Session, user_id: int) -> Optional[User]:
    return db.query(User).filter(User.id == user_id).first()

def get_user_by_email(db: Session, email: EmailStr) -> Optional[User]:
    return db.query(User).filter(User.email == email).first()

# --- User erstellen ( angepasst ) ---
def create_user(db: Session, user: UserCreate) -> User:
    """Erstellt einen neuen User mit gehashtem Passwort."""
    # Hashe das Passwort aus dem UserCreate Schema
    hashed_password = security.get_password_hash(user.password)
    db_user = User(
        email=user.email,
        name=user.name,
        hashed_password=hashed_password # Speichere den Hash
        # permanent_token wird nicht mehr gesetzt
    )
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    return db_user

# --- NEU: User authentifizieren ---
def authenticate_user(db: Session, email: EmailStr, password: str) -> Optional[User]:
    """
    Prüft E-Mail und Passwort. Gibt User-Objekt bei Erfolg zurück, sonst None.
    """
    user = get_user_by_email(db, email=email)
    if not user:
        return None # User nicht gefunden
    if not user.is_active:
         return None # Inaktiver User
    if not security.verify_password(password, user.hashed_password):
        return None # Passwort falsch
    return user # Authentifizierung erfolgreich
