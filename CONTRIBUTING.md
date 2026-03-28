# Contributing to Open Permit

Thanks for helping improve Open Permit. This project mixes product work, civic-tech infrastructure, and legal research, so good contributions can come from many directions: frontend, backend, permit ingestion, legal framework coverage, documentation, QA, or source verification.

This guide explains how to get the app running locally, where the main extension points live, and how to contribute changes that are easy to review and ship.

## Before You Start

- Check the [open issues](https://github.com/LarytheLord/Automated-Factory-Farm-Objection-Generator/issues) before starting work.
- If you want to take an issue, leave a short comment saying you are working on it and outline your plan.
- If the issue is not clear yet, ask clarifying questions in the issue before opening a large PR.
- Prefer one issue or one focused change per pull request.

## Development Setup

### Prerequisites

- Node.js `20+`
- npm `10+`
- Git

### Clone and install

```bash
git clone https://github.com/<your-user>/Automated-Factory-Farm-Objection-Generator.git
cd Automated-Factory-Farm-Objection-Generator
npm install
```

Running `npm install` at the repo root also installs backend and frontend dependencies via `postinstall`.

### Environment variables

The app can run with minimal configuration for local development.

1. Copy the root example:

```bash
cp .env.example .env
```

2. Use [`backend/.env.example`](backend/.env.example) as the fuller reference for backend-only options.

Important notes:

- `GEMINI_API_KEY` is optional. If it is missing, letter generation falls back to built-in templates.
- `SUPABASE_URL`, `SUPABASE_KEY`, and `DATABASE_URL` are optional for local work. The backend can fall back to JSON/in-memory storage.
- `JWT_SECRET` should still be set for local auth flows.
- Do not commit real secrets, production endpoints, or admin tokens.

### Recommended local run mode

Run the combined app from the repo root:

```bash
npm run dev
```

This starts the root [`server.js`](server.js), which:

- mounts the Express backend
- prepares the Next.js frontend from `frontend/`
- serves the app on `http://localhost:3000`
- exposes the API on `http://localhost:3000/api`

### Optional split run mode

If you want to run backend and frontend separately:

1. Start the backend on a separate port, for example `3001`:

```bash
PORT=3001 npm run server
```

If you are using PowerShell, the equivalent is:

```powershell
$env:PORT=3001
npm run server
```

2. In a second terminal, create `frontend/.env.local` with the matching port:

```bash
NEXT_PUBLIC_BACKEND_URL=http://localhost:3001
```

3. Start the frontend:

```bash
npm run frontend
```

The frontend also includes a proxy route in [`frontend/src/app/api/[...path]/route.ts`](frontend/src/app/api/[...path]/route.ts) that forwards `/api/*` traffic to `API_PROXY_TARGET`, `NEXT_PUBLIC_API_BASE_URL`, or `NEXT_PUBLIC_BACKEND_URL`.

## Project Map

### High-level architecture

- [`server.js`](server.js): combined local entrypoint for Express + Next.js
- [`backend/server.js`](backend/server.js): main Express API, templated letter logic, auth, permit/admin routes
- [`frontend/src/app/page.tsx`](frontend/src/app/page.tsx): main product UI
- [`backend/personaConfig.js`](backend/personaConfig.js): persona registry used by `/api/personas` and `/api/generate-letter`
- [`backend/permitIngestion.js`](backend/permitIngestion.js): generic permit ingestion and normalization
- [`backend/permitSourceTransforms.js`](backend/permitSourceTransforms.js): source-specific transform helpers
- [`backend/data/permit-sources.json`](backend/data/permit-sources.json): source registry
- [`backend/data/recipient-directory.json`](backend/data/recipient-directory.json): authority/contact mapping
- [`backend/scripts/validate-permit-sources.js`](backend/scripts/validate-permit-sources.js): preview and validate source configs
- [`backend/scripts/sync-permit-sources.js`](backend/scripts/sync-permit-sources.js): sync supported sources into local data stores
- [`test/`](test): API contract and module-level test suite
- [`.github/workflows/permit-sync.yml`](.github/workflows/permit-sync.yml): scheduled sync workflow for fast and slow sources

### Frontend and backend responsibilities

- The frontend is a Next.js app focused on permit discovery, filtering, and letter generation UX.
- The backend owns permit retrieval, normalization, legal framework selection, prompt construction, templated fallbacks, usage/auth flows, and admin management.
- `/api/personas` exposes the public persona list.
- `POST /api/generate-letter` accepts the selected persona id and uses it for prompt and template generation.

## Common Commands

From the repo root:

```bash
npm run dev
npm run build
npm run server
npm run frontend
npm run validate:sources
npm run validate:sources:all
npm run sync:sources
npm run sync:sources:all
```

Test entry points:

```bash
cd test
npm run test:all:local
npm run test:phase10
npm run test:phase11
npm run test:phase14
```

Use the smallest relevant validation set for your change, and include the commands you ran in your PR description.

## How to Add a New Persona

Personas define the stakeholder voice, concern framing, evidence types, and legal emphasis used during letter generation.

Primary files:

- [`backend/personaConfig.js`](backend/personaConfig.js)
- [`frontend/src/app/page.tsx`](frontend/src/app/page.tsx)
- [`frontend/src/components/PersonaSelector.tsx`](frontend/src/components/PersonaSelector.tsx)

Steps:

1. Add a new entry to `PERSONAS` in [`backend/personaConfig.js`](backend/personaConfig.js).
2. Include all public-facing metadata:
   - `id`
   - `label`
   - `description`
   - `icon`
   - `category`
   - `categoryLabel`
3. Add the AI and fallback fields used by generation:
   - `aiRole`
   - `aiConcerns`
   - `aiEvidenceTypes`
   - `aiEmotionalFrame`
   - `legalPriorities`
   - `fallbackConcernHeading`
   - `fallbackConcernBody`
   - `fallbackTopReasons`
4. Add the new persona id to `PERSONA_LIST` so it appears in `/api/personas`.
5. If you use a new icon name, make sure the frontend selector maps it to a real icon component.
6. Verify that selecting the persona still sends the expected `persona` id to `POST /api/generate-letter`.

Good persona additions are specific. They should meaningfully change how harms are described, what evidence is emphasized, and which legal hooks matter most.

## How to Add a New Permit Source

Permit sources are tracked in [`backend/data/permit-sources.json`](backend/data/permit-sources.json).

There are two source paths in this repo:

- Generic ingestion sources handled by [`backend/permitIngestion.js`](backend/permitIngestion.js)
- Bespoke slow-source scripts for sources that need HTML search, GOV.UK search, or multi-step workflows

### Generic ingestion path

Use this path if your source can be modeled as one of the currently supported connector types:

- `local_file`
- `arcgis_mapserver`
- `json_url`
- `csv_url`

Suggested workflow:

1. Add a source entry to [`backend/data/permit-sources.json`](backend/data/permit-sources.json).
2. Include the core metadata:
   - `key`
   - `name`
   - `country`
   - `trust_level`
   - `type`
   - `tier`
   - `enabled`
   - `poll_interval_hours`
3. Add transport-specific fields such as `url`, `path`, `query`, `records_path`, `field_map`, `defaults`, `timeout_ms`, `include_keywords`, and `filter_fields` as needed.
4. If the source payload is irregular, add a transformer in [`backend/permitSourceTransforms.js`](backend/permitSourceTransforms.js) and register it in `getSourceTransformer()`.
5. Validate the source:

```bash
npm run validate:sources -- --source <source-key>
```

6. If validation looks good, run a targeted sync:

```bash
npm run sync:sources -- --source <source-key>
```

### Bespoke slow-source path

Some configured sources in `permit-sources.json` use types like `html_search` or `govuk_search_api`. Those are not handled by the generic `previewPermitSource()` and `readSourcePermits()` pipeline today.

For those sources:

- add or update a dedicated sync script in [`backend/scripts/`](backend/scripts)
- document how it should run locally and in CI
- wire it into [`.github/workflows/permit-sync.yml`](.github/workflows/permit-sync.yml) only after it is stable

If you are introducing a new connector shape rather than a one-off scraper, prefer extending the generic ingestion pipeline and adding tests for it.

## How to Add a New Legal Framework

The main country-level legal framework mapping currently lives in `getCountryLegalFramework()` inside [`backend/server.js`](backend/server.js).

When adding a new country or framework:

1. Add the new country entry to `getCountryLegalFramework()`.
2. Update any country-specific authority routing or fallback text in the templated letter generator if needed.
3. Add persona-specific `legalPriorities` entries in [`backend/personaConfig.js`](backend/personaConfig.js) where the new jurisdiction matters.
4. If the country also needs recipient suggestions, update [`backend/data/recipient-directory.json`](backend/data/recipient-directory.json) and any related matching logic.
5. Add or update tests for the new framework behavior.

Please be careful with legal contributions:

- cite real statutes, agencies, and regulatory schemes
- avoid speculative legal claims
- note whether a framework is national, state/provincial, or local
- prefer precise sections over generic law names where possible

This project is not a law firm, but the software still needs to be trustworthy.

## Testing Expectations

At minimum:

- run the most relevant phase tests in [`test/`](test)
- run `npm run build` for frontend changes
- run `npm run validate:sources` for permit source work

Examples:

- Persona or letter-generation changes: `node test/phase10-api-surface.test.js` and `node test/phase13-letter-sanitizer.test.js`
- Permit source connector or transform work: `node test/phase5-source-connectors.test.js`, `node test/phase6-source-transforms.test.js`, and `node test/phase11-source-validation-report.test.js`
- Recipient suggestion work: `node test/phase14-recipient-suggestions.test.js`

If you could not run a check locally, say so clearly in the PR.

## Pull Request Guidelines

- Fork the repo and open the PR against `master` unless the issue says otherwise.
- Use a branch name that makes the issue obvious, for example `codex/issue-15-contributing-guide`.
- Link the issue in the PR body with `Closes #<issue-number>` when appropriate.
- Keep the scope focused. Separate refactors from feature work when possible.
- Include a short summary of what changed and why.
- Include verification commands and their results.
- Add screenshots or short screen recordings for meaningful frontend changes.
- Call out any follow-up work, gaps, or risks.
- Do not bundle unrelated formatting churn into functional PRs.

## Issue Labels

The repo currently uses these issue labels:

- `bug`: Something is not working
- `documentation`: Improvements or additions to documentation
- `duplicate`: This issue or pull request already exists
- `enhancement`: New feature or request
- `good first issue`: Good for newcomers
- `help wanted`: Extra attention is needed
- `invalid`: This does not appear actionable or correct
- `question`: More information is needed
- `wontfix`: This will not be worked on

If you are opening a new issue, choose the label that best matches the actual work needed and include enough detail for someone else to pick it up quickly.

## Good First Contributions

These tend to be the easiest places to help:

- focused UI improvements in the Next.js frontend
- source validation and transform hardening
- recipient directory data quality fixes
- documentation and onboarding improvements
- legal framework additions with clear citations

## Contributor Etiquette

- Be kind and concrete in issues and PRs.
- Explain tradeoffs when you make product or legal assumptions.
- Prefer small, reviewable steps over large speculative rewrites.
- If you notice an issue already appears implemented on `master`, mention that in the issue before duplicating work.

Thanks again for contributing. Small, careful improvements here can make the platform more useful for real communities facing permit decisions.
