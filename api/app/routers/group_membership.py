# app/routers/group_membership.py

import logging
from typing import List

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.dependencies.auth import get_current_user
# Schemas importieren
from app.schemas.group_membership import GroupMembership, GroupMembershipCreate
# CRUD-Module importieren
from app.crud import group_membership as crud_membership
from app.crud import group as crud_group # crud_group importieren
# Modelle importieren
from app.models.user import User as UserModel
# from app.crud.group import get_group # wird nicht mehr direkt hier gebraucht

logger = logging.getLogger(__name__)

router = APIRouter(
    tags=["Group Memberships"]
)

@router.post(
    "/join/{token}", # Token im Pfad, kein Prefix nötig, da Router-Prefix greift
    response_model=GroupMembership, # Gibt die erstellte Mitgliedschaft zurück
    status_code=status.HTTP_201_CREATED,
    summary="Join a group using an invite token",
)
def join_group_by_token(
    token: str,
    db: Session = Depends(get_db),
    current_user: UserModel = Depends(get_current_user)
):
    """
    Allows the current user to join a group using a unique invite token.
    """
    logger.info(f"User {current_user.id} attempting to join group via token {token[:8]}...")

    # 1. Gruppe anhand des Tokens finden
    db_group = crud_group.get_group_by_invite_token(db, token=token)
    if db_group is None:
        logger.warning(f"Invite token {token[:8]}... not found for user {current_user.id}")
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Invalid or expired invite link."
        )

    group_id = db_group.id
    user_id = current_user.id

    # 2. Prüfen, ob User bereits Mitglied ist
    existing = crud_membership.get_existing_membership(db, user_id, group_id)
    if existing:
        logger.info(f"User {user_id} is already a member of group {group_id}. Token {token[:8]}...")
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT, # 409 Conflict ist passend
            detail="You are already a member of this group."
        )

    # 3. Neue Mitgliedschaft erstellen
    try:
        # GroupMembershipCreate erwartet user_id und group_id
        membership_data = GroupMembershipCreate(user_id=user_id, group_id=group_id)
        new_membership = crud_membership.create_membership(db=db, membership=membership_data)
        logger.info(f"User {user_id} successfully joined group {group_id} using token {token[:8]}...")
        return new_membership
    except Exception as e:
        logger.error(f"Failed to create membership via token for user {user_id} in group {group_id}: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Could not join group using the invite link."
        )

@router.post(
    "/",
    response_model=GroupMembership,
    status_code=status.HTTP_201_CREATED,
    summary="Join a group (Manual/Admin)", # Angepasste Summary
    # Optional: deprecated=True hinzufügen, wenn er ersetzt wird
)
def join_group_manual( # Umbenannt zur Unterscheidung
    membership_data: GroupMembershipCreate,
    db: Session = Depends(get_db),
    current_user: UserModel = Depends(get_current_user)
):
    """
    Allows joining a group by explicitly providing user_id and group_id.
    NOTE: Standard user flow should use the invite link mechanism (POST /join/{token}).
    Users can only add themselves unless specific admin logic is added.
    """
    # Authorization: Ensure user tries to add themselves (oder Admin-Check hier einbauen)
    if membership_data.user_id != current_user.id:
        # Hier könnte eine Prüfung auf Admin-Rechte für die Gruppe erfolgen
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Users can generally only join groups for themselves via this endpoint."
        )

    # Check if group exists (verwende crud_group)
    if not crud_group.get_group(db, group_id=membership_data.group_id):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Group not found")

    # Check for existing membership
    existing = crud_membership.get_existing_membership(db, membership_data.user_id, membership_data.group_id)
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="User is already a member of the group."
        )

    try:
        return crud_membership.create_membership(db=db, membership=membership_data)
    except Exception as e:
        logger.error(f"Failed to create manual membership for user {membership_data.user_id} in group {membership_data.group_id}: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Could not join group."
        )

@router.get(
    "/user/me",
    response_model=List[GroupMembership],
    summary="Get current user's memberships",
)
def read_my_memberships(
    db: Session = Depends(get_db),
    current_user: UserModel = Depends(get_current_user)
):
    """
    Retrieves all group memberships for the currently logged-in user.
    """
    return crud_membership.get_memberships_for_user(db=db, user_id=current_user.id)


@router.get(
    "/group/{group_id}",
    response_model=List[GroupMembership],
    summary="List members of a group",
)
def read_group_memberships(
    group_id: int,
    db: Session = Depends(get_db),
    current_user: UserModel = Depends(get_current_user)
):
    """
    Retrieves all memberships for a specific group.
    Only members of the group can view the list.
    """
    if not crud_membership.is_member_of_group(db=db, user_id=current_user.id, group_id=group_id):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access to this group's member list is not allowed."
        )
    return crud_membership.get_memberships_for_group(db=db, group_id=group_id)