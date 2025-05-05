# app/database.py (Beispielhafte Anpassung)
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base
from app.config import settings # Annahme: DB URL ist in settings

# --- Annahme: Diese Zeilen sind hier definiert ---
engine = create_engine(settings.DATABASE_URL, connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()
# ---------------------------------------------

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# --- NEUE/ANGEPASSTE Funktion NUR für create_all ---
def create_db_and_tables():
    print("Attempting to create database tables...")
    # Importiere hier ALLE deine Modelle, damit Base sie kennt!
    from app.models import user, group, group_membership, event, tip # Passe Imports an
    try:
        Base.metadata.create_all(bind=engine)
        print("Tables created successfully (if they didn't exist).")
    except Exception as e:
        print(f"Error creating tables: {e}")
        raise