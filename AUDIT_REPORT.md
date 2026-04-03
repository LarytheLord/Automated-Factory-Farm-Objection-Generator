# Open Permit Production Audit

Generated: 2026-04-03
Workspace: `C:\Adil\codex\Open Permit`

## Scope

This pass covered the whole repository: root app bootstrap, backend API/server modules, frontend app/router/components, tests, SQL/config/infra files, and ingestion scripts/config.

## Phase 1 - Discovery and Mapping

### Frameworks and runtime

- Root app: custom Node launcher in `server.js`
- Frontend: Next.js `14.2.35`, React `18.3.1`, TypeScript `5.9.3`
- Backend: Express API in `backend/server.js`; installed backend Express is `5.2.1`
- Root package lock resolves Express `4.22.1` for the root wrapper server
- Auth: `jsonwebtoken 9.0.3`, `bcrypt 6.0.0`
- Data layer: optional Supabase via `@supabase/supabase-js 2.95.3`, fallback JSON store in `backend/dataStore.js`
- AI dependency: `@google/generative-ai 0.24.1`
- Infra: Docker, Docker Compose, Render, Railway, Vercel config files

### High-level architecture

1. Root `server.js` boots Next and serves the frontend.
2. Next app routes live in `frontend/src/app`.
3. Frontend calls `/api/*` through `frontend/src/app/api/[...path]/route.ts`, which proxies to the backend origin when configured.
4. Backend `backend/server.js` handles auth, permits, objections, feedback, admin tooling, quota usage, and ingestion administration.
5. Permit data comes from Supabase when configured, otherwise JSON fallback storage and ingestion files.
6. Letter generation uses Gemini when `GEMINI_API_KEY` is present and falls back to the built-in legal template engine otherwise.

### Primary data flows

- Auth:
  User input -> `frontend/src/components/AuthModal.tsx` -> `/api/auth/login` or `/api/auth/register` -> backend JWT issuance -> secure HttpOnly cookie -> `/api/auth/me` for session refresh in navbar/pages.

- Permit exploration:
  User filters/search -> `frontend/src/app/page.tsx` and `frontend/src/app/dashboard/page.tsx` -> `/api/permits`, `/api/stats`, `/api/public/latest-pending-permit`, `/api/legal-frameworks` -> backend -> Supabase or JSON store.

- Letter generation:
  Selected permit + user form -> `/api/generate-letter` -> backend legal framework lookup + Gemini/template generation -> rendered draft -> save to `/api/objections` or launch mailto flow.

- Admin flows:
  `frontend/src/app/admin/access/page.tsx` -> `/api/admin/access-requests*`, `/api/admin/users/:id`, `/api/admin/permit-sources*`, `/api/admin/usage*`, `/api/admin/runtime-config`.

### API surface

- `POST /api/auth/register`
- `POST /api/auth/login`
- `POST /api/auth/logout`
- `GET /api/auth/me`
- `POST /api/feedback`
- `GET /api/public/latest-pending-permit`
- `GET /api/permits`
- `GET /api/permits/:id`
- `POST /api/permits`
- `GET /api/objections`
- `POST /api/objections`
- `POST /api/recipient-suggestions`
- `GET /api/personas`
- `POST /api/generate-letter`
- `POST /api/send-email` (intentionally disabled at runtime)
- `GET /api/usage`
- `GET /api/admin/quotas`
- `GET /api/admin/platform-config`
- `GET /api/admin/runtime-config`
- `GET /api/admin/access-requests`
- `PATCH /api/admin/access-requests/:userId`
- `DELETE /api/admin/users/:userId`
- `PATCH /api/admin/platform-config`
- `PATCH /api/admin/quotas`
- `GET /api/admin/usage/summary`
- `GET /api/admin/usage/anomalies`
- `POST /api/admin/usage/reset`
- `GET /api/admin/permit-sources`
- `POST /api/admin/permit-sources/preview`
- `POST /api/admin/permit-sources/validate`
- `PATCH /api/admin/permit-sources/:sourceKey`
- `GET /api/admin/ingestion-runs`
- `GET /api/admin/ingestion-health`
- `GET /api/admin/permit-status-history`
- `POST /api/admin/permit-sources/sync`
- `GET /api/stats`
- `GET /api/legal-frameworks`
- `GET /api/health`
- `GET /api/cron/permit-sync`
- `GET /api`

### External dependencies and integrations

- Gemini API
- Supabase/Postgres
- Government/open-data permit sources referenced by ingestion configs
- Mail client via `mailto:`
- Hosting targets: Docker, Render, Railway, Vercel

