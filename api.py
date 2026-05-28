from fastapi import FastAPI, Body
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from sqlalchemy import text
import json

from main import run_dispatch
from utils.db import SessionLocal
from utils.import_resources import import_resources
from models.dispatch_log import DispatchLog

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ─────────────────────────────────────────────
# Request schema
# ─────────────────────────────────────────────

class IncidentRequest(BaseModel):
    incident_type: str
    casualties: int
    incident_location: str
    incident_lat: float | None = None   # device location latitude
    incident_lng: float | None = None   # device location longitude


# ─────────────────────────────────────────────
# POST /dispatch
# ─────────────────────────────────────────────

@app.post("/dispatch")
def dispatch_incident(request: IncidentRequest):

    initial_state = {
        "incident_type":     request.incident_type,
        "casualties":        request.casualties,
        "incident_location": request.incident_location,
        "incident_lat":      request.incident_lat,
        "incident_lng":      request.incident_lng,
        "severity":          0,
        "dispatch_decision": ""
    }

    try:
        result = run_dispatch(initial_state)
    except Exception as e:
        return {
            "status": "Dispatch failed safely",
            "error": str(e)
        }

    db = SessionLocal()

    try:
        log = DispatchLog(
            incident_type      = result["incident_type"],
            casualties         = result["casualties"],
            incident_location  = result["incident_location"],
            selected_ambulance = result.get("selected_ambulance"),
            selected_hospital  = result.get("selected_hospital"),
            selected_route     = result.get("selected_route"),
            police_status      = result.get("police_status"),
            escalation_status  = result.get("escalation_status"),
            dispatch_decision  = result.get("dispatch_decision"),
            route_geometry     = result.get("route_geometry"),       # GeoJSON or None
            real_eta_seconds   = result.get("real_eta_seconds"),     # int or None
            route_source       = result.get("route_source"),         # "ORS"|"NetworkX"|None
        )
        db.add(log)
        db.commit()
    except Exception as e:
        db.rollback()
        print(f"[Dispatch] DB log error: {e}")
    finally:
        db.close()

    return result


# ─────────────────────────────────────────────
# GET /dispatch-history
# ─────────────────────────────────────────────

@app.get("/dispatch-history")
def get_dispatch_history():
    db = SessionLocal()
    logs = db.query(DispatchLog).all()
    db.close()
    return logs


# ─────────────────────────────────────────────
# GET /api/v1/analytics/hotspots
# ─────────────────────────────────────────────

@app.get("/api/v1/analytics/hotspots")
def get_hotspots():
    db = SessionLocal()
    logs = db.query(DispatchLog).all()

    if not logs:
        db.close()
        return {"zones": [], "metrics": {}}

    total = len(logs)
    incident_counts = {}
    for log in logs:
        incident_counts[log.incident_location] = incident_counts.get(log.incident_location, 0) + 1

    highest_zone = max(incident_counts, key=incident_counts.get)
    db.close()

    return {
        "zones": [{
            "id":          "Z001",
            "name":        f"{highest_zone} Corridor",
            "location":    highest_zone,
            "severity":    "critical" if incident_counts[highest_zone] > 3 else "moderate",
            "crashes_24h": incident_counts[highest_zone],
            "peak_hour":   "dynamic"
        }],
        "metrics": {
            "highest_zone":       highest_zone,
            "critical_window":    "dynamic",
            "crashes_24h":        total,
            "active_incidents":   total,
            "avg_response_min":   max(5, 15 - total),
            "sla_compliance_pct": max(80, 100 - total),
            "units_deployed":     total * 2
        }
    }


# ─────────────────────────────────────────────
# GET /api/v1/analytics/map-state  (legacy stub)
# ─────────────────────────────────────────────

@app.get("/api/v1/analytics/map-state")
def get_analytics_map_state():
    return {
        "crash_sites": [
            {"lat": 19.0760, "lng": 72.8777, "label": "Incident_B"}
        ],
        "ambulances": [],
        "hospitals":  [],
        "routes":     []
    }


# ─────────────────────────────────────────────
# GET /api/v1/reports/incidents
# ─────────────────────────────────────────────

@app.get("/api/v1/reports/incidents")
def get_incident_reports():
    db = SessionLocal()
    logs = db.query(DispatchLog).all()
    db.close()
    return logs


# ─────────────────────────────────────────────
# GET /api/v1/resources
# ─────────────────────────────────────────────

