# src/app/routers/tip.py

import logging
from datetime import datetime, timezone
from typing import List
from collections import defaultdict

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.dependencies.auth import get_current_user
from app.models.user import User as UserModel
from app.models.event import Event
from app.models.tip import Tip
from app.models.group_membership import GroupMembership
from app.schemas.tip import TipCreate, TipOut, UserGroupPoints, HighscoreEntry
from app.crud import tip as crud_tip
from app.crud import group_membership as crud_membership
from app.crud import event as crud_event

# Stelle sicher, dass das Logging konfiguriert ist (z.B. in deiner main.py oder einem Konfigurationsmodul)
# Beispielhafte Basiskonfiguration (normalerweise zentral):
# logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')

logger = logging.getLogger(__name__) # Logger für dieses Modul holen

router = APIRouter(
    tags=["Tips & Scoring"]
)

# ===========================================
#       submit_tip Endpoint (unverändert)
# ===========================================
@router.post(
    "/",
    response_model=TipOut,
    status_code=status.HTTP_201_CREATED,
    summary="Submit a tip for an event"
)
def submit_tip(
    tip_data: TipCreate,
    db: Session = Depends(get_db),
    current_user: UserModel = Depends(get_current_user)
):
    """
    Submits a betting tip for a specific event.
    - User must be a member of the group the event belongs to.
    - User cannot submit more than one tip per event.
    - The selected option must be valid (case-insensitive, trimmed).
    - Cannot tip on past events.
    """
    logger.info(f"Attempting tip submission by user {current_user.id} for event {tip_data.event_id}")
    event = crud_event.get_event(db, event_id=tip_data.event_id)
    if not event:
        logger.warning(f"Tip submission failed: Event {tip_data.event_id} not found.")
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Event not found")

    logger.info(f"Event {tip_data.event_id} belongs to group {event.group_id}. Checking membership for user {current_user.id}.")
    if not crud_membership.is_member_of_group(db, current_user.id, event.group_id):
        logger.warning(f"Tip submission forbidden: User {current_user.id} is not a member of group {event.group_id}.")
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not allowed to tip on events in this group."
        )

    # Normalisiere Optionen
    selected_option_normalized = tip_data.selected_option.strip().lower()
    valid_options_normalized = [opt.strip().lower() for opt in event.options]
    logger.info(f"Normalizing options for event {event.id}. Selected: '{selected_option_normalized}', Valid: {valid_options_normalized}")

    if selected_option_normalized not in valid_options_normalized:
         logger.warning(f"Tip submission failed: Invalid option '{tip_data.selected_option}' for event {event.id}.")
         raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"'{tip_data.selected_option}' is not a valid option for this event."
        )

    existing_tip = crud_tip.get_tip_by_user_and_event(db, current_user.id, tip_data.event_id)
    if existing_tip:
        logger.warning(f"Tip submission conflict: User {current_user.id} already tipped on event {event.id}.")
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Tip already submitted for this event.")

    now_utc = datetime.now(timezone.utc)
    logger.info(f"Checking event time for event {event.id}. Event time: {event.event_datetime}, Current time (UTC): {now_utc}")
    if event.event_datetime and event.event_datetime < now_utc:
        logger.warning(f"Tip submission failed: Event {event.id} has already started/finished.")
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Event has already started or finished.")

    try:
        logger.info(f"Creating tip for user {current_user.id} on event {event.id} with option '{tip_data.selected_option}'.")
        new_tip = crud_tip.create_tip(
            db=db,
            user_id=current_user.id,
            event_id=tip_data.event_id,
            selected_option=tip_data.selected_option  # Originale Eingabe speichern
        )
        logger.info(f"Tip created successfully with ID {new_tip.id}.")
        return new_tip
    except Exception as e:
        logger.error(f"Failed to create tip for user {current_user.id} on event {tip_data.event_id}: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Could not submit tip."
        )


