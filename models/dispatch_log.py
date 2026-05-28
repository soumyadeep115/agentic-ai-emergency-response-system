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
    selected_police    = Column(String(50),  nullable=True)   # NEW
    selected_police_eta = Column(Integer,    nullable=True)   # NEW — minutes

    escalation_status  = Column(String(255))
    dispatch_decision  = Column(Text)

    route_geometry     = Column(JSON,        nullable=True)
    real_eta_seconds   = Column(Integer,     nullable=True)
    route_source       = Column(String(10),  nullable=True)

    created_at         = Column(TIMESTAMP, server_default=func.now())