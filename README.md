# RoadSoS  
Multi-Agent Emergency Dispatch Orchestration System

===========================================================
PROJECT OVERVIEW
===========================================================

RoadSoS is an AI-powered emergency response coordination system that dynamically allocates ambulances, police units, hospital resources, and optimal traffic routes in real time using:

- LangGraph for agent orchestration
- NetworkX for graph optimization
- MySQL for live operational state
- FastAPI for API exposure

It simulates real-world emergency response decision-making through adaptive multi-agent coordination.

===========================================================
PROBLEM SOLVED
===========================================================

Emergency response requires simultaneous coordination between:

- Ambulance dispatch
- Police traffic clearance
- Hospital readiness verification
- Route optimization
- Emergency escalation handling

RoadSoS solves this using dynamic agentic workflows.

===========================================================
CORE FEATURES
===========================================================

1. Dynamic Ambulance Allocation

Optimizes ambulance selection using:

- ETA
- Equipment readiness
- Availability

-----------------------------------------------------------

2. Dynamic Police Coordination

Critical incidents trigger police deployment based on:

- ETA
- Clearance capacity

-----------------------------------------------------------

3. Smart Hospital Selection

Hospitals ranked using:

- Bed availability
- ICU readiness
- Trauma score
- Route travel time

-----------------------------------------------------------

4. Real-Time Route Optimization

Shortest path recomputation using graph-based routing.

Traffic updates dynamically affect route decisions.

-----------------------------------------------------------

5. Emergency Escalation

When hospital capacity becomes critically low:

- Detect overload
- Trigger escalation workflow
- Activate fallback emergency response

-----------------------------------------------------------

6. Conditional Multi-Agent Workflow

Adaptive branching based on:

- Incident severity
- Hospital overload state

===========================================================
TECH STACK
===========================================================

Backend:
Python

Agent Orchestration:
LangGraph

Graph Optimization:
NetworkX

Database:
MySQL

API Layer:
FastAPI

Configuration:
python-dotenv

===========================================================
SYSTEM ARCHITECTURE
===========================================================

Incident Input
      ↓
Incident Assessment Agent
      ↓
Severity Branch
 ┌───────────────┬───────────────┐
 ↓               ↓
Police Agent   Skip
      ↓
Ambulance Allocation Agent
      ↓
Hospital Evaluation Agent
      ↓
Capacity Branch
 ┌───────────────┬───────────────┐
 ↓               ↓
Route Agent   Escalation Agent
      ↓
Dispatch Coordinator
      ↓
Final Emergency Dispatch Decision

===========================================================
AGENTS
===========================================================

1. Incident Assessment Agent

Responsibilities:

- Analyze incident type
- Assess casualties
- Compute severity score

-----------------------------------------------------------

2. Police Coordination Agent

Responsibilities:

- Evaluate police unit readiness
- Select optimal clearance unit

Optimization:

Score = (0.7 × Clearance Capacity) - (0.3 × ETA)

-----------------------------------------------------------

3. Ambulance Allocation Agent

Responsibilities:

- Select best ambulance

Optimization:

Score = (0.6 × Equipment Score) - (0.4 × ETA)

-----------------------------------------------------------

4. Hospital Evaluation Agent

Responsibilities:

- Rank hospitals

Optimization considers:

- Bed availability
- ICU readiness
- Trauma score
- Route travel time

-----------------------------------------------------------

5. Route Planning Agent

Responsibilities:

- Compute shortest path
- Dynamically adapt to traffic updates

-----------------------------------------------------------

6. Escalation Agent

Responsibilities:

- Trigger emergency escalation
- Activate regional fallback response

-----------------------------------------------------------

7. Dispatch Decision Agent

Responsibilities:

- Generate final dispatch recommendation

===========================================================
DATABASE SCHEMA
===========================================================

1. ambulances

Columns:

- ambulance_id
- eta
- equipment_score
- status
- location

-----------------------------------------------------------

2. hospitals

Columns:

- hospital_id
- available_beds
- icu_readiness
- trauma_score

-----------------------------------------------------------

3. traffic_edges

Columns:

- source_node
- destination_node
- travel_time

-----------------------------------------------------------

4. police_units

Columns:

- unit_id
- eta
- clearance_capacity
- status

===========================================================
API ENDPOINTS
===========================================================

POST /dispatch

Input:

{
  "incident_type": "road_accident",
  "casualties": 3,
  "incident_location": "Incident_B"
}

Returns:

- severity
- selected police unit
- selected ambulance
- selected hospital
- optimal route
- escalation status
- final dispatch decision

-----------------------------------------------------------

Future Endpoints:

GET /ambulances
GET /hospitals
GET /traffic

PUT /ambulance/{id}
PUT /hospital/{id}
PUT /traffic

===========================================================
PROJECT STRUCTURE
===========================================================

road_sos/
│
├── agents/
│   ├── incident_agent.py
│   ├── ambulance_agent.py
│   ├── hospital_agent.py
│   ├── route_agent.py
│   ├── police_agent.py
│   └── escalation_agent.py
│
├── graph/
│   └── state.py
│
├── utils/
│   ├── db.py
│   └── road_graph.py
│
├── api.py
├── main.py
├── .env
├── .env.example
├── .gitignore
└── README.md

===========================================================
SETUP INSTRUCTIONS
===========================================================

1. Install dependencies

pip install fastapi uvicorn mysql-connector-python networkx langgraph python-dotenv

-----------------------------------------------------------

2. Configure MySQL

Create database:

CREATE DATABASE roadsos;

-----------------------------------------------------------

3. Configure environment

Create .env

DB_HOST=localhost
DB_USER=root
DB_PASSWORD=your_password
DB_NAME=roadsos

-----------------------------------------------------------

4. Run API

uvicorn api:app --reload

-----------------------------------------------------------

5. Open Swagger docs

http://127.0.0.1:8000/docs

===========================================================
DEMO SCENARIOS
===========================================================

Scenario 1: Normal Dispatch

System performs standard optimized emergency response.

-----------------------------------------------------------

Scenario 2: Traffic Congestion

Traffic edge weights updated.

System reroutes automatically.

-----------------------------------------------------------

Scenario 3: Hospital Overload

Hospital capacity reduced.

System escalates to fallback emergency workflow.

-----------------------------------------------------------

Scenario 4: Police Reallocation

Police operational state updated.

System selects alternate police unit dynamically.

===========================================================
FUTURE ENHANCEMENTS
===========================================================

- Computer vision-based severity estimation
- Live map visualization
- Authority dashboard
- WebSocket event streaming
- Regional emergency federation
- CCTV-based automated incident detection

===========================================================
KEY ACHIEVEMENT
===========================================================

RoadSoS demonstrates:

- Multi-agent adaptive orchestration
- Graph-theoretic route optimization
- Real-time operational state adaptation
- Fault-tolerant emergency escalation
- Full backend API integration

It is a production-inspired emergency response intelligence prototype.