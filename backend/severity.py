"""
Severity scoring logic.
Uses a simple weighted algorithm combining mock IP reputation and frequency heuristics.
"""

import hashlib
import random

# Mock "IP reputation database" — IPs hashed into a score range
# In production this would query AbuseIPDB or similar services
_REPUTATION_CACHE: dict[str, float] = {}

# Frequency tracking (simple in-memory counter)
_FREQUENCY_COUNTER: dict[str, int] = {}


def _get_ip_reputation(ip: str) -> float:
    """
    Mock IP reputation score [0..1]. Higher = more suspicious.
    Uses a deterministic hash so the same IP always gets the same score.
    """
    if ip not in _REPUTATION_CACHE:
        digest = int(hashlib.md5(ip.encode()).hexdigest()[:8], 16)
        # Normalize to [0, 1] with a bias toward medium
        score = (digest % 1000) / 1000.0
        _REPUTATION_CACHE[ip] = score
    return _REPUTATION_CACHE[ip]


def _get_frequency_score(ip: str) -> float:
    """
    Frequency-based score [0..1]. More hits from same IP = higher score.
    """
    _FREQUENCY_COUNTER[ip] = _FREQUENCY_COUNTER.get(ip, 0) + 1
    count = _FREQUENCY_COUNTER[ip]
    # Logarithmic scaling, caps at ~1.0 around 50 hits
    import math
    return min(math.log(count + 1) / math.log(50), 1.0)


def calculate_severity(ip: str) -> str:
    """
    Calculate severity using a weighted algorithm:
      score = 0.6 * reputation + 0.3 * frequency + 0.1 * random_noise
    Returns 'low', 'medium', or 'high'.
    """
    reputation = _get_ip_reputation(ip)
    frequency = _get_frequency_score(ip)
    noise = random.random()  # adds unpredictability for demo

    score = 0.6 * reputation + 0.3 * frequency + 0.1 * noise

    if score > 0.7:
        return "high"
    elif score > 0.4:
        return "medium"
    else:
        return "low"