### Config files and environment variables

Config files reviewed:

- `package.json`
- `package-lock.json`
- `backend/package.json`
- `frontend/package.json`
- `.env.example`
- `backend/.env.example`
- `frontend/next.config.mjs`
- `Dockerfile`
- `docker-compose.yml`
- `render.yaml`
- `railway.json`
- `vercel.json`
- backend SQL files under `backend/database/`
- ingestion config/data under `backend/data/`

Environment variables discovered:

- Core app/auth:
  `PORT`, `NODE_ENV`, `JWT_SECRET`, `ADMIN_BOOTSTRAP_TOKEN`
- Database/Supabase:
  `SUPABASE_URL`, `SUPABASE_KEY`, `DATABASE_URL`, `REQUIRE_SUPABASE`
- AI:
  `GEMINI_API_KEY`
- CORS/proxy/security:
  `ALLOWED_ORIGINS`, `TRUST_PROXY`, `STRICT_SECURITY_HEADERS`, `CRON_SECRET`, `API_PROXY_TARGET`, `NEXT_PUBLIC_API_BASE_URL`, `NEXT_PUBLIC_BACKEND_URL`
- Quotas/rate limits:
  `FREE_DAILY_LETTERS`, `FREE_MONTHLY_LETTERS`, `NGO_DAILY_LETTERS`, `NGO_MONTHLY_LETTERS`, `ANON_DAILY_LETTERS`, `USER_DAILY_EMAILS`, `NGO_DAILY_EMAILS`, `ANON_DAILY_EMAILS`, `AUTH_RATE_LIMIT_PER_HOUR`, `LETTER_RATE_LIMIT_PER_HOUR`, `FEEDBACK_RATE_LIMIT_PER_HOUR`, `SUBMISSION_RATE_LIMIT_PER_HOUR`
- Permit sync:
  `ENABLE_PERMIT_SYNC`, `PERMIT_SYNC_INTERVAL_MINUTES`, `INCLUDE_STATIC_PERMITS`, `REAL_PERMITS_ONLY`, `RUN_GLOBAL_PENDING_SYNC_ON_START`, `RUN_UK_PENDING_SYNC_ON_START`
- Ingestion tuning:
  `UK_PENDING_PERMIT_SEARCH_LIMIT`, `UK_PENDING_PERMIT_CONSULTATION_PAGES`, `UK_PENDING_PERMIT_CONTENT_CONCURRENCY`, `UK_PENDING_PERMIT_HTTP_TIMEOUT_MS`, `UK_PENDING_PERMIT_HTTP_RETRIES`, `UK_PENDING_PERMIT_LOOKBACK_DAYS`, `UK_PENDING_PERMIT_PRUNE`, `GLOBAL_PENDING_INCLUDE_NON_FARM`, `GLOBAL_PENDING_LOOKBACK_DAYS`, `GLOBAL_PENDING_UPSERT_BATCH_SIZE`, `ONTARIO_ERO_MAX_PAGES`, `ONTARIO_ERO_KEYWORDS`, `INDIA_PENDING_MAX_STATES`, `INDIA_PENDING_MAX_LINKS_PER_STATE`, `INDIA_PENDING_MAX_RECORDS`, `INDIA_PENDING_LOOKBACK_DAYS`, `INDIA_OCMMS_MAX_STATES`, `INDIA_OCMMS_MAX_DISTRICTS_PER_STATE`, `INDIA_OCMMS_MAX_RECORDS`, `INDIA_OCMMS_YEAR_FROM`, `INDIA_OCMMS_YEAR_TO`, `INDIA_FARM_MAX_STATES`, `INDIA_FARM_MAX_LINKS_PER_STATE`, `INDIA_FARM_MAX_RECORDS`, `INDIA_FARM_LOOKBACK_DAYS`
- Misc platform toggles:
  `VERCEL`, `APPLY_DELETE`

## Phase 2-5 Findings and Fixes

### 1. Critical - bearer tokens were stored in `localStorage`

Files:

- `backend/server.js:24, 794, 812, 841, 845, 1215-1244, 1311-1428`
- `frontend/src/lib/session.ts:20-38`
- `frontend/src/components/Navbar.tsx:7, 73, 97`
- `frontend/src/app/page.tsx:141, 623, 662, 776`
- `frontend/src/app/admin/access/page.tsx:95, 109`
- `frontend/src/app/dashboard/page.tsx:69`
- `frontend/src/app/my-objections/page.tsx:31`
- `frontend/src/app/submit-permit/page.tsx:34, 82-84`

Problematic snippet:

```ts
const token = localStorage.getItem("token");
headers.Authorization = `Bearer ${token}`;
```

Why it failed:

- Any XSS on the frontend could exfiltrate session tokens.
- Multiple pages were coupled to browser storage and drifted from the actual backend auth state.
- Logout could not reliably invalidate browser-held credentials.

Production replacement:

```js
const SESSION_COOKIE_NAME = 'open_permit_session';

function extractRequestToken(req) {
  const bearer = getBearerToken(req);
  if (bearer) return bearer;
  return getSessionTokenFromCookies(req);
}

function setSessionCookie(res, token) {
  appendSetCookieHeader(res, buildSessionCookie(token));
}
```

```ts
export async function getSessionUser(): Promise<SessionUser | null> {
  const response = await fetch("/api/auth/me", { credentials: "same-origin" });
  if (!response.ok) return null;
  const payload = await response.json();
  return payload?.user ?? null;
}
```

### 2. High - logout endpoint and cookie invalidation were missing

File:

- `backend/server.js:1427-1428`

Problematic snippet:

```js
// No logout route; frontend only removed local state.
```

Why it failed:

- Once cookie-backed auth exists, server-side invalidation is required.
- Without a logout route, stale cookies survive until expiry.

Production replacement:

```js
app.post('/api/auth/logout', (_req, res) => {
  clearSessionCookie(res);
  res.status(204).end();
});
```

### 3. High - auth, permit, and objection inputs were under-validated

File:

- `backend/server.js:700-792, 1311-1419, 1710-1812`

Problematic snippet:

```js
const { email, password, name } = req.body;
const { project_title, location, country, activity } = req.body;
```

Why it failed:

- Allowed malformed email/password payloads.
- Allowed empty or non-string permit fields.
- Allowed inconsistent permit/objection statuses.
- Left downstream code open to bad data, noisy failures, and malformed persisted rows.

Production replacement:

```js
function sanitizeRequiredText(value, fieldName, maxLength = 255) {
  if (typeof value !== 'string') throw new Error(`${fieldName} is required`);
  const trimmed = value.trim();
  if (!trimmed) throw new Error(`${fieldName} is required`);
  return trimmed.slice(0, maxLength);
}

function isValidEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizeEmail(value));
}
```

```js
projectTitle = sanitizeRequiredText(req.body?.project_title, 'project_title', 240);
location = sanitizeRequiredText(req.body?.location, 'location', 240);
country = sanitizeRequiredText(req.body?.country, 'country', 120);
activity = sanitizeRequiredText(req.body?.activity, 'activity', 500);
```

### 4. High - authenticated submission endpoints were not rate-limited

Files:

- `backend/server.js:614-619, 1715, 1817`
- `.env.example`
- `backend/.env.example`

Problematic snippet:

```js
app.post('/api/permits', authenticateToken, requireApprovedAccess, async (req, res) => {
app.post('/api/objections', authenticateToken, requireApprovedAccess, async (req, res) => {
```

Why it failed:

- Approved users could still spam permit or objection creation from one IP.
- Abuse controls existed for auth, feedback, and letter generation, but not for content submissions.

Production replacement:

```js
const submissionRateLimiter = createRateLimiter({
  key: 'submission',
  windowMs: 60 * 60 * 1000,
  maxRequests: intFromEnv('SUBMISSION_RATE_LIMIT_PER_HOUR', 30),
});

app.post('/api/permits', authenticateToken, requireApprovedAccess, submissionRateLimiter, async (req, res) => {
app.post('/api/objections', authenticateToken, requireApprovedAccess, submissionRateLimiter, async (req, res) => {
```

### 5. High - contact form payload did not match backend contract

File:

- `frontend/src/app/contact/page.tsx:41, 54-56`

Problematic snippet:

```ts
body: JSON.stringify({
  type: formData.type,
  organisation: formData.organisation,
  message: formData.message,
})
```

Why it failed:

- Backend `/api/feedback` expects `feedbackType`, `additionalComments`, and `role`.
- The live form could submit successfully from the browser but still fail validation server-side.

Production replacement:

```ts
const additionalComments = [
  formData.organisation && `Organisation: ${formData.organisation}`,
  formData.message,
].filter(Boolean).join("\n\n");

body: JSON.stringify({
  role: formData.role,
  feedbackType: "feedback",
  additionalComments,
})
```

### 6. Medium - proxy route had no timeout for upstream backend calls

File:

- `frontend/src/app/api/[...path]/route.ts:5, 101-102`

Problematic snippet:

```ts
const response = await fetch(upstreamUrl, requestInit);
```

