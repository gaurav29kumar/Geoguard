"""
seed.py — Populate the GeoGuard database with demo users + data.
Run once:  python seed.py
"""

import asyncio
import uuid
import random
from datetime import datetime, timezone

from db.database import init_db, AsyncSessionLocal
from models.user import User, UserRole
from models.tip import Tip, TipStatus
from models.alert import Alert, AlertType, AlertSeverity, AlertStatus
from models.case import Case, CaseStatus, MiningType
from services.auth_service import hash_password


DEMO_USERS = [
    {"username": "citizen_demo",  "password": "citizen123",  "role": UserRole.citizen, "station": None},
    {"username": "officer_sharma","password": "police123",   "role": UserRole.police,  "station": "Khetri HQ"},
    {"username": "officer_meena", "password": "police123",   "role": UserRole.police,  "station": "Sariska"},
    {"username": "state_admin",   "password": "state123",    "role": UserRole.state,   "station": "Jaipur HQ"},
]

DEMO_TIPS = [
    {"id": "MIN-4829", "description": "Excavator activity near protected ridge. Blasting at night.", "latitude": 27.4, "longitude": 80.2, "location_text": "Khetri Hills, Zone 4", "status": TipStatus.verified, "ai_check_passed": True, "ai_check_score": 0.04},
    {"id": "MIN-5541", "description": "Blasting sounds reported by 3 residents. Night activity.", "latitude": 27.3, "longitude": 80.8, "location_text": "Bandi River Basin", "status": TipStatus.verified, "ai_check_passed": True, "ai_check_score": 0.09},
    {"id": "MIN-3302", "description": "Suspicious vehicle near restricted zone. Unknown trucks.", "latitude": 27.5, "longitude": 80.6, "location_text": "Ranthambore Fringe", "status": TipStatus.rewarded, "ai_check_passed": True, "ai_check_score": 0.12, "reward_amount": 20000, "bank_account": "XXXX9876", "bank_ifsc": "SBIN0001234", "bank_holder": "Anonymous"},
]

DEMO_ALERTS = [
    {"id": "MIN-4829-ALERT", "type": AlertType.citizen,   "severity": AlertSeverity.high,     "status": AlertStatus.unverified,  "latitude": 27.4, "longitude": 80.2, "location": "Khetri Hills, Zone 4",   "description": "Citizen tip: Excavator near protected ridge.", "tip_id": "MIN-4829"},
    {"id": "SAT-0293",       "type": AlertType.satellite, "severity": AlertSeverity.critical,  "status": AlertStatus.drone_en_route,"latitude": 27.6,"longitude": 80.5, "location": "Aravalli Sector 7",      "description": "NDVI drop -0.34 over 2.3 ha. Confidence 94%."},
    {"id": "MIN-5541-ALERT", "type": AlertType.citizen,   "severity": AlertSeverity.medium,    "status": AlertStatus.unverified,  "latitude": 27.3, "longitude": 80.8, "location": "Bandi River Basin",      "description": "Blasting reported by residents.", "tip_id": "MIN-5541"},
    {"id": "SAT-0194",       "type": AlertType.satellite, "severity": AlertSeverity.high,      "status": AlertStatus.resolved,    "latitude": 27.7, "longitude": 80.1, "location": "Sariska Buffer Zone",    "description": "Truck pattern matches illegal quarry."},
    {"id": "MIN-3302-ALERT", "type": AlertType.citizen,   "severity": AlertSeverity.low,       "status": AlertStatus.resolved,    "latitude": 27.5, "longitude": 80.6, "location": "Ranthambore Fringe",     "description": "Suspicious vehicle near zone.", "tip_id": "MIN-3302"},
]

DEMO_CASES = [
    {"id": "CASE-2291", "alert_id": "MIN-4829-ALERT", "tip_id": "MIN-4829", "officer_username": "officer_sharma", "station": "Khetri HQ",  "mining_type": MiningType.open_cast, "suspects_count": 4, "status": CaseStatus.pending_review, "has_video": True, "has_fir": True,  "notes": "Caught 4 operators at site. Equipment seized."},
    {"id": "CASE-2188", "alert_id": "SAT-0194",       "tip_id": None,        "officer_username": "officer_meena",  "station": "Sariska",    "mining_type": MiningType.quarrying, "suspects_count": 7, "status": CaseStatus.flagged,         "has_video": False,"has_fir": True,  "notes": "Truck convoy intercepted."},
    {"id": "CASE-2057", "alert_id": "MIN-3302-ALERT", "tip_id": "MIN-3302",  "officer_username": "officer_sharma", "station": "Khetri HQ",  "mining_type": MiningType.stone,     "suspects_count": 2, "status": CaseStatus.verified,        "has_video": True, "has_fir": True,  "notes": "Two suspects arrested, FIR filed."},
]


async def seed():
    await init_db()

    async with AsyncSessionLocal() as db:
        # Users
        user_map = {}
        for u in DEMO_USERS:
            existing = await db.get(User, u["username"])
            user = User(
                id        = str(uuid.uuid4()),
                username  = u["username"],
                hashed_pw = hash_password(u["password"]),
                role      = u["role"],
                station   = u["station"],
            )
            db.add(user)
            user_map[u["username"]] = user
        await db.flush()

        # Tips
        for t in DEMO_TIPS:
            tip = Tip(
                id              = t["id"],
                description     = t["description"],
                latitude        = t.get("latitude"),
                longitude       = t.get("longitude"),
                location_text   = t.get("location_text"),
                status          = t["status"],
                ai_check_passed = t.get("ai_check_passed"),
                ai_check_score  = t.get("ai_check_score"),
                reward_amount   = t.get("reward_amount"),
                bank_account    = t.get("bank_account"),
                bank_ifsc       = t.get("bank_ifsc"),
                bank_holder     = t.get("bank_holder"),
            )
            db.add(tip)

        # Alerts
        for a in DEMO_ALERTS:
            alert = Alert(
                id          = a["id"],
                type        = a["type"],
                severity    = a["severity"],
                status      = a["status"],
                latitude    = a.get("latitude"),
                longitude   = a.get("longitude"),
                location    = a.get("location"),
                description = a.get("description"),
                tip_id      = a.get("tip_id"),
            )
            db.add(alert)
        await db.flush()

        # Cases
        state_user = user_map["state_admin"]
        for c in DEMO_CASES:
            officer = user_map[c["officer_username"]]
            case = Case(
                id             = c["id"],
                alert_id       = c["alert_id"],
                tip_id         = c.get("tip_id"),
                officer_id     = officer.id,
                station        = c["station"],
                mining_type    = c["mining_type"],
                suspects_count = c["suspects_count"],
                notes          = c.get("notes"),
                status         = c["status"],
                video_path     = "uploads/evidence/demo_video.mp4" if c["has_video"] else None,
                fir_path       = "uploads/evidence/demo_fir.pdf"   if c["has_fir"]   else None,
                reviewed_by    = state_user.id if c["status"] in (CaseStatus.verified, CaseStatus.flagged) else None,
                reward_triggered = datetime.now(timezone.utc).isoformat() if c["status"] == CaseStatus.verified else None,
            )
            db.add(case)

        await db.commit()
        print("✅ Database seeded successfully!")
        print("\nDemo credentials:")
        print("  Citizen:      citizen_demo  / citizen123")
        print("  Police:       officer_sharma / police123")
        print("  State Admin:  state_admin   / state123")


if __name__ == "__main__":
    asyncio.run(seed())
