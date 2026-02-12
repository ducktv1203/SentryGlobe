"""
Random attack generator for demo/development.
Produces one Attack every N seconds targeting Adelaide or Brisbane.
"""

import random
import uuid
from datetime import datetime, timezone
from models import Attack
from severity import calculate_severity

ATTACK_TYPES = ["UDP Flood", "SYN Flood", "HTTP Request", "DNS Amplification"]

SOURCE_POOL = [
    {"country": "China", "lat": 39.9, "lng": 116.4},
    {"country": "Russia", "lat": 55.75, "lng": 37.62},
    {"country": "United States", "lat": 38.9, "lng": -77.04},
    {"country": "Brazil", "lat": -15.79, "lng": -47.88},
    {"country": "India", "lat": 28.61, "lng": 77.23},
    {"country": "Iran", "lat": 35.69, "lng": 51.39},
    {"country": "North Korea", "lat": 39.03, "lng": 125.75},
    {"country": "Vietnam", "lat": 21.03, "lng": 105.85},
    {"country": "Indonesia", "lat": -6.21, "lng": 106.85},
    {"country": "Turkey", "lat": 39.93, "lng": 32.85},
    {"country": "Ukraine", "lat": 50.45, "lng": 30.52},
    {"country": "Nigeria", "lat": 9.06, "lng": 7.49},
    {"country": "Germany", "lat": 52.52, "lng": 13.41},
    {"country": "Netherlands", "lat": 52.37, "lng": 4.9},
    {"country": "South Korea", "lat": 37.57, "lng": 126.98},
]

TARGET_POOL = [
    {"city": "Adelaide", "lat": -34.92, "lng": 138.6},
    {"city": "Brisbane", "lat": -27.47, "lng": 153.03},
]


def _random_ip() -> str:
    return f"{random.randint(1, 223)}.{random.randint(0, 255)}.{random.randint(0, 255)}.{random.randint(0, 255)}"


def generate_attack() -> Attack:
    """Generate a single random attack with severity scoring."""
    source = random.choice(SOURCE_POOL)
    target = random.choice(TARGET_POOL)
    ip = _random_ip()

    severity = calculate_severity(ip)

    return Attack(
        id=str(uuid.uuid4()),
        source_ip=ip,
        source_location={
            "country": source["country"],
            "lat": source["lat"] + (random.random() - 0.5) * 4,
            "lng": source["lng"] + (random.random() - 0.5) * 4,
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
