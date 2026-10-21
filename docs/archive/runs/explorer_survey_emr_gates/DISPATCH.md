# DISPATCH: Survey Explorer - EMR, Scheduling & Monorepo Gates

## Objective
Survey Requirements R3 and R4:
- Schedule Concurrency & 043/u Electronic Medical Record Hardening.
- Pessimistic lock hierarchy (Chair Level 1 -> Doctor Level 2 -> Patient Level 3) preventing double-booking at DB level.
- 043/u medical card drafts auto-save, SOAP protocol templates populate seamlessly.
- Electronic signatures with SHA-256 integrity digests & automated inventory deductions.
- Monorepo Gate Compliance:
  * `node scripts/check-css-tokens.mjs`
  * `node scripts/check-encoding.mjs`
  * `node scripts/check-dynamic-imports.mjs` & `check-env-contract.mjs`
  * `npm run typecheck` across all packages
  * Zero Mocks verification (no `// TODO`, no mock interfaces in production paths).

## Scope & Instructions
1. Read `C:\Clinic_MVP\dental-crm\.agents\AGENTS.md`, `C:\Clinic_MVP\dental-crm\ORIGINAL_REQUEST.md`, `C:\Clinic_MVP\dental-crm\.agents\CLINICAL_RULES.md`, `COMMANDS_AND_TESTS.md`, `DATABASE.md`.
2. Inspect scheduling concurrency and lock mechanisms in backend services and DB transactions.
3. Inspect 043/u medical record draft saving, SOAP templates, SHA-256 signature signing, and inventory deduction integration.
4. Run/inspect gate scripts and identify existing test suites, typecheck issues, or gate failures.
5. Check for any `// TODO` or mock implementations in production paths.
6. Recommend a concrete fix strategy and inventory of all files to modify.
7. Write your comprehensive report to `C:\Clinic_MVP\dental-crm\.agents\explorer_survey_emr_gates\handoff.md` and report back.
