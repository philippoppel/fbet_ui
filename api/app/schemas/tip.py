# app/schemas/tip.py

from pydantic import BaseModel, ConfigDict # ConfigDict für V2 importieren
from typing import List # Wird für List[HighscoreEntry] im Router benötigt, hier aber nicht direkt

# Basis-Schema mit gemeinsamen Feldern für Erstellung und Lesen
class TipBase(BaseModel):
    event_id: int
    selected_option: str

# Schema für die Erstellung eines Tipps (oft identisch zu Base)
class TipCreate(TipBase):
    pass

# Vollständiges Schema, das dem DB-Modell Tip entspricht
class Tip(TipBase):
    id: int
    user_id: int

    # Pydantic V2 Konfiguration, um ORM-Objekte zu lesen
    model_config = ConfigDict(from_attributes=True)

# Schema für die API-Antwort beim Erstellen/Abrufen eines Tipps
# Erbt von Tip, um Konsistenz zu gewährleisten
class TipOut(Tip):
    pass # Kann erweitert werden, falls die Ausgabe anders sein soll als das DB-Modell


class UserGroupPoints(BaseModel):
    """Response schema for user points in a group."""
    user_id: int
    group_id: int
    points: int
    calculated_events: int # Anzahl der Events, die in die Punktzahl eingeflossen sind
    model_config = ConfigDict(from_attributes=True)


class HighscoreEntry(BaseModel):
    """Response schema for a single entry in the highscore list."""
    user_id: int
    name: str # Benutzername für die Anzeige
    points: int

    model_config = ConfigDict(from_attributes=True)