-- Letter generation audit trail: provenance for every objection draft request.

CREATE TABLE IF NOT EXISTS letter_generation_runs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    run_id TEXT NOT NULL UNIQUE,
    actor_kind TEXT NOT NULL CHECK (actor_kind IN ('authenticated', 'anonymous')),
    actor_user_id TEXT,
    actor_role TEXT,
    trigger TEXT NOT NULL DEFAULT 'api' CHECK (trigger IN ('api')),
    status TEXT NOT NULL CHECK (status IN ('success', 'fallback', 'failed')),
    generation_strategy TEXT NOT NULL CHECK (generation_strategy IN ('gemini', 'template')),
    fallback_used BOOLEAN NOT NULL DEFAULT false,
    fallback_reason TEXT,
    model_name TEXT,
    letter_mode TEXT NOT NULL CHECK (letter_mode IN ('concise', 'detailed')),
    persona_id TEXT NOT NULL,
    prompt_version TEXT NOT NULL,
    permit_id TEXT,
    permit_title TEXT,
    permit_location TEXT,
    permit_country TEXT,
    permit_activity TEXT,
    permit_status TEXT,
    permit_category TEXT,
    permit_source_key TEXT,
    permit_source_name TEXT,
    output_length INTEGER NOT NULL DEFAULT 0,
    error_message TEXT,
    started_at TIMESTAMPTZ NOT NULL,
    completed_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_letter_generation_runs_actor_user_id
    ON letter_generation_runs(actor_user_id);

CREATE INDEX IF NOT EXISTS idx_letter_generation_runs_created_at
    ON letter_generation_runs(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_letter_generation_runs_permit_country
    ON letter_generation_runs(permit_country);
