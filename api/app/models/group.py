# app/models/group.py

# Imports hier ggf. zusammenfassen, wenn in einer Datei
from sqlalchemy import Column, Integer, String, ForeignKey
from sqlalchemy.orm import relationship
from app.database import Base
# Import Event für die optionale Beziehung
# from .event import Event # Relative import

class Group(Base):
    __tablename__ = "groups"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    description = Column(String, nullable=True)
    created_by = Column(Integer, ForeignKey("users.id")) # ID des Erstellers
    invite_token = Column(String, unique=True, index=True, nullable=True)

    # --- Beziehungen ---
    # Beziehung zum Ersteller (User)
    creator = relationship("User", back_populates="groups_created")
    # Beziehung zu den Mitgliedschaften dieser Gruppe
    memberships = relationship("GroupMembership", back_populates="group", cascade="all, delete-orphan")
    # Optionale Beziehung zu den Events dieser Gruppe
    # events = relationship("Event", back_populates="group", cascade="all, delete-orphan")