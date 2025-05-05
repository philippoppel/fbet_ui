from sqlalchemy.orm import Session
from typing import List # Importieren

from app.models.tip import Tip

def create_tip(db: Session, user_id: int, event_id: int, selected_option: str) -> Tip: # Hint hinzugefügt
    """Creates a new tip."""
    tip = Tip(user_id=user_id, event_id=event_id, selected_option=selected_option)
    db.add(tip)
    db.commit()
    db.refresh(tip)
    return tip

def get_tip_by_user_and_event(db: Session, user_id: int, event_id: int) -> Tip | None: # Hint hinzugefügt
    """Retrieves a specific tip by user and event."""
    return db.query(Tip).filter_by(user_id=user_id, event_id=event_id).first()

def get_tips_for_event(db: Session, event_id: int) -> List[Tip]: # Hint hinzugefügt
    """Retrieves all tips for a specific event."""
    return db.query(Tip).filter_by(event_id=event_id).all()

def get_tips_for_events_and_users(db: Session, event_ids: List[int], user_ids: List[int]) -> List[Tip]:
   """Retrieves all tips for given events and users."""
   return db.query(Tip).filter(Tip.event_id.in_(event_ids), Tip.user_id.in_(user_ids)).all()