## 2026-08-25T17:56:54Z
You are a Survey Explorer investigating Cash Desk, Billing, 54-FZ and SanPiN 3.3686-21 Sterilization & Inventory in DENTE Dental CRM (C:\Clinic_MVP\dental-crm).
Your working directory is C:\Clinic_MVP\dental-crm\.agents\explorer_survey_2.
Your parent orchestrator is dc5ff56d-a5e3-40a0-be0d-34c4eab6c5da.

Read the following authoritative documents completely:
- C:\Clinic_MVP\dental-crm\ORIGINAL_REQUEST.md
- C:\Clinic_MVP\dental-crm\AGENTS.md and C:\Clinic_MVP\dental-crm\.agents\AGENTS.md
- C:\Clinic_MVP\dental-crm\.agents\BILLING_AND_FINANCE.md
- C:\Clinic_MVP\dental-crm\.agents\DATABASE.md
- Relevant files in apps/web/src/ (e.g. apps/web/src/components/finance/, apps/web/src/components/inventory/, apps/web/src/components/sterilization/, apps/web/src/useAppLogic.tsx) and apps/api/src/ (e.g. apps/api/src/routes/payments/, apps/api/src/routes/sterilization/, apps/api/src/routes/inventory/).

Survey and analyze the current implementation against Round 43 Requirements R2 & R3:
1. Requirement R2: Cash Desk, Billing & 54-FZ:
   - Tier 1 (Base): Clean total due in RUB, 1-click tender selection (Cash, Card, SBP QR, Deposit balance), instant 54-FZ receipt printing with penny-exact arithmetic (banker's rounding roundHalfEven) and idempotency protection (Idempotency-Key + PostgreSQL advisory locks).
   - Tier 2 (Collapsible): Multi-currency tourism calculators (USD/EUR/KZT/BYN), complex family deposit allocations, granular loyalty point breakdown strictly in dropdowns/sub-panels.
2. Requirement R3: SanPiN 3.3686-21 Sterilization & Inventory:
   - Tier 1 (Base): 1-click / 2D scan Kraft-package verification attached directly to visit diary 043/u with expiration safety gate.
   - Tier 2 (Collapsible): Granular BOM material deduction tables (Order 804n grams/milliliters of composite, bond, gutta-percha) operating quietly in background with expandable details on demand.

Identify exact file paths, schemas, API endpoints, UI components, math implementations, and any missing features or structural gaps.

Write your detailed findings to:
- C:\Clinic_MVP\dental-crm\.agents\explorer_survey_2\survey_billing_sanpin.md
- C:\Clinic_MVP\dental-crm\.agents\explorer_survey_2\handoff.md

When complete, call send_message to report your findings to the parent orchestrator.

## 2026-08-25T17:57:16Z
**Context**: 3-Tier Architecture Mandate received from Parent.
**Content**: Please ensure your survey explicitly categorizes all investigated features, components, and workflows into the strict 3-tier structure:
1. TIER 1 (Hot Path — 0 clicks, always on screen): Total due in RUB + 1-click tender (Cash, Card, SBP QR, Deposit balance), 54-FZ instant receipt with banker's rounding, 1-click Kraft package scan attached to 043/u diary.
2. TIER 2 (Warm Path — 1 click, sliding drawer/accordion at specific visit/tender): Family account allocation, loyalty points breakdown, granular BOM Order 804n material deduction (grams/ml composite, bond, gutta-percha).
3. TIER 3 (Cold Path — separate workspace/fullscreen backoffice): T-51 payroll, T-13 timesheet, Sberbank acquirer reconciliation, KND 1151156 tax certs, warehouse revisions & MDLP Chestny ZNAK, multi-currency tourism calculator (USD/EUR/KZT/BYN).
**Action**: Include 3-Tier categorization and compliance status in your survey_billing_sanpin.md and handoff.md.

