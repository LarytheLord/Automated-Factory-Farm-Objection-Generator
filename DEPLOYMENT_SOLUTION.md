# AFFOG Deployment Solution (Definitive)

## Decision

AFFOG deploys on Railway using the native Node.js build/runtime path.

- No Docker in primary workflow.
- Unified server (`server.js`) serves frontend and API.
- Health endpoint: `/api/health`.

## Why This Path

- Lowest operational overhead.
- Single deployable unit.
- Avoids split-service drift between frontend and API.
- Works with JSON-first persistence and optional Supabase.

## Build and Start Contracts

- Build: `npm install && npm run build`
- Start: `npm start`

## Runtime Guarantees

- API paths remain `/api/*`.
- Frontend uses same-origin API requests.
- JSON persistence survives process restarts via `backend/data/*.json`.
- If Gemini is unavailable, template fallback still generates letters.

## Optional/Archival Paths

- Docker artifacts remain in repository as fallback only.
- Vercel split deployment is intentionally out of primary scope for this phase.

## Validation Targets

- `GET /api/health` -> 200
- `GET /api/permits` -> non-empty array
- Auth register/login/me flow works
- Letter generation works with and without Gemini
- Objection save/read persists to JSON files
