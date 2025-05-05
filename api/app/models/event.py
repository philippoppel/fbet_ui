from sqlalchemy import Column, Integer, String, ForeignKey, JSON, DateTime
from sqlalchemy.orm import relationship
from app.database import Base
# Import Group für die optionale Beziehung
# from .group import Group # Relative import

class Event(Base):
    __tablename__ = "events"
    # __table_args__ = {"extend_existing": True} # Oft nicht nötig in strukturierter App

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String, nullable=False)
    description = Column(String, nullable=True)
    group_id = Column(Integer, ForeignKey("groups.id"), nullable=False)
    created_by = Column(Integer, ForeignKey("users.id"), nullable=False)
    question = Column(String, nullable=False)
    options = Column(JSON, nullable=False) # Liste von Strings als JSON gespeichert
    winning_option = Column(String, nullable=True) # Die gewinnende Option als String
    event_datetime = Column(DateTime(timezone=True), nullable=True) # Zeitpunkt des Events

    # --- Beziehungen ---
    # Beziehung zu den Tipps für dieses Event
    tips = relationship("Tip", back_populates="event", cascade="all, delete-orphan")
    # Optionale Beziehung zur Gruppe
    #´group = relationship("Group", back_populates="events")