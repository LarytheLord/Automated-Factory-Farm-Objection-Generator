# Open Permit Professional Readiness Audit

Last updated: 2026-02-25

## Scope

- Product professionalism (trust, safety, operations).
- Production reliability and legal-risk controls.
- Gaps still present after disabling direct platform email send.

## Completed in this update

- Direct backend email sending disabled by design:
  - `POST /api/send-email` now returns `410`.
  - Frontend one-click send action removed.
  - Users now send from their own mail client (`Open in Mail App` / `Copy Email Draft`).

## Priority Gaps

### P0 (Critical before broad public scale)

1. Access approvals are file-backed and may reset on redeploy.
   - Evidence: `backend/server.js` (reads/writes `access-approvals.json`).
   - Risk: vetted-user access decisions can be lost in ephemeral deployments.
   - Fix: migrate access approvals to Supabase table with immutable audit fields.

2. Build quality gates are disabled.
   - Evidence: `frontend/next.config.mjs` (`ignoreBuildErrors`, `ignoreDuringBuilds`).
   - Risk: type and lint regressions can ship to production unnoticed.
   - Fix: enforce TypeScript + ESLint on CI and production build.

3. In-memory rate limiting is single-instance only.
   - Evidence: `backend/server.js` (`createRateLimiter` uses in-process `Map`).
   - Risk: limits are bypassable across instances/restarts.
   - Fix: move limiter to Redis or database-backed sliding window.

### P1 (High)

1. Approval/revocation actions do not have strong audit trail guarantees.
   - Evidence: approval note storage exists, but no tamper-resistant audit log stream.
   - Risk: weak incident forensics and compliance posture.
   - Fix: append-only admin audit table + actor IP/device + timestamp.

2. JSON fallback still active for core operational paths.
   - Evidence: `backend/server.js` can run with `supabase` unavailable unless `REQUIRE_SUPABASE=true`.
   - Risk: inconsistent behavior and weaker durability under production load.
   - Fix: set `REQUIRE_SUPABASE=true` for production and migrate remaining JSON-only critical state.

3. Public legal-risk UX notices are minimal.
   - Evidence: no explicit Terms/Disclaimer consent gate in core generation flow.
   - Risk: user misuse and legal exposure.
   - Fix: add explicit legal disclaimer acceptance and purpose-of-use attestation.

### P2 (Medium)

1. Legacy disabled endpoint remains reachable for compatibility.
   - Evidence: `backend/server.js` still exposes `POST /api/send-email` (returns `410`).
   - Risk: minimal, but API surface is larger than necessary.
   - Fix: remove route entirely after client rollout window.

2. Professional analytics are not yet standardized.
   - Evidence: usage is tracked, but no SLA/SLO dashboard or incident alerting baseline.
   - Fix: add baseline ops dashboard (error rate, auth failures, generation latency, approval queue age).

## 14-day Execution Plan

1. Persist approvals + audit in Supabase (P0).
2. Re-enable strict build gates in CI (P0).
3. Introduce distributed rate limiting (P0/P1).
4. Add legal disclaimers/consent checkpoint in generation flow (P1).
5. Remove legacy disabled endpoint after compatibility window (P2).

