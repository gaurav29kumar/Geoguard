# GeoGuard – FastAPI Backend

AI-powered Illegal Mining Detection & Accountability System  
**Stack:** Python 3.11 · FastAPI · SQLAlchemy (async) · SQLite · JWT Auth

---

## Quick Start (3 commands)

```bash
# 1. Install dependencies
pip install -r requirements.txt

# 2. Seed demo data (creates geoguard.db + demo users)
python seed.py

# 3. Run the server
uvicorn main:app --reload --port 8000
```

Interactive API docs → **http://localhost:8000/docs**

---

## Demo Credentials

| Role         | Username        | Password    |
|--------------|-----------------|-------------|
| Citizen      | citizen_demo    | citizen123  |
| Police       | officer_sharma  | police123   |
| State Admin  | state_admin     | state123    |

---

## Project Structure

```
geoguard-backend/
├── main.py                  # FastAPI app + CORS + router mounts
├── requirements.txt
├── seed.py                  # Demo data seeder
│
├── db/
│   └── database.py          # Async SQLite engine + session factory
│
├── models/                  # SQLAlchemy ORM models
│   ├── user.py              # Users (citizen / police / state)
│   ├── tip.py               # Citizen tips
│   ├── alert.py             # Police alerts (citizen + satellite)
│   ├── drone_dispatch.py    # Drone missions
│   └── case.py              # Evidence cases
│
├── schemas/                 # Pydantic request/response models
│   ├── auth.py
│   ├── tip.py
│   ├── alert.py
│   └── case.py
│
├── routers/                 # API route handlers
│   ├── auth.py              # /api/auth
│   ├── tips.py              # /api/tips       (Page 1)
│   ├── alerts.py            # /api/alerts     (Page 2)
│   ├── drones.py            # /api/drones     (Page 2)
│   ├── cases.py             # /api/cases      (Page 2)
│   └── oversight.py         # /api/oversight  (Page 3)
│
├── services/
│   ├── auth_service.py      # JWT + bcrypt + role guards
│   └── ai_service.py        # Simulated AI (deepfake / YOLO / satellite)
│
└── uploads/
    ├── tips/                # Citizen-submitted images
    └── evidence/            # Police video + FIR documents
```

---

## API Reference

### Auth  `/api/auth`

| Method | Endpoint       | Auth | Description                  |
|--------|----------------|------|------------------------------|
| POST   | `/register`    | None | Register a new user          |
| POST   | `/login`       | None | Login → returns JWT token    |

**Login example:**
```bash
curl -X POST http://localhost:8000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"officer_sharma","password":"police123"}'
```

---

### Page 1 – Citizen Tips  `/api/tips`

| Method | Endpoint              | Auth  | Description                        |
|--------|-----------------------|-------|------------------------------------|
| POST   | `/submit`             | None  | Submit anonymous tip (multipart)   |
| GET    | `/{tip_id}`           | None  | Track tip status by ID             |
| GET    | `/{tip_id}/ai-status` | None  | Poll AI deepfake check result      |
| POST   | `/{tip_id}/bank`      | None  | Link bank details to Tip ID        |
| GET    | `/`                   | State | List all tips                      |

**Submit a tip:**
```bash
curl -X POST http://localhost:8000/api/tips/submit \
  -F "description=Excavator activity near protected forest" \
  -F "latitude=27.4" \
  -F "longitude=80.2" \
  -F "location_text=Khetri Hills Zone 4" \
  -F "image=@/path/to/photo.jpg"
```

**Response:**
```json
{
  "id": "MIN-4829",
  "status": "pending",
  "description": "Excavator activity near protected forest",
  "ai_check_passed": null,
  "created_at": "2025-07-14T10:30:00Z"
}
```

---

### Page 2 – Police Alerts  `/api/alerts`

| Method | Endpoint                  | Auth   | Description                      |
|--------|---------------------------|--------|----------------------------------|
| GET    | `/`                       | Police | List all alerts (filterable)     |
| GET    | `/map/markers`            | Police | Active alerts with coordinates   |
| GET    | `/{alert_id}`             | Police | Get single alert                 |
| POST   | `/`                       | Police | Create alert manually            |
| PATCH  | `/{alert_id}/status`      | Police | Update alert status              |
| POST   | `/{alert_id}/accept`      | Police | Accept confirmed case            |
| POST   | `/satellite/ingest`       | None   | ESA Sentinel-2 pipeline webhook  |

**Alert status lifecycle:**
```
unverified → drone_en_route → drone_verifying → confirmed → accepted → resolved
```

---

### Page 2 – Drone Dispatch  `/api/drones`

