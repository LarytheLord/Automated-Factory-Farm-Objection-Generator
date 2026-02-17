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
- `PORT` (default `3000` in unified mode)
- `NODE_ENV`

## API Endpoints

- `GET /api/health`
- `GET /api/permits`
- `GET /api/permits/:id`
- `POST /api/permits`
- `POST /api/generate-letter`
- `POST /api/send-email`
- `GET /api/stats`
- `GET /api/objections`
- `POST /api/objections`
- `POST /api/auth/register`
- `POST /api/auth/login`
- `GET /api/auth/me`
- `GET /api/legal-frameworks`

## Testing

```bash
cd test
npm run test
```

The contract suite validates auth, permits, letter generation, objection persistence, and email endpoint behavior.

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
