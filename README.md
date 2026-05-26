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

It is an AI-powered multi-agent emergency response orchestration platform that autonomously analyzes incidents, allocates emergency resources, computes optimal dispatch routes, coordinates police response, evaluates hospital capacity, and provides real-time operational analytics through an interactive tactical dashboard.

The system combines LangGraph agent orchestration, FastAPI APIs, SQLAlchemy persistence, MySQL analytics, NetworkX route optimization, and a React-based command dashboard to simulate real-world intelligent emergency response operations.

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

-----------------------------------------------------------

7. Dispatch History Logging

Every emergency dispatch is persisted to MySQL using SQLAlchemy.

Stored metadata includes:

- Incident details
- Selected responders
- Route decision
- Police allocation
- Escalation state
- Final dispatch recommendation
- Timestamp

-----------------------------------------------------------

===========================================================
TECH STACK
===========================================================

Frontend
- React
- Vite
- TailwindCSS

Backend:
- Python
- MySQL Connector
- Pydantic

Agent Orchestration:
LangGraph

Graph Optimization:
NetworkX

Database:
MySQL

ORM:
SQLAlchemy

API Layer:
FastAPI

Architecture
- Multi-Agent Workflow Orchestration
- REST API Microservice Layer
- Real-Time Dashboard Polling

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
System Workflow
===========================================================

Incident Input  
→ FastAPI API Layer  
→ LangGraph Multi-Agent Execution  
→ Route Optimization (NetworkX)  
→ Dispatch Decision  
→ SQLAlchemy Logging  
→ MySQL Persistence  
→ Analytics Computation  
→ React Dashboard Live Update

===========================================================
Dynamic Analytics Validation
===========================================================

The dashboard metrics update automatically based on real dispatch logs.

Example:
- Incident_B dominant → Dashboard shows Incident_B hotspot
- Incident dominant → Dashboard automatically switches hotspot ranking

This validates live backend-driven adaptive analytics.

Observed Validation:

Incident_B dominant (4 logs)
→ Dashboard hotspot: Incident_B

Incident dominant (5 logs)
→ Dashboard hotspot automatically switched to Incident

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

-----------------------------------------------------------

5. dispatch_logs

Columns:

- id
- incident_type
- casualties
- incident_location
- selected_ambulance
- selected_hospital
- selected_route
- police_status
- escalation_status
- dispatch_decision
- created_at

===========================================================
API ENDPOINTS
===========================================================

POST /dispatch
GET /dispatch-history
GET /api/v1/analytics/hotspots
GET /api/v1/analytics/map-state
GET /api/v1/reports/incidents

Returns complete historical dispatch audit logs including:

- Incident metadata
- Selected responders
- Routing decisions
- Escalation events
- Dispatch timestamps

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

===========================================================
SETUP INSTRUCTIONS
===========================================================

1. Install dependencies

pip install fastapi uvicorn mysql-connector-python networkx langgraph python-dotenv sqlalchemy

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

-----------------------------------------------------------

6. Run Frontend

cd frontend
npm install
npm run dev

-----------------------------------------------------------

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
- Google Maps API route visualization
- Authority dashboard
- WebSocket event streaming
- Regional emergency federation
- CCTV-based automated incident detection

===========================================================
INTEGRATION CHALLENGES SOLVED
===========================================================

During development, the following system integration challenges were resolved:

- Frontend-backend CORS synchronization
- API schema mismatch in polling layer
- SQLAlchemy persistence integration
- Dynamic analytics endpoint validation
- Real-time dashboard state synchronization

These fixes enabled complete end-to-end autonomous dispatch execution.

===========================================================
KEY ACHIEVEMENT
===========================================================

RoadSoS demonstrates:

- Multi-agent adaptive orchestration
- Dijkstra-based shortest path routing
- Dynamic operational state updates from MySQL
- Persistent dispatch history tracking
- Fault-tolerant escalation workflows
- RESTful emergency dispatch APIs
- Production-grade backend persistence via SQLAlchemy ORM

It is a fully integrated full-stack autonomous emergency response orchestration prototype demonstrating live adaptive decision intelligence.