# AFFOG Deployment Guide (Railway Native, No Docker)

This is the canonical deployment path for AFFOG.

## Target

- Platform: Railway
- Runtime: Node.js 20
- Deployment model: native buildpack (no Docker)

## Required Files

- `railway.json`
- `package.json` (root scripts)
- `server.js` (unified server)

## Railway Configuration

`railway.json` defines:

- Build command: `npm install && npm run build`
- Start command: `npm start`
- Healthcheck path: `/api/health`

## Environment Variables

Required:

- `JWT_SECRET`

Optional:

- `GEMINI_API_KEY`
- `USER_EMAIL`
- `USER_PASS`
- `SUPABASE_URL`
- `SUPABASE_KEY`
- `NODE_ENV=production`
- `PORT` (Railway usually injects this)

## Deploy Steps

1. Push code to your Git provider.
2. Create Railway project and connect the repo.
3. Add environment variables.
4. Deploy.
5. Validate:
- `GET /api/health`
- Browse homepage
- Generate letter
- Register/login
- Save objection

## Post-Deploy Smoke Checklist

- `GET /api/permits` returns data
- `POST /api/generate-letter` returns letter text
- `POST /api/send-email` returns success (real or simulated)
- `POST /api/objections` persists and appears in `GET /api/objections`

## Troubleshooting

- Build fails on Next config: ensure `frontend/next.config.mjs` has only supported keys.
- Auth errors in production: ensure `JWT_SECRET` is set.
- Empty objections after restart: check write access and `backend/data/*.json`.
- Email failures: verify SMTP vars or use simulated mode.
