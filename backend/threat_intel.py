import requests
import time
import uuid
import random
import os
from typing import List, Dict, Optional
from datetime import datetime, timezone
from models import Attack
from severity import calculate_severity
from dotenv import load_dotenv

load_dotenv()


ATTACK_TYPES = ["UDP Flood", "SYN Flood", "HTTP Request",
                "DNS Amplification", "Port Scan", "Brute Force"]


class ThreatIntelService:
    def __init__(self):
        self.threat_pool = []
        self.last_update = 0
        self.update_interval = int(os.getenv("THREAT_UPDATE_INTERVAL", "1800"))
        self.pointer = 0

    @staticmethod
    def _chunk_list(items: List[str], size: int) -> List[List[str]]:
        return [items[i:i + size] for i in range(0, len(items), size)]

    def _fetch_real_ips(self) -> List[str]:
        """Fetch latest identified malicious IPs from upstream intel."""
        try:
            headers = {
                'User-Agent': 'SentryGlobe/1.0 (Real-time Threat Visualization)'}
            response = requests.get(
                'https://isc.sans.edu/api/sources/summary?json', headers=headers, timeout=10)
            if response.status_code == 200:
                data = response.json()
                sans_ips = [item['ip'] for item in data if item.get('ip')]
            else:
                sans_ips = []
        except Exception as e:
            print(f"❌ Error fetching SANS feed: {e}")
            sans_ips = []

        otx_ips = self._fetch_otx_ips()
        print(f"✅ Feed counts | SANS: {len(sans_ips)} | OTX: {len(otx_ips)}")
        merged = list(dict.fromkeys(sans_ips + otx_ips))
        return merged

    def _fetch_otx_ips(self) -> List[str]:
        """Fetch IP indicators from AlienVault OTX (requires API key)."""
        api_key = os.getenv("OTX_API_KEY", "")
        if not api_key:
            return []

        try:
            headers = {
                'User-Agent': 'SentryGlobe/1.0 (Real-time Threat Visualization)',
                'X-OTX-API-KEY': api_key,
            }
            params = {
                'type': 'IPv4',
                'limit': os.getenv("OTX_LIMIT", "1000"),
            }
            response = requests.get(
                'https://otx.alienvault.com/api/v1/indicators/export',
                headers=headers,
                params=params,
                timeout=15
            )
            if response.status_code != 200:
                print(f"❌ OTX feed error: HTTP {response.status_code}")
                return []

            lines = response.text.splitlines()
            return [line.strip() for line in lines if line.strip()]
        except Exception as e:
            print(f"❌ Error fetching OTX feed: {e}")
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
                        "city": r.get('city'),
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
            all_geo: List[Dict] = []
            for chunk in self._chunk_list(ips, 100):
                all_geo.extend(self._geolocate_ips(chunk))
            if all_geo:
                self.threat_pool = all_geo
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

        target = attacker
        if len(self.threat_pool) > 1:
            for _ in range(3):
                candidate = random.choice(self.threat_pool)
                if candidate.get("ip") != attacker.get("ip"):
                    target = candidate
                    break

        target_city = target.get("city") or target.get("country") or "Unknown"
        target_country = target.get("country") or "Unknown"

        return Attack(
            id=str(uuid.uuid4()),
            source_ip=attacker['ip'],
            source_location={
                "country": attacker['country'],
                "lat": attacker['lat'],
                "lng": attacker['lng'],
            },
            target_location={
                "city": target_city,
                "country": target_country,
                "lat": target.get("lat", 0),
                "lng": target.get("lng", 0),
            },
            severity=calculate_severity(attacker['ip']),
            type=random.choice(ATTACK_TYPES),
            timestamp=datetime.now(timezone.utc).isoformat(),
        )


# Singleton
intel_service = ThreatIntelService()
