# app/routers/event.py

import logging
from typing import List

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

# Eigene Module importieren
from app.database import SessionLocal
from app.dependencies.auth import get_current_user
from app.schemas.event import (
    Event,
    EventCreate,
    EventCreateInternal,
    EventResultSet,
    BoxingScheduleItem, UfcEventItem
)
from app.models.user import User as UserModel
from app.models.group import Group
from app.models.event import Event as EventModel
from app.models.tip import Tip
from app.crud import event as crud_event
from app.crud import group as crud_group
from app.crud import group_membership as crud_membership
from app.services import espn_scraper, ufc_calendar
from requests.exceptions import ConnectionError

logger = logging.getLogger(__name__)
logging.basicConfig(level=logging.INFO)

# Router OHNE Prefix hier definieren!
router = APIRouter(
    # prefix="/events", # <-- DIESE ZEILE ENTFERNEN oder auskommentieren
    tags=["Events"]       # Tags können hier bleiben oder auch in main.py gesetzt werden
)

# Dependency für die Datenbank-Session (kann hier bleiben oder in eine zentrale dependencies.py)
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# === CRUD Endpunkte für interne Events ===

# Der Pfad "/" ist jetzt relativ zum Prefix, das in main.py gesetzt wird -> /events/
@router.post("/", response_model=Event, status_code=status.HTTP_201_CREATED, summary="Create a new Event")
def create_event(
    event_data: EventCreate,
    db: Session = Depends(get_db),
    current_user: UserModel = Depends(get_current_user)
):
    # ... (Rest der Funktion bleibt gleich) ...
    group = crud_group.get_group(db, event_data.group_id)
    if not group:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Group not found")

    if group.created_by != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only the group admin can create events in this group")

    internal_event_data = EventCreateInternal(**event_data.dict(), created_by=current_user.id)
    new_event = crud_event.create_event(db=db, event_data=internal_event_data)
    return new_event


# Der Pfad "/{event_id}" wird zu /events/{event_id}
@router.get("/{event_id}", response_model=Event, summary="Get a specific Event by ID")
def read_event(
    event_id: int,
    db: Session = Depends(get_db),
    current_user: UserModel = Depends(get_current_user)
):
    # ... (Rest der Funktion bleibt gleich) ...
    event = crud_event.get_event(db, event_id)
    if not event:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Event not found")

    if not crud_membership.is_member_of_group(db, current_user.id, event.group_id):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="User is not a member of the group this event belongs to")

    return event

# Der Pfad "/group/{group_id}" wird zu /events/group/{group_id}
@router.get("/group/{group_id}", response_model=List[Event], summary="Get all Events for a specific Group")
def read_group_events(
    group_id: int,
    db: Session = Depends(get_db),
    current_user: UserModel = Depends(get_current_user)
):
    # ... (Rest der Funktion bleibt gleich) ...
    if not crud_membership.is_member_of_group(db, current_user.id, group_id):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="User is not a member of this group")

    events = crud_event.get_events_for_group(db, group_id)
    return events

# Der Pfad "/result" wird zu /events/result
@router.post("/result", status_code=status.HTTP_200_OK, summary="Set the result for an Event")
def set_event_result(
    result: EventResultSet,
    db: Session = Depends(get_db),
    current_user: UserModel = Depends(get_current_user),
):
    # ... (Rest der Funktion bleibt gleich) ...
    event = crud_event.get_event(db, result.event_id)
    if not event:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Event not found")

    group = crud_group.get_group(db, event.group_id)
    if not group:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Associated group not found")

    if group.created_by != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only the group admin can set the event result")

    if result.winning_option not in event.options:
         raise HTTPException(
             status_code=status.HTTP_400_BAD_REQUEST,
             detail=f"'{result.winning_option}' is not a valid option for this event. Valid options are: {event.options}"
         )

    event.winning_option = result.winning_option
    db.commit()
    db.refresh(event)
    return {"event_id": event.id, "winning_option": event.winning_option, "message": "Event result set successfully"}


