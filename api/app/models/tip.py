from sqlalchemy import Column, Integer, ForeignKey, String, UniqueConstraint
from sqlalchemy.orm import relationship
from app.database import Base

class Tip(Base):
    __tablename__ = "tips"
    id = Column(Integer, primary_key=True, index=True)
    event_id = Column(Integer, ForeignKey("events.id"), nullable=False)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    selected_option = Column(String, nullable=False)

    __table_args__ = (UniqueConstraint("event_id", "user_id", name="unique_tip_per_user_per_event"),)

    user = relationship("User", back_populates="tips")
    event = relationship("Event", back_populates="tips")