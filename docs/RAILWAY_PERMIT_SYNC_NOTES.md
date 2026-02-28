# Railway Permit Sync Notes

## Why permits can look stale on Railway
- Deploying code does **not** automatically run `sync:uk-pending-permits` or `sync:global-pending-permits`.
- If Railway points to a different Supabase project than local, local sync runs will not appear on Railway.
- Background source sync (`ENABLE_PERMIT_SYNC`) uses `permit-sources.json` only; it does not execute the global pending script.

## Recommended Railway variables
- `RUN_GLOBAL_PENDING_SYNC_ON_START=true` (preferred)
- or `RUN_UK_PENDING_SYNC_ON_START=true` (UK-only)
- `REAL_PERMITS_ONLY=true`
- `REQUIRE_SUPABASE=true`

## One-off manual refresh
Run from Railway service shell:

```bash
npm --prefix backend run sync:global-pending-permits
```

or UK-only:

```bash
npm --prefix backend run sync:uk-pending-permits
```

## Verify runtime configuration
Use admin runtime config endpoint:
- `GET /api/admin/runtime-config`
- `GET /api/health`

Confirm:
- Supabase host matches your intended production project.
- Storage mode is Supabase (not JSON fallback).
- `realPermitsOnly=true` and trusted source count is non-zero.
