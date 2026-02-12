import requests
import json
import time
import uuid
import random
from typing import List, Dict, Optional
from datetime import datetime, timezone
from models import Attack
from severity import calculate_severity

# Monitored Asset Nodes (Where the real data "lands" on our display)
SENTRY_NODES = [
    {"city": "Paris", "lat": 48.85, "lng": 2.35, "country": "France"},
    {"city": "New York", "lat": 40.71, "lng": -74.00, "country": "United States"},
    {"city": "Tokyo", "lat": 35.68, "lng": 139.76, "country": "Japan"},
    {"city": "London", "lat": 51.50, "lng": -0.12, "country": "United Kingdom"},
    {"city": "Berlin", "lat": 52.52, "lng": 13.40, "country": "Germany"},
    {"city": "Singapore", "lat": 1.35, "lng": 103.81, "country": "Singapore"},
    {"city": "Sydney", "lat": -33.86, "lng": 151.21, "country": "Australia"},
]

ATTACK_TYPES = ["UDP Flood", "SYN Flood", "HTTP Request",
                "DNS Amplification", "Port Scan", "Brute Force"]


class ThreatIntelService:
    def __init__(self):
        self.threat_pool = []
        self.last_update = 0
        self.update_interval = 1800  # 30 minutes
        self.pointer = 0

    def _fetch_real_ips(self) -> List[str]:
        """Fetch latest identified malicious IPs from SANS ISC."""
        try:
            headers = {
                'User-Agent': 'SentryGlobe/1.0 (Real-time Threat Visualization)'}
            response = requests.get(
                'https://isc.sans.edu/api/sources/summary?json', headers=headers, timeout=10)
            if response.status_code == 200:
                data = response.json()
                return [item['ip'] for item in data[:100]]
        except Exception as e:
            print(f"❌ Error fetching SANS feed: {e}")
        return []

    def _geolocate_ips(self, ips: List[str]) -> List[Dict]:
        """Convert raw IPs to physical locations."""
        try:
            url = "http://ip-api.com/batch"
            response = requests.post(url, json=ips, timeout=15)
            if response.status_code == 200:
                results = response.json()
                return [
                    {
                        "ip": r.get('query'),
                        "country": r.get('country'),
                        "lat": r.get('lat'),
                        "lng": r.get('lon')
                    }
                    for r in results if r.get('status') == 'success'
                ]
        except Exception:
            pass
        return []

    def refresh(self):
        """Update the live threat pool from upstream intelligence."""
        ips = self._fetch_real_ips()
        if ips:
            geodata = self._geolocate_ips(ips)
            if geodata:
                self.threat_pool = geodata
                self.last_update = time.time()
                self.pointer = 0
                print(
                    f"✅ Threat Intelligence Sync: {len(self.threat_pool)} active attackers cached.")

    def get_next_event(self) -> Optional[Attack]:
        """Extract the next real-world threat event from the cache."""
        if not self.threat_pool or (time.time() - self.last_update > self.update_interval):
            self.refresh()

        if not self.threat_pool:
            return None

        # Cycle through the real threats
        attacker = self.threat_pool[self.pointer]
        self.pointer = (self.pointer + 1) % len(self.threat_pool)

        # Map to a random Sentry Monitor Node
        target = random.choice(SENTRY_NODES)

        return Attack(
            id=str(uuid.uuid4()),
            source_ip=attacker['ip'],
            source_location={
                "country": attacker['country'],
                "lat": attacker['lat'],
                "lng": attacker['lng'],
            },
            target_location={
                "city": target["city"],
                "country": target["country"],
                "lat": target["lat"],
                "lng": target["lng"],
            },
            severity=calculate_severity(attacker['ip']),
            type=random.choice(ATTACK_TYPES),
            timestamp=datetime.now(timezone.utc).isoformat(),
        )


# Singleton
intel_service = ThreatIntelService()
