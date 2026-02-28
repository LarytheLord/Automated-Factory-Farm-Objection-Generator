# Pending Permit Source Policy

## Objective
Only ingest pending permits from official, trusted public registers with machine-readable data and auditable source links.

## Active ingestion script
- `backend/scripts/sync-global-pending-permits-to-supabase.js`

## Current trusted feeds in global sync
- United Kingdom:
  - GOV.UK Environment Agency permit application notices API (`www.gov.uk/api/search.json` + `www.gov.uk/api/content/*`)
- United States:
  - North Carolina DEQ Application Tracker (official ArcGIS endpoint)
  - Arkansas DEQ Permit Data System CSV (official table download)
- Australia:
  - Department EPBC Referrals public ArcGIS layer (`gis.environment.gov.au`)
- Europe (Ireland):
  - Ireland EPA LEAP API (`data.epa.ie/leap/api/v1`)
- Canada (Ontario):
  - Environmental Registry of Ontario (ERO) instrument notice search (`ero.ontario.ca/search`)

## Safety filters
- Pending-state filtering is applied per source (status-based).
- Factory-farm/intensive-animal filtering is applied with strict keyword + activity logic.
- Ontario ERO ingestion is additionally constrained to:
  - Notice type `Instrument`
  - Notice stage `Proposal`
  - Comment period `Open`
- No deletion of existing permits in global sync.
- Legacy schema compatibility is supported by storing full original payload in permit `notes` with:
  - `Original Payload JSON:`

## India source status
- India has official portals (`parivesh.nic.in`, `environmentclearance.nic.in`), but no stable anonymous machine-readable endpoint for bulk pending permit listings was finalized in this iteration.
- India ingestion is intentionally blocked until a deterministic, auditable endpoint is confirmed.

## Operator commands
- Run global sync:
  - `npm --prefix backend run sync:global-pending-permits`
- Run UK-only sync:
  - `npm --prefix backend run sync:uk-pending-permits`
