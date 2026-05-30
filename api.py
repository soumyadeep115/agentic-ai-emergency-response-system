from fastapi import FastAPI, Body
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from sqlalchemy import text
import json
from datetime import datetime

from main import run_dispatch
from utils.db import SessionLocal
from utils.import_resources import import_resources
from models.dispatch_log import DispatchLog

app = FastAPI()
offline_alert = None
offline_alerts = []

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "https://agentic-ai-emergency-response-system.vercel.app",
        "https://agentic-ai-emergency-response-system-orx0ddaa0.vercel.app",
        "https://agentic-ai-emergency-git-738cf2-soumyadeep-mukherjee-s-projects.vercel.app"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class OfflineAlertRequest(BaseModel):
    transcript: str
    location_text: str
    incident_type: str
    casualties: int
    sms_message: str | None = None
    timestamp: str | None = None

class IncidentRequest(BaseModel):
    incident_type: str
    casualties: int
    incident_location: str
    incident_lat: float | None = None
    incident_lng: float | None = None


@app.post("/dispatch")
def dispatch_incident(request: IncidentRequest):

    print("DISPATCH REQUEST")
    print("lat:", request.incident_lat)
    print("lng:", request.incident_lng)

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
        return {"status": "Dispatch failed safely", "error": str(e)}

    db = SessionLocal()
    try:
        log = DispatchLog(
            incident_type       = result["incident_type"],
            casualties          = result["casualties"],
            incident_location   = result["incident_location"],
            selected_ambulance  = result.get("selected_ambulance"),
            selected_hospital   = result.get("selected_hospital"),
            selected_route      = result.get("selected_route"),
            police_status       = result.get("police_status"),
            selected_police     = result.get("selected_police"),
            selected_police_eta = result.get("selected_police_eta"),
            escalation_status   = result.get("escalation_status"),
            dispatch_decision   = result.get("dispatch_decision"),
            route_geometry      = result.get("route_geometry"),
            real_eta_seconds    = result.get("real_eta_seconds"),
            route_source        = result.get("route_source"),
        )
        db.add(log)
        db.commit()
    except Exception as e:
        db.rollback()
        print(f"[Dispatch] DB log error: {e}")
    finally:
        db.close()

    return result

@app.post("/api/v1/offline-alert")
async def offline_alert(payload: OfflineAlertRequest):

    alert = {
        "location": payload.location_text,
        "incident_type": payload.incident_type,
        "casualties": payload.casualties,
        "transcript": payload.transcript,
        "sms_message": payload.sms_message,
        "timestamp": payload.timestamp or datetime.now().isoformat(),
        "status": "pending"
    }

    offline_alerts.append(alert)

    return {
        "status": "received",
        "alert": alert
    }

@app.get("/api/v1/offline-alerts")
async def get_offline_alerts():
    return offline_alerts


@app.get("/dispatch-history")
def get_dispatch_history():
    db = SessionLocal()
    logs = db.query(DispatchLog).all()
    db.close()
    return logs


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


@app.get("/api/v1/analytics/map-state")
def get_analytics_map_state():
    return {
        "crash_sites": [{"lat": 19.0760, "lng": 72.8777, "label": "Incident_B"}],
        "ambulances":  [],
        "hospitals":   [],
        "routes":      []
    }


@app.get("/api/v1/reports/incidents")
def get_incident_reports():
    db = SessionLocal()
    logs = db.query(DispatchLog).all()
    db.close()
    return logs


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
        "repair_shops": [dict(row._mapping) for row in repair_shops],
        "tow_services":  [dict(row._mapping) for row in tow_services],
    }


@app.get("/api/v1/map-state")
def get_map_state():
    db = SessionLocal()

    hospitals    = db.execute(text("SELECT * FROM hospitals")).fetchall()
    police       = db.execute(text("SELECT * FROM police_units")).fetchall()
    ambulances   = db.execute(text("SELECT * FROM ambulances")).fetchall()
    repair_shops = db.execute(text("SELECT * FROM repair_shops")).fetchall()
    tow_services = db.execute(text("SELECT * FROM tow_services")).fetchall()

    latest_log = (
        db.query(DispatchLog)
        .order_by(DispatchLog.created_at.desc())
        .first()
    )

    db.close()

    def _ok(lat, lng):
        return lat is not None and lng is not None

    return {
        "resources": {
            "hospitals": [
                {"id": r.hospital_id, "name": r.name, "latitude": r.latitude,
                 "longitude": r.longitude, "available_beds": r.available_beds, "type": "hospital"}
                for r in hospitals if _ok(r.latitude, r.longitude)
            ],
            "police": [
                {"id": r.unit_id, "name": r.name, "latitude": r.latitude,
                 "longitude": r.longitude, "status": r.status, "eta": r.eta, "type": "police"}
                for r in police if _ok(r.latitude, r.longitude)
            ],
            "ambulances": [
                {"id": r.ambulance_id, "name": r.name, "latitude": r.latitude,
                 "longitude": r.longitude, "status": r.status, "eta": r.eta, "type": "ambulance"}
                for r in ambulances if _ok(r.latitude, r.longitude)
            ],
            "repair_shops": [
                {"id": r.id, "name": r.name, "latitude": r.latitude,
                 "longitude": r.longitude, "status": r.status, "type": "repair_shop"}
                for r in repair_shops if _ok(r.latitude, r.longitude)
            ],
            "tow_services": [
                {"id": r.id, "name": r.name, "latitude": r.latitude,
                 "longitude": r.longitude, "status": r.status, "type": "tow_service"}
                for r in tow_services if _ok(r.latitude, r.longitude)
            ],
        },
        "active_dispatch": {
            "incident_location":  latest_log.incident_location,
            "selected_ambulance": latest_log.selected_ambulance,
            "selected_hospital":  latest_log.selected_hospital,
            "selected_police":    latest_log.selected_police,
            "selected_police_eta": latest_log.selected_police_eta,
            "route_geometry":     latest_log.route_geometry,
            "real_eta_seconds":   latest_log.real_eta_seconds,
            "route_source":       latest_log.route_source,
            "dispatch_decision":  latest_log.dispatch_decision,
            "created_at":         str(latest_log.created_at)
        } if latest_log else None
    }


@app.post("/api/v1/save-resources")
def save_resources(data: dict = Body(...)):
    with open("frontend/src/data/resources.json", "w") as file:
        json.dump(data, file, indent=2)
    import_resources()
    return {"message": "Resources saved and synced to database"}