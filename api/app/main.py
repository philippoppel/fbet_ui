# app/main.py
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
# Annahme: Diese Module existieren und sind korrekt implementiert
from app.database import create_db_and_tables
from app.routers import user, group, group_membership, event, tip

# --- LIFESPAN MANAGER ---
# Verwaltet Aktionen beim Starten und Herunterfahren der Anwendung
@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Asynchroner Kontextmanager für den Lebenszyklus der FastAPI-App.
    Wird beim Starten der App ausgeführt, um z.B. Datenbanktabellen zu erstellen.
    """
    print("App startup: Initializing resources...")
    # Erstellt die Datenbank und Tabellen beim Start, falls sie nicht existieren
    create_db_and_tables()
    print("App startup: Database tables checked/created.")
    yield # Hier läuft die eigentliche Anwendung
    # Code nach yield wird beim Herunterfahren ausgeführt (falls nötig)
    print("App shutdown: Cleaning up resources...")
# --- ENDE LIFESPAN MANAGER ---

# Erstellt die FastAPI-Anwendungsinstanz
# Übergibt den Lifespan-Manager, um Aktionen beim Start/Ende zu steuern
app = FastAPI(
    title="Friendly Betting API",
    description="API for managing users, groups, events, and tips for friendly betting.",
    version="1.0.0",
    lifespan=lifespan # Übergibt den Lifespan-Manager
)

# --- CORS MIDDLEWARE ---
# Konfiguriert Cross-Origin Resource Sharing (CORS)
# Erlaubt Anfragen von Webseiten, die auf anderen Domains/Ports laufen (z.B. dein Frontend)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Erlaubt Anfragen von JEDER Herkunft (Origin). Vorsicht in Produktion!
    allow_credentials=False, # WICHTIG: Muss False sein, wenn allow_origins=["*"] verwendet wird.
                           # Wenn True benötigt wird, müssen spezifische Origins angegeben werden.
    allow_methods=["*"],  # Erlaubt alle Standard-HTTP-Methoden (GET, POST, PUT, DELETE, etc.)
    allow_headers=["*"],  # Erlaubt alle HTTP-Header in Anfragen.
)
# --- ENDE CORS MIDDLEWARE ---

# --- ROUTER EINBINDEN ---
# Fügt die verschiedenen Endpunkt-Gruppen (Router) zur Hauptanwendung hinzu
# Jeder Router behandelt einen spezifischen Teil der API (z.B. Benutzer, Gruppen)
app.include_router(user.router, prefix="/users", tags=["Users"])
app.include_router(group.router, prefix="/groups", tags=["Groups"])
app.include_router(group_membership.router, prefix="/memberships", tags=["Memberships"])
app.include_router(event.router, prefix="/events", tags=["Events"])
app.include_router(tip.router, prefix="/tips", tags=["Tips"])
# --- ENDE ROUTER EINBINDEN ---

# --- ROOT ENDPUNKT ---
# Ein einfacher Endpunkt für die Wurzel-URL ("/") der API
@app.get("/", tags=["Root"])
async def read_root():
    """
    Gibt eine Willkommensnachricht zurück, wenn die Wurzel-URL der API aufgerufen wird.
    Nützlich als einfacher Test, ob die API läuft.
    """
    return {"message": "Welcome to the Friendly Betting API"}
# --- ENDE ROOT ENDPUNKT ---

# Optional: Wenn du uvicorn direkt aus dem Skript starten möchtest (eher für Debugging)
# if __name__ == "__main__":
#     import uvicorn
#     uvicorn.run(app, host="0.0.0.0", port=3000) # Stelle sicher, dass Port und Host stimmen
