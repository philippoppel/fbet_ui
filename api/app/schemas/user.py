# app/schemas/user.py
from pydantic import BaseModel, EmailStr, ConfigDict
from typing import Optional

# --- Base Schemas ---
class UserBase(BaseModel):
    email: EmailStr
    name: Optional[str] = None

# --- Schema für User Erstellung ---
class UserCreate(UserBase):
    password: str # NEU: Passwort beim Erstellen benötigt

# --- Schema für User Ausgabe (KEIN Passwort hier!) ---
class UserOut(UserBase):
    id: int
    is_active: bool # Gut, dies auch auszugeben
    model_config = ConfigDict(from_attributes=True)

# --- Schema für die Token-Antwort nach Login ---
class Token(BaseModel):
    access_token: str
    token_type: str

# --- Schema für Token-Payload (intern) ---
class TokenData(BaseModel):
    user_id: Optional[int] = None # Angepasst an deine get_current_user Logik
