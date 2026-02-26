# AFFOG Professionalization Backlog

Last updated: 2026-02-26

## Objective
Close product-quality and operational gaps that reduce trust, reliability, and legal safety before broader public scale.

## Completed in this cycle
- [x] Feedback page now has clear back navigation (`/survey` -> `/`).
- [x] Feedback form now writes to backend (`POST /api/feedback`) instead of mock submit.
- [x] Added DB migration path for feedback persistence (`feedback_submissions`).

## P0: Critical (ship next)
- [ ] Enforce build quality gates:
  - remove `ignoreBuildErrors` and `ignoreDuringBuilds` from `frontend/next.config.mjs`.
  - run lint + typecheck in CI before deploy.
- [ ] Migrate remaining JSON operational state to Supabase-first in production:
  - usage events
  - ingestion runs/status history
  - objections fallback
- [ ] Add robust admin audit log:
  - who approved/rejected which account
  - actor id + timestamp + IP
  - immutable append-only storage
- [ ] Add legal disclaimer acceptance checkpoint before letter generation.

## P1: High
- [ ] Standardize navigation shell across all pages:
  - consistent back/home controls
  - consistent top bar and page-level context
- [ ] Improve accessibility and UX consistency:
  - color contrast audit
  - keyboard and focus state audit
  - form error messaging consistency
- [ ] Add admin feedback inbox view:
  - filter by `feedback_type`
  - sort by newest
  - status/tag for triage

## P2: Medium
- [ ] Replace in-memory rate limiter with shared store (Redis/Postgres) for multi-instance accuracy.
- [ ] Add structured observability baseline:
  - request/response logs
  - error rate alerts
  - queue age metrics for access requests
- [ ] Remove legacy disabled endpoints after compatibility window (e.g., `POST /api/send-email`).

## Execution cadence
1. Ship P0 reliability/safety controls.
2. Stabilize UX consistency + admin workflows (P1).
3. Add ops instrumentation and cleanup (P2).
