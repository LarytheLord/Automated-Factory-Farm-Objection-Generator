-- Ingestion schedule: tracks which sources have been scraped and when.
-- Used by the Vercel cron to rotate through sources (one per invocation).

CREATE TABLE IF NOT EXISTS ingestion_schedule (
    source_key TEXT PRIMARY KEY,
    source_name TEXT,
    enabled BOOLEAN DEFAULT true,
    tier TEXT DEFAULT 'fast' CHECK (tier IN ('fast', 'slow', 'manual')),
    last_run_at TIMESTAMPTZ,
    last_run_status TEXT DEFAULT 'never' CHECK (last_run_status IN ('never', 'success', 'partial', 'failed')),
    last_run_records_fetched INTEGER DEFAULT 0,
    last_run_records_inserted INTEGER DEFAULT 0,
    last_run_duration_ms INTEGER,
    last_error TEXT,
    next_eligible_at TIMESTAMPTZ DEFAULT NOW(),
    poll_interval_hours INTEGER DEFAULT 24,
    priority INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Ingestion run log: audit trail of every sync invocation.

CREATE TABLE IF NOT EXISTS ingestion_runs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    run_id TEXT NOT NULL,
    source_key TEXT NOT NULL,
    trigger TEXT DEFAULT 'cron' CHECK (trigger IN ('cron', 'manual', 'startup', 'github-actions')),
    started_at TIMESTAMPTZ NOT NULL,
    completed_at TIMESTAMPTZ,
    status TEXT DEFAULT 'running' CHECK (status IN ('running', 'success', 'partial', 'failed')),
    records_fetched INTEGER DEFAULT 0,
    records_inserted INTEGER DEFAULT 0,
    records_updated INTEGER DEFAULT 0,
    records_skipped INTEGER DEFAULT 0,
    errors INTEGER DEFAULT 0,
    error_messages JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ingestion_runs_source_key ON ingestion_runs(source_key);
CREATE INDEX IF NOT EXISTS idx_ingestion_runs_started_at ON ingestion_runs(started_at DESC);

-- Seed the schedule with known sources.

INSERT INTO ingestion_schedule (source_key, source_name, enabled, tier, poll_interval_hours, priority)
VALUES
    ('nc_deq_application_tracker', 'North Carolina DEQ Application Tracker', true, 'fast', 48, 10),
    ('uk_ea_public_register', 'UK Environment Agency Public Register', true, 'fast', 48, 10),
    ('au_epbc_referrals', 'Australian EPBC Referrals', true, 'fast', 72, 5),
    ('ie_epa_leap', 'Ireland EPA LEAP Licensing', true, 'fast', 72, 5),
    ('us_arkansas_deq_pds', 'Arkansas DEQ Permit Data System', true, 'fast', 72, 5),
    ('uk_gov_environment_agency_notice', 'GOV.UK EA Permit Notices', false, 'slow', 168, 3),
    ('ca_on_ero_instruments', 'Ontario ERO Instruments', false, 'slow', 168, 3),
    ('in_parivesh_seiaa_pending_ec', 'India PARIVESH State EC', false, 'slow', 168, 8),
    ('in_ocmms_pending_consent', 'India OCMMS Consent Registry', false, 'slow', 168, 8)
ON CONFLICT (source_key) DO NOTHING;
