# app/schemas/group.py

from pydantic import BaseModel, ConfigDict # ConfigDict importieren
from typing import Optional # Optional importieren

# Basis-Schema mit den Kernfeldern für Erstellung und Lesen
class GroupBase(BaseModel):
    name: str
    description: Optional[str] = None # Explizit Optional machen

# Schema zum Erstellen einer Gruppe
class GroupCreate(GroupBase):
    pass # Keine zusätzlichen Felder benötigt

# Schema, das dem DB-Modell Group entspricht (inkl. ID und Ersteller)
class Group(GroupBase):
    id: int
    created_by: int # Die ID des Users, der die Gruppe erstellt hat
    invite_token: Optional[str] = None
    # Pydantic V2 Konfiguration für ORM-Modus
    model_config = ConfigDict(from_attributes=True)

# Schema für API-Antworten (erbt alle Felder von Group)
# In diesem Fall ist die Ausgabe wahrscheinlich identisch zum internen Modell
class GroupOut(Group):
    pass # Kann später erweitert werden, falls nötig (z.B. Anzahl Mitglieder hinzufügen)