# Der Pfad "/points/group/{group_id}" wird zu /events/points/group/{group_id}
@router.get("/points/group/{group_id}", summary="Calculate user points for a Group")
def get_points_for_group(
    group_id: int,
    db: Session = Depends(get_db),
    current_user: UserModel = Depends(get_current_user)
):
    # ... (Rest der Funktion bleibt gleich) ...
    if not crud_membership.is_member_of_group(db, current_user.id, group_id):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="User is not a member of this group")

    finished_events = db.query(EventModel)\
        .filter(EventModel.group_id == group_id, EventModel.winning_option.isnot(None))\
        .all()

    if not finished_events:
        return {"user_id": current_user.id, "group_id": group_id, "points": 0, "calculated_events": 0}

    finished_event_ids = {e.id: e.winning_option for e in finished_events}

    user_tips = db.query(Tip)\
        .filter(Tip.event_id.in_(finished_event_ids.keys()), Tip.user_id == current_user.id)\
        .all()

    points = 0
    for tip in user_tips:
        if finished_event_ids.get(tip.event_id) == tip.selected_option:
            points += 1

    return {
        "user_id": current_user.id,
        "username": current_user.username,
        "group_id": group_id,
        "points": points,
        "calculated_events": len(finished_event_ids)
    }


# === Endpunkt für externe Daten (ESPN Boxing Schedule) ===

@router.get("/external/boxing-schedule",
            response_model=List[BoxingScheduleItem],
            summary="Fetch Upcoming Boxing Schedule from ESPN",
            description="Ruft die aktuellen 'Key Dates' für Boxkämpfe von ESPN ab. Benötigt keine Authentifizierung.",
            tags=["External Data"]
           )
def get_external_boxing_schedule():
    """
    Ruft die Boxkampf-Termine von ESPN ab und gibt sie zurück.
    Dieser Endpunkt interagiert nicht mit der internen Datenbank und
    erfordert keine Benutzerauthentifizierung.
    """
    try:
        # Nutze die Funktion aus dem Service-Modul
        # ÄNDERUNG: await entfernt
        schedule_data = espn_scraper.fetch_and_parse_espn_boxing_schedule()
        # FastAPI kümmert sich um die Konvertierung zu BoxingScheduleItem basierend auf response_model
        return schedule_data
    except ConnectionError as e:
        logger.warning(f"ESPN Scraper - Connection Error: {e}")
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=f"Could not fetch data from external source (ESPN): {e}"
        )
    # ÄNDERUNG: Den spezifischen RuntimeError-Block wieder hinzufügen,
    #           falls fetch_and_parse_espn_boxing_schedule diesen werfen kann.
    except RuntimeError as e:
        logger.error(f"ESPN Scraper - Runtime Error during scraping: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"An internal error occurred during scraping process: {e}"
        )
    except Exception as e:
        # Allgemeiner Fallback-Fehler (fängt jetzt auch den RuntimeError auf, falls nicht spezifisch behandelt)
        logger.error(f"ESPN Scraper - Unexpected error in endpoint: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="An unexpected internal error occurred while fetching external schedule."
        )

@router.get("/external/ufc-schedule",
            response_model=List[UfcEventItem],
            summary="Fetch Upcoming UFC Schedule from iCalendar",
            description="Ruft zukünftige UFC Events aus einem öffentlichen iCalendar Feed ab.",
            tags=["External Data"]
           )
def get_external_ufc_schedule():
    """
    Ruft zukünftige UFC Events aus einem iCalendar Feed ab, parst sie und gibt sie zurück.
    """
    try:
        # Nutze die Funktion aus dem neuen Service-Modul
        schedule_data = ufc_calendar.fetch_and_parse_ufc_schedule()
        # FastAPI kümmert sich um die Konvertierung zu UfcEventItem basierend auf response_model
        return schedule_data
    except ConnectionError as e:
        logger.warning(f"UFC Calendar - Connection Error: {e}")
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=f"Could not fetch data from external source (UFC Calendar): {e}"
        )
    except RuntimeError as e: # Fängt z.B. Parsing-Fehler
        logger.error(f"UFC Calendar - Error during processing: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"An internal error occurred during UFC calendar processing: {e}"
        )
    except Exception as e:
        logger.error(f"UFC Calendar - Unexpected error in endpoint: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="An unexpected internal error occurred while fetching UFC schedule."
        )