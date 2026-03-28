from sqlalchemy import Boolean, Column, Date, Integer, String
from app.core.database import Base


class GhanaCardRecord(Base):
    __tablename__ = "nia_ghana_cards"

    id = Column(Integer, primary_key=True, index=True)
    card_number = Column(String(20), unique=True, nullable=False, index=True)
    first_name = Column(String(100), nullable=False)
    last_name = Column(String(100), nullable=False)
    other_names = Column(String(100), nullable=True)
    date_of_birth = Column(Date, nullable=False)
    gender = Column(String(10), nullable=False)
    nationality = Column(String(50), nullable=False, default="Ghanaian")
    region = Column(String(60), nullable=True)
    district = Column(String(80), nullable=True)
    is_active = Column(Boolean, nullable=False, default=True)