| Method | Endpoint              | Auth   | Description                    |
|--------|-----------------------|--------|--------------------------------|
| POST   | `/dispatch`           | Police | Dispatch drone to alert        |
| GET    | `/`                   | Police | List all dispatches            |
| GET    | `/{dispatch_id}`      | Police | Poll dispatch status           |
| GET    | `/alert/{alert_id}`   | Police | Dispatches for an alert        |

**Dispatch a drone:**
```bash
curl -X POST http://localhost:8000/api/drones/dispatch \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"alert_id": "MIN-4829-ALERT"}'
```

**Drone lifecycle (simulated timing):**
```
dispatched → [8s] → en_route → [10s] → verifying (YOLO runs) → [5s] → returning → landed
```

---

### Page 2 – Case Management  `/api/cases`

| Method | Endpoint                  | Auth   | Description                        |
|--------|---------------------------|--------|------------------------------------|
| POST   | `/`                       | Police | Open case for accepted alert       |
| POST   | `/{case_id}/evidence`     | Police | Upload video + FIR (multipart)     |
| GET    | `/{case_id}`              | Police | Get case details                   |
| GET    | `/`                       | Police | List cases                         |

**Upload evidence (closes the case):**
```bash
curl -X POST http://localhost:8000/api/cases/CASE-2291/evidence \
  -H "Authorization: Bearer <token>" \
  -F "video=@suspect_footage.mp4" \
  -F "fir=@fir_document.pdf"
```

When **both** video and FIR are uploaded → case moves to `pending_review` and alert becomes `resolved`.

---

### Page 3 – State Oversight  `/api/oversight`

| Method | Endpoint                      | Auth  | Description                        |
|--------|-------------------------------|-------|------------------------------------|
| GET    | `/queue`                      | State | Cases awaiting state review        |
| GET    | `/cases`                      | State | All cases (filterable by status)   |
| GET    | `/cases/{case_id}`            | State | Full side-by-side case detail      |
| POST   | `/cases/{case_id}/review`     | State | Verify or flag a case              |
| GET    | `/stats`                      | State | Dashboard statistics               |

**Verify a case (triggers reward):**
```bash
curl -X POST http://localhost:8000/api/oversight/cases/CASE-2291/review \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"action": "verify", "review_notes": "Evidence complete. FIR matches drone footage."}'
```

**Flag for corruption:**
```bash
curl -X POST http://localhost:8000/api/oversight/cases/CASE-2188/review \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"action": "flag", "review_notes": "Video missing. Suspect FIR tampering."}'
```

---

## AI Services (Simulated → Production Swap)

| Service           | File                      | Swap with                              |
|-------------------|---------------------------|----------------------------------------|
| Deepfake detection| `services/ai_service.py`  | Intel FakeCatcher API / custom CNN     |
| YOLO detection    | `services/ai_service.py`  | YOLOv8 on drone edge (NVIDIA Jetson)  |
| Satellite change  | `services/ai_service.py`  | ESA Sentinel-2 + NDVI Change CNN      |

---

## Full Workflow (End-to-End)

```
[Citizen]  POST /tips/submit          → Tip ID generated
           GET  /tips/{id}/ai-status  → Poll until "verified"
           POST /tips/{id}/bank       → Link bank for reward

[AI BG]    deepfake check runs        → alert auto-created if passed

[Police]   GET  /alerts/              → See new alert on dashboard
           POST /drones/dispatch      → Drone sent to location
           GET  /drones/{id}          → Poll: en_route → verifying → confirmed

[Police]   POST /alerts/{id}/accept   → Officer accepts confirmed case
           POST /cases/               → Open case record
           POST /cases/{id}/evidence  → Upload video + FIR
                                      → Case → pending_review

[State]    GET  /oversight/queue      → Review queue
           GET  /oversight/cases/{id} → Side-by-side comparison
           POST /oversight/cases/{id}/review  action=verify
                                      → Reward triggered automatically
                                      → Tip status → rewarded
```

---

## Production Upgrade Path

1. **Database** → Swap `sqlite+aiosqlite` for `postgresql+asyncpg`
2. **Secret** → Set `GEOGUARD_SECRET` env variable to a 256-bit random string
3. **File storage** → Replace local `/uploads` with AWS S3 / GCS bucket
4. **AI models** → Uncomment real inference calls in `services/ai_service.py`
5. **Rewards** → Integrate NEFT/IMPS banking API in `oversight.py:_calculate_reward`
6. **Satellite** → Set up ESA Sentinel-2 webhook to call `POST /alerts/satellite/ingest`
7. **Drones** → Replace `asyncio.sleep` simulation with MQTT/WebSocket telemetry
