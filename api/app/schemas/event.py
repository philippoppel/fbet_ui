# app/schemas/event.py

from typing import List, Optional
from pydantic import BaseModel, Field, ConfigDict # ConfigDict importieren

# Basis-Schema für Event-Daten
class EventBase(BaseModel):
    title: str
    description: Optional[str] = None
    group_id: int
    question: str
    options: List[str] # Liste der möglichen Wettoptionen
    # Optional: Feld für den Zeitpunkt des Events hinzufügen
    # event_datetime: Optional[datetime] = None

# Schema zum Erstellen eines Events (Payload von außen)
class EventCreate(EventBase):
    # created_by wird serverseitig gesetzt, daher hier optional und exkludiert
    # Es wird aber im Router verwendet, um created_by zu setzen.
    pass # Keine zusätzlichen Felder vom Client benötigt

# Internes Schema zum Erstellen, setzt created_by zwingend
class EventCreateInternal(EventBase): # Erbt von EventBase, nicht EventCreate
    created_by: int

# Vollständiges Schema, das dem DB-Modell Event entspricht
class Event(EventBase):
    id: int
    created_by: int
    winning_option: Optional[str] = None # Ergebnis kann None sein

    # Pydantic V2 Konfiguration für ORM-Modus
    model_config = ConfigDict(from_attributes=True)

# Schema für API-Antworten (erbt alle Felder von Event)
class EventOut(Event):
    pass # Aktuell identisch zu Event, kann später angepasst werden

# Schema zum Setzen des Event-Ergebnisses
class EventResultSet(BaseModel):
    event_id: int
    winning_option: str

# --- Schemas für externe Daten ---

class BoxingScheduleItem(BaseModel):
    """Repräsentiert einen einzelnen Eintrag aus dem ESPN Boxing Schedule."""
    date: Optional[str] = None
    location: Optional[str] = None
    broadcaster: Optional[str] = None
    details: Optional[str] = None

    # Pydantic V2 Konfiguration
    model_config = ConfigDict(from_attributes=True)


class UfcEventItem(BaseModel):
    """Repräsentiert einen einzelnen Eintrag aus dem UFC iCalendar."""
    summary: Optional[str] = None
    location: Optional[str] = None
    description: Optional[str] = None
    uid: Optional[str] = None
    dtstart: Optional[str] = None # ISO 8601 Format
    dtend: Optional[str] = None   # ISO 8601 Format

    # Pydantic V2 Konfiguration
    model_config = ConfigDict(from_attributes=True)