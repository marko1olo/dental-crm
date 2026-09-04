# Project: DENTE Dental CRM (Round 43 — 3-Tier Clinical UX & Full-System Audit)

> 🧭 **Navigation:** [🗺️ Master Documentation Index (.agents/INDEX.md)](file:///C:/Clinic_MVP/dental-crm/.agents/INDEX.md) | [📚 Documentation Knowledge Hub (docs/README.md)](file:///C:/Clinic_MVP/dental-crm/docs/README.md)

## Architecture
- Module/package boundaries:
  - `@dental/shared`: Canonical clinical models, DTOs, CRDT LWW sync logic, Vector Clocks, 54-FZ kopecks arithmetic (`roundHalfEven`, `splitKopecks`), Statutory Form 043/u & Order 804n/834n EMR engines, SanPiN 3.3686-21 Kraft package verification, Multi-Currency CBR engine, Theme token definitions.
  - `@dental/api`: Fastify 5 backend, native PostgreSQL 18.4 with Drizzle ORM, ACID transactions (payments, fiscal receipt queue, inventory stock deduction), Cloud Sync Gateway, 54-FZ Idempotency-Key handling, EGISZ SEMD XML generation, MDLP Schema 10560.
  - `@dental/web`: React 19 SPA, Tailwind CSS with design tokens (`var(--paper)`, `var(--ink)`), 3 strictly segregated tiers:
    * **Tier 1 (Hot Path / In-Chair Cockpit — 0 clicks, always visible)**: Large dental arch (FDI 11..48 adult, 51..85 pediatric, >=140-160px tooth height), 1-click diagnosis & status selection (Caries, Pulpitis, Filling, Crown, Extracted, Healthy) via stamp tools & radial menus, Order 804n live invoice with 1-click tenders (Cash, Card, SBP QR, Deposit balance), Form 043/u SOAP diary with non-intrusive banner chips and `smart_append` overwrite protection, always-visible red medical safety alert beacon. Zero blocking surface modals.
    * **Tier 2 (Warm Context / Tooth Drawer — 1 click, slide-out drawer per tooth/visit)**: 5-surface cavity breakdown (MOD), endodontic canal logs, periodontal mobility cards, weight/age express anesthesia calculator, 1-click SanPiN 3.3686-21 Kraft-package link with GOST R ISO 11607 validation, family deposit & loyalty point deduction (54-FZ Tag 1215), 200x200 viziograph image preview attached to selected tooth.
    * **Tier 3 (Cold Backoffice / Dedicated Fullscreen Modes — outside chair)**: 3D DICOM / PACS MPR viewer with mandibular nerve/sinus safety bounds ($<2.0\text{ mm}$ alert) and HU bone density calibration; Legal EGISZ CDA R3 export with CryptoPro UKEP signing; Doctor Payroll Form T-51 piece-rate and Timesheet T-13; FNS Tax payment certificate (Form 1151156 / KND 1151156); Warehouse inventory audits & MDLP Chestny ZNAK Schema 10560; Multi-Currency CBR medical tourism calculator.
    * **Multi-Theme & WCAG 2.1 AA Visual Quality**: 10 design themes (`light`, `dark`, `night`, `calm_teal`, `contrast`, `sakura`, `ocean`, `emerald`, `cyber_xray`, `warm_sand`), $\ge 4.5:1$ contrast ratio, $\ge 44\times 44\text{px}$ touch targets across PC (1440px), Tablet (1024px), and Mobile (390px).

## Critical Architectural Invariants

### 1. The Universal 3-Tier Interaction Doctrine (Hot Path ➔ Warm Context ➔ Cold Backoffice)
1. **Tier 1 (Hot Path / In-The-Zone — 0 Clicks, Always Visible):**
   - The central cockpit (dental arch, active visit diary, live invoice total in ₽) dominates the screen.
   - Primary clinical actions, status stamps, and tenders execute with 0–1 click.
   - Zero blocking popups, wizard interruptions, or modal obstructions on the main clinical path.
2. **Tier 2 (Warm Context / Entity Drawer — 1 Click, On-Demand):**
   - Granular parameters (MOD tooth surfaces, canal apex logs, anesthesia calculators, Kraft-package barcode links) reside strictly in slide-out drawers or collapsible accordions bound to the active entity.
   - Anti-Matryoshka Law: max nesting depth is strictly 1; no cards inside cards.
3. **Tier 3 (Cold Backoffice / Dedicated Fullscreen Workspaces):**
   - Heavy operations (3D DICOM MPR reconstructions, CDA R3 EGISZ export, UKEP cryptographic signing, T-51 payroll calculations, FNS 1151156 tax certificates, MDLP warehouse audits) operate in dedicated standalone workspaces, decoupled from the Tier 1 hot loop.

### 2. Mandate 8e: Doctor Autonomy & Zero-Friction Law (Запрет на палки в колёса врачам)
1. **Software serves the doctor, not bureaucratic barriers:** Any barrier, redundant click, or artificial block is treated as a critical defect.
2. **Zero disabled buttons without cause:** Primary buttons («Сохранить», «Завершить приём», «Добавить услугу», «Печать») are NEVER disabled due to unfilled secondary fields (temperature, pulse, or 50-point somatic forms).
3. **Physiological norm by default:** Anamnesis and initial inspections prefill physiological norm in 1 click («Соматически здоров / норма»). The doctor records only pathology.
4. **No draft locks or chief physician approvals:** Doctors edit visit diaries freely in 1 click with versioned audit («Исправленному верить»). 24-hour hard locks are strictly forbidden.
5. **Print at any time:** Form 043/u, informed consents, and estimates print at any moment: unclosed visits carry watermark «ЧЕРНОВИК» (Draft); closed visits carry «ПОДПИСАНО ВРАЧОМ» (Signed by Doctor).
6. **Autosave & zero data loss:** Continuous debounced autosave saves clinical inputs to local storage/IndexedDB. Tab switches, call alerts, or drawer transitions never destroy unsaved visit drafts.
7. **Doctor discount freedom:** Doctors have full authority to apply discounts (up to 100% on warranty reworks and clinic personnel) without administrative master passwords. 30-day treatment plan expiration does NOT block ZTL lab orders, treatment execution, or payment.
8. **Reception & Registration:** Creating an appointment never demands mandatory assistant assignment. Registrars can print blank contracts with 0 ₽ and lines `_______` for manual signing without 403 errors.
9. **54-FZ Cashbox without barriers:** Never demand taxpayer INN from physical persons paying by cash or card. Combined payment tenders (Cash + Card + Advance/Bonuses) execute in 1 click.
10. **Nurse & Warehouse:** Nurses dispose of empty anesthetic carpules in 1 click without a 3-person commission. Soft overdraft prevents delayed supplier invoices from halting emergency surgeries.
11. **Sub-50ms Visioradiography:** Visioradiography images open in under 50ms at sensor resolution without AI network lag; AI assistance runs strictly on doctor demand.

### 3. Apple & Mac Ergonomics & Layout Standards (Studio Clinical HIG)
1. **80% — Workstation Desktop (Doctor & Reception):** High-density pilot-panel layout, compact toolbars (32–36px), quick hotkeys (`Cmd/Ctrl+K`, `Esc`), 150ms Hover HUD, 0-click 54-FZ tenders and tooth arch.
2. **10% — Chairside Tablet (Doctor on iPad):** Touch targets $\ge 44\times 44\text{px}$ (and 48–52px for primary clinical action buttons). Native Segmented Control `[ Эконом | ★ Оптимум | Премиум ]` eliminates 2500px scrolling tunnels.
3. **10% — Patient Consumer Portal:** Apple Health inspired UX, 1-tap appointments, electronic 54-FZ receipts with QR codes, and 1-click FNS Form 1151156 tax deduction requests.
4. **Anti-Matryoshka Law:** Modal nesting depth is strictly $\le 1$. Tonal background elevation (`var(--paper)` ➔ `var(--paper-strong)`) replaces multiple nested borders.
5. **Strict Medical Typography:** Zero cartoon emojis in medical records (Form 043/u), treatment plans, acts, or fiscal receipts; only rigorous Lucide vector icons.

## Feature Inventory
Every feature from the Survey phase assigned to a milestone:
| # | Feature | Description | Milestone | Source |
|---|---------|-------------|-----------|--------|
| 1 | Large Anatomical Dental Arch | FDI 11..48 adult, 51..85 pediatric, 140-160px tooth height, full-width top layout | M1 | survey |
| 2 | 1-Click Diagnosis & Status Stamp | 1-click status assignment (Caries, Pulpitis, Filling, Crown, Extracted, Healthy) with radial menu & ICD-10 | M1 | survey |
| 3 | Order 804n Live Invoice & 1-Click Tenders | Penny-exact total in RUB, 1-click tenders (Cash, Card, SBP QR, Balance), Cash Change HUD | M1 | survey |
| 4 | Non-Intrusive SOAP Diary & Safety Alert | Form 043/u SOAP fields, soft chip suggestions, smart_append overwrite protection, persistent red alert beacon | M1 | survey |
| 5 | Zero Blocking Popups on Hot Path | Primary in-chair cockpit opens directly without modal barriers; sub-tools deferred to Tier 2/3 | M1 | survey |
| 6 | 5-Surface Cavity (MOD) & Canal Log Drawer | Tier 2 slide-out drawer for MOD surface selection, IROPZ > 0.6 alert, ISO canal logs, periodontal mobility | M2 | survey |
| 7 | Express Weight/Age Anesthesia Calculator | Anesthetic max dosage limits, pediatric mode (<=40kg / <18yo), aspiration check, SOAP insertion | M2 | survey |
| 8 | 1-Click SanPiN Kraft-Package Attachment | 2D DataMatrix scan, GOST R ISO 11607 shelf-life check, SanPiN 3.3686-21 cl. 3632 diary link, BOM deduction | M2 | survey |
| 9 | Family Deposit & Loyalty Points Deduction | 54-FZ Tag 1215 advance offset, family balance allocation, statutory loyalty cashback | M2 | survey |
| 10 | 200x200 Viziograph Thumbnail Preview | IndexedDB media query, 200x200 WebP card tied to active tooth | M2 | survey |
| 11 | 3D DICOM / PACS MPR & Implant Planning | Tri-planar MPR (Axial, Coronal, Sagittal), mandibular nerve (<2.0mm alert), sinus metric, Misch HU density | M3 | survey |
| 12 | Legal EGISZ CDA R3 Export & CryptoPro UKEP | SEMD 108/111 HL7 CDA R3 XML generation, SNILS/OID validation, detached CAdES-BES / Rutoken signing | M3 | survey |
| 13 | Doctor Payroll Form T-51 & Timesheet T-13 | Piece-rate payroll calculation, lab/material deduction, Form T-51 CSV export, Goskomstat T-13 engine | M3 | survey |
| 14 | FNS Tax Payment Certificate (1151156) | Order ED-7-11/824@ certificate, Code 01 vs 02 classification, NO_MEDOPL 5.01 XML & QR payload | M3 | survey |
| 15 | Warehouse Audits & MDLP Chestny ZNAK | MDLP Schema 10560 disposal, 2D DataMatrix parsing, FEFO queue, Senior Nurse acts, TORG-13/TORG-2 transfers | M3 | survey |
| 16 | Multi-Currency CBR Tourism Calculator | 10 currencies (USD/EUR/KZT/BYN/CNY/AED/GEL/AMD/UZS), official CBR conversion, bank spread, RU/EN quote | M3 | survey |
| 17 | 10 Cohesive Design Themes | Light, Dark, Night, Calm Teal, Contrast, Sakura, Ocean, Emerald, Cyber X-Ray, Warm Sand | M4 | survey |
| 18 | WCAG 2.1 AA Contrast & Multi-Viewport | Luminance thresholds (dark < 0.15, light > 0.60), >=4.5:1 text/badge contrast, 390px/1024px/1440px layouts | M4 | survey |
| 19 | Medical Touch Ergonomics (>=44-52px) | Touch targets >= 44x44px base, 48-52px primary clinical buttons for gloved tablet operation | M4 | survey |
| 20 | 54-FZ Idempotency & Remediation Polish | Idempotency-Key handling, Banker's rounding, SanPiN mutation headers, typofix, complete panels mounting | M5 | survey |
| 21 | Dual Track Acceptance & Adversarial Hardening | Comprehensive E2E test suites (Tiers 1-5), 100% pass across shared, api, and web | M6 | survey |

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| 1 | M1: Tier 1 Hot Path In-Chair Cockpit | Features 1–5: Large arch 140-160px, 1-click status stamp, Order 804n tenders, SOAP diary, zero popups | none | DONE |
| 2 | M2: Tier 2 Warm Context Tooth Drawer | Features 6–10: MOD drawer, canal logs, anesthesia calc, SanPiN Kraft link, family balance, 200x200 thumb | M1 | DONE |
| 3 | M3: Tier 3 Cold Backoffice Workspaces | Features 11–16: 3D DICOM MPR, EGISZ CDA R3, Payroll T-51/T-13, FNS 1151156, MDLP 10560, Multi-currency CBR | M2 | DONE |
| 4 | M4: Multi-Theme & WCAG 2.1 AA Gating | Features 17–19: 10 themes token compliance, WCAG >=4.5:1 contrast, >=44px touch ergonomics | M3 | DONE |
| 5 | M5: 54-FZ & Statutory Remediation Polish | Feature 20: 54-FZ idempotency, banker's rounding, mutation headers, typofix, panels mounting | M4 | DONE |
| 6 | M6: E2E Dual Track Acceptance & Adversarial Hardening | Feature 21: Full E2E verification across Tiers 1-5, 100% test pass, visual proof | M1..M5 | IN_PROGRESS |

## Interface Contracts
### @dental/web ↔ @dental/shared
- `mergeSoapDiaryState(current: SoapDiaryState, incoming: SoapDiaryState, options: { strategy: "smart_append" }): SoapDiaryState`
- `attachKraftPackageTo043Diary(diary: SoapDiaryState, packageData: KraftPackagePayload): SoapDiaryState`
- `calculateDoctorPieceRate(services: ExecutedService[], rules: PayrollRules): DoctorPayrollResult`
- `generateTaxDeduction1151156Xml(data: TaxDeductionPayload): TaxDeductionXmlResult`
- `convertMultiCurrency(amountKopecks: number, from: CurrencyCode, to: CurrencyCode, rates: CbrRates): CurrencyConversionResult`
- `roundHalfEven(amount: number): number`

### @dental/web ↔ @dental/api
- `POST /api/billing/payments`: Headers `Idempotency-Key: <key>`, Body `PaymentPayload`, Returns `PaymentRecord`
- `POST /api/fiscal/receipts`: Headers `Idempotency-Key: <key>`, Body `FiscalReceiptPayload`, Returns `FiscalReceiptRecord`
- `POST /api/egisz/cda/export`: Body `EgiszCdaPayload`, Returns `{ xml: string, sha256: string, oids: string[] }`
- `POST /api/inventory/mdlp/disposal`: Body `MdlpDisposalPayload`, Returns `MdlpDocumentResult`
- `POST /api/warehouse/:organizationId/quick-carpule-disposal`: Body `QuickCarpuleDisposalPayload`, Returns `DisposalActRecord`
- `POST /api/warehouse/:organizationId/soft-overdraft-deduct`: Body `SoftOverdraftPayload`, Returns `OverdraftDeductResult`

## Code Layout
- `packages/shared/`: Shared business logic, types, CRDT, arithmetic, SanPiN protocols, Statutory EMR, multi-currency engines.
- `apps/api/`: Fastify 5 backend, native PostgreSQL 18.4 schemas (Drizzle ORM), billing, sync, EGISZ, MDLP routes.
- `apps/web/`: React 19 frontend:
  * `src/components/odontogram/`: Tier 1 large dental arch, stamp tools, radial menu, live invoice.
  * `src/components/visit/`: Tier 1 Form 043/u diary, SOAP autopilot, allergy safety banner, Tier 2 anesthesia calculator.
  * `src/components/visiograph/`: Tier 3 3D DICOM Cornerstone viewer, MPR slices, nerve/sinus safety guards.
  * `src/components/egisz/`: Tier 3 SEMD CDA R3 export and CryptoPro UKEP modal.
  * `src/components/finance/`: Tier 3 Doctor Payroll Form T-51, Timesheet T-13, FNS 1151156 Tax Certificate, Sberbank POS.
  * `src/components/inventory/`: Tier 3 MDLP Chestny ZNAK Schema 10560 disposal, Senior Nurse acts, TORG transfers.
  * `src/styles/`: Design tokens (`var(--paper)`, `var(--ink)`), 10 WCAG themes, touch target ergonomics.
- `scripts/`: Quality gate scripts (`check-encoding.mjs`, `check-css-tokens.mjs`, `check-dynamic-imports.mjs`, `check-env-contract.mjs`).
