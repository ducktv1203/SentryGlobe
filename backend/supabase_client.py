"""
Supabase client for persisting and broadcasting attacks via Database Realtime.
"""

import os
from dotenv import load_dotenv
from supabase import create_client

load_dotenv()

SUPABASE_URL = os.getenv("SUPABASE_URL", "")
SUPABASE_KEY = os.getenv("SUPABASE_KEY", "")


def is_supabase_configured():
    return bool(SUPABASE_URL and SUPABASE_KEY)


_client = None


def get_supabase():
    global _client
    if not is_supabase_configured():
        return None
    if _client is None:
        _client = create_client(SUPABASE_URL, SUPABASE_KEY)
    return _client


async def broadcast_attack(attack_dict: dict) -> bool:
    """
    Inserts an attack into the 'attacks' table.
    Supabase Realtime will automatically broadcast the 'INSERT' event.
    """
    client = get_supabase()
    if not client:
        return False

    try:
        # Use simple table insertion - this is extremely stable in Python
        client.table("attacks").insert(attack_dict).execute()
        return True
    except Exception as e:
        print(f"[Supabase] Insert error: {e}")
        return False
