ALTER TABLE IF EXISTS permits
ADD COLUMN IF NOT EXISTS ingest_key TEXT;

ALTER TABLE IF EXISTS permits
ADD COLUMN IF NOT EXISTS source_key TEXT;

ALTER TABLE IF EXISTS permits
ADD COLUMN IF NOT EXISTS source_name TEXT;

ALTER TABLE IF EXISTS permits
ADD COLUMN IF NOT EXISTS source_url TEXT;

ALTER TABLE IF EXISTS permits
ADD COLUMN IF NOT EXISTS external_id TEXT;

ALTER TABLE IF EXISTS permits
ADD COLUMN IF NOT EXISTS source_payload JSONB;

ALTER TABLE IF EXISTS permits
ADD COLUMN IF NOT EXISTS published_at TIMESTAMPTZ;

ALTER TABLE IF EXISTS permits
ADD COLUMN IF NOT EXISTS consultation_deadline DATE;

CREATE UNIQUE INDEX IF NOT EXISTS idx_permits_ingest_key_unique
ON permits (ingest_key)
WHERE ingest_key IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_permits_source_key ON permits (source_key);
CREATE INDEX IF NOT EXISTS idx_permits_consultation_deadline ON permits (consultation_deadline);
CREATE INDEX IF NOT EXISTS idx_permits_published_at ON permits (published_at DESC);
