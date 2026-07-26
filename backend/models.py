"""SQLAlchemy models for the Neural Justice FIR system."""

from datetime import datetime
from sqlalchemy import (
    Column, Integer, String, Float, DateTime, ForeignKey, Text, Enum as SAEnum
)
from sqlalchemy.orm import DeclarativeBase, relationship
import enum


class Base(DeclarativeBase):
    pass


# ── Enums ────────────────────────────────────────────────────────────────────

class FIRStatus(str, enum.Enum):
    REGISTERED = "registered"
    UNDER_INVESTIGATION = "under_investigation"
    CHARGESHEETED = "chargesheeted"
    CLOSED = "closed"
    CONVICTED = "convicted"
    TRANSFERRED = "transferred"


# ── Models ────────────────────────────────────────────────────────────────────

class District(Base):
    __tablename__ = "districts"

    id = Column(Integer, primary_key=True, autoincrement=True)
    name = Column(String(100), nullable=False, unique=True)
    division = Column(String(100), nullable=True)
    code = Column(String(10), nullable=True, unique=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    stations = relationship("PoliceStation", back_populates="district")

    def __repr__(self) -> str:
        return f"<District {self.name}>"


class PoliceStation(Base):
    __tablename__ = "police_stations"

    id = Column(Integer, primary_key=True, autoincrement=True)
    name = Column(String(200), nullable=False)
    code = Column(String(20), nullable=True, unique=True)
    district_id = Column(Integer, ForeignKey("districts.id"), nullable=False)
    lat = Column(Float, nullable=True)
    lng = Column(Float, nullable=True)
    address = Column(String(500), nullable=True)
    phone = Column(String(20), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    district = relationship("District", back_populates="stations")
    firs = relationship("FirCase", back_populates="station")

    def __repr__(self) -> str:
        return f"<PoliceStation {self.name}>"


class CrimeHead(Base):
    __tablename__ = "crime_heads"

    id = Column(Integer, primary_key=True, autoincrement=True)
    name = Column(String(200), nullable=False, unique=True)
    code = Column(String(20), nullable=True, unique=True)
    category = Column(String(100), nullable=True)
    description = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    firs = relationship("FirCase", back_populates="crime_head")

    def __repr__(self) -> str:
        return f"<CrimeHead {self.name}>"


class Officer(Base):
    __tablename__ = "officers"

    id = Column(Integer, primary_key=True, autoincrement=True)
    name = Column(String(200), nullable=False)
    badge_number = Column(String(50), nullable=True, unique=True)
    rank = Column(String(50), nullable=True)
    station_id = Column(Integer, ForeignKey("police_stations.id"), nullable=True)
    phone = Column(String(20), nullable=True)
    email = Column(String(200), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    station = relationship("PoliceStation")
    registered_firs = relationship(
        "FirCase", back_populates="registered_by_officer",
        foreign_keys="FirCase.registered_by"
    )

    def __repr__(self) -> str:
        return f"<Officer {self.name}>"


class FirCase(Base):
    __tablename__ = "fir_cases"

    id = Column(Integer, primary_key=True, autoincrement=True)
    crime_no = Column(String(50), nullable=False, unique=True, index=True)
    station_id = Column(Integer, ForeignKey("police_stations.id"), nullable=False)
    registered_by = Column(Integer, ForeignKey("officers.id"), nullable=True)
    crime_head_id = Column(Integer, ForeignKey("crime_heads.id"), nullable=True)
    occurrence_date = Column(String(20), nullable=True)
    occurrence_time = Column(String(10), nullable=True)
    lat = Column(Float, nullable=True)
    lng = Column(Float, nullable=True)
    brief_facts = Column(Text, nullable=True)
    status = Column(String(50), default="registered")
    fir_type = Column(String(50), nullable=True)
    case_master_id = Column(Integer, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    station = relationship("PoliceStation", back_populates="firs")
    registered_by_officer = relationship(
        "Officer", back_populates="registered_firs",
        foreign_keys=[registered_by]
    )
    crime_head = relationship("CrimeHead", back_populates="firs")

    def __repr__(self) -> str:
        return f"<FirCase {self.crime_no}>"
