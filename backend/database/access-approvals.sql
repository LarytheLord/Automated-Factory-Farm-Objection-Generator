ALTER TABLE IF EXISTS users
DROP CONSTRAINT IF EXISTS users_role_check;

ALTER TABLE IF EXISTS users
ADD CONSTRAINT users_role_check
CHECK (role IN ('citizen', 'ngo', 'ngo_admin', 'ngo_member', 'lawyer', 'admin', 'disabled'));

CREATE TABLE IF NOT EXISTS access_approvals (
    id BIGSERIAL PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    email TEXT,
    approved BOOLEAN NOT NULL DEFAULT FALSE,
    note TEXT,
    reviewed_by TEXT,
    reviewed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT access_approvals_user_id_key UNIQUE (user_id)
);

CREATE INDEX IF NOT EXISTS idx_access_approvals_email ON access_approvals (email);
CREATE INDEX IF NOT EXISTS idx_access_approvals_updated_at ON access_approvals (updated_at DESC);

CREATE OR REPLACE FUNCTION set_access_approvals_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_access_approvals_updated_at ON access_approvals;
CREATE TRIGGER trg_access_approvals_updated_at
BEFORE UPDATE ON access_approvals
FOR EACH ROW EXECUTE FUNCTION set_access_approvals_updated_at();

INSERT INTO access_approvals (user_id, email, approved, note, reviewed_by, reviewed_at)
SELECT
    u.id,
    u.email,
    TRUE,
    'Auto-approved admin user (migration backfill)',
    'migration',
    NOW()
FROM users u
WHERE u.role = 'admin'
ON CONFLICT (user_id) DO UPDATE SET
    approved = TRUE,
    reviewed_by = EXCLUDED.reviewed_by,
    reviewed_at = EXCLUDED.reviewed_at,
    note = EXCLUDED.note,
    email = EXCLUDED.email,
    updated_at = NOW();
