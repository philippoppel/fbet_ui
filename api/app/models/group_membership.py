# app/models/group_membership.py

from sqlalchemy import Column, Integer, ForeignKey, UniqueConstraint
from sqlalchemy.orm import relationship
from app.database import Base

class GroupMembership(Base):
    __tablename__ = "group_memberships"

    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    group_id = Column(Integer, ForeignKey("groups.id"), nullable=False)

    # --- Beziehungen ---
    user = relationship("User", back_populates="memberships")
    group = relationship("Group", back_populates="memberships")

    __table_args__ = (UniqueConstraint('user_id', 'group_id', name='uq_user_group'),)