"""
SentryGlobe FastAPI Backend
===========================
- /ingest  — Accept raw IP data, score severity, broadcast via Supabase
- Background task: generate random attacks every 3 seconds
"""

import asyncio
import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware

from models import Attack, IngestRequest
from generator import generate_attack
from severity import calculate_severity
from supabase_client import broadcast_attack, SUPABASE_URL

logging.basicConfig(level=logging.INFO,
                    format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("sentryglobe")

# --- Background attack generator ---
_stop_event = asyncio.Event()


async def attack_generator_loop():
    """Generate and broadcast a random attack every 3 seconds."""
    logger.info("🚀 Attack generator started (every 3s)")
    while not _stop_event.is_set():
        try:
            attack = generate_attack()
            attack_dict = attack.model_dump()

            sent = await broadcast_attack(attack_dict)
            status = "📡 Broadcast" if sent else "🔇 Local-only (no Supabase)"
            logger.info(
                f"{status} | {attack.severity.upper():6s} | "
                f"{attack.source_location.country:20s} → {attack.target_location.city:10s} | "
                f"{attack.type:20s} | {attack.source_ip}"
            )
        except Exception as e:
            logger.error(f"Generator error: {e}")

        await asyncio.sleep(3)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Start background task on startup, stop on shutdown."""
    task = asyncio.create_task(attack_generator_loop())
    yield
    _stop_event.set()
    task.cancel()
    try:
        await task
    except asyncio.CancelledError:
        pass


# --- FastAPI App ---
app = FastAPI(
    title="SentryGlobe API",
    description="Real-time DDoS attack ingestion and broadcasting",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/")
async def root():
    return {
        "service": "SentryGlobe API",
        "status": "running",
        "supabase_connected": bool(SUPABASE_URL),
    }


@app.post("/ingest", response_model=Attack)
async def ingest(request: IngestRequest):
    """
    Accept raw IP data, calculate severity, and broadcast.
    """
    import uuid
    import random
    from datetime import datetime, timezone
    from generator import SOURCE_POOL, TARGET_POOL, ATTACK_TYPES

    # Find a random source location (in production, use GeoIP lookup)
    source = random.choice(SOURCE_POOL)

    # Find target
    target = next(
        (t for t in TARGET_POOL if t["city"].lower()
         == request.target_city.lower()),
        TARGET_POOL[0],
    )

    severity = calculate_severity(request.source_ip)

    attack = Attack(
        id=str(uuid.uuid4()),
        source_ip=request.source_ip,
        source_location={
            "country": source["country"],
            "lat": source["lat"],
            "lng": source["lng"],
        },
        target_location={
            "city": target["city"],
            "lat": target["lat"],
            "lng": target["lng"],
        },
        severity=severity,
        type=random.choice(ATTACK_TYPES),
        timestamp=datetime.now(timezone.utc).isoformat(),
    )

    # Broadcast
    await broadcast_attack(attack.model_dump())

    return attack


@app.get("/health")
async def health():
    return {"status": "healthy"}
