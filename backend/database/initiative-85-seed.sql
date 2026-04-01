-- Seed Initiative 85 (D.C. Foie Gras Ban) into the permits table

INSERT INTO permits (project_title, location, country, activity, status, category, notes)
VALUES (
    'Prohibiting Force-Feeding of Birds Act (Initiative 85)',
    'Washington, D.C.',
    'United States',
    'Ballot Initiative — Ban on foie gras production and sale via force-feeding',
    'pending',
    'Green',
    'D.C. Initiative 85 would prohibit force-feeding birds (gavage) to produce foie gras and ban the sale of foie gras products within D.C. Currently in signature collection phase — needs 25,000+ voter signatures across 5+ wards to qualify for the November 2026 ballot. Sponsored by Pro-Animal DC (local chapter of Pro-Animal Future). If passed, effective July 1, 2027. Penalties: $1,000-$5,000 civil fines per violation. Enforcement by DOEE.'
)
ON CONFLICT DO NOTHING;