# ===========================================
#     get_points_for_group Endpoint (unverändert)
# ===========================================
@router.get(
    "/points/{group_id}",
    response_model=UserGroupPoints,
    summary="Get points for the current user in a specific group"
)
def get_points_for_group(
    group_id: int,
    db: Session = Depends(get_db),
    current_user: UserModel = Depends(get_current_user)
):
    """
    Calculates the total points for the current user in a specific group
    based on finished events with correct tips.
    """
    logger.info(f"Requesting points for user {current_user.id} in group {group_id}")
    if not crud_membership.is_member_of_group(db, current_user.id, group_id):
        logger.warning(f"Points request forbidden: User {current_user.id} not in group {group_id}.")
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not allowed to view points for this group."
        )

    logger.info(f"Fetching finished events for group {group_id}.")
    events = db.query(Event).filter(
        Event.group_id == group_id,
        Event.winning_option.isnot(None)
    ).all()
    logger.info(f"Found {len(events)} finished events for group {group_id}.")

    event_winners = {
        e.id: (e.winning_option or "").strip().lower()
        for e in events
    }
    logger.debug(f"Event winners map for group {group_id}: {event_winners}")

    if not event_winners:
        logger.info(f"No finished events with winners for group {group_id}. Returning 0 points for user {current_user.id}.")
        return UserGroupPoints(
            user_id=current_user.id,
            group_id=group_id,
            points=0,
            calculated_events=0
        )

    logger.info(f"Fetching tips for user {current_user.id} for events {list(event_winners.keys())}.")
    tips = db.query(Tip).filter(
        Tip.event_id.in_(event_winners.keys()),
        Tip.user_id == current_user.id
    ).all()
    logger.info(f"Found {len(tips)} tips for user {current_user.id} relevant to finished events.")

    points = sum(
        1 for tip in tips
        if (tip.selected_option or "").strip().lower() == event_winners.get(tip.event_id)
    )
    logger.info(f"Calculated points for user {current_user.id} in group {group_id}: {points} from {len(event_winners)} calculated events.")

    return UserGroupPoints(
        user_id=current_user.id,
        group_id=group_id,
        points=points,
        calculated_events=len(event_winners)
    )