Why it failed:

- Frontend requests could hang indefinitely if the backend or platform edge stalled.
- Hanging proxy calls produce poor UX and tie up server resources.

Production replacement:

```ts
const UPSTREAM_TIMEOUT_MS = 30000;
const controller = new AbortController();
const timeout = setTimeout(() => controller.abort(), UPSTREAM_TIMEOUT_MS);
```

### 7. Medium - status rendering assumed title-cased permit statuses

File:

- `frontend/src/app/page.tsx:776-787`

Problematic snippet:

```ts
selectedPermit.status === "Pending" ? ... : ...
```

Why it failed:

- Supabase rows can be stored as lowercase values such as `pending`.
- The UI badge could misclassify a live permit and render the wrong color/label.

Production replacement:

```ts
const normalizedSelectedPermitStatus = String(selectedPermit?.status || "")
  .trim()
  .toLowerCase()
  .replace(/_/g, " ");
```

### 8. Medium - clipboard copy had no failure handling

File:

- `frontend/src/app/page.tsx:730`

Problematic snippet:

```ts
await navigator.clipboard.writeText(generatedLetter);
setCopied(true);
```

Why it failed:

- Clipboard access can fail on browser permission or insecure-context edge cases.
- The UI would silently fail and mislead the user.

Production replacement:

```ts
navigator.clipboard.writeText(generatedLetter)
  .then(() => setCopied(true))
  .catch(() => setLetterError("Could not copy the letter. Please copy it manually."));
```

### 9. Medium - admin source preview/validate returned generic 500s for unsupported types

Files:

- `backend/server.js:2649-2684`
- `backend/permitSourceConfig.js:16`

Problematic snippet:

```js
catch (error) {
  res.status(500).json({ error: 'Preview failed' });
}
```

Why it failed:

- Unsupported source types were a client/configuration problem, not a server crash.
- Operators received the wrong severity signal and had less actionable troubleshooting detail.
- `csv_url` existed in source configs but was rejected by validation.

Production replacement:

```js
const allowedTypes = new Set(['local_file', 'arcgis_mapserver', 'json_url', 'csv_url']);
```

```js
return res.status(400).json({
  error: error instanceof Error ? error.message : 'Unsupported source configuration',
});
```

### 10. High - frontend build config masked real type and lint failures

File:

- `frontend/next.config.mjs`

Problematic snippet:

```js
typescript: { ignoreBuildErrors: true },
eslint: { ignoreDuringBuilds: true },
```

Why it failed:

- Production builds could succeed while shipping broken types and lint regressions.
- CI would miss runtime-adjacent bugs until deploy or manual QA.

Production replacement:

```js
const nextConfig = {
  experimental: {
    serverActions: {
      bodySizeLimit: '2mb',
    },
  },
  async rewrites() {
    ...
  },
};
```

### 11. Medium - runtime image used a Node version below the declared engine

File:

- `Dockerfile:2, 16-18`

Problematic snippet:

```dockerfile
FROM node:18-alpine
RUN npm install
```

Why it failed:

- Root and backend packages declare Node 20 requirements.
- Non-deterministic installs also make production builds harder to reproduce.

Production replacement:

```dockerfile
FROM node:20-alpine
RUN npm ci --ignore-scripts
RUN npm ci --prefix backend
RUN npm ci --prefix frontend
```

### 12. Medium - auth modal and survey interactions had accessibility gaps

Files:

- `frontend/src/components/AuthModal.tsx:81-88`
- `frontend/src/app/survey/page.tsx:273-274`

Problematic snippet:

```tsx
<div className="modal">
```

```tsx
<button onClick={() => setRating(star)}>{star}</button>
```

Why it failed:

- Dialog semantics were missing for assistive tech.
- Rating buttons did not expose pressed state or descriptive labels.

Production replacement:

```tsx
<div
  role="dialog"
  aria-modal="true"
  aria-labelledby="auth-modal-title"
>
```

```tsx
aria-label={`Rate ${star} star${star === 1 ? "" : "s"}`}
aria-pressed={star === formData.rating}
```

### 13. Low - hydration warning suppression masked potential SSR/client drift

File:

- `frontend/src/app/layout.tsx:28`

Problematic snippet:

```tsx
<html lang="en" suppressHydrationWarning>
```

Why it failed:

- This suppresses a signal that should normally surface real SSR/client mismatches.

Production replacement:

```tsx
<html lang="en">
```

## Security scan notes

