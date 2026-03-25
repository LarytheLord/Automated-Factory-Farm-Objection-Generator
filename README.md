<p align="center">
  <h1 align="center">Open Permit</h1>
  <p align="center">
    AI-powered civic intelligence for communities fighting harmful development permits.
    <br />
    <a href="https://openpermit.vercel.app"><strong>Live App</strong></a> · <a href="#contributing">Contribute</a> · <a href="https://github.com/LarytheLord/Automated-Factory-Farm-Objection-Generator/issues">Issues</a>
  </p>
</p>

---

Factory farms and polluting facilities get approved because communities can't respond fast enough. Permits move through technical legal processes in days — objection windows close before most people even find out. **Open Permit changes that.**

We monitor permit filings across **8 countries**, match them against **40+ legal frameworks**, and generate **legally cited objection letters** from **12 stakeholder perspectives** — in seconds, not weeks.

### What it does

1. **Discovers permits** — Automated scraping from government portals (US EPA, UK Environment Agency, Australia EPBC, India PARIVESH, Ireland EPA, and more)
2. **Generates objection letters** — Google Gemini AI writes legally grounded letters citing specific laws, sections, and precedents for the permit's country
3. **Adapts to your perspective** — Choose from 12 stakeholder personas (farmer, resident, parent, business owner, health advocate, indigenous community, etc.) to generate letters that speak to YOUR specific harm
4. **Finds the right recipients** — Suggests the correct government authority, email, and submission method for each permit
5. **Falls back gracefully** — If AI is unavailable, a built-in legal template engine generates the letter using the same legal frameworks

### Numbers

| Metric | Value |
|--------|-------|
| Countries covered | 8 (India, US, UK, EU, Australia, Canada, Ireland, Nigeria) |
| Legal frameworks | 40+ laws with specific sections cited |
| Stakeholder personas | 12 + general default |
| Permit sources | 11 government portals (4 automated, 7 configurable) |
| Active permits tracked | 650+ |

---

## Origin Story

