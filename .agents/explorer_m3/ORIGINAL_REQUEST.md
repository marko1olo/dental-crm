## 2026-08-01T02:21:51Z
You are an Explorer subagent assigned to Milestone 3: Kopeck-Exact Financial Accounting & Ledger Audit for DENTE Dental CRM located at C:\Clinic_MVP\dental-crm.
Working directory for your metadata: C:\Clinic_MVP\dental-crm\.agents\explorer_m3

Your tasks:
1. Audit all transaction calculations, pricing, invoice totals, and patient balance ledgers in `apps/api/src/routes/finance/`, `packages/shared/`, and `apps/web/src/` financial components.
2. Verify that integer arithmetic (1 RUB = 100 kopecks) is strictly enforced across all calculations, without floating-point division, `parseFloat`, or rounding errors.
3. Check schema definitions and Drizzle query parameters to ensure financial columns are stored as integer/bigint kopecks.
4. Write a comprehensive audit report to `C:\Clinic_MVP\dental-crm\.agents\explorer_m3\analysis.md` and `handoff.md`.

Rules: You are read-only. Do not modify source code files. Run check commands to gather proof and include exact file paths, line numbers, and stdout logs in your report.
