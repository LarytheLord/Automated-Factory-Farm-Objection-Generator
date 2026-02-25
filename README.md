# Automated Factory Farm Objection Generator (AFFOG)

AFFOG is a unified Next.js + Express platform for generating legally grounded objections against factory-farm permits.

## Stack

- Frontend: Next.js App Router
- Backend API: Express
- AI: Google Gemini (optional; template fallback built-in)
- Email delivery: client-side only (`mailto`/copy draft); server-side sending disabled
- Persistence: JSON-first (`backend/data/*.json`), Supabase optional
- Deployment target: Railway native (no Docker)

## Runtime Architecture

- Root `server.js` runs one process.
- Backend API owns `/api/*` routes.
- Next.js serves all non-API routes.
- Single port serves frontend + backend.

## Prerequisites

- Node.js 20 (`.nvmrc` provided)
- npm 10+

## Local Setup

```bash
npm install
npm run build
npm start
```

App runs on `http://localhost:3000`.

## Environment Variables

Use root `.env` and/or `backend/.env`.

Required for production security:

- `JWT_SECRET`

Optional:

- `GEMINI_API_KEY`
- `SUPABASE_URL`
- `SUPABASE_KEY`
- `REQUIRE_SUPABASE` (`true` to fail startup unless Supabase is configured; recommended for strict production mode)
- `ADMIN_BOOTSTRAP_TOKEN` (required only if you want to create admin users via register API)
- `FREE_DAILY_LETTERS`
- `FREE_MONTHLY_LETTERS`
- `NGO_DAILY_LETTERS`
- `NGO_MONTHLY_LETTERS`
- `ANON_DAILY_LETTERS`
- `ENABLE_PERMIT_SYNC` (`true` to run background source sync loop)
- `PERMIT_SYNC_INTERVAL_MINUTES` (default `360`)
- `INCLUDE_STATIC_PERMITS` (`false` by default; set `true` only if you want bundled static permits from `backend/permits.json`)
- `REAL_PERMITS_ONLY` (`true` by default; excludes untrusted/demo permits from `/api/permits`)
- `ALLOWED_ORIGINS` (comma-separated CORS allowlist; required in production for browser access)
- `TRUST_PROXY` (default enabled; set `false` only if you are not behind a proxy/load balancer)
- `STRICT_SECURITY_HEADERS` (default enabled in production)
- `AUTH_RATE_LIMIT_PER_HOUR` (default `20`)
- `LETTER_RATE_LIMIT_PER_HOUR` (default `25`)
- `PORT` (default `3000` in unified mode)
- `NODE_ENV`

## API Endpoints

- `GET /api/health`
- `GET /api/permits`
- `GET /api/permits/:id`
- `POST /api/permits`
- `POST /api/generate-letter`
- `GET /api/usage`
- `GET /api/stats`
- `GET /api/objections`
- `POST /api/objections`
- `POST /api/auth/register`
- `POST /api/auth/login`
- `GET /api/auth/me`
- `GET /api/legal-frameworks`
- `GET /api/admin/quotas` (admin)
- `PATCH /api/admin/quotas` (admin)
- `GET /api/admin/platform-config` (admin)
- `GET /api/admin/runtime-config` (admin)
- `GET /api/admin/access-requests` (admin)
- `PATCH /api/admin/access-requests/:userId` (admin)
- `DELETE /api/admin/users/:userId` (admin, remove non-admin account)
- `PATCH /api/admin/platform-config` (admin)
- `GET /api/admin/usage/summary` (admin)
- `GET /api/admin/usage/anomalies` (admin)
- `POST /api/admin/usage/reset` (admin)
- `GET /api/admin/permit-sources` (admin)
- `POST /api/admin/permit-sources/preview` (admin)
- `POST /api/admin/permit-sources/validate` (admin)
- `PATCH /api/admin/permit-sources/:sourceKey` (admin)
- `POST /api/admin/permit-sources/sync` (admin)
- `GET /api/admin/ingestion-runs` (admin)
- `GET /api/admin/ingestion-health` (admin)
- `GET /api/admin/permit-status-history` (admin)

## Testing

```bash
cd test
npm run test
npm run test:phase2
npm run test:phase3
npm run test:phase4
npm run test:phase5
npm run test:phase6
npm run test:phase7
npm run test:phase8
npm run test:phase9
npm run test:phase10
npm run test:phase11
npm run test:phase12
npm run test:phase13
npm run test:all:local
```

The contract suite validates auth, permits, letter generation, and objection persistence behavior.

Project-level documentation bundle:

- `docs/AFFOG_MASTER_PROJECT_DOSSIER.md` (full start-to-end project narrative)
- `docs/EXECUTION_NOTES.md` (recent implementation log)
- `docs/LEGAL_RISK_PLAYBOOK.md` (legal-risk controls and roadmap)
- `docs/PROFESSIONAL_READINESS_AUDIT.md` (prioritized production/professionalism gaps)

## Access Control Model

- Permit browsing and letter generation actions are protected by auth + manual approval.
- New signups are pending by default.
- Admins can review and approve/revoke account access through:
  - `GET /api/admin/access-requests`
  - `PATCH /api/admin/access-requests/:userId` with `{ "approved": true|false, "note": "..." }`
  - `DELETE /api/admin/users/:userId` to remove non-admin users
- Admin UI path: `/admin/access` (legacy alias: `/internal-access-review-7d9f4a`)

Permit ingestion is source-driven via `backend/data/permit-sources.json` and persists normalized records to `backend/data/ingested-permits.json`.
The current local default runs remote sources only (`local_file` sources are disabled by default).

Source validation commands:

```bash
npm run validate:sources
npm run validate:sources:all
npm --prefix backend run validate:sources -- --source nc_deq_application_tracker --include-disabled
npm run sync:sources
npm --prefix backend run sync:sources -- --reset-data
npm --prefix backend run sync:recipients
```

Safe live rollout sequence (staging first):

1. Keep source disabled (`enabled: false`) in `backend/data/permit-sources.json`.
2. Run preview/validation:
`POST /api/admin/permit-sources/preview` then `POST /api/admin/permit-sources/validate`.
3. Patch source config only after validation:
`PATCH /api/admin/permit-sources/:sourceKey`.
4. Run one manual sync:
`POST /api/admin/permit-sources/sync` with `{ "sourceKey": "..." }`.
5. Check:
`GET /api/admin/ingestion-runs`,
`GET /api/admin/ingestion-health`,
`GET /api/admin/permit-status-history`.
6. Enable background sync only after stable runs:
`ENABLE_PERMIT_SYNC=true`.

## Railway Deployment (No Docker)

1. Connect repository to Railway.
2. Railway uses `railway.json`:
- Build: `npm install && npm run build`
- Start: `npm start`
- Healthcheck: `/api/health`
3. Set env vars (at minimum `JWT_SECRET`, plus optional Gemini/Supabase).
4. Deploy.

## Docker Note

Docker files remain in the repo only as archival fallback and are not the primary deployment path.
