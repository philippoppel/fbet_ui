# app/models/user.py
from sqlalchemy import Column, Integer, String, Boolean
from sqlalchemy.orm import relationship
from app.database import Base

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    name = Column(String, nullable=True)
    hashed_password = Column(String, nullable=False)
    is_active = Column(Boolean, default=True)
    groups_created = relationship("Group", back_populates="creator")
    tips = relationship("Tip", back_populates="user", cascade="all, delete-orphan")
    memberships = relationship("GroupMembership", back_populates="user", cascade="all, delete-orphan")