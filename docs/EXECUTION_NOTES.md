# AFFOG Execution Notes

Last updated: 2026-02-20

## Purpose
This document is the running implementation log for production hardening and execution work.  
Use it as the source of truth for what has shipped, what is configured, and what is next.

## Shipped in this execution cycle

### 1) India legal framework strengthened (AWBI-aligned)
- Updated India legal citations used by letter generation in `backend/server.js`.
- Added stronger India references (PCA Act + specific rules + EPA/Water/Air/NGT acts).
- Updated `/api/legal-frameworks` India metadata to reflect expanded law count.

### 2) Public deployment hardening: CORS + proxy trust
- Added production CORS allowlisting via `ALLOWED_ORIGINS` in `backend/server.js`.
- Production behavior:
  - If `ALLOWED_ORIGINS` is empty: browser origins are denied.
  - If configured: only allowlisted origins are accepted.
- Added Railway/proxy-aware IP handling via `app.set('trust proxy', 1)` unless `TRUST_PROXY=false`.
- Added explicit CORS-denied response: HTTP `403` with JSON error.

### 3) Route-specific rate limiting
- Replaced one generic limiter with dedicated endpoint limiters:
  - `POST /api/auth/register` and `POST /api/auth/login` -> auth limiter
  - `POST /api/generate-letter` -> letter limiter
  - `POST /api/send-email` -> email limiter
- Limits are configured by env vars and keyed by client IP.

### 4) Security headers middleware
- Added optional strict security headers in `backend/server.js`.
- Enabled by default in production, configurable with `STRICT_SECURITY_HEADERS`.
- Headers set:
  - `X-Content-Type-Options: nosniff`
  - `X-Frame-Options: DENY`
  - `Referrer-Policy: no-referrer`
  - `Permissions-Policy: camera=(), microphone=(), geolocation=()`
  - `Strict-Transport-Security` when production + secure request

### 5) Admin runtime visibility
- Added `GET /api/admin/runtime-config` (admin-only) to inspect:
  - runtime environment
  - security config state (CORS/proxy/headers)
  - current per-hour limiter values
  - feature flags
  - active storage mode (`supabase` vs `json`)

### 6) Optional strict Supabase startup guard
- Added `REQUIRE_SUPABASE` env support in `backend/server.js`.
- When `REQUIRE_SUPABASE=true`, startup fails unless Supabase is configured.
- This enables a clean transition to “no JSON fallback in production” policy.

### 7) Emergency access lockdown for legal-risk control
- Implemented manual account approval workflow.
- New accounts are pending by default (admins auto-approved).
- Protected routes now require auth + approval:
  - permit browsing endpoints
  - objection write/read endpoints
  - letter generation endpoint
  - email send endpoint
- Added admin review APIs:
  - `GET /api/admin/access-requests`
  - `PATCH /api/admin/access-requests/:userId`
- Frontend now:
  - hides permit database from anonymous users
  - blocks pending users from permit/generation features with explicit pending message

### 8) Legal risk planning artifact
- Added `docs/LEGAL_RISK_PLAYBOOK.md` with:
  - risk exposure map
  - policy/terms/disclaimer requirements
  - incident response controls
  - 30-day hardening roadmap

## Required production env vars (Railway)
- `JWT_SECRET`
- `ALLOWED_ORIGINS` (comma-separated, include your Railway app URL and any custom domain)
- `TRUST_PROXY=true`
- `STRICT_SECURITY_HEADERS=true`
- `REQUIRE_SUPABASE=true` (when you are ready to enforce DB-backed production mode)
- `AUTH_RATE_LIMIT_PER_HOUR`
- `LETTER_RATE_LIMIT_PER_HOUR`
- `EMAIL_RATE_LIMIT_PER_HOUR`

Optional but recommended:
- `SUPABASE_URL`
- `SUPABASE_KEY`
- `GEMINI_API_KEY`
- `ENABLE_PERMIT_SYNC=true`

## Validation run results
- Command: `npm --prefix test run test:all:local`
- Status: all phase tests passed after hardening changes.

## Operational checks after deploy
1. `GET /api/health` returns `200`.
2. Browser frontend can call API successfully (confirms `ALLOWED_ORIGINS` is correct).
3. `GET /api/admin/runtime-config` confirms expected security/rate settings.
4. Generate-letter, login, and send-email enforce limits correctly under repeated requests.
5. Access-lock behavior check:
   - anonymous users cannot read permits
   - pending users cannot generate/send letters
   - approved users can use permit + letter workflow

## Next build items (priority order)
1. Make Supabase the primary required store for public production data paths (users, objections, usage, ingestion state).
2. Add captcha/challenge on `register`, `login`, and optionally anonymous letter generation.
3. Add structured request logging and error tracking hooks for Railway operations.
4. Add admin UI page for source health + runtime-config visibility.
