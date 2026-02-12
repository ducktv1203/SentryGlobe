"""
Supabase client for broadcasting attacks via Realtime.
"""

import os
from dotenv import load_dotenv

load_dotenv()

SUPABASE_URL = os.getenv("SUPABASE_URL", "")
SUPABASE_KEY = os.getenv("SUPABASE_KEY", "")

_client = None


def get_supabase():
    """Lazy-init Supabase client. Returns None if credentials are missing."""
    global _client
    if not SUPABASE_URL or not SUPABASE_KEY:
        return None
    if _client is None:
        from supabase import create_client
        _client = create_client(SUPABASE_URL, SUPABASE_KEY)
    return _client


async def broadcast_attack(attack_dict: dict) -> bool:
    """
    Broadcast an attack to the sentry_live_feed channel.
    Returns True if successful, False if Supabase is not configured.
    """
    client = get_supabase()
    if client is None:
        return False

    try:
        channel = client.realtime.channel("sentry_live_feed")
        await channel.subscribe()
        await channel.send_broadcast("new_attack", attack_dict)
        await channel.unsubscribe()
        return True
    except Exception as e:
        print(f"[Supabase] Broadcast error: {e}")
        return False
