CREATE TABLE IF NOT EXISTS feedback_submissions (
    id BIGSERIAL PRIMARY KEY,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    name VARCHAR(120) NOT NULL,
    email VARCHAR(255) NOT NULL,
    role VARCHAR(80),
    feedback_type VARCHAR(20) NOT NULL CHECK (feedback_type IN ('suggestion', 'issue', 'feedback')),
    suggestion TEXT,
    issue_description TEXT,
    rating SMALLINT CHECK (rating BETWEEN 1 AND 5),
    additional_comments TEXT,
    source VARCHAR(40) NOT NULL DEFAULT 'web_form',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT feedback_submissions_type_payload_check CHECK (
        (feedback_type <> 'suggestion' OR (suggestion IS NOT NULL AND LENGTH(TRIM(suggestion)) > 0))
        AND (feedback_type <> 'issue' OR (issue_description IS NOT NULL AND LENGTH(TRIM(issue_description)) > 0))
    )
);

CREATE INDEX IF NOT EXISTS idx_feedback_submissions_email ON feedback_submissions (email);
CREATE INDEX IF NOT EXISTS idx_feedback_submissions_created_at ON feedback_submissions (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_feedback_submissions_feedback_type ON feedback_submissions (feedback_type);

CREATE OR REPLACE FUNCTION set_feedback_submissions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_feedback_submissions_updated_at ON feedback_submissions;
CREATE TRIGGER trg_feedback_submissions_updated_at
BEFORE UPDATE ON feedback_submissions
FOR EACH ROW EXECUTE FUNCTION set_feedback_submissions_updated_at();
