ALTER TABLE IF EXISTS permits
ADD COLUMN IF NOT EXISTS permit_domain TEXT;

ALTER TABLE IF EXISTS permits
ADD COLUMN IF NOT EXISTS permit_subtype TEXT;

ALTER TABLE IF EXISTS permits
ADD COLUMN IF NOT EXISTS jurisdiction_region TEXT;

ALTER TABLE IF EXISTS permits
ADD COLUMN IF NOT EXISTS recipient_status TEXT DEFAULT 'missing';

ALTER TABLE IF EXISTS permits
DROP CONSTRAINT IF EXISTS permits_permit_domain_check;

ALTER TABLE IF EXISTS permits
ADD CONSTRAINT permits_permit_domain_check
CHECK (permit_domain IN ('farm_animal', 'industrial_infra', 'pollution_industrial', 'other') OR permit_domain IS NULL);

ALTER TABLE IF EXISTS permits
DROP CONSTRAINT IF EXISTS permits_recipient_status_check;

ALTER TABLE IF EXISTS permits
ADD CONSTRAINT permits_recipient_status_check
CHECK (recipient_status IN ('verified', 'inferred', 'missing') OR recipient_status IS NULL);

CREATE INDEX IF NOT EXISTS idx_permits_permit_domain ON permits(permit_domain);
CREATE INDEX IF NOT EXISTS idx_permits_permit_subtype ON permits(permit_subtype);
CREATE INDEX IF NOT EXISTS idx_permits_jurisdiction_region ON permits(jurisdiction_region);
CREATE INDEX IF NOT EXISTS idx_permits_recipient_status ON permits(recipient_status);

UPDATE permits
SET permit_domain = CASE
  WHEN COALESCE(permit_domain, '') <> '' THEN permit_domain
  WHEN LOWER(COALESCE(source_key, '')) LIKE '%farm%'
    OR LOWER(COALESCE(activity, '')) ~ '(poultry|broiler|layer|chicken|turkey|pig|swine|hog|sow|livestock|dairy|farrow|animal feeding|factory farm|intensive agriculture|cafo)'
    OR LOWER(COALESCE(project_title, '')) ~ '(poultry|broiler|layer|chicken|turkey|pig|swine|hog|sow|livestock|dairy|factory farm|intensive agriculture|cafo)'
  THEN 'farm_animal'
  WHEN LOWER(COALESCE(activity, '')) ~ '(industrial emissions|licence|license|permit to operate|waste|landfill|effluent|discharge|air pollution|water pollution|environmental permit)'
    OR LOWER(COALESCE(project_title, '')) ~ '(industrial|plant|refinery|cement|steel|chemical|manufactur|waste|landfill|incinerator|power station)'
  THEN 'pollution_industrial'
  WHEN LOWER(COALESCE(activity, '')) ~ '(infrastructure|construction|road|highway|rail|metro|airport|port|mining|quarry|energy|solar|wind|transmission|data centre|datacenter)'
    OR LOWER(COALESCE(project_title, '')) ~ '(infrastructure|construction|road|highway|rail|metro|airport|port|mining|quarry|energy|solar|wind|transmission|data centre|datacenter)'
  THEN 'industrial_infra'
  ELSE 'other'
END
WHERE permit_domain IS NULL;

UPDATE permits
SET recipient_status = 'missing'
WHERE recipient_status IS NULL;
