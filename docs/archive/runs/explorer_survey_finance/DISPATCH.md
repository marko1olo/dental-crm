# DISPATCH: Survey Explorer - Finance, 54-FZ & NDFL

## Objective
Survey Requirement R2:
- 54-FZ Cashier, Sberbank Acquiring & NDFL Certificate Precision.
- Kopeck-exact financial calculations across billing, payments, invoices, payroll (1 RUB = 100 kopecks integer).
- FFD 1.2 fiscal receipt generation (tags 1054, 1212, 1214, 1199, 2108, 1055).
- HMAC-SHA256 Sberbank acquiring callbacks with pessimistic locking (`SELECT ... FOR UPDATE`) and idempotency key tracking.
- 1-click NDFL tax deduction certificate generation (KND 1151156 XML 5.01) and accurate doctor payroll calculations.

## Scope & Instructions
1. Read `C:\Clinic_MVP\dental-crm\.agents\AGENTS.md`, `C:\Clinic_MVP\dental-crm\ORIGINAL_REQUEST.md`, `C:\Clinic_MVP\dental-crm\.agents\BILLING_AND_FINANCE.md`.
2. Inspect billing, acquiring, receipts, NDFL, and payroll modules in `@dental/api`, `@dental/shared`, `@dental/web`.
3. Check Sberbank webhook implementation: HMAC signature verification, pessimistic locking (`SELECT FOR UPDATE`), idempotency handling, status transitions.
4. Check FFD 1.2 tags in receipt generation logic.
5. Check NDFL certificate XML generator against KND 1151156 XML 5.01 schema and kopeck math.
6. Check doctor payroll logic.
7. Recommend a concrete fix strategy and inventory of all files to modify.
8. Write your comprehensive report to `C:\Clinic_MVP\dental-crm\.agents\explorer_survey_finance\handoff.md` and report back.