- No committed real secrets were found in tracked env/config files; reviewed `.env.example` files only contained placeholders.
- No `dangerouslySetInnerHTML`, raw `innerHTML` writes, `eval`, or client-side secret embedding was found in the application code.
- Cookie auth is now `HttpOnly` and `Secure` in production, with `SameSite=Lax`.
- Current CSRF posture is acceptable for same-origin cookie usage with `SameSite=Lax`, but explicit CSRF tokens are still recommended if the product later introduces cross-site embeds, third-party form posts, or `SameSite=None`.

## Dependency review

Installed package review against current public advisories checked on 2026-04-03:

- `next 14.2.35` is above the patched lines for the reviewed Next advisories:
  - GHSA-f82v-jwr5-mffw
  - GHSA-gp8f-8m3g-qvj9
- Root `express 4.22.1` and backend `express 5.2.1` are above the patched versions for:
  - CVE-2024-29041 / open redirect in `< 4.19.2`
  - CVE-2024-43796 / XSS in `< 4.20.0`
- `jsonwebtoken 9.0.3` is above the patched floor for GHSA-27h2-hvpr-p74q (`>= 9.0.0`)
- No active GitHub advisory surfaced during this pass for the installed `react 18.3.1`, `bcrypt 6.0.0`, or `@supabase/supabase-js 2.95.3`

Sources:

- https://github.com/advisories/GHSA-f82v-jwr5-mffw
- https://github.com/advisories/GHSA-gp8f-8m3g-qvj9
- https://github.com/advisories/GHSA-qw6h-vgh9-j6wx
- https://nvd.nist.gov/vuln/detail/CVE-2024-29041
- https://github.com/advisories/GHSA-27h2-hvpr-p74q

## Residual issues not changed in this pass

### High

- `render.yaml` sets `ANON_DAILY_LETTERS=6`, while backend defaults and env examples document `2`. This configuration drift can create confusing quota behavior across environments.

### Medium

- `frontend/src/app/internal-access-review-7d9f4a/page.tsx` is still a hidden alias to the admin access page. Authorization is enforced server-side, so this is not a direct auth bypass, but it is still security-through-obscurity and should be removed or documented.
- Several static marketing pages still use mount-only loading/spinner patterns that delay first content unnecessarily.

### Low

- `docker-compose.yml` contains older env names that no longer appear central to the live runtime model.

## Verification

Commands run after the fixes:

- `cmd /c .\frontend\node_modules\.bin\tsc.cmd --project frontend\tsconfig.json --noEmit`
- `cmd /c npm.cmd exec eslint . --config eslint.config.mjs` in `frontend`
- `cmd /c npm.cmd run build` in `frontend`
- `cmd /c npm.cmd --prefix test run test:all:local`

Results:

- TypeScript: pass
- ESLint: pass
- Production Next build: pass
- Local backend/API test suite: pass

## Final severity summary

### Critical

- Browser-stored bearer tokens exposed auth to XSS exfiltration and inconsistent session state.

### High

- Missing logout invalidation for cookie sessions.
- Weak server-side input validation on auth and submission endpoints.
- No rate limiting on permit/objection submissions.
- Contact form/backend contract mismatch.
- Hidden build failures due to Next config suppression.

### Medium

- No timeout on proxy fetches.
- Status rendering mismatch for lowercase permit states.
- Misclassified admin source errors and missing `csv_url` support.
- Accessibility gaps in modal/rating UI.
- Node runtime mismatch in Docker image.

### Low

- Hydration warning suppression.
- Minor UX/error-handling gaps such as clipboard failure fallback.
- Config drift in ancillary deployment files.

## Checklist of changes made

- Replaced frontend `localStorage` auth flow with server-issued secure session cookies.
- Added `/api/auth/logout` and cookie invalidation helpers.
- Added shared session utilities in `frontend/src/lib/session.ts`.
- Updated navbar, home, dashboard, admin access, objections, and submit-permit pages to use cookie-backed session resolution.
- Added validation and normalization for auth, permit, and objection payloads.
- Added submission rate limiting for permit and objection creation.
- Fixed contact form payload shape to match `/api/feedback`.
- Added proxy timeout and cleanup in `frontend/src/app/api/[...path]/route.ts`.
- Fixed selected-permit status normalization and badge rendering.
- Added clipboard failure handling on the home page.
- Added `csv_url` to permit source validation.
- Returned `400` for unsupported source preview/validate errors instead of generic `500`.
- Removed `ignoreBuildErrors` and `ignoreDuringBuilds` from Next config.
- Updated Docker to Node 20 and deterministic `npm ci` installs.
- Added auth modal dialog semantics and survey rating accessibility attributes.
- Removed hydration warning suppression from the root layout.
