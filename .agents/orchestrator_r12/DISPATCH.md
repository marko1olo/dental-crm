## 2026-08-15T03:11:42Z

Task Scope: Dental CRM (DENTE) Full Multi-Agent Engineering, Audit & UI Self-Healing Swarm

Requirements:
1. R1. Autonomous UI Design System & 4-State Visual Self-Healing
- Eliminate all remaining theme contrast violations (WCAG 2.1 AA 4.5:1), unmapped CSS variables in light/dark/night modes, broken layout shifts (CLS), and forbidden design clichés (neon glowing borders, pulsing animations, purple-on-dark) across all viewports (Mobile 375px–390px and Desktop 1440px–1920px).
- Ensure all interactive elements have >= 44x44px touch targets.
- Ensure 0 undefined CSS variables via `node scripts/check-css-tokens.mjs`.

2. R2. 54-FZ Cashier, Sberbank Acquiring & NDFL Certificate Precision
- Enforce kopeck-exact financial calculations, FFD 1.2 fiscal receipt generation (tags 1054, 1212, 1214, 1199, 2108, 1055).
- HMAC-SHA256 Sberbank acquiring callbacks with pessimistic locking (SELECT ... FOR UPDATE) and idempotency key tracking.
- 1-click NDFL tax deduction certificate generation (KND 1151156 XML 5.01) and accurate doctor payroll calculations.

3. R3. Schedule Concurrency & 043/u Electronic Medical Record Hardening
- Prevent double-booking chairs/doctors via the canonical pessimistic lock hierarchy (Chair Level 1 -> Doctor Level 2 -> Patient Level 3).
- Ensure 043/u medical card drafts auto-save, SOAP protocol templates populate seamlessly, and electronic signatures generate valid SHA-256 integrity digests with automated inventory deductions.

4. R4. Complete Gate Verification & Zero Mocks Compliance
- Pass all repository gates:
  * node scripts/check-css-tokens.mjs (0 unresolved variables across all themes)
  * node scripts/check-encoding.mjs (0 mojibake / 100% valid UTF-8)
  * node scripts/check-dynamic-imports.mjs & check-env-contract.mjs
  * npm run typecheck (0 errors across @dental/shared, @dental/api, @dental/web)
  * Mandate 8b compliance: individual git add <file>, clean commits without tool trailers, and push to origin/main.
