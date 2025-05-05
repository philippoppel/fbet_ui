# app/crud/group.py
import uuid
from asyncio.log import logger

from sqlalchemy.orm import Session
from typing import List
from app.models.group import Group
from app.models.group_membership import GroupMembership
from app.schemas.group import GroupCreate

def create_group(db: Session, group: GroupCreate, created_by_id: int) -> Group:
    """
    Erstellt eine neue Gruppe, generiert einen Invite-Token und fügt den Ersteller als erstes Mitglied hinzu.
    """
    # Gruppe-Instanz aus Schema-Daten erstellen
    db_group = Group(**group.model_dump(), created_by=created_by_id)

    # Invite Token generieren und zuweisen
    db_group.invite_token = str(uuid.uuid4())
    logger.info(f"Generated invite_token: {db_group.invite_token}") # Log 1: Direkt nach Generierung

    # Gruppe zur Session hinzufügen
    db.add(db_group)
    # Flush, um die db_group.id für die Mitgliedschaft zu erhalten
    db.flush()

    # Ersteller als erstes Mitglied hinzufügen
    db_membership = GroupMembership(user_id=created_by_id, group_id=db_group.id)
    db.add(db_membership)

    # Transaktion committen
    try:
        db.commit()
        logger.info("Transaction committed.") # Log 2: Nach Commit
    except Exception as e:
        logger.error(f"Commit failed: {e}", exc_info=True) # Log bei Fehler
        db.rollback() # Wichtig bei Fehler
        raise # Fehler weitergeben

    # Gruppenobjekt refreshen
    try:
        db.refresh(db_group)
        logger.info(f"db_group refreshed. invite_token from DB: {db_group.invite_token}") # Log 3: Nach Refresh
    except Exception as e:
         logger.error(f"Refresh failed: {e}", exc_info=True) # Log bei Fehler
         # Hier nicht unbedingt raisen, aber der Token im Objekt könnte alt sein

    # WICHTIG: Loggen direkt vor der Rückgabe
    logger.info(f"CRUD returning db_group with ID: {db_group.id}, Token: {db_group.invite_token}") # Log 4: Direkt vor return

    return db_group
def get_group(db: Session, group_id: int) -> Group | None: # Rückgabetyp hinzugefügt
    """
    Ruft eine einzelne Gruppe anhand ihrer ID ab.
    """
    return db.query(Group).filter(Group.id == group_id).first()

# Diese Funktion wird vom aktuellen Router nicht mehr für Standardbenutzer verwendet,
# kann aber für Admin-Zwecke nützlich sein.
def get_groups(db: Session, skip: int = 0, limit: int = 100) -> List[Group]: # Rückgabetyp hinzugefügt
    """
    Ruft eine Liste aller Gruppen ab (Paginierung möglich).
    Achtung: Wird vom Standard-Endpunkt GET /groups/ nicht mehr verwendet.
    """
    return db.query(Group).offset(skip).limit(limit).all()

# --- NEUE FUNKTION ---
def get_user_groups(db: Session, user_id: int, skip: int = 0, limit: int = 100) -> List[Group]:
    """
    Ruft alle Gruppen ab, in denen ein bestimmter Benutzer Mitglied ist.
    """
    # Subquery, um alle group_ids zu finden, in denen der User Mitglied ist
    user_group_ids_query = db.query(GroupMembership.group_id).filter(GroupMembership.user_id == user_id)

    # Hauptquery, um die Gruppen basierend auf den gefundenen IDs zu holen
    groups_query = db.query(Group).filter(Group.id.in_(user_group_ids_query))

    # Paginierung anwenden und Ergebnisse abrufen
    user_groups = groups_query.offset(skip).limit(limit).all()

    return user_groups

def get_group_by_invite_token(db: Session, token: str) -> Group | None:
    """
    Ruft eine Gruppe anhand ihres eindeutigen Invite-Tokens ab.
    """
    return db.query(Group).filter(Group.invite_token == token).first()

def regenerate_invite_token(db: Session, group_id: int) -> Group | None:
    """
    Generiert einen neuen Invite-Token für eine bestehende Gruppe.
    Gibt die aktualisierte Gruppe oder None zurück, wenn die Gruppe nicht gefunden wurde.
    """
    db_group = get_group(db, group_id)
    if db_group:
        db_group.invite_token = str(uuid.uuid4())
        db.add(db_group) # db.add() ist sicher, auch wenn das Objekt schon existiert
        db.commit()
        db.refresh(db_group)
    return db_group
