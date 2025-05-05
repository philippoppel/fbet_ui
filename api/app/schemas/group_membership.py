# app/schemas/group_membership.py

from pydantic import BaseModel, ConfigDict # ConfigDict importieren

# Basis-Schema mit den Kernfeldern
class GroupMembershipBase(BaseModel):
    user_id: int
    group_id: int

# Schema zum Erstellen einer Mitgliedschaft
class GroupMembershipCreate(GroupMembershipBase):
    pass # Keine zusätzlichen Felder benötigt

# Schema, das dem DB-Modell GroupMembership entspricht (inkl. ID)
class GroupMembership(GroupMembershipBase):
    id: int

    # Pydantic V2 Konfiguration für ORM-Modus
    model_config = ConfigDict(from_attributes=True)

# Schema für API-Antworten (erbt alle Felder von GroupMembership)
class GroupMembershipOut(GroupMembership):
    pass # Kann später erweitert werden, falls nötig

