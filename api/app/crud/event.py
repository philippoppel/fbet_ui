from sqlalchemy.orm import Session
from app.models.event import Event
from app.schemas.event import EventCreate, EventCreateInternal
from app.models.event import Event as EventModel
from app.schemas.event import EventCreate

def create_event(db: Session, event_data: EventCreateInternal):
    db_event = EventModel(
        title=event_data.title,
        description=event_data.description,
        group_id=event_data.group_id,
        created_by=event_data.created_by,
        question=event_data.question,
        options=event_data.options,
    )
    db.add(db_event)
    db.commit()
    db.refresh(db_event)
    return db_event

def get_event(db: Session, event_id: int):
    return db.query(Event).filter(Event.id == event_id).first()

def get_events_for_group(db: Session, group_id: int):
    return db.query(Event).filter(Event.group_id == group_id).all()
