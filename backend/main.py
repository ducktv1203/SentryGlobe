"""
SentryGlobe FastAPI Backend
===========================
Truly live Cyber Threat intelligence streamer.
Fetches real malicious activities from the internet and broadcasts via Supabase.
"""

import asyncio
import logging
import uuid
from datetime import datetime, timezone
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .models import Attack, IngestRequest
from .threat_intel import intel_service
from .severity import calculate_severity
from .supabase_client import broadcast_attack, is_supabase_configured

logging.basicConfig(level=logging.INFO,
                    format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("sentryglobe")

# --- Live Threat Stream ---
_stop_event = asyncio.Event()
_recent_attacks: list[dict] = []
MAX_RECENT = 200


async def threat_streaming_loop():
    """Poll the real-world threat feed and broadcast events."""
    logger.info("📡 Live Threat Streamer active.")

    while not _stop_event.is_set():
        try:
            event = intel_service.get_next_event()

            if event:
                attack_dict = event.model_dump()
                _recent_attacks.append(attack_dict)
                if len(_recent_attacks) > MAX_RECENT:
                    _recent_attacks.pop(0)
                sent = await broadcast_attack(attack_dict)
                status = "📡 LIVE" if sent else "🔇 OFFLINE"

                logger.info(
                    f"{status} | {event.severity.upper():6s} | "
                    f"{event.source_location.country:15s} → {event.target_location.city:10s} | "
                    f"{event.source_ip}"
                )
            else:
                logger.warning("⚠️ No threat data available in pool.")

        except Exception as e:
            logger.error(f"Streamer Error: {e}")

        # Real-time cadence
        await asyncio.sleep(2.5)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Start background threat streaming on startup."""
    task = asyncio.create_task(threat_streaming_loop())
    yield
    _stop_event.set()
    task.cancel()
    try:
        await task
    except asyncio.CancelledError:
        pass

app = FastAPI(title="SentryGlobe Real-time API", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/recent")
async def recent_attacks(since: str | None = None):
    """Return recent attacks (for frontend polling when Supabase not configured)."""
    attacks = _recent_attacks
    if since:
        attacks = [a for a in attacks if a.get("timestamp", "") > since]
    return attacks[-100:]  # return up to 100 most recent


@app.get("/")
async def root():
    return {
        "status": "online",
        "supabase": "connected" if is_supabase_configured() else "local-only",
        "provider": "SANS ISC Live Threat Intelligence",
        "nodes": "7 global sentry monitoring nodes active"
    }


@app.post("/ingest")
async def ingest_attack(request: IngestRequest):
    """Manual ingest for specific security events (SIEM integration)."""
    severity = calculate_severity(request.source_ip)

    attack = Attack(
        id=str(uuid.uuid4()) if 'uuid' in locals(
        ) else "manual-" + request.source_ip,
        source_ip=request.source_ip,
        source_location={"country": "Manual Ingest", "lat": 0, "lng": 0},
        target_location={"city": request.target_city,
                         "country": "Local", "lat": 0, "lng": 0},
        severity=severity,
        type="Manual Event",
        timestamp=datetime.now(timezone.utc).isoformat(),
    )

    attack_dict = attack.model_dump()
    _recent_attacks.append(attack_dict)
    if len(_recent_attacks) > MAX_RECENT:
        _recent_attacks.pop(0)
    await broadcast_attack(attack_dict)
    return {"status": "ingested", "severity": severity}
