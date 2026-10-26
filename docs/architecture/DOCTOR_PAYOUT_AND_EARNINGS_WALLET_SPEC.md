# Doctor Payout & Earnings Wallet Specification (Mandates 8b, 8e, 8n)

## 1. Executive Summary & Clinical Sovereignty
The Doctor Payout & Earnings Wallet subsystem provides transparent, real-time calculation of piece-rate compensation for dental practitioners (solo chair renters, self-employed/NPD, and salaried specialists). It replaces opaque payroll sheets and Soviet Goskomstat nomenclature with an intuitive, Apple Wallet-grade clinical interface.

### Key Mandates Addressed:
- **Mandate 8b (Anti-Monolith Invariant):** Monolithic stylesheet `apps/web/src/styles/modules/mobile-doctor-payout.css` (856 lines) decomposed into 8 focused modules in `apps/web/src/styles/payoutStyles/` strictly `<= 120 lines` each, leaving a 13-line facade (`<= 25 lines`).
- **Mandate 8e (Doctor Autonomy & Financial Sovereignty):** Doctors see transparent breakdowns of gross billings, laboratory (ZTL) deductions, category rates, and net receivable funds without administrative gatekeeping.
- **Mandate 8n (Solo Practice & Chair Rental Primacy):** Full support for chair rental deductions, advance offsets, and self-employed (НПД 0–6%) tax modes.
- **Mandate 8x & 8ap (Eradication of Soviet Bureaucracy):** Banned bureaucratic form numbers («Форма Т-51», «Т-49», «Табель») across production UI and codebase, replacing them with clear Russian clinical domain terminology («Отчет о доходах врача», «Гонорарная ведомость»).

---

## 2. Decomposed CSS Architecture (`apps/web/src/styles/payoutStyles/`)

The 856-line stylesheet was decomposed into 8 modules according to single-responsibility and cascade layers:

| File | Purpose | Lines (Max 120) |
| :--- | :--- | :--- |
| `payoutThemeTokens.css` | Design token variables, dark theme overrides, color definitions | 47 lines |
| `payoutLayout.css` | Wallet container shell, header layout, month picker, sticky bottom bar | 90 lines |
| `payoutKpiSummary.css` | Net revenue display (`28-36px font-mono`), KPI grid cards, commission summary | 114 lines |
| `payoutLabDeductions.css` | ZTL laboratory work orders, material withholdings, status badges | 100 lines |
| `payoutShiftsList.css` | Shift history cards, patient metrics, hours tracking, chevron triggers | 101 lines |
| `payoutMobileCards.css` | Mobile touch optimization, responsive breakpoints ($\le 768\text{px}$), safe-area insets | 105 lines |
| `payoutDetailsModal.css` | Bottom sheet / detailed drawer for shifts and visit breakdowns | 113 lines |
| `payoutVisitsList.css` | Completed clinical appointments, service items, tariffs, dental codes | 97 lines |
| **`mobile-doctor-payout.css`** | **Thin `@import` facade for backward compatibility** | **13 lines (<= 25)** |

---

## 3. Financial Net Revenue Formula (Integer Kopecks)

Doctor earnings are calculated transparently and deterministically:
$$\text{Net Revenue} = (\text{Gross Revenue} - \text{ZTL Lab Deductions} - \text{Material Withholdings}) \times \text{Commission Rate} - \text{Chair Rental} - \text{Advance}$$

### Backend Contract (`GET /api/doctor/my-earnings`):
- `amountKopecks` stored as integers (`BIGINT`) to eliminate IEEE 754 floating-point inaccuracies.
- Honest handling of laboratory costs: lab expenses are deducted from gross before applying commission.
- Chair rental deductions for solo practitioners operating on chair lease.
- RBAC validation: doctors access their own financial records; administrators and owners audit across all clinicians.

---

## 4. Mobile Ergonomics & Apple HIG Compliance

- **Natural Thumb Zone First:** The primary CTA («Гонорарная ведомость») and refresh controls are positioned in a sticky bottom floating bar (`backdrop-filter: blur(20px)`).
- **Grouped List Cards:** Multi-column tables replaced by touch-friendly cards with visual status badges, category icons, and $\ge 44\times 44\text{px}$ touch targets.
- **Zero Horizontal Drift:** Tested on 390×844 viewport with `0px` parasitic horizontal drift (`overflow-x: clip; max-width: 100vw`).

---

## 5. Visual Proof & Audit Artifacts

All 4 states verified via high-resolution Playwright capture and inspected via `read_file`:
- `docs/proofs/doctor_payout/01_payout_pc_light.png` (1440×900, PC Light mode)
- `docs/proofs/doctor_payout/02_payout_pc_dark.png` (1440×900, PC Dark mode)
- `docs/proofs/doctor_payout/03_payout_mobile_light.png` (390×844, Mobile Light mode)
- `docs/proofs/doctor_payout/04_payout_mobile_dark.png` (390×844, Mobile Dark mode)

---

## 6. Test Suite Coverage (72/72 Passing)

1. `apps/web/src/components/payroll/__tests__/staffPayrollEngine.test.ts` (10 passed)
2. `apps/web/src/components/finance/payroll/doctorPayrollEngine.test.ts` (9 passed)
3. `apps/web/src/components/payroll/__tests__/advancedPayrollComponents.test.ts` (5 passed)
4. `apps/web/src/components/payroll/__tests__/doctorPayrollNetRevenue.test.ts` (6 passed)
5. `apps/web/src/components/payroll/__tests__/payrollTimesheetSoloDoctorAutonomy.test.ts` (18 passed)
6. `apps/web/src/components/finance/payroll/__tests__/soloDoctorPayrollAutonomy.test.ts` (9 passed)
7. `apps/web/src/components/finance/doctorPayoutWallet/__tests__/DoctorPayoutMobileWallet.test.ts` (10 passed)
8. `apps/api/src/tests/routes/doctorEarningsRoutes.test.ts` (5 passed)
