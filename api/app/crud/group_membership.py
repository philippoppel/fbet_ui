from sqlalchemy.orm import Session
from typing import List

from app.models.group_membership import GroupMembership
from app.schemas.group_membership import GroupMembershipCreate

def create_membership(db: Session, membership: GroupMembershipCreate) -> GroupMembership: # Hint hinzugefügt
    """Creates a new group membership entry."""
    db_membership = GroupMembership(**membership.model_dump())
    db.add(db_membership)
    db.commit()
    db.refresh(db_membership)
    return db_membership

def get_memberships_for_user(db: Session, user_id: int) -> List[GroupMembership]: # Hint hinzugefügt
    """Retrieves all memberships for a specific user."""
    return db.query(GroupMembership).filter(GroupMembership.user_id == user_id).all()

def get_memberships_for_group(db: Session, group_id: int) -> List[GroupMembership]: # Hint hinzugefügt
    """Retrieves all memberships for a specific group."""
    return db.query(GroupMembership).filter(GroupMembership.group_id == group_id).all()

def get_existing_membership(db: Session, user_id: int, group_id: int) -> GroupMembership | None: # Hint hinzugefügt
    """Checks if a specific membership already exists."""
    return db.query(GroupMembership).filter_by(user_id=user_id, group_id=group_id).first()

def is_member_of_group(db: Session, user_id: int, group_id: int) -> bool: # Hint war schon korrekt
    """Checks if a user is a member of a specific group."""
    return db.query(GroupMembership).filter_by(user_id=user_id, group_id=group_id).first() is not None