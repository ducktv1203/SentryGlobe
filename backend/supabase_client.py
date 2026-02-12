"""
Supabase client for broadcasting attacks via Realtime.
Simplified to avoid 'NoneType' errors when Realtime is not initialized.
"""

import os
from dotenv import load_dotenv
from supabase import create_client

load_dotenv()

SUPABASE_URL = os.getenv("SUPABASE_URL", "")
SUPABASE_KEY = os.getenv("SUPABASE_KEY", "")

# Re-export for main.py check


def is_supabase_configured():
    return bool(SUPABASE_URL and SUPABASE_KEY)


_client = None


def get_supabase():
    """Lazy-init Supabase client. Returns None if credentials missing."""
    global _client
    if not is_supabase_configured():
        return None
    if _client is None:
        try:
            _client = create_client(SUPABASE_URL, SUPABASE_KEY)
        except Exception:
            return None
    return _client


async def broadcast_attack(attack_dict: dict) -> bool:
    """
    Attempts to broadcast via Supabase Realtime.
    Gracefully falls back to False if the Python client fails to initialize Realtime.
    """
    client = get_supabase()
    if not client:
        return False

    try:
        # Check if realtime is initialized (usually None in SyncClient)
        if hasattr(client, 'realtime') and client.realtime is not None:
            channel = client.realtime.channel("sentry_live_feed")
            # In some versions these are sync, in others async.
            # We try to handle it safely.
            import asyncio
            res = channel.subscribe()
            if asyncio.iscoroutine(res):
                await res

            res = channel.send_broadcast("new_attack", attack_dict)
            if asyncio.iscoroutine(res):
                await res

            res = channel.unsubscribe()
            if asyncio.iscoroutine(res):
                await res
            return True
        else:
            # Realtime client not initialized (common in sync Python client)
            return False
    except Exception:
        # Silently fail and return False to trigger the "Local-only" log
        return False