# =======================================================
#     get_highscore_for_group Endpoint (MIT LOGGING)
# =======================================================
@router.get(
    "/highscore/{group_id}",
    response_model=List[HighscoreEntry],
    summary="Get the highscore list for a group"
)
def get_highscore_for_group(
    group_id: int,
    db: Session = Depends(get_db),
    current_user: UserModel = Depends(get_current_user)
):
    """
    Returns the highscore for all members in a group based on correct tips.
    3 points for a uniquely correct tip, otherwise 1 point.
    Comparison is case- and whitespace-insensitive.
    Includes all members, even with 0 points.
    """
    logger.info(f"--- Starting highscore calculation for group {group_id} (requested by user {current_user.id}) ---")

    def _normalize(option: str) -> str:
        return (option or "").strip().lower()

    # 1. Berechtigungsprüfung
    logger.info(f"Checking if user {current_user.id} is member of group {group_id}.")
    if not crud_membership.is_member_of_group(db, current_user.id, group_id):
        logger.warning(f"Highscore request forbidden: User {current_user.id} not in group {group_id}.")
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not allowed to view highscore for this group."
        )
    logger.info(f"User {current_user.id} is member. Proceeding.")

    # 2. Abgeschlossene Events holen
    logger.info(f"Fetching finished events with winning options for group {group_id}.")
    finished_events = db.query(Event).filter(
        Event.group_id == group_id,
        Event.winning_option.isnot(None)
    ).all()
    logger.info(f"Found {len(finished_events)} finished events for group {group_id}.")

    # 3. Event-Gewinner mappen (auch wenn leer)
    event_winners = {
        e.id: _normalize(e.winning_option)
        for e in finished_events
    }
    logger.info(f"Mapped event winners for group {group_id}: {event_winners}")
    # HINWEIS: Der frühe `return []` wenn event_winners leer ist, wurde entfernt!

    # 4. Alle Mitglieder der Gruppe holen
    logger.info(f"Fetching all memberships for group {group_id}.")
    memberships = crud_membership.get_memberships_for_group(db, group_id=group_id)
    member_ids = [m.user_id for m in memberships]
    logger.info(f"Found {len(memberships)} memberships for group {group_id}. Member IDs: {member_ids}")

    # Wenn keine Mitglieder vorhanden sind, eine leere Liste zurückgeben (sinnvoll)
    if not member_ids:
        logger.info(f"No members found in group {group_id}. Returning empty highscore list.")
        return []

    # 5. User-Daten (Namen, E-Mails) für alle Mitglieder holen
    logger.info(f"Fetching user details for member IDs: {member_ids}")
    users = db.query(UserModel).filter(UserModel.id.in_(member_ids)).all()
    users_by_id = {
        u.id: {"name": u.name, "email": u.email} for u in users
    }
    logger.info(f"Fetched details for {len(users)} users. User map: {users_by_id}")
    # Logge, falls User fehlen (Dateninkonsistenz?)
    if len(users) != len(member_ids):
        found_ids = set(users_by_id.keys())
        missing_ids = [mid for mid in member_ids if mid not in found_ids]
        logger.warning(f"Data inconsistency? Found {len(users)} user records for {len(member_ids)} member IDs. Missing user records for IDs: {missing_ids}")


    # 6. Alle relevanten Tipps holen (nur wenn es abgeschlossene Events gibt)
    all_tips = []
    if event_winners:
        logger.info(f"Fetching all tips for events {list(event_winners.keys())} and members {member_ids}.")
        all_tips = db.query(Tip).filter(
            Tip.event_id.in_(event_winners.keys()),
            Tip.user_id.in_(member_ids)
        ).all()
        logger.info(f"Found {len(all_tips)} relevant tips.")
    else:
        logger.info("No finished events with winners, skipping tip fetching.")

    # 7. Punkteberechnung
    logger.info("Calculating points...")
    user_points = defaultdict(int)
    correct_tips_by_event = defaultdict(list)

    # Nur Punkte berechnen, wenn es Tipps gibt
    if all_tips:
        for tip in all_tips:
            normalized_tip_option = _normalize(tip.selected_option)
            winning_option = event_winners.get(tip.event_id) # Ist bereits normalisiert

            # Logge jeden Tipp Vergleich (kann sehr verbose sein, ggf. DEBUG Level verwenden)
            # logger.debug(f"Comparing Tip ID {tip.id} (User {tip.user_id}, Event {tip.event_id}, Option '{normalized_tip_option}') with Winning Option '{winning_option}'")

            if winning_option is not None and normalized_tip_option == winning_option:
                # logger.debug(f"  -> Correct tip found for User {tip.user_id} on Event {tip.event_id}")
                correct_tips_by_event[tip.event_id].append(tip.user_id)

        logger.info(f"Correct tips grouped by event: {dict(correct_tips_by_event)}")

        for event_id, correct_users in correct_tips_by_event.items():
            if len(correct_users) == 1:
                winner_id = correct_users[0]
                user_points[winner_id] += 3
                logger.debug(f"  -> Awarding 3 points to User {winner_id} for unique correct tip on Event {event_id}")
            else:
                for uid in correct_users:
                    user_points[uid] += 1
                    logger.debug(f"  -> Awarding 1 point to User {uid} for correct tip (shared) on Event {event_id}")
    else:
        logger.info("No relevant tips found or no finished events, points remain 0 for all.")

    logger.info(f"Final calculated points map: {dict(user_points)}") # dict() für Lesbarkeit

    # 8. Ergebnisliste erstellen (alle Mitglieder inkludieren!)
    logger.info("Building final highscore list...")
    highscore_list = []
    for uid in member_ids:
        user_info = users_by_id.get(uid, {}) # Fallback auf leeres Dict, falls User fehlt
        name = (user_info.get("name") or "").strip()
        email = user_info.get("email") # Kann None sein

        # Fallback-Logik für den Namen
        if not name or name.lower().startswith("user "):
             # Bevorzuge E-Mail als Fallback, sonst "User {uid}"
            valid_name = email if email else f"User {uid}"
            if name != valid_name: # Logge nur, wenn sich der Name ändert
                 logger.debug(f"User {uid}: Using fallback name '{valid_name}' (Original DB name: '{name}', Email: '{email}')")
        else:
            valid_name = name
            # logger.debug(f"User {uid}: Using DB name '{valid_name}'")


        points = user_points.get(uid, 0) # WICHTIG: Standardwert 0, falls User keine Punkte hat

        highscore_list.append(
            HighscoreEntry(
                user_id=uid,
                name=valid_name,
                points=points
            )
        )
        # logger.debug(f"  -> Added entry for User {uid}: Name='{valid_name}', Points={points}")

    logger.info(f"Built highscore list before sorting (Count: {len(highscore_list)}): {highscore_list}")

    # 9. Sortieren und zurückgeben
    logger.info("Sorting highscore list by points (desc) and name (asc).")
    # Stabile Sortierung: Bei Punktegleichheit nach Name aufsteigend sortieren
    # Hinweis: Die Sortierung nach Namen ist hier vielleicht nicht nötig, da das Frontend das auch macht,
    # aber es schadet nicht und sorgt für eine konsistente Reihenfolge vom Backend.
    sorted_list = sorted(highscore_list, key=lambda x: (-x.points, x.name.lower()))
    logger.info(f"--- Finished highscore calculation for group {group_id}. Returning {len(sorted_list)} entries. ---")

    return sorted_list