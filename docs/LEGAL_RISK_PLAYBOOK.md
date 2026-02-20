# AFFOG Legal Risk Playbook

Last updated: 2026-02-20

## Objective
Reduce the probability of platform misuse, takedown, or legal claims while preserving legitimate advocacy use.

## High-priority controls (ship/operate now)

1. Access gating
- Keep permit and generation endpoints restricted to authenticated + manually approved users.
- Approve users only after profile review.
- Maintain approval notes for auditability.

2. Output safety
- Keep human review expectation explicit: generated letters are drafts, not legal advice.
- Do not auto-send to authorities by default for new users.
- Preserve sanitization for generated text.

3. Data source trust
- Use only official or vetted sources in production feeds.
- Keep source validation workflow mandatory before enabling new source.
- Document source provenance for each permit record.

4. Security + abuse controls
- CORS allowlist set and validated in production.
- Strong JWT secret and restricted admin bootstrap handling.
- Route-specific rate limits enabled and monitored.
- Strict security headers enabled.

## Policy controls to publish

1. Terms of use
- Prohibit harassment, false submissions, impersonation, and non-public-data misuse.
- Reserve right to suspend accounts and preserve logs for abuse investigations.

2. Legal disclaimer
- Platform provides informational drafting support only.
- Not legal representation or legal advice.
- User is responsible for verifying facts and legal arguments before submission.

3. Privacy policy
- Define stored personal data, retention period, and deletion process.
- State what is logged for security and anti-abuse.

## Operational safeguards

1. Manual review SOP
- Review every signup before approval:
  - identity signal (real name/email/org context)
  - intended use aligned with advocacy goals
  - no obvious abuse indicators

2. Incident response SOP
- If misuse is detected:
  - immediately revoke access
  - capture request/user logs
  - rotate keys if compromise suspected
  - disable high-risk features via platform config flags

3. Release gate for legal features
- No production release without:
  - passing test suite
  - smoke-testing auth/approval gates
  - validating legal framework references for edited jurisdictions

## Legal exposure map and mitigations

1. Defamation or false claims in generated content
- Mitigation: require user fact verification; include caution copy in UI; keep user-edit step before send.

2. Unauthorized legal practice concerns
- Mitigation: explicit non-legal-advice disclaimers; avoid attorney-client language; no promise of legal outcomes.

3. Platform misuse by malicious actors
- Mitigation: manual approval, admin revocation endpoints, rate limits, logging, and account-level audit trail.

4. Data licensing or source terms violations
- Mitigation: record source URLs, check terms before ingestion, disable questionable sources immediately.

5. Jurisdiction-specific liability (US/other regions)
- Mitigation: jurisdiction-tagged legal frameworks, periodic legal review with partner counsel, staged rollout by geography.

## 30-day hardening roadmap

1. Week 1
- Publish Terms/Privacy/Disclaimer pages and link in footer.
- Add mandatory “I understand this is not legal advice” checkbox before generation.

2. Week 2
- Add basic audit log for admin approval/revocation actions.
- Add abuse-report contact + in-app report button.

3. Week 3
- Add captcha/challenge to signup/login.
- Add monitoring alerts for auth spikes and repeated 403/429 patterns.

4. Week 4
- Conduct legal copy review with external advisor.
- Run tabletop incident drill (misuse scenario + takedown scenario).
