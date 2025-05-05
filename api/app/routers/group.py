# app/routers/group.py

import logging
from typing import List

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.dependencies.auth import get_current_user
from app.schemas.group import Group, GroupCreate
from app.models.user import User as UserModel
from app.crud import group as crud_group
from app.crud import group_membership as crud_membership

logger = logging.getLogger(__name__)

router = APIRouter(
    tags=["Groups"]
)

@router.post(
    "/",
    response_model=Group,
    status_code=status.HTTP_201_CREATED,
    summary="Create a new Group",
)
def create_group(
    group_data: GroupCreate,
    db: Session = Depends(get_db),
    current_user: UserModel = Depends(get_current_user)
):
    """
    Creates a new group in the database.
    The currently logged-in user is set as the creator (admin).
    """
    try:
        # Ensure crud_group.create_group expects 'created_by_id' or similar
        new_group = crud_group.create_group(db=db, group=group_data, created_by_id=current_user.id)
        return new_group
    except Exception as e:
        logger.error(f"Failed to create group for user {current_user.id}: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Could not create group."
        )

@router.get(
    "/{group_id}",
    response_model=Group,
    summary="Get a specific Group by ID",
)
def read_group(
    group_id: int,
    db: Session = Depends(get_db),
    current_user: UserModel = Depends(get_current_user)
):
    """
    Retrieves a single group by its ID.
    Only members of the group can access its details.
    """
    db_group = crud_group.get_group(db, group_id=group_id)
    if db_group is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Group not found")

    if not crud_membership.is_member_of_group(db=db, user_id=current_user.id, group_id=group_id):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access to this group is not allowed."
        )
    return db_group

@router.get(
    "/",
    response_model=List[Group],
    summary="List groups for the current user",
)
def read_user_groups(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user: UserModel = Depends(get_current_user)
):
    """
    Lists all groups where the currently logged-in user is a member.
    Requires a corresponding CRUD function `get_user_groups`.
    """
    user_groups = crud_group.get_user_groups(db, user_id=current_user.id, skip=skip, limit=limit)
    return user_groups