# app/config.py
import os
from datetime import timedelta
from dotenv import load_dotenv
from pathlib import Path # Importiere pathlib

load_dotenv()

# --- Datenbank ---
# Bestimme den Projekt-Root-Pfad (geht zwei Ebenen hoch von app/config.py)
PROJECT_ROOT = Path(__file__).resolve().parent.parent
# Definiere den Pfad zur Datenbankdatei im Projekt-Root (z.B. fbet.db)
DEFAULT_DB_PATH = PROJECT_ROOT / "fbet_main.db" # Gib ihr einen eindeutigen Namen

# Verwende den Pfad oder die Umgebungsvariable
DATABASE_URL = os.getenv("DATABASE_URL", f"sqlite:///{DEFAULT_DB_PATH}")
# Stelle sicher, dass der Pfad korrekt als String formatiert ist

# --- Sicherheit ---
SECRET_KEY = os.getenv("SECRET_KEY", "a-very-secret-key-that-you-should-change")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "30"))
VERIFICATION_TOKEN_EXPIRE_MINUTES = int(os.getenv("VERIFICATION_TOKEN_EXPIRE_MINUTES", "15"))

# --- Anwendung ---
API_BASE_URL = os.getenv("API_BASE_URL", "http://localhost:8000")
FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:3000")

# --- Testmodus ---
TESTING = os.getenv("TESTING", "False").lower() == "true"

# ... (Rest der Datei, Settings Klasse etc. bleiben gleich) ...

class Settings:
    DATABASE_URL: str = DATABASE_URL # Nimmt jetzt den eindeutigen Pfad
    SECRET_KEY: str = SECRET_KEY
    ALGORITHM: str = ALGORITHM
    ACCESS_TOKEN_EXPIRE_MINUTES: int = ACCESS_TOKEN_EXPIRE_MINUTES
    VERIFICATION_TOKEN_EXPIRE_MINUTES: int = VERIFICATION_TOKEN_EXPIRE_MINUTES
    API_BASE_URL: str = API_BASE_URL
    FRONTEND_URL: str = FRONTEND_URL
    TESTING: bool = TESTING
    # Mail settings...

settings = Settings()