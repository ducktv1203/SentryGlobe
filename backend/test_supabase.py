import os
from supabase import create_client
from dotenv import load_dotenv

load_dotenv()

url = os.getenv("SUPABASE_URL")
key = os.getenv("SUPABASE_KEY")

client = create_client(url, key)

# Manually trigger realtime init if it failed
if client.realtime is None:
    print("Manually initializing realtime...")
    client.realtime = client._init_realtime_client()

print(f"Realtime: {client.realtime}")
if client.realtime:
    channel = client.realtime.channel("test")
    print(f"Channel: {channel}")
