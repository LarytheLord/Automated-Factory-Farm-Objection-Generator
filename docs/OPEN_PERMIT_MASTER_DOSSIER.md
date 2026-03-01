# Open Permit Master Project Dossier

Version: 1.0  
Last updated: February 24, 2026

## 1) Project Summary

**Project name**: Open Permit (Open Permit)  
**Project type**: Civic-tech advocacy platform  
**Mission**: Help trusted advocates respond to factory-farm permit filings quickly with legally grounded objection drafts and structured workflows.

Open Permit exists to close the execution gap between public concern and timely legal participation in permit processes.

## 2) Problem Statement

Factory-farm permits often move through technical legal processes faster than communities can respond.  
Most advocacy teams face these constraints:

- permit data is fragmented and hard to monitor,
- legal drafting is slow and specialized,
- small teams cannot scale manual objection writing.

Result: low participation in high-impact permit windows, even when community concern is high.

## 3) Solution

Open Permit combines:

1. Permit discovery and structured permit records.
2. Legal-framework-backed draft generation for objections.
3. Workflow support for saving objections and preparing submission drafts.
4. Admin controls for safety, abuse prevention, and platform governance.

## 4) Project Journey (Start to Current State)

### Phase A: Concept and Hackathon foundation
- Started as continuation of a Mumbai C4C effort focused on farm animal advocacy tooling.
- Initial goal: auto-detect permits and reduce drafting friction with AI assistance.

### Phase B: MVP full-stack implementation
- Built unified Next.js + Express app.
- Added permit browsing, objection generation, user auth, objection save flow, and submission-draft support.
- Added legal frameworks endpoint and templated fallback generation.

### Phase C: Deployment and integration stabilization
- Resolved split frontend/backend routing issues by moving to a single-process runtime (`server.js`).
- Standardized same-origin API flow for deployment.
- Deployed to Railway with health checks.

### Phase D: Data ingestion and source operations
- Added source-driven ingestion pipeline with validation and health endpoints.
- Added source transforms and ingestion run/status history.

### Phase E: Security and legal-risk hardening
- Added CORS allowlisting + proxy support + strict headers + route-specific rate limits.
- Added runtime admin diagnostics endpoint.
- Added manual-access approval model (restricted usage).
- Hid permits and generation from anonymous users.
- Added admin approval APIs and a private admin review UI route.

## 5) Core Features (Current)

### Product features
- Permit feed ingestion and permit browsing.
- AI-assisted objection draft generation with fallback template mode.
- User registration/login and saved objections workflow.
- Authority recipient suggestions plus user-controlled submission via mail client.
- Dashboard, impact page, and survey page.

### Admin and operations features
- Quota controls and platform feature flags.
- Permit source preview/validate/sync workflows.
- Ingestion health and run history APIs.
- Runtime config inspection endpoint.
- Manual access approval and approval-review endpoints.
- Private admin-only access review page.

## 6) Technical Architecture

- Frontend: Next.js 14 (App Router), React 18, Tailwind CSS 4.
- Backend: Express API in Node.js.
- AI: Google Gemini integration with template fallback.
- Storage model:
  - Supabase optional/active for users/permits/objections.
  - JSON fallback used for operational datasets in current implementation.
- Deployment: Railway (single service, healthcheck `/api/health`).
- Testing: contract and module phases in `test/`.

## 7) Team and People

### Core build team (from project plan docs)
- Lead: full-stack + architecture + integration.
- Ard: Python/AI/NLP.
- Alle: LLM integration.
- Rya: backend/API.
- Quinta: frontend/UI.

### Team size
- Core contributors referenced in planning docs: **5**.

## 8) Current Metrics Snapshot

### Production API snapshot (queried February 24, 2026)
- Health status: `ok`
- Storage mode: `supabase`
- Ingested permits: **207**
- Submitted permits: **0**
- Trusted permit sources: **2**
- Legal frameworks total laws: **40**
- Legal frameworks total countries: **8**

### Stats endpoint snapshot (currently configured values)
- Total permits: **18** (stats-view/fallback output)
- Countries covered: **8**
- Potential animals protected: **2,847,000**
- Objections generated: **1**

### Test coverage snapshot
- Phase tests detected: **13**
- `test:all:local` status: **passing**

Note: There is a known metrics consistency gap between ingestion totals and public stats aggregation outputs. This is tracked in the “Problems Facing” section.

## 9) Wins and Achievements

1. End-to-end platform shipped and deployed.
2. Unified runtime architecture stabilized for Railway.
3. Ingestion pipeline built with source validation and health diagnostics.
4. Legal references expanded and updated (including AWBI-aligned India updates).
5. Security hardening completed (CORS, headers, rate limits).
6. Manual-access approval model implemented for misuse control.
7. Private admin UI added for access approvals.
8. Continuous local contract-phase tests passing.

## 10) Problems Facing (Current)

### Product and adoption
- Early-stage usage; limited validated real-world objection throughput.
- Feedback collection is present (survey), but structured analytics loop is not yet mature.

### Data and metrics
- Ingestion totals and `/api/stats` representation are not yet fully aligned.
- Some operational counters are backed by JSON files, which can reset on ephemeral deployments if not persisted externally.

### Legal and trust
- Generated output quality varies by permit data quality and prompt behavior.
- Need stronger user-facing disclaimers and mandatory user acknowledgment before generation/send.

### Security and governance
- Access control is implemented but should be backed by durable, centralized storage for approval records.
- Need explicit audit logs for admin approval/revocation actions.

## 11) Feedback Summary (Mentor, Internal, Early Users)

Collected feedback themes to date:

1. **Legal risk concern is high**:
   - risk of hallucinated legal claims,
   - risk of misuse by bad actors,
   - risk of reputational/legal challenge in US and other jurisdictions.
2. **Trust posture needed improvement**:
   - strict access controls required,
   - stronger governance and review process required.
3. **UX trust cues**:
   - move from dark/gloomy visual tone to lighter, professional presentation.

Actions already taken based on feedback:
- manual account approval,
- restricted permit/generation access,
- private admin approval workflow,
- legal-risk playbook creation,
- light-theme migration work.

## 12) Legal, Compliance, and Risk Position

### Current legal-risk controls
- Restricted access model (auth + manual approval).
- Rate limiting and abuse controls.
- Security headers and CORS hardening.
- Data-source trust filtering and source validation workflows.

### Legal posture (current)
- Platform should be treated as decision-support tooling, not legal representation.
- Human review must remain required before external submission.

### Required next legal controls
1. Publish Terms of Use.
2. Publish Legal Disclaimer.
3. Publish Privacy Policy.
4. Add mandatory “not legal advice” acknowledgement in generation workflow.
5. Add approval/revocation audit trail.

Detailed risk framework is in `docs/LEGAL_RISK_PLAYBOOK.md`.

## 13) Outreach and Reach

### Outreach status
- Outreach direction exists (NGO/community sharing, Slack activist groups, partner channels).
- Promotion messaging drafted for activist networks and reviewer cohorts.
- Funder memo and pitch material drafted.

### Reach tracking status
- Need a formal outreach CRM-style tracker for:
  - contacts reached,
  - responses,
  - demos booked,
  - pilot participants onboarded.

### Current “number of people” tracking
- Core team contributors (planning docs): **5**.
- Approved/pending end-user counts should be read from admin access-review API in production.
- A durable reporting table is recommended for reliable historical counts.

## 14) Pitch (Meeting-ready)

### One-line pitch
Open Permit is a controlled-access advocacy platform that helps trusted campaigners respond to factory-farm permits faster with legally grounded objection workflows.

### 60-second pitch
Factory-farm permits often move faster than communities can respond, because legal drafting is technical and time-sensitive. Open Permit reduces that gap by combining permit data, legal-framework-supported drafting, and objection workflows in one platform. We are not running this as an open public generator: permit and generation access is restricted to manually approved users to reduce misuse and legal risk. The platform is deployed, ingestion is live, and core tests are passing. The next milestone is a controlled pilot that proves adoption and objection throughput with vetted users and clear legal safeguards.

### Funder ask framing
- Request: **$2,150** microgrant for a 90-day controlled pilot.
- Purpose: convert technical readiness into measurable advocacy outcomes under a strict safety model.

## 15) 90-Day Milestones

### Days 1–30
- Finalize policy pages (terms, disclaimer, privacy).
- Add mandatory legal-acknowledgement step before generation.
- Standardize approval SOP and reviewer checklist.

### Days 31–60
- Run vetted user cohort pilot.
- Collect structured quality feedback from partners/activists.
- Tighten ingestion-to-stats consistency and reporting.

### Days 61–90
- Publish pilot outcomes:
  - approved users,
  - workflows completed,
  - drafts generated/reviewed,
  - safety incidents and mitigations,
  - phase-2 funding readiness.

## 16) Strategic Priorities (Next)

1. Make Supabase the primary persistent source for operational records (including approvals/audit).
2. Add policy/legal pages and explicit non-legal-advice UX gate.
3. Add admin audit logs and abuse incident capture.
4. Build outreach funnel tracking dashboard.
5. Improve quality assurance on generated content with stronger citation validation.

## 17) Appendix: Key Documents

- Product overview: `README.md`
- Status snapshots: `PROJECT_STATUS.md`, `SESSION_HANDOFF.md`
- Pitch material: `PITCH.md`
- Hardening log: `docs/EXECUTION_NOTES.md`
- Legal risk framework: `docs/LEGAL_RISK_PLAYBOOK.md`
- Planning context: `hackathon_plan.md`
