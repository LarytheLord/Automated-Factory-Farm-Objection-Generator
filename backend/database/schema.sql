-- Open Permit PostgreSQL Database Schema

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    name VARCHAR(255) NOT NULL,
    role VARCHAR(50) DEFAULT 'citizen' CHECK (role IN ('citizen', 'ngo', 'lawyer', 'admin')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Permits table
CREATE TABLE permits (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_title TEXT NOT NULL,
    location TEXT NOT NULL,
    country VARCHAR(100) NOT NULL,
    activity TEXT NOT NULL,
    status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'under_review')),
    category VARCHAR(50) CHECK (category IN ('Red', 'Orange', 'Green', 'Unknown')),
    capacity INTEGER,
    species VARCHAR(100),
    coordinates JSONB, -- {lat: number, lng: number}
    notes TEXT,
    submitted_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Objections table
CREATE TABLE objections (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    permit_id UUID NOT NULL REFERENCES permits(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    generated_letter TEXT NOT NULL,
    status VARCHAR(50) DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'delivered', 'acknowledged', 'failed')),
    recipient_email VARCHAR(255),
    sent_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Activity log table
CREATE TABLE activity_log (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    action VARCHAR(100) NOT NULL CHECK (action IN ('permit_added', 'permit_updated', 'objection_generated', 'objection_sent', 'user_registered')),
    target TEXT NOT NULL, -- permit title or objection ID
    country VARCHAR(100),
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    metadata JSONB, -- Additional context
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for performance
CREATE INDEX idx_permits_country ON permits(country);
CREATE INDEX idx_permits_status ON permits(status);
CREATE INDEX idx_permits_created_at ON permits(created_at DESC);
CREATE INDEX idx_objections_user_id ON objections(user_id);
CREATE INDEX idx_objections_permit_id ON objections(permit_id);
CREATE INDEX idx_objections_status ON objections(status);
CREATE INDEX idx_activity_log_created_at ON activity_log(created_at DESC);
CREATE INDEX idx_activity_log_action ON activity_log(action);

-- Trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_permits_updated_at BEFORE UPDATE ON permits
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_objections_updated_at BEFORE UPDATE ON objections
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- View for aggregated stats
CREATE OR REPLACE VIEW stats_view AS
SELECT
    COUNT(DISTINCT p.id) AS total_permits,
    COUNT(DISTINCT p.country) AS countries_covered,
    COALESCE(SUM(p.capacity), 0) AS potential_animals_protected,
    COUNT(DISTINCT o.id) AS objections_generated,
    COUNT(DISTINCT o.id) FILTER (WHERE o.sent_at IS NOT NULL) AS objections_sent
FROM permits p
LEFT JOIN objections o ON p.id = o.permit_id;

-- View for recent activity
CREATE OR REPLACE VIEW recent_activity_view AS
SELECT
    action,
    target,
    country,
    created_at
FROM activity_log
ORDER BY created_at DESC
LIMIT 50;
