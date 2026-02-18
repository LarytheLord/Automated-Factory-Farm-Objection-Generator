# Automated Factory Farm Objection Generator (AFFOG)

AFFOG is a unified Next.js + Express platform for generating legally grounded objections against factory-farm permits.

## Stack

- Frontend: Next.js App Router
- Backend API: Express
- AI: Google Gemini (optional; template fallback built-in)
- Email: Nodemailer (optional; simulated fallback)
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
- `USER_EMAIL`
- `USER_PASS`
- `SUPABASE_URL`
- `SUPABASE_KEY`
- `ADMIN_BOOTSTRAP_TOKEN` (required only if you want to create admin users via register API)
- `FREE_DAILY_LETTERS`
- `FREE_MONTHLY_LETTERS`
- `NGO_DAILY_LETTERS`
- `NGO_MONTHLY_LETTERS`
- `ANON_DAILY_LETTERS`
- `USER_DAILY_EMAILS`
- `NGO_DAILY_EMAILS`
- `ANON_DAILY_EMAILS`
- `ENABLE_PERMIT_SYNC` (`true` to run background source sync loop)
- `PERMIT_SYNC_INTERVAL_MINUTES` (default `360`)
- `PORT` (default `3000` in unified mode)
- `NODE_ENV`

## API Endpoints

- `GET /api/health`
- `GET /api/permits`
- `GET /api/permits/:id`
- `POST /api/permits`
- `POST /api/generate-letter`
- `POST /api/send-email`
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
npm run test:all:local
```

The contract suite validates auth, permits, letter generation, objection persistence, and email endpoint behavior.

Permit ingestion is source-driven via `backend/data/permit-sources.json` and persists normalized records to `backend/data/ingested-permits.json`.
The current default production-safe mode keeps remote government sources configured but disabled until validated in your environment.

Source validation commands:

```bash
npm run validate:sources
npm --prefix backend run validate:sources -- --include-disabled
npm --prefix backend run validate:sources -- --source nc_deq_application_tracker --include-disabled
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
3. Set env vars (at minimum `JWT_SECRET`, plus optional Gemini/email/Supabase).
4. Deploy.

## Docker Note

Docker files remain in the repo only as archival fallback and are not the primary deployment path.
