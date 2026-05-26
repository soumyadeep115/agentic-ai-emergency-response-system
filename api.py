from fastapi import FastAPI
from pydantic import BaseModel
from main import run_dispatch
from utils.db import SessionLocal
from models.dispatch_log import DispatchLog

app = FastAPI()


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