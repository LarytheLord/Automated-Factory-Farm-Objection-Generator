# Permit Domain + Recipient Expansion Notes

## What was added
- Permit domain model for non-mixed browsing and analytics:
  - `farm_animal`
  - `industrial_infra`
  - `pollution_industrial`
  - `other`
- New migration file: `backend/database/permits-domain-classification.sql`
- Backend permit filtering now supports:
  - `permit_domain`
  - `permit_type`
  - `permitType`
  - `domain`
- Home and dashboard now include permit-type filter controls.
- New product page: `frontend/src/app/future-prototype/page.tsx`

## Recipient expansion
- `backend/recipientFinder.js` now blocks cross-source leakage.
- Source-key aliases normalize legacy and current keys (e.g. `nc_deq_application_tracker` and `us_nc_deq_application_tracker`).
- Added Arkansas DEQ fallback route for `us_arkansas_deq_pds`.
- Added official webform fallbacks for:
  - Ireland EPA LEAP
  - Australia EPBC referrals
  - Ontario ERO
- `backend/scripts/sync-recipient-directory.js` now scrapes Arkansas DEQ PDS page contacts.

## Global permit sync expansion
- `backend/scripts/sync-global-pending-permits-to-supabase.js` now supports multi-domain classification.
- New env flag:
  - `GLOBAL_PENDING_INCLUDE_NON_FARM=true`
- Script now emits domain metadata fields when DB supports them:
  - `permit_domain`
  - `permit_subtype`
  - `jurisdiction_region`
  - `recipient_status`

## Deploy order
1. Apply migration:
   - Open `backend/database/permits-domain-classification.sql`
   - Paste and run it in Supabase SQL editor.

2. Refresh recipient directory (local, then deploy):

```bash
npm --prefix backend run sync:recipients
```

3. Refresh permits with domain metadata:

```bash
GLOBAL_PENDING_INCLUDE_NON_FARM=true npm --prefix backend run sync:global-pending-permits
```

4. Redeploy backend/frontend.

## Safety notes
- Recipient suggestions prioritize source-scoped matches.
- If no verified email is found, the UI should use official source links/webforms.
- Cross-state email suggestions are intentionally blocked.
