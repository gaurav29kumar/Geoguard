"""
GeoGuard – FastAPI Backend
Run with:  uvicorn main:app --reload --port 8000
Docs at:   http://localhost:8000/docs
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from contextlib import asynccontextmanager

from db.database import init_db
from routers import tips, alerts, drones, cases, oversight, auth


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Initialise DB on startup."""
    await init_db()
    yield


app = FastAPI(
    title="GeoGuard API",
    description="AI-powered Illegal Mining Detection & Accountability System",
    version="1.0.0",
    lifespan=lifespan,
)

# ── CORS (allows the React frontend on localhost:5173 / 3000) ─────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Static file serving (uploaded evidence) ───────────────────────────────────
app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")

# ── Routers ───────────────────────────────────────────────────────────────────
app.include_router(auth.router,      prefix="/api/auth",      tags=["Auth"])
app.include_router(tips.router,      prefix="/api/tips",      tags=["Citizen Tips"])
app.include_router(alerts.router,    prefix="/api/alerts",    tags=["Police Alerts"])
app.include_router(drones.router,    prefix="/api/drones",    tags=["Drone Dispatch"])
app.include_router(cases.router,     prefix="/api/cases",     tags=["Case Management"])
app.include_router(oversight.router, prefix="/api/oversight", tags=["State Oversight"])


@app.get("/", tags=["Health"])
async def root():
    return {"status": "online", "system": "GeoGuard", "version": "1.0.0"}


@app.get("/api/health", tags=["Health"])
async def health():
    return {"status": "healthy", "db": "connected"}