@app.get("/api/v1/resources")
def get_resources():
    db = SessionLocal()

    hospitals    = db.execute(text("SELECT * FROM hospitals")).fetchall()
    police       = db.execute(text("SELECT * FROM police_units")).fetchall()
    ambulances   = db.execute(text("SELECT * FROM ambulances")).fetchall()
    repair_shops = db.execute(text("SELECT * FROM repair_shops")).fetchall()
    tow_services = db.execute(text("SELECT * FROM tow_services")).fetchall()

    db.close()

    return {
        "hospitals": [
            {
                "id":             row.hospital_id,
                "name":           row.name,
                "latitude":       row.latitude,
                "longitude":      row.longitude,
                "available_beds": row.available_beds,
                "icu_readiness":  row.icu_readiness,
                "trauma_score":   row.trauma_score,
                "status":         "available"
            }
            for row in hospitals
        ],

        "police": [
            {
                "id":                 row.unit_id,
                "name":               row.name,
                "latitude":           row.latitude,
                "longitude":          row.longitude,
                "eta":                row.eta,
                "clearance_capacity": row.clearance_capacity,
                "status":             row.status
            }
            for row in police
        ],

        "ambulances": [
            {
                "id":              row.ambulance_id,
                "name":            row.name,
                "latitude":        row.latitude,
                "longitude":       row.longitude,
                "eta":             row.eta,
                "equipment_score": row.equipment_score,
                "status":          row.status
            }
            for row in ambulances
        ],

        "repair_shops": [
            dict(row._mapping)
            for row in repair_shops
        ],

        "tow_services": [
            dict(row._mapping)
            for row in tow_services
        ]
    }


# ─────────────────────────────────────────────
# GET /api/v1/map-state  (new — tactical map)
# ─────────────────────────────────────────────

@app.get("/api/v1/map-state")
def get_map_state():
    """
    Single endpoint for the tactical map.
    Returns all resource coordinates + latest dispatch route geometry.
    The frontend polls this to render live markers and post-dispatch route.
    """
    db = SessionLocal()

    # ── All live resources ────────────────────────────────────
    hospitals    = db.execute(text("SELECT * FROM hospitals")).fetchall()
    police       = db.execute(text("SELECT * FROM police_units")).fetchall()
    ambulances   = db.execute(text("SELECT * FROM ambulances")).fetchall()
    repair_shops = db.execute(text("SELECT * FROM repair_shops")).fetchall()
    tow_services = db.execute(text("SELECT * FROM tow_services")).fetchall()

    # ── Latest dispatch with route geometry ───────────────────
    latest_log = (
        db.query(DispatchLog)
        .order_by(DispatchLog.created_at.desc())
        .first()
    )

    db.close()

    # ── Build resource marker lists ───────────────────────────
    def _coords_valid(lat, lng):
        return lat is not None and lng is not None

    hospital_markers = [
        {
            "id":       row.hospital_id,
            "name":     row.name,
            "latitude": row.latitude,
            "longitude": row.longitude,
            "available_beds": row.available_beds,
            "type":     "hospital"
        }
        for row in hospitals
        if _coords_valid(row.latitude, row.longitude)
    ]

    police_markers = [
        {
            "id":        row.unit_id,
            "name":      row.name,
            "latitude":  row.latitude,
            "longitude": row.longitude,
            "status":    row.status,
            "type":      "police"
        }
        for row in police
        if _coords_valid(row.latitude, row.longitude)
    ]

    ambulance_markers = [
        {
            "id":        row.ambulance_id,
            "name":      row.name,
            "latitude":  row.latitude,
            "longitude": row.longitude,
            "status":    row.status,
            "eta":       row.eta,
            "type":      "ambulance"
        }
        for row in ambulances
        if _coords_valid(row.latitude, row.longitude)
    ]

    repair_markers = [
        {
            "id":        row.id,
            "name":      row.name,
            "latitude":  row.latitude,
            "longitude": row.longitude,
            "status":    row.status,
            "type":      "repair_shop"
        }
        for row in repair_shops
        if _coords_valid(row.latitude, row.longitude)
    ]

    tow_markers = [
        {
            "id":        row.id,
            "name":      row.name,
            "latitude":  row.latitude,
            "longitude": row.longitude,
            "status":    row.status,
            "type":      "tow_service"
        }
        for row in tow_services
        if _coords_valid(row.latitude, row.longitude)
    ]

    # ── Latest dispatch route (post-dispatch mode) ────────────
    active_dispatch = None
    if latest_log:
        active_dispatch = {
            "incident_location":  latest_log.incident_location,
            "selected_ambulance": latest_log.selected_ambulance,
            "selected_hospital":  latest_log.selected_hospital,
            "route_geometry":     latest_log.route_geometry,    # GeoJSON LineString or None
            "real_eta_seconds":   latest_log.real_eta_seconds,
            "route_source":       latest_log.route_source,
            "dispatch_decision":  latest_log.dispatch_decision,
            "created_at":         str(latest_log.created_at)
        }

    return {
        "resources": {
            "hospitals":    hospital_markers,
            "police":       police_markers,
            "ambulances":   ambulance_markers,
            "repair_shops": repair_markers,
            "tow_services": tow_markers,
        },
        "active_dispatch": active_dispatch   # None if no dispatch has run yet
    }


# ─────────────────────────────────────────────
# POST /api/v1/save-resources
# ─────────────────────────────────────────────

@app.post("/api/v1/save-resources")
def save_resources(data: dict = Body(...)):
    with open("frontend/src/data/resources.json", "w") as file:
        json.dump(data, file, indent=2)

    import_resources()

    return {"message": "Resources saved and synced to database"}