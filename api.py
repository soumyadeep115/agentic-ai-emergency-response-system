from fastapi import FastAPI
from pydantic import BaseModel
from main import run_dispatch

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

    return result