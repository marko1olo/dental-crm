# Dispatch: Explorer Survey Finance (R2)

## Mission
Survey the codebase for Requirement R2:
Financial module & cash discipline (54-FZ / Sberbank). 100% kopeck-exact integer arithmetic, correct Sberbank acquiring response handling (QR / formUrl), flawless NDFL KND 1151156 tax certificates, and doctor yield calculations.

## Scope & Targets
- `apps/api/src/routes/finance*`, `apps/api/src/routes/payments*`, `apps/api/src/routes/sber*`, `apps/api/src/routes/tax*`, `apps/api/src/routes/ndfl*`, `apps/api/src/services/`
- `apps/web/src/components/finance/`, `apps/web/src/components/accounting/`, `apps/web/src/components/documents/`
- Kopeck-exact integer math in transactions, bills, discounts, payments, refunds.
- Sberbank acquiring gateway response parsing (handling `formUrl`, `qrCode` / `qrUrl`, status callbacks, idempotency).
- NDFL tax certificate KND 1151156 generation (format, patient vs payer, treatment code 1 vs 2, sums).
- Doctor yield / payroll calculations.

## Output
Write your findings to `C:\Clinic_MVP\dental-crm\.agents\explorer_survey_fin\handoff.md`.
Follow AGENTS.md mandates strictly.
