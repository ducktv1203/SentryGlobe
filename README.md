# SentryGlobe

SentryGlobe is a real-time cyber threat visualization dashboard. It renders a 3D globe with live attack arcs, a threat feed, and country leaderboards. Data can be streamed from a FastAPI backend via Supabase Realtime, with a mock data fallback for local development.

## Features

- 3D globe visualization with animated arcs and impact rings
- Live attack feed with severity and attack-type badges
- Leaderboard of top attacking countries
- Realtime updates via Supabase Database Realtime (postgres_changes)
- Mock data mode when Supabase credentials are missing

## Tech Stack

- Frontend: Next.js (App Router), React, Tailwind CSS
- Visualization: Three.js, React Three Fiber, Drei
- Realtime: Supabase JS client (Database Realtime)
- Backend: FastAPI, Supabase Python client
- Threat feed: SANS ISC sources + IP geolocation (ip-api)

## Project Structure

- `src/app`: Next.js App Router pages and layout
- `src/components`: UI panels and globe visualization
- `src/hooks`: Realtime data subscription + mock fallback
- `src/lib`: Supabase client, arc mapping, mock generator
- `backend`: FastAPI service that ingests threat intel and writes to Supabase

## Quick Start

### 1) Frontend (Next.js)

```bash
npm install
npm run dev
```

Open http://localhost:3000

If you do not configure Supabase, the UI will automatically generate local mock attacks every 2.5s.

### 2) Backend (FastAPI)

```bash
python -m venv .venv
.venv/Scripts/activate
pip install -r backend/requirements.txt
uvicorn backend.main:app --reload --port 8000
```

The backend continuously polls the SANS ISC feed and inserts attacks into Supabase (if configured). It also exposes a manual ingest endpoint:

```bash
curl -X POST http://localhost:8000/ingest \
	-H "Content-Type: application/json" \
	-d '{"source_ip":"8.8.8.8","target_city":"Adelaide"}'
```

## Environment Variables

Create `.env.local` at the project root for the frontend:

```
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

Create `.env` inside `backend/` for the FastAPI service:

```
SUPABASE_URL=your_supabase_url
SUPABASE_KEY=your_supabase_service_role_key
```

If the backend does not have Supabase configured, it will keep running but will not insert events.

## Supabase Table

Create a table named `attacks` with these columns:

- `id` (text, primary key)
- `source_ip` (text)
- `source_location` (jsonb)
- `target_location` (jsonb)
- `severity` (text)
- `type` (text)
- `timestamp` (text or timestamptz)

Enable Realtime for the `attacks` table and allow `INSERT` events.

## How It Works

1. FastAPI pulls threat IPs from SANS ISC and geolocates them.
2. Each event is scored, enriched, and inserted into Supabase.
3. The Next.js client subscribes to `postgres_changes` on `attacks`.
4. Events are converted into globe arcs and UI stats in real time.

## Scripts

- `npm run dev` - start the frontend dev server
- `npm run build` - build for production
- `npm run start` - run the production build
- `npm run lint` - run ESLint

## Notes

- Supabase is optional for local development. Without credentials, the UI runs fully in mock mode.
- The globe outline uses `public/globe.json` (GeoJSON format).
