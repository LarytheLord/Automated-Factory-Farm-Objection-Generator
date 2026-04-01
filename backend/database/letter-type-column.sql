-- Add letter_type column to objections table (support vs objection)

ALTER TABLE objections ADD COLUMN IF NOT EXISTS letter_type VARCHAR(20) DEFAULT 'objection';
