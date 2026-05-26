from fastapi import FastAPI
from pydantic import BaseModel
from main import run_dispatch
from utils.db import SessionLocal
from models.dispatch_log import DispatchLog
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class IncidentRequest(BaseModel):
    incident_type: str
    casualties: int
    incident_location: str


@app.post("/dispatch")
def dispatch_incident(request: IncidentRequest):

    initial_state = {
        "incident_type": request.incident_type,
        "casualties": request.casualties,
        "incident_location": request.incident_location,
        "severity": 0,
        "dispatch_decision": ""
    }

    result = run_dispatch(initial_state)

    db = SessionLocal()

    log = DispatchLog(
        incident_type=result["incident_type"],
        casualties=result["casualties"],
        incident_location=result["incident_location"],
        selected_ambulance=result["selected_ambulance"],
        selected_hospital=result["selected_hospital"],
        selected_route=result["selected_route"],
        police_status=result.get("police_status"),
        escalation_status=result.get("escalation_status"),
        dispatch_decision=result["dispatch_decision"]
    )

    db.add(log)
    db.commit()
    db.close()

    return result

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

    total = len(logs)

    if not logs:
        db.close()
        return {
            "zones": [],
            "metrics": {}
        }

    incident_counts = {}
    for log in logs:
        incident_counts[log.incident_location] = incident_counts.get(log.incident_location, 0) + 1

    highest_zone = max(incident_counts, key=incident_counts.get)

    db.close()

    return {
        "zones": [{
            "id": "Z001",
            "name": f"{highest_zone} Corridor",
            "location": highest_zone,
            "severity": "critical" if incident_counts[highest_zone] > 3 else "moderate",
            "crashes_24h": incident_counts[highest_zone],
            "peak_hour": "dynamic"
        }],
        "metrics": {
            "highest_zone": highest_zone,
            "critical_window": "dynamic",
            "crashes_24h": total,
            "active_incidents": total,
            "avg_response_min": max(5, 15-total),
            "sla_compliance_pct": max(80, 100-total),
            "units_deployed": total * 2
        }
    }


@app.get("/api/v1/analytics/map-state")
def get_map_state():
    return {
        "crash_sites": [
            {
                "lat": 19.0760,
                "lng": 72.8777,
                "label": "Incident_B"
            }
        ],
        "ambulances": [],
        "hospitals": [],
        "routes": []
    }


@app.get("/api/v1/reports/incidents")
def get_incident_reports():
    db = SessionLocal()
    logs = db.query(DispatchLog).all()
    db.close()
    return logs