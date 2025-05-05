# app/security.py
from datetime import datetime, timedelta, timezone
from typing import Optional, Dict, Any
from jose import JWTError, jwt
from passlib.context import CryptContext # NEU
# from itsdangerous import URLSafeTimedSerializer, SignatureExpired, BadSignature # Nicht mehr nötig

from app.config import settings

# --- NEU: Passlib Kontext einrichten ---
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# --- JWT Funktionen (bleiben weitgehend gleich) ---
def create_access_token(data: Dict[str, Any], expires_delta: Optional[timedelta] = None) -> str:
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.now(timezone.utc) + expires_delta
    else:
        expire = datetime.now(timezone.utc) + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    # WICHTIG: Stelle sicher, dass 'sub' als String gespeichert wird, wenn deine Dependency das erwartet!
    if "sub" in to_encode and isinstance(to_encode["sub"], int):
         to_encode["sub"] = str(to_encode["sub"])
    encoded_jwt = jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)
    return encoded_jwt

def decode_access_token(token: str) -> Optional[Dict[str, Any]]:
    try:
        # Erwarte 'sub' als String, wie in deiner Dependency
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        # Optional: Zusätzliche Validierungen hier (z.B. Token-Typ)
        return payload
    except JWTError:
        return None

# --- NEU: Passwort-Verifizierungsfunktion ---
def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Überprüft, ob das Klartext-Passwort mit dem Hash übereinstimmt."""
    return pwd_context.verify(plain_password, hashed_password)

# --- NEU: Passwort-Hash-Funktion ---
def get_password_hash(password: str) -> str:
    """Erzeugt einen Hash aus dem Klartext-Passwort."""
    return pwd_context.hash(password)
