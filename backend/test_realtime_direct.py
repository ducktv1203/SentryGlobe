import os
import asyncio
from realtime import RealtimeClient
from dotenv import load_dotenv

load_dotenv()


async def main():
    url = os.getenv("SUPABASE_URL")
    key = os.getenv("SUPABASE_KEY")

    rt_url = url.replace("https://", "wss://") + "/realtime/v1"

    print(f"Connecting to: {rt_url}")

    # In some versions it needs apikey as a param
    client = RealtimeClient(rt_url, key)

    # RealtimeClient in 1.x is usually sync but uses an internal thread or needs to be awaited?
    # Let's check attributes
    print(f"Client attributes: {dir(client)}")

    # If it has connect() as a method
    if hasattr(client, "connect"):
        res = client.connect()
        if asyncio.iscoroutine(res):
            await res
        print("Connected!")

    channel = client.channel("sentry_live_feed")
    res = channel.subscribe()
    if asyncio.iscoroutine(res):
        await res
    print("Subscribed!")

    res = channel.send_broadcast("new_attack", {"test": "data"})
    if asyncio.iscoroutine(res):
        await res
    print("Broadcast sent!")

    client.disconnect()

if __name__ == "__main__":
    asyncio.run(main())