**Built in 10 hours** at [Code 4 Compassion](https://www.codeforcompassion.com/) Mumbai hackathon (November 2024), hosted by [Open Paws](https://www.openpaws.ai/) and Electric Sheep. Originally called AFOG (Automated Factory Farm Objection Generator) — a scrappy tool to help animal welfare advocates respond to factory farm permits in India.

**Evolved through the [AARC Pre-Accelerator](https://www.codeforcompassion.com/)** (January–March 2026), where it grew from a single-country prototype into a multi-country civic intelligence platform. Rebranded to **Open Permit** to reflect the expanded scope: environmental, health, economic, and social impact — not just animal welfare.

**Now open source** and accepting contributions from developers, legal researchers, and civic technologists worldwide.

---

## Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | Next.js (React 19, TypeScript, Tailwind CSS) |
| Backend API | Express.js (38 endpoints) |
| AI | Google Gemini 2.0 Flash (with template fallback) |
| Database | Supabase PostgreSQL |
| Auth | JWT + bcrypt (role-based: citizen, NGO, lawyer, admin) |
| Hosting | Vercel (frontend + backend serverless) |
| Scraping | Automated cron pipeline with source rotation |

## Architecture

```
openpermit.vercel.app (Frontend — Next.js on Vercel)
        │
        │ /api/* proxy rewrites
        ▼
final-azure-nu.vercel.app (Backend — Express on Vercel Serverless)
        │
        ├── Google Gemini API (letter generation)
        ├── Supabase PostgreSQL (permits, users, objections)
        └── Government portals (permit scraping via cron)
```

```
├── frontend/              Next.js app (Vercel)
│   └── src/app/page.tsx   Single-page dashboard + letter generator
├── backend/
│   ├── server.js          Express API (2700+ lines, 38 endpoints)
│   ├── personaConfig.js   12 stakeholder personas
│   ├── permitScheduler.js Source-rotation cron pipeline
│   ├── permitIngestion.js Multi-format permit scraper (ArcGIS, JSON, CSV)
│   ├── recipientFinder.js Government authority matcher
│   ├── letterSanitizer.js Output cleanup (strips markdown, control chars)
│   ├── database/          SQL migrations
│   ├── data/              Permit source configs, ingested data
│   └── scripts/           Sync scripts for each country
├── .github/workflows/     Automated permit sync (3x/day)
└── docs/                  Dossier, legal playbook, pitch materials
```

---

## Local Development

```bash
# Clone
git clone https://github.com/LarytheLord/Automated-Factory-Farm-Objection-Generator.git
cd Automated-Factory-Farm-Objection-Generator

# Backend
cd backend
cp .env.example .env  # Fill in SUPABASE_URL, SUPABASE_KEY, GEMINI_API_KEY, JWT_SECRET
npm install
node server.js        # Runs on http://localhost:3001

# Frontend (separate terminal)
cd frontend
echo "NEXT_PUBLIC_BACKEND_URL=http://localhost:3001" > .env.local
npm install
npm run dev           # Runs on http://localhost:3000
```

### Required Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `SUPABASE_URL` | Yes | Supabase project URL |
| `SUPABASE_KEY` | Yes | Supabase anon/publishable key |
| `GEMINI_API_KEY` | No | Google Gemini API key (falls back to templates) |
| `JWT_SECRET` | Yes | Secret for auth tokens |
| `ALLOWED_ORIGINS` | Production | Comma-separated allowed CORS origins |

See [`backend/.env.example`](backend/.env.example) for the full list including quotas, rate limits, and sync options.

---

## Stakeholder Personas

When generating a letter, users choose their perspective. The AI prompt, legal emphasis, and evidence types change per persona:

| Persona | Focus Areas |
|---------|-------------|
| **General** (default) | Comprehensive environmental law + animal welfare |
| **Neighboring Farmer** | Crop contamination, water pollution, livestock disease |
| **Local Resident** | Odor, noise, air quality, daily livability |
| **Small Business Owner** | Tourism decline, customer loss, economic harm |
| **Public Health Advocate** | Respiratory illness, antibiotic resistance, disease |
| **Parent / Caregiver** | Child safety, school proximity, developmental risks |
| **Environmental Activist** | Biodiversity, habitat, climate, ecosystem damage |
| **Water Resource Stakeholder** | Fishers, irrigators, downstream contamination |
| **Transport & Infrastructure** | Road damage, traffic, heavy vehicles, accidents |
| **Property Owner** | Property devaluation, mortgage risk, unsellability |
| **Indigenous / Tribal** | Sacred sites, treaty rights, traditional practices |
| **Environmental Justice** | Disproportionate siting in marginalized communities |
| **Veterinary Professional** | Animal welfare science, confinement, disease protocols |

---

## Permit Scraping Pipeline

The backend scrapes government portals on a rotating schedule. Fast sources (< 8 seconds) run through Vercel cron + GitHub Actions. Slow sources (India, UK GOV.UK) run weekly via GitHub Actions with full Node.js.

| Source | Country | Type | Tier | Status |
|--------|---------|------|------|--------|
| NC DEQ Application Tracker | US | ArcGIS REST | Fast | Active |
| UK Environment Agency | UK | JSON API | Fast | Active |
| Australian EPBC Referrals | Australia | ArcGIS REST | Fast | Active |
| Ireland EPA LEAP | Ireland | JSON API | Fast | Active |
| Arkansas DEQ | US | CSV | Slow | Active |
| UK GOV.UK EA Notices | UK | GOV.UK API | Slow | Active |
| India PARIVESH | India | HTML scrape | Slow | Configurable |
| India OCMMS | India | HTML scrape | Slow | Configurable |
| Ontario ERO | Canada | HTML scrape | Slow | Configurable |

---

## Contributing

We welcome contributions from developers, legal researchers, translators, and civic technologists. Here are good starting points:

- [**#10** — Persona card-grid UI with icons](https://github.com/LarytheLord/Automated-Factory-Farm-Objection-Generator/issues/10) (React + Tailwind)
- [**#13** — Legal frameworks for Ireland, Nigeria, Brazil](https://github.com/LarytheLord/Automated-Factory-Farm-Objection-Generator/issues/13) (Legal research)
- [**#14** — Letter A/B comparison tool](https://github.com/LarytheLord/Automated-Factory-Farm-Objection-Generator/issues/14) (Frontend)
- [**#15** — CONTRIBUTING.md guide](https://github.com/LarytheLord/Automated-Factory-Farm-Objection-Generator/issues/15) (Documentation)

### How to add a new persona
Add an entry to `backend/personaConfig.js` — each persona is a self-contained config object with AI role, concerns, evidence types, and legal priorities.

### How to add a new permit source
Add to `backend/data/permit-sources.json` + optional transformer in `backend/permitSourceTransforms.js`.

### How to add a new country's legal framework
Add to the `frameworks` object in `getCountryLegalFramework()` in `backend/server.js`.

---

## Supported By

- **[Open Paws](https://www.openpaws.ai/)** — AI for animal welfare; founded Code 4 Compassion
- **[AARC Pre-Accelerator](https://www.codeforcompassion.com/)** — Accelerator program supporting civic AI projects
- **Electric Sheep** — Co-hosts Code 4 Compassion hackathons

---

## License

See LICENSE files in repository.
