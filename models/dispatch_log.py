from sqlalchemy import Column, Integer, String, Text, JSON, TIMESTAMP
from sqlalchemy.sql import func
from utils.db import Base


class DispatchLog(Base):
    __tablename__ = "dispatch_logs"

    id = Column(Integer, primary_key=True, index=True)

    incident_type      = Column(String(50))
    casualties         = Column(Integer)
    incident_location  = Column(String(50))

    selected_ambulance = Column(String(255))
    selected_hospital  = Column(String(255))
    selected_route     = Column(String(255))

    police_status      = Column(String(255))
    escalation_status  = Column(String(255))

    dispatch_decision  = Column(Text)

    # ── Route metadata (Phase 5+) ─────────────────────────────
    route_geometry     = Column(JSON,    nullable=True)   # GeoJSON LineString
    real_eta_seconds   = Column(Integer, nullable=True)   # ORS or NetworkX ETA
    route_source       = Column(String(10), nullable=True)  # "ORS" | "NetworkX"

    created_at         = Column(TIMESTAMP, server_default=func.now())