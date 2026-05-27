# RoadSoS  
Multi-Agent Emergency Dispatch Orchestration System

===========================================================
PROJECT OVERVIEW
===========================================================

RoadSoS is a full-stack AI-powered multi-agent emergency response orchestration platform that enables real-time incident reporting, intelligent emergency resource allocation, persistent operational resource management, live dispatch analytics, and interactive user/admin dashboards.

The platform integrates:

- LangGraph for autonomous agent orchestration
- FastAPI for backend APIs
- React + Vite for dual dashboard interfaces
- MySQL for persistent operational state
- NetworkX for route optimization
- SQLAlchemy for dispatch logging
- Dynamic JSON → MySQL resource synchronization

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

8. Persistent Resource Administration

Admin operators can dynamically:

- Add hospitals
- Add ambulances
- Add police units
- Add repair shops
- Add tow services

Changes persist through:

Admin Dashboard → JSON Sync → MySQL → Frontend Live Refresh

-----------------------------------------------------------

9. Dual Dashboard Architecture

The platform now supports:

- Admin Command Center
- Citizen/User Emergency Reporting Portal

-----------------------------------------------------------

10. Resource Persistence Layer

Resources survive browser refresh and backend restart through synchronized database persistence.

-----------------------------------------------------------

===========================================================
TECH STACK
===========================================================

Frontend:
- React
- Vite
- TailwindCSS
- React Router
- Dynamic Polling Hooks

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

State Synchronization:
- JSON Resource Sync Layer

===========================================================
SYSTEM ARCHITECTURE
===========================================================

Landing Page
      ↓
Role Selection
 ┌──────────────────────┬──────────────────────┐
 ↓                      ↓
User Portal         Admin Dashboard
 ↓                      ↓
Incident Report     Resource Management
 ↓                      ↓
POST /dispatch      POST /api/v1/save-resources
 ↓                      ↓
FastAPI API Layer   resources.json
        ↓                ↓
        └──────→ import_resources.py
                     ↓
                   MySQL
                     ↓
          ┌─────────────────────────────┐
          │ LangGraph Dispatch Engine    │
          └─────────────────────────────┘
                     ↓
            Incident Assessment Agent
                     ↓
               Severity Evaluation
            ┌───────────────┬───────────────┐
            ↓               ↓
     Police Coordination   Skip
            ↓
     Ambulance Allocation Agent
            ↓
      Hospital Evaluation Agent
            ↓
      Capacity Decision Branch
       ┌─────────────┬─────────────┐
       ↓             ↓
 Route Agent   Escalation Agent
       ↓             ↓
       └──────→ Dispatch Decision Agent
                     ↓
             Dispatch Logs (MySQL)
                     ↓
        Analytics Dashboard + Tactical Map
                     ↓
           Live User/Admin Visualization

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

Admin Input
→ FastAPI Save Endpoint
→ resources.json
→ Resource Import Pipeline
→ MySQL Persistence
→ API Retrieval
→ Frontend Refresh Persistence

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

-----------------------------------------------------------

6. repair_shops

- id
- name
- latitude
- longitude
- status

-----------------------------------------------------------

7. tow_services

- id
- name
- latitude
- longitude
- status

-----------------------------------------------------------

===========================================================
API ENDPOINTS
===========================================================

POST /dispatch
GET /dispatch-history
GET /api/v1/analytics/hotspots
GET /api/v1/analytics/map-state
GET /api/v1/reports/incidents
GET /api/v1/resources
POST /api/v1/save-resources

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

GET /api/v1/resources
Returns live operational resources from MySQL

POST /api/v1/save-resources
Persists admin dashboard resource changes to JSON and synchronizes to MySQL

-----------------------------------------------------------

===========================================================
USER INTERFACES
===========================================================

1. Landing Page
Role-based system entry

2. Admin Dashboard
Operational resource management

3. Tactical Analytics Dashboard
Live dispatch intelligence

4. User Emergency Portal
Citizen emergency reporting interface

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

RoadSoS is a fully integrated production-grade autonomous emergency response orchestration prototype featuring:

- Persistent operational resource synchronization
- Multi-agent adaptive dispatch intelligence
- Full-stack dual-portal architecture
- Real-time tactical analytics
- Database-backed live state management
- Fault-tolerant emergency fallback workflows