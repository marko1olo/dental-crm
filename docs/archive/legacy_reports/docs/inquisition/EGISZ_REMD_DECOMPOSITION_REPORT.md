# EGISZ REMD & FNS Tax Deduction Modules Architectural Decomposition Report

> **Standard:** Mandate 8b ($\le 120$ lines per file), Mandate 8e (Doctor Autonomy & Non-blocking Outbox Queue), Mandate 8x & 8ap (Clinical Terminology, Zero Regulatory Slang in UI), Apple HIG Touch Ergonomics (390×844 Mobile Sheet, Natural Thumb Zone).

---

## 1. Executive Summary & Verification Gates

- **Total Files in `apps/web/src/components/egisz/`:** 152 files (including modular stylesheets).
- **Files Exceeding 120 Lines:** **0 files** (100% compliant with Mandate 8b).
- **Cyclopean Monolith Elimination:** `egiszRemd.css` (originally 3,271 lines) decomposed into modular cohesive styles in `remdStyles/` ($\le 120$ lines each), with a 14-line root facade.
- **Test Suite Results:** **85 passing tests, 0 failing, 0 skipped** (`npx vitest run apps/web/src/components/egisz/`).
- **TypeScript Compilation:** Zero errors in `apps/web/src/components/egisz/`.
- **4-State Visual Proof Inspected via `read_file`:**
  - ☀️ `docs/proofs/egisz/01_egisz_hub_pc_light.png` (1440×900) — EGISZ REMD Hub Studio Light
  - 🌙 `docs/proofs/egisz/02_egisz_hub_pc_dark.png` (1440×900) — EGISZ REMD Hub Studio Dark
  - 📱 `docs/proofs/egisz/03_egisz_queue_mobile_light.png` (390×844) — Apple HIG Mobile Bottom Sheet Light
  - 📱 `docs/proofs/egisz/04_egisz_queue_mobile_dark.png` (390×844) — Apple HIG Mobile Bottom Sheet Dark

---

## 2. Modular CSS Decomposition Architecture (`remdStyles/`)

The cyclopean monolithic stylesheet `egiszRemd.css` has been decomposed into high-cohesion sub-modules, all strictly $\le 120$ lines:

### 2.1 Theme Tokens & Modals
- `theme/egiszRemdThemeDark.css` (66 lines): Dark mode CSS variables and palette tokens.
- `modals/egiszRemdBackdrops.css` (51 lines): Fixed backdrops, blur filters, entrance animations.
- `modals/egiszRemdShell.css` (60 lines): Modal shells, container elevation, borders.
- `egiszRemdThemeTokens.css` (2 lines): Theme gateway.
- `egiszRemdModals.css` (3 lines): Modals gateway.

### 2.2 Layout, Headers & Workspaces
- `layout/egiszRemdHeader.css` (103 lines): Header icon badge, title/subtitle group, close button.
- `layout/egiszRemdHubHeader.css` (79 lines): Hub header, title layout and close action.
- `layout/egiszRemdModeSelector.css` (57 lines): Center mode selector for SEMD documents.
- `layout/egiszRemdTabsNav.css` (81 lines): Navigation tab bar, active pills.
- `layout/egiszRemdWorkspaceGrid.css` (108 lines): Two-pane master-detail layouts.
- `layout/egiszRemdMasterList.css` (109 lines): Master list sidebar and filtering.
- `layout/egiszRemdMasterItems.css` (96 lines): Master list items and telemetry badges.
- `layout/egiszRemdMonolithicCard.css` (86 lines): Anti-matryoshka single-level container.
- `layout/egiszRemdWorkspaceTabs.css` (94 lines): XML and Journal tab workspaces.
- `egiszRemdLayout.css` (10 lines): Layout gateway.

### 2.3 Queue & Journal Tables
- `queue/egiszRemdQueueBaseTable.css` (75 lines): Background queue data table container.
- `queue/egiszRemdQueueRows.css` (78 lines): Table rows and mobile queue cards.
- `queue/egiszRemdQueueBadges.css` (72 lines): Sent, accepted, error badges.
- `queue/egiszRemdJournalTable.css` (84 lines): Journal documents table.
- `queue/egiszRemdJournalStats.css` (101 lines): Stats ribbon and counter tiles.
- `egiszRemdQueueTable.css` (6 lines): Queue gateway.

### 2.4 CDA R2 Viewer, Preflight & Tooth Matrix
- `cda/egiszRemdXmlViewer.css` (89 lines): XML syntax box, UKEP signature inspector.
- `cda/egiszRemdPreflightBanner.css` (48 lines): Preflight score banner and gauge.
- `cda/egiszRemdPreflightGrid.css` (90 lines): Verification checklist grid.
- `cda/egiszRemdToothMatrix.css` (83 lines): FDI tooth matrix in clinical tab.
- `egiszRemdCdaViewer.css` (5 lines): CDA viewer gateway.

### 2.5 UKEP Certificates & CryptoPro CSP
- `certs/egiszRemdCryptoPro.css` (67 lines): CryptoPro CSP status strip.
- `certs/egiszRemdCertCards.css` (108 lines): Certificate selection cards and radio states.
- `certs/egiszRemdCertPreview.css` (97 lines): Detached signature inspector card.
- `certs/egiszRemdCertificatesHubModal.css` (87 lines): Certificates hub panel and backdrop.
- `certs/egiszRemdCertificatesHubCards.css` (93 lines): Certificates hub list cards.
- `certs/egiszRemdStampBox.css` (72 lines): Blue electronic signature stamp per Order 947n.
- `certs/egiszRemdStampPrint.css` (60 lines): Stamp print media queries and seal styles.
- `certs/egiszRemdDocPreview.css` (96 lines): Document paper preview and tabs.
- `egiszRemdCertificates.css` (9 lines): Certificates gateway.

### 2.6 Drawers & Remediation
- `drawers/egiszRemdTaxDrawer.css` (74 lines): FNS Tax Deduction (КНД 1151156) drawer.
- `drawers/egiszRemdTaxPayments.css` (71 lines): Tax drawer payments table.
- `drawers/egiszRemdExtractDrawer.css` (112 lines): Medical record extract drawer.
- `drawers/egiszRemdJournalRemediation.css` (67 lines): Error remediation action cards.
- `egiszRemdDrawers.css` (5 lines): Drawers gateway.

### 2.7 Actions & Filters
- `actions/egiszRemdButtons.css` (106 lines): Touch-first action buttons ($\ge 44\text{px}$).
- `actions/egiszRemdHubFooter.css` (97 lines): Hub footer bar and primary CTA.
- `actions/egiszRemdDocFilters.css` (63 lines): Hick's law document filter toolbar.
- `actions/egiszRemdJournalFilters.css` (79 lines): Journal filter toolbar and search.
- `egiszRemdActions.css` (5 lines): Actions gateway.

### 2.8 Mobile Apple HIG Responsive Adaptive
- `layout/egiszRemdMobileLayout.css` (79 lines): Breakpoint $\le 768\text{px}$ adaptive layout.
- `layout/egiszRemdMobileBottomSheets.css` (90 lines): Native Bottom Sheet with drag handle.
- `egiszRemdResponsive.css` (3 lines): Responsive gateway imported at cascade end.

---

## 3. Clinical & Ergonomic Compliance Verification

1. **Mandate 8e (Doctor Autonomy):**
   - No primary buttons ("Отправить в Минздрав", "Отложить отправку", "Печать", "1-Клик Валидация") are disabled by missing CryptoPro or missing UKEP.
   - Non-blocking banner is displayed when CryptoPro is not detected: *"Криптопровайдер не обнаружен, документ сохранен в черновики бэкофиса"*.
   - Async background outbox queue pattern allows the doctor to finish consultations and billing without waiting for state gateways.

2. **Mandate 8x & 8ap (Anti-Jargon):**
   - Elimination of Soviet regulatory codes in UI:
     - "Форма 043/у" $\to$ "Медицинская карта приёма"
     - "Справка об оплате мед. услуг для ИФНС" $\to$ "Справка для налогового вычета"
     - "Касса 54-ФЗ" $\to$ "Касса и чеки"

3. **Apple HIG Touch Ergonomics:**
   - On screens $\le 768\text{px}$, modal renders as native Bottom Sheet with tactile drag handle (`egisz-mobile-drag-handle`).
   - Touch targets $\ge 44\times 44\text{px}$ across all buttons and tabs.
   - Fixed Floating Bottom Bar with primary CTA in the Natural Thumb Zone.
