# Open Permit Frontend Rebrand Prompt (AI Builder)

Use this prompt in your AI website/UI builder to redesign the **existing frontend only**.

---

You are redesigning an existing Next.js frontend for a civic-tech platform.

## Project
- Old brand: **AFFOG**
- New brand: **Open Permit**
- Core mission: help advocates discover harmful permits and generate legally grounded objection letters.

## Hard Constraints
- Do **not** change backend code or API contracts.
- Do **not** rename or remove existing API endpoints.
- Keep authentication, approval-gated access, and admin flow intact.
- Keep all current routes working:
  - `/`
  - `/dashboard`
  - `/impact`
  - `/submit-permit`
  - `/my-objections`
  - `/survey`
  - `/admin/access`
- Preserve functional user actions (login, generate letter, save objection, feedback submit).

## Branding Requirements
- Replace all visible mentions of **AFFOG/AFOG** with **Open Permit**.
- Tone: trusted, civic, legal-tech, transparent, calm urgency.
- Positioning line: “Open Permit for legal civic action.”
- Keep the platform’s focus on permit intelligence + objection workflows.

## Visual Direction
- Light-first interface.
- Strong editorial layout (not generic SaaS blocks).
- Typography: confident and readable, clear hierarchy.
- Use a distinct brand palette (example):
  - Primary: `#0B5FFF`
  - Secondary: `#0F766E`
  - Accent: `#F59E0B`
  - Surface: `#F8FAFC`
  - Ink: `#0F172A`
- Use subtle gradients and depth; avoid dark/gloomy visuals.
- Add tasteful motion (staggered reveal, hover transitions), but no noisy animations.

## UX Improvements to Include
- Unified top navigation and footer branding across pages.
- Consistent back navigation on all secondary pages.
- Strong empty states, loading states, and error states.
- Improve readability and spacing in forms and legal letter output sections.
- Keep mobile-first responsiveness.

## Content Updates
- Home hero should clearly say “Open Permit”.
- Explain value in 3 steps:
  1. Find permit
  2. Generate legal objection draft
  3. Send via own email client
- Keep legal-risk-aware messaging and approval-gated access messaging.

## Technical Output Requirements
- Output production-ready React/Next.js App Router code.
- Reuse existing route/component structure where possible.
- Keep classes/tokens consistent (Tailwind).
- No fake data layer rewrites and no backend assumptions.

## Acceptance Criteria
- All existing frontend flows still work with current backend.
- No references to AFFOG remain in UI copy.
- Visual identity clearly reflects **Open Permit**.
- Build should pass `npm --prefix frontend run build`.
