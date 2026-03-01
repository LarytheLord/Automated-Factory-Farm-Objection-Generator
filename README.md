# Open Permit — Civic Intelligence Platform

Open Permit is a unified Next.js + Express platform that monitors development permits, generates AI-powered legally grounded objection letters, and provides civic intelligence for citizens, NGOs, and legal advocates.

> **Origin:** Built in 10 hours at [Code 4 Compassion](https://www.codeforcompassion.com/) Mumbai (hosted by [Open Paws](https://www.openpaws.ai/) & Electric Sheep). Evolved through the AARC Pre-Accelerator. Originally called AFOG — now Open Permit, covering all permit types across environmental, health, economic, and social impact.

## Project Structure

```
├── frontend/          Next.js app (deployed to Vercel)
├── backend/           Express API, data scripts, ingestion
├── docs/              Documentation, reports, internal notes
├── test/              Contract test suite
├── server.js          Unified entry point (deployed to Railway)
├── railway.json       Railway deployment config
└── vercel.json        Vercel deployment config
```

## Stack

- Frontend: Next.js App Router (TypeScript, Tailwind CSS)
- Backend API: Express
- AI: Google Gemini (optional; template fallback built-in)
- Email delivery: client-side only (`mailto`/copy draft); server-side sending disabled
- Persistence: JSON-first (`backend/data/*.json`), Supabase optional
- Deployment target: Railway native (no Docker)

## Local Setup

```bash
npm install
npm run build
npm start
```

App runs on `http://localhost:3000`.

## Environment Variables

Use root `.env` and/or `backend/.env`. Required: `JWT_SECRET`. Optional: `GEMINI_API_KEY`, `SUPABASE_URL`, `SUPABASE_KEY`, `DATABASE_URL`, and others (see full list in the repo docs).

## API Endpoints

- `GET /api/health`
- `GET /api/permits`
- `GET /api/permits/:id`
- `POST /api/permits`
- `POST /api/generate-letter`
- `GET /api/usage`
- `GET /api/stats`
- `POST /api/feedback`
- `GET /api/objections`
- `POST /api/objections`
- `POST /api/auth/register`
- `POST /api/auth/login`
- `GET /api/auth/me`
- `GET /api/legal-frameworks`
- Admin endpoints: `/api/admin/quotas`, `/api/admin/access-requests`, `/api/admin/permit-sources`, etc.

## Testing

```bash
cd test
npm run test
npm run test:all:local
```

## Documentation

- `docs/OPEN_PERMIT_MASTER_DOSSIER.md` — Full project narrative
- `docs/EXECUTION_NOTES.md` — Implementation log
- `docs/LEGAL_RISK_PLAYBOOK.md` — Legal-risk controls
- `docs/PENDING_PERMIT_SOURCE_POLICY.md` — Permit source policy
- `docs/RAILWAY_PERMIT_SYNC_NOTES.md` — Railway deployment notes
- `docs/internal/` — Team handoff notes, pitch materials, deployment guides

## Access Control

- Permit browsing and letter generation require auth + manual approval
- New signups are pending by default
- Admins approve via `/admin/access` or API endpoints

## Supported By

- [Open Paws](https://www.openpaws.ai/) — AI for animal welfare; hosts Code 4 Compassion
- AARC Pre-Accelerator — Accelerator program by [Code 4 Compassion](https://www.codeforcompassion.com/)
- Electric Sheep — Co-hosts [Code 4 Compassion](https://www.codeforcompassion.com/) events

## License

See LICENSE files in repository.
