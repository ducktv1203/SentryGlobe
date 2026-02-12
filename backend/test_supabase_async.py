import os
import asyncio
from supabase._async.client import create_client
from dotenv import load_dotenv

load_dotenv()


async def main():
    url = os.getenv("SUPABASE_URL")
    key = os.getenv("SUPABASE_KEY")

    print(f"URL: {url}")
    # Key is sensitive, just check length
    print(f"Key length: {len(key) if key else 0}")

    client = await create_client(url, key)

    print(f"Client type: {type(client)}")
    # In v2 AsyncClient, realtime should be there
    try:
        print(f"Realtime: {client.realtime}")
    except AttributeError:
        print("realtime attribute missing")

    await client.aclose()

if __name__ == "__main__":
    asyncio.run(main())
