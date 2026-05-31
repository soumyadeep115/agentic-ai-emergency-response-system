# 🚨 RoadSoS

### Hybrid Online–Offline Geospatial Multi-Agent Emergency Dispatch Orchestration System

[![Frontend](https://img.shields.io/badge/Live_App-Vercel-black?style=flat-square)](https://agentic-ai-emergency-response-system-1lzlwhcm8.vercel.app/)
[![Backend](https://img.shields.io/badge/Backend-Render-blue?style=flat-square)](https://road-safety-backend-7s87.onrender.com)
[![Swagger](https://img.shields.io/badge/API_Docs-Swagger-green?style=flat-square)](https://road-safety-backend-7s87.onrender.com/docs)
[![OpenAPI](https://img.shields.io/badge/OpenAPI-JSON-orange?style=flat-square)](https://road-safety-backend-7s87.onrender.com/openapi.json)

---

## Table of Contents

1. [Overview](#overview)
2. [Problem Statement](#problem-statement)
3. [System Objectives](#system-objectives)
4. [Technology Stack](#technology-stack)
5. [Deployment Infrastructure](#deployment-infrastructure)
6. [System Architecture](#system-architecture)
7. [Agent Architecture](#agent-architecture)
8. [Database Schema](#database-schema)
9. [API Endpoints](#api-endpoints)
10. [User Interfaces](#user-interfaces)
11. [Hybrid Emergency Workflow](#hybrid-emergency-workflow)
12. [Offline Emergency Architecture](#offline-emergency-architecture)
13. [Resource Persistence Pipeline](#resource-persistence-pipeline)
14. [Fallback Resilience Mechanisms](#fallback-resilience-mechanisms)
15. [Validated Demo Scenarios](#validated-demo-scenarios)
16. [System Validation](#system-validation)
17. [Setup Instructions](#setup-instructions)
18. [Integration Challenges Solved](#integration-challenges-solved)
19. [Future Scope](#future-scope)
20. [Conclusion](#conclusion)

---

## Overview

RoadSoS is a deployment-validated, cloud-native, full-stack AI-powered emergency orchestration platform that enables intelligent real-time incident reporting, autonomous emergency resource allocation, persistent operational resource management, live dispatch analytics, and interactive user/admin dashboards.

The platform integrates:

- **LangGraph** for autonomous multi-agent orchestration with conditional state-driven branching
- **OSRM** real-road routing with **NetworkX** fallback resilience
- **FastAPI** for backend REST microservices
- **React + Vite** for dual dashboard interfaces (Admin + User portals)
- **MySQL (Railway)** for persistent operational state
- **SQLAlchemy ORM** for dispatch logging and audit trails
- **Leaflet.js** for geospatial tactical visualization
- **Hybrid online GPS-based and offline voice/SMS-assisted** emergency activation
- **Human-in-the-loop** administrative escalation workflows
- **Dynamic JSON → MySQL** resource synchronization pipeline

---

## Problem Statement

Emergency response requires simultaneous coordination between multiple authorities:

- Ambulance dispatch
- Police traffic clearance
- Hospital readiness verification
- Route optimization
- Emergency escalation handling

Traditional systems suffer from static dispatch rules, limited real-road route responsiveness, delayed hospital capacity awareness, and poor inter-agency coordination.

RoadSoS addresses these challenges through autonomous agentic orchestration with dynamic, adaptive multi-agent workflows.

---

## System Objectives

1. Dynamically allocate emergency responders
2. Optimize shortest traversable emergency response routes
3. Select hospitals based on operational readiness
4. Trigger police coordination for critical incidents
5. Escalate emergencies during hospital overload
6. Persist dispatch logs for full auditability
7. Provide real-time operational dashboard visualization
8. Enable real-time dispatch state monitoring
9. Support offline emergency reporting under degraded connectivity

---

## Technology Stack

| Component | Technology |
|---|---|
| Programming Language | Python |
| Agent Orchestration | LangGraph |
| Primary Routing Engine | OSRM Public Routing API |
| Fallback Routing Engine | NetworkX |
| Distance Computation | Haversine Formula |
| Database | MySQL (Railway) |
| ORM Layer | SQLAlchemy |
| Backend API | FastAPI |
| Frontend Framework | React.js + Vite |
| Geospatial Visualization | Leaflet.js + React-Leaflet |
| Map Tiles | OpenStreetMap |
| Persistence Layer | JSON + MySQL Synchronization |
| Offline Recovery Interface | Browser Speech Recognition + Native SMS Protocol |
| Route Format | GeoJSON |
| Build Tool | Vite |
| Styling | Tailwind CSS |
| Frontend Polling | Dynamic Polling Hooks |
| Config Management | python-dotenv |
| Cloud Deployment | Vercel + Render |
| Cloud Database | Railway MySQL |
| Offline Alert Transport | Native SMS Protocol |
| Fallback Recovery Layer | Browser Network Failure Recovery |

---

## Deployment Infrastructure

### Production Deployment Stack

| Layer | Provider |
|---|---|
| Frontend Hosting | Vercel |
| Backend Hosting | Render |
| Database Hosting | Railway MySQL |

### Production URLs

| Resource | URL |
|---|---|
| Frontend Application | https://agentic-ai-emergency-response-system-1lzlwhcm8.vercel.app/ |
| Backend Base URL | https://road-safety-backend-7s87.onrender.com |
| Swagger Documentation | https://road-safety-backend-7s87.onrender.com/docs |
| OpenAPI Specification | https://road-safety-backend-7s87.onrender.com/openapi.json |

### Environment Isolation Model

Local development and deployed production environments are strictly isolated.

- **Local changes** affect only: local backend, local MySQL database, local frontend session
- **Production changes** affect only: Railway production database, Render backend, public deployment state

Architectural logic remains identical across both environments.

---

## System Architecture

```
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
          │   LangGraph Dispatch Engine  │
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
```

### Hybrid Routing Decision Flow

```
Route Request
      ↓
Coordinates Available?
   ├── YES → Invoke OSRM Routing Engine
   │              ↓
   │         OSRM Route Successful?
   │          ├── YES → Generate GeoJSON Route
   │          └── NO  → Trigger NetworkX Fallback
   └── NO  → Trigger NetworkX Fallback
```

### Dual-Mode Resource Location Acquisition

RoadSoS supports two resource registration modes:

- **Manual latitude-longitude entry** via admin form
- **Interactive tactical map pin placement** via the `LocationPicker` component — enables direct geospatial click-based placement of emergency resources

---

## Agent Architecture

The LangGraph orchestration engine executes agent decisions through conditional state-driven branching. Incident severity dynamically determines police coordination activation before downstream ambulance allocation, hospital ranking, route optimization, escalation handling, dispatch synthesis, and persistence execution.

### Multi-Agent Dispatch Pipeline

```
Incident Input
      ↓
Incident Assessment Agent
      ↓
Severity Critical? (≥ 8)
 ├── YES → Police Coordination Agent
 └── NO  → Direct Progression
      ↓
Ambulance Allocation Agent
      ↓
Hospital Evaluation Agent
      ↓
Hospital Overload? (Beds < 20)
 ├── YES → Escalation Agent
 └── NO  → Route Planning Agent
      ↓
Dispatch Decision Agent
      ↓
Dispatch Persistence Layer
      ↓
Dashboard + User Response Output
```

---

### Agent 1 — Incident Assessment Agent

**Responsibilities:**
- Analyze incident type
- Evaluate casualty count
- Compute rule-based incident severity heuristic

**Severity Formula:**

```
Severity = 2 × Casualties + IncidentFactor
```

Critical threshold: `Severity ≥ 8` → Police coordination is triggered

The severity layer uses deterministic rule-based incident classification rather than predictive inference.

---

### Agent 2 — Police Coordination Agent *(conditional)*

Triggered only when severity ≥ 8.

**Scoring formula:**

```
PoliceScore = 0.7 × ClearanceCapacity − 0.3 × ETA
```

Where:
- `ClearanceCapacity` = road clearance efficiency
- `ETA` = response arrival time

The unit with maximum score is selected.

---

### Agent 3 — Ambulance Allocation Agent

Uses hybrid proximity-weighted geospatial scoring. Candidate responders are ranked using:

```
Score = −1000D + 2E − T
```

Where:
- `D` = Geospatial distance to incident (Haversine)
- `E` = Equipment readiness score
- `T` = Estimated response time

**Selection workflow:**
1. Query all available ambulances
2. Compute geographic proximity
3. Apply weighted responder scoring
4. Select highest-ranked responder
5. Forward responder coordinates to route engine
6. Compute real-road dispatch route via OSRM

This architecture separates **responder selection** (ambulance agent) from **path optimization** (route agent).

---

### Agent 4 — Hospital Evaluation Agent

**Scoring formula:**

```
HospitalScore = 0.5(Beds) + 0.3(ICUReadiness) + 0.2(TraumaScore) − 0.3(RouteTime)
```

Where:
- `Beds` = available bed count
- `ICUReadiness` = ICU preparedness
- `TraumaScore` = trauma handling capability
- `RouteTime` = shortest path time

---

### Agent 5 — Route Planning Agent

The routing layer follows a hybrid architecture:

- **Primary:** OSRM real-road routing
- **Fallback:** NetworkX shortest-path search

**Routing objective:**

```
P* = argmin_P TravelTime(P)
```

**Routing workflow:**
1. Query OSRM road network
2. Generate GeoJSON route
3. Compute real ETA
4. Persist route geometry
5. Trigger NetworkX fallback on API failure

---

### Agent 6 — Escalation Agent *(conditional)*

**Triggered when:** `Beds < 20`

**Actions:**
- Activate regional emergency escalation
- Trigger fallback dispatch workflow

---

### Agent 7 — Dispatch Decision Agent

Synthesizes:
- Selected ambulance
- Selected police unit
- Selected hospital
- Optimal route
- Escalation state

Produces the final unified dispatch recommendation.

---

### Agent 8 — Dispatch Persistence Function

Stores every emergency response decision as a structured operational MySQL audit record via SQLAlchemy ORM.

**Persistence function:**

```
D = f(I, A, P, H, R, E, T)
```

Where:
- `I` = Incident metadata
- `A` = Ambulance allocation state
- `P` = Police coordination decision
- `H` = Hospital selection result
- `R` = Route optimization output
- `E` = Escalation state
- `T` = Dispatch timestamp

**Enables:**
- Historical dispatch replay
- Emergency response analytics
- Operational auditability
- Authority dashboard integration

---

## Database Schema

### `ambulances`

| Column | Description |
|---|---|
| ambulance_id | Primary key |
| name | Unit name |
| latitude | GPS latitude |
| longitude | GPS longitude |
| eta | Estimated response time |
| equipment_score | Equipment readiness rating |
| status | Availability status |
| location | Location label |

### `hospitals`

| Column | Description |
|---|---|
| hospital_id | Primary key |
| name | Hospital name |
| latitude | GPS latitude |
| longitude | GPS longitude |
| available_beds | Current available bed count |
| icu_readiness | ICU preparedness score |
| trauma_score | Trauma handling capability |

### `police_units`

| Column | Description |
|---|---|
| unit_id | Primary key |
| name | Unit name |
| latitude | GPS latitude |
| longitude | GPS longitude |
| eta | Response arrival time |
| clearance_capacity | Road clearance efficiency |
| status | Operational status |

### `nodes`

| Column | Description |
|---|---|
| node_id | Primary key |
| name | Node label |
| latitude | GPS latitude |
| longitude | GPS longitude |

### `traffic_edges`

| Column | Description |
|---|---|
| source_node | Origin node |
| destination_node | Destination node |
| travel_time | Edge weight (travel time) |

### `repair_shops`

| Column | Description |
|---|---|
| id | Primary key |
| name | Shop name |
| latitude | GPS latitude |
| longitude | GPS longitude |
| status | Operational status |

### `tow_services`

| Column | Description |
|---|---|
| id | Primary key |
| name | Service name |
| latitude | GPS latitude |
| longitude | GPS longitude |
| status | Operational status |

### `dispatch_logs`

| Column | Description |
|---|---|
| id | Primary key |
| incident_type | Type of emergency incident |
| casualties | Casualty count |
| incident_location | Incident GPS / location label |
| selected_ambulance | Allocated ambulance unit |
| selected_hospital | Routed hospital |
| selected_route | Route geometry (GeoJSON) |
| police_status | Police coordination state |
| escalation_status | Escalation activation flag |
| dispatch_decision | Final synthesized dispatch output |
| real_eta_seconds | Computed real ETA |
| route_source | OSRM or NetworkX |
| selected_police | Assigned police unit |
| selected_police_eta | Police unit ETA |
| created_at | Dispatch timestamp |

---

## API Endpoints

### Dispatch

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/dispatch` | Trigger full multi-agent dispatch pipeline |
| `GET` | `/dispatch-history` | Retrieve complete operational audit records |

**POST `/dispatch` — Request body:**

```json
{
  "incident_type": "road_accident",
  "casualties": 3,
  "incident_location": "Incident_B"
}
```

**Returns:**
- Severity score
- Selected police unit + ETA
- Selected ambulance
- Selected hospital
- Optimal route (GeoJSON)
- Escalation status
- Final dispatch decision

---

### Analytics & Reports

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/v1/analytics/hotspots` | Dynamic incident hotspot detection |
| `GET` | `/api/v1/analytics/map-state` | Live operational map state |
| `GET` | `/api/v1/reports/incidents` | Incident reporting records |

---

### Resources

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/v1/resources` | Fetch live operational resources from MySQL |
| `POST` | `/api/v1/save-resources` | Persist admin resource changes → JSON → MySQL |

---

### Offline Alerts

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/v1/offline-alert` | Ingest offline voice/SMS emergency alert |
| `GET` | `/api/v1/offline-alerts` | Dashboard offline alert synchronization |

---

### Documentation

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/docs` | Swagger interactive documentation |
| `GET` | `/openapi.json` | OpenAPI specification |

---

## User Interfaces

### 1. Landing Page
Role-based system entry point — directs users to either the User Emergency Portal or Admin Command Center.

### 2. Admin Command Center
Operational resource management dashboard for authority operators. Supports adding/updating ambulances, hospitals, police units, repair shops, and tow services. Changes persist through JSON sync → MySQL → live frontend refresh.

### 3. Tactical Analytics Dashboard
Live dispatch intelligence panel with real-time hotspot detection, map state visualization, and dispatch history. Dashboard metrics update automatically based on real dispatch logs.

**Example of adaptive analytics:**
```
Incident_B dominant (4 logs) → Dashboard hotspot: Incident_B
Incident_A dominant (5 logs) → Dashboard hotspot automatically switches to Incident_A
```

### 4. User Emergency Portal
Citizen-facing emergency reporting interface. Supports:
- Online GPS SOS (location captured via GPS, multi-agent dispatch triggered immediately)
- Offline Voice SOS (speech-to-text extraction, SMS protocol, backend alert ingestion)

---

## Hybrid Emergency Workflow

```
START
  ↓
User Faces Emergency
  ↓
Internet Connection Available?
 ├── YES → ONLINE FLOW (GPS SOS)
 │         ↓ User presses GPS SOS
 │         ↓ Location captured via GPS
 │         ↓ Incident sent to Multi-Agent Dispatch Engine
 │         ↓ Nearest ambulance assigned
 │         ↓ OSRM Route + Real ETA computed
 │         ↓ Route visualization + ETA updates delivered
 │
 └── NO  → OFFLINE FLOW (Voice SOS)
           ↓ User presses Offline Voice SOS
           ↓ Browser speech recognition extracts location + incident
           ↓ Offline alert sent to backend (POST /api/v1/offline-alert)
           ↓ Offline Alert DB stores alert
           ↓ Admin Dashboard surfaces alert
           ↓ Admin manually triggers dispatch via LangGraph backend engine
           ↓ Dispatch outcome + real-time updates delivered
END
```

---

## Offline Emergency Architecture

The offline emergency recovery pipeline is fully implemented and validated.

**Execution flow:**

```
Trigger
  → NetworkFailureDetection
  → EmergencyPayloadRecovery
  → SMSProtocolInvocation
  → BackendAlertIngestion
  → DashboardAlertSync
  → ManualAdminDispatch
```

**Validated offline recovery behaviors:**
- Network failure interception
- Automatic emergency preview recovery
- SMS sequencing correction
- Emergency payload auto-generation
- Backend alert persistence
- Dispatch continuity preservation
- Dashboard offline alert synchronization

---

## Resource Persistence Pipeline

The system supports dynamic admin-driven infrastructure updates that survive browser refresh and backend restart.

### Synchronization Flow

```
Admin Resource UI
      ↓
Resource Form Submission
      ↓
POST /api/v1/save-resources
      ↓
resources.json
      ↓
import_resources.py
      ↓
MySQL Resource Tables
      ↓
GET /api/v1/resources
      ↓
Admin Dashboard Refresh + Live Tactical User Map
```

### Persistence Equation

```
UIadmin → JSON → ImportSync → MySQL → API → UserMap
```

This guarantees live operational consistency between authority input and citizen-facing tactical visualization.

---

## Fallback Resilience Mechanisms

RoadSoS implements **23 validated fallback recovery mechanisms** across 6 categories:

| Category | Mechanisms |
|---|---|
| Agentic decision fallbacks | Ambulance unavailable substitution, hospital unavailable substitution |
| Routing recovery | NetworkX fallback on OSRM failure, GeoJSON route persistence |
| Database safety | Transaction rollback recovery, metadata-lock prevention cleanup |
| Persistence recovery | Dispatch-safe exception interception, offline emergency payload auto-generation |
| API reliability | Empty analytics safe-state rendering, fault-tolerant dispatch fallback |
| Offline emergency continuity | SMS sequencing correction, backend alert ingestion, dispatch continuity preservation, automatic emergency preview generation, network failure detection recovery, safe dispatch degradation substitution |

---

## Validated Demo Scenarios

### Scenario 1 — Geospatial Ambulance Reallocation
Changing incident coordinates dynamically triggers proximity-based ambulance rescoring followed by route recomputation. Validated across multiple Mumbai-region incident points (South Mumbai, Thane, Vasai), confirming proximity-based responder reassignment.

### Scenario 2 — Route Engine Fallback Validation
Simulated OSRM route failure triggers automatic NetworkX fallback routing while preserving full dispatch continuity.

### Scenario 3 — Hospital Overload
Reducing hospital bed availability below 20 activates the escalation agent and redirects dispatch to regional fallback facilities.

### Scenario 4 — Police Reallocation
Updating a police unit's operational state triggers alternate police selection using re-scored clearance capacity and ETA.

### Scenario 5 — Traffic Congestion *(route stress test)*
Traffic edge weights updated dynamically. System reroutes automatically using the updated graph state.

---

## System Validation

The complete RoadSoS platform was validated through end-to-end execution testing across all operational layers.

**Validation scenarios executed:**
- User incident submission through role-based portal
- Agentic dispatch orchestration execution
- Emergency resource persistence synchronization
- JSON-to-MySQL consistency validation
- Administrative dashboard refresh verification
- Dispatch audit logging verification
- Tactical map synchronization testing

**Observed outcomes:**
- Successful multi-agent dispatch execution
- Consistent database persistence
- Reliable frontend-backend synchronization
- Stable fault-tolerant fallback handling

**Production validation included:**
- Render deployment verification
- Railway persistence synchronization
- Offline fallback recovery testing
- SMS protocol generation validation
- Cloud API endpoint inspection via Swagger

---

## Setup Instructions

### 1. Install Python dependencies

```bash
pip install fastapi uvicorn mysql-connector-python networkx langgraph python-dotenv sqlalchemy
```

### 2. Configure MySQL

```sql
CREATE DATABASE roadsos;
```

### 3. Configure environment variables

Create a `.env` file in the backend root:

```env
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=your_password
DB_NAME=roadsos
```

### 4. Run the backend

```bash
uvicorn api:app --reload
```

### 5. Open Swagger docs

```
http://127.0.0.1:8000/docs
```

### 6. Run the frontend

```bash
cd frontend
npm install
npm run dev
```

---

## Integration Challenges Solved

During development, the following system integration challenges were identified and resolved:

| Challenge | Resolution |
|---|---|
| Frontend-backend CORS synchronization | CORS middleware configured for dual-portal compatibility |
| API schema mismatch in polling layer | Pydantic model alignment and response normalization |
| SQLAlchemy persistence integration | ORM session management and connection pooling |
| Dynamic analytics endpoint validation | Backend-driven adaptive hotspot computation |
| Real-time dashboard state synchronization | Polling hooks with live MySQL-backed state |

These fixes enabled complete end-to-end autonomous dispatch execution.

---

## Future Scope

| Enhancement | Description |
|---|---|
| Carrier-grade SMS gateway | Automated SMS dispatch escalation via carrier APIs |
| Store-and-forward sync | Delayed dispatch synchronization for offline-first recovery |
| WebSocket streaming | Real-time event streaming for live dashboard updates |
| Live GPS telemetry | Real-time responder location tracking |
| Self-hosted OSRM | Scalable route computation without public API dependency |
| Custom routing profiles | Enhanced route control via OSRM profile optimization |
| CCTV accident detection | Computer vision-based automated incident detection |
| CV severity estimation | AI-powered severity classification from live camera feeds |
| Predictive hotspot forecasting | ML-based emergency hotspot prediction |
| Multi-city deployment | Distributed architecture for regional federation |

---

## Conclusion

RoadSoS is a deployment-validated full-stack intelligent emergency orchestration platform integrating:

- Multi-agent decision intelligence via LangGraph
- Hybrid geospatial responder scoring with real-road route optimization
- Full-stack real-time dual-portal dashboard visualization
- Real-time database-driven operational adaptation
- Persistent dispatch audit logging via SQLAlchemy + MySQL
- API-driven emergency response coordination via FastAPI
- Validated offline emergency fallback pipeline with SMS recovery

The system establishes a scalable foundation for next-generation emergency response infrastructure, with 23 implemented fallback resilience mechanisms and production-validated cloud-native deployment across Vercel, Render, and Railway.

---

*RoadSoS — Autonomous Emergency Dispatch Intelligence*