## 2026-08-01T02:29:56Z
You are a Worker subagent assigned to Milestone 3: Financial Kopeck Integer Math Refactoring for DENTE Dental CRM located at C:\Clinic_MVP\dental-crm.
Working directory for your metadata: C:\Clinic_MVP\dental-crm\.agents\worker_m3

Your task is to refactor all remaining floating-point arithmetic locations to use pure kopeck integer math from `packages/shared/src/utils/money.ts` (`parseKopecks`, `rublesToKopecks`, `kopecksToNumericString`, `splitKopecks`, `sumKopecks`, `multiplyKopecks`, `percentageOfKopecks`):

Specific files and lines to refactor:
1. `apps/api/src/documents/guards.ts` (lines 841, 847, and surrounding math):
   Replace float `Math.round((line.quantity * line.unitPriceRub - line.discountRub) * 100) / 100` and `Math.abs(...) > 0.01` tolerance checks with exact integer kopeck math via `parseKopecks` / `multiplyKopecks` / `percentageOfKopecks`.
2. `apps/web/src/useAppLogic.tsx` (lines 5089–5170):
   Replace `roundToKopecks` helper and float multiplication `(treatmentLineTotal(item) * pct) / 100` for insurance coverage with `percentageOfKopecks` / `parseKopecks`.
3. `apps/web/src/PaymentCapture.tsx` (lines 346–348):
   Replace float `Math.round((totalAmount * downPaymentPercent) / 100)` and `Math.floor(remaining / months)` with `percentageOfKopecks` and `splitKopecks()`.
4. `apps/web/src/components/finance/cashDaySummary.ts` (line 102):
   Replace `addRub` float rounding with kopeck integer summation `parseKopecks` / `kopecksToNumericString`.
5. `apps/web/src/components/inventory/useInventoryLogic.ts` (line 771):
   Replace `parseFloat` for inventory item unit cost with `parseKopecks()`.

Verification Requirements:
- Run `npm run typecheck` across `@dental/shared`, `@dental/api`, `@dental/web` to confirm 0 compiler errors.
- Run `npm run test -w @dental/shared` to confirm 185/185 unit tests pass.
- Run `npm run check:encoding` to ensure 0 encoding issues.
- Document exact file modifications, build outputs, and test results in `C:\Clinic_MVP\dental-crm\.agents\worker_m3\handoff.md`.

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A Forensic Auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.
