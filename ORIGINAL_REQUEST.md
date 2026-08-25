# Original User Request

## 2026-08-22T19:04:25Z

# Teamwork Project Prompt — DENTE Universal Multi-Platform & Network Resilience Architecture

Working directory: C:\Clinic_MVP\dental-crm
Integrity mode: development

DENTE Dental CRM is an industrial-grade clinical ecosystem engineered for real-world conditions across medical clinics in Russia. The system must operate seamlessly across 3 Universal Runtime Targets: (1) Modern Web App / PWA, (2) Standalone Desktop Executable (.exe via Electron/Tauri), and (3) Mobile/Tablet App (.apk via Capacitor/Android WebView), while guaranteeing 100% data integrity across 3 Network Tiers: Local In-Cabinet Offline, Clinic LAN/Wi-Fi Subnet, and Remote Cloud Synchronization.

## Requirements

### R1. Universal Multi-Platform Portability (Web / Desktop EXE / Mobile APK)
- **Web & PWA (`apps/web`)**: Web App Manifest (`manifest.webmanifest`), Service Worker with cache-first and stale-while-revalidate strategies for assets, offline IndexedDB outbox.
- **Desktop Windows Executable (.exe)**: Direct integration with workstation hardware (COM/USB ports for TWAIN dental sensors, direct TCP sockets for АТОЛ/Штрих-М KKT, local folder watching for Visiograph/PACS files).
- **Mobile Android (.apk) & Tablet UI**: Touch-first responsive interface (>= 44x44px touch targets), camera-based Barcode/DataMatrix scanner (Честный ЗНАК / МДЛП), biometric PIN lock, adaptive tooth formula scaling.

### R2. 3-Tier Network & Hardware Topology
- **Tier 1 — Autonomous Offline**: Doctor fills Form 043/u SOAP, selects odontogram pathologies, writes 107-1/u prescriptions, and accepts payments into the offline queue without network blockers or data loss.
- **Tier 2 — Local Clinic Subnet (LAN / Wi-Fi 192.168.x.x)**:
  - Direct network printing on fiscal registers (АТОЛ ДТО 10 / Штрих-М). If paper runs out or KKT is powered off, receipts buffer in `fiscal_receipt_queue` (`hardware_offline`) with automatic background retry.
  - Local radiology viewing without cloud round-trip delay (`local_offline_available`).
  - Local Asterisk WebRTC SIP telephony with automatic failover to cloud webhooks (Mango/Zadarma).
- **Tier 3 — Remote Cloud Synchronization**: Bi-directional replication with PostgreSQL, background queue draining, and retry backoff.

### R3. Strict Financial Idempotency & CRDT Field-Level Merging
- Every transaction and mutation carries a composite `Idempotency-Key` (`<uuid>#<sha256(canonicalJson(payload))>`).
- Re-sending offline payments or invoices guarantees **exactly-once execution**: no double charges, no duplicate fiscal receipts.
- Concurrent edits by doctors and receptionists merge deterministically via Field-Level Last-Write-Wins (LWW) CRDT without field clobbering.

### R4. Automated Verification & Resilience Test Suite
- Automated unit and integration test suites covering:
  - Network disconnection mid-typing in Form 043/u -> IndexedDB persistence -> 100% character recovery.
  - KKT power interruption -> offline buffer -> recovery.
  - Multi-platform packaging contracts, Web Manifest validity, and icon assets.
  - Monorepo typecheck (`npm run typecheck`), CSS tokens check (`node scripts/check-css-tokens.mjs`), and UTF-8 encoding check (`npm run check:encoding`).

## Acceptance Criteria

### Universal Runtime & Resilience Integrity
- [ ] PWA Web Manifest is valid and passes standalone installability checks.
- [ ] Offline typing in Form 043/u with `navigator.onLine = false` preserves 100% of entered text in IndexedDB without data loss.
- [ ] Restoring network connection automatically syncs all queued changes to backend with `EXIT 0`.
- [ ] Financial operations maintain strict idempotency — duplicate payments are recognized and deduplicated in PostgreSQL.
- [ ] All 10 CRM themes render with compliant WCAG AAA contrast and >= 44x44px touch targets.
- [ ] Full monorepo typecheck (`npm run typecheck`) and encoding tests (`npm run check:encoding`) pass with 0 errors.

## 2026-08-22T19:15:11Z

# Teamwork Project Prompt — DENTE Multi-Platform Packaging & Native Runtime Engine

Working directory: C:\Clinic_MVP\dental-crm
Integrity mode: development

DENTE Dental CRM must be packaged, runnable, and verifiable across all 3 major platforms: (1) Windows Desktop Standalone (.EXE via Electron/Tauri harness with native hardware drivers), (2) Mobile Android (.APK via Capacitor/Android WebView with camera DataMatrix scanning and biometric lock), and (3) Modern Web App / PWA (Browser Standalone with Service Worker caching and IndexedDB outbox). All platforms share the identical @dental/shared business logic and state synchronization protocols.

## Requirements

### R1. Desktop Standalone Windows Runtime (.EXE)
- Native desktop wrapper configuration (Electron / Tauri / Node Host) for Windows.
- Native hardware bridges:
  - Local COM/USB serial port access for TWAIN dental sensors and visiographs.
  - Direct TCP/IP socket printing for АТОЛ and Штрих-М fiscal registers without cloud latency.
  - Local filesystem watch for incoming X-ray DICOMs.

### R2. Mobile Android & Tablet App (.APK)
- Native mobile wrapper configuration (Capacitor / Android WebView).
- Native mobile hardware integration:
  - Camera-based GS1 DataMatrix / Barcode scanner for Честный ЗНАК / МДЛП medication verification.
  - Biometric PIN / TouchID / FaceID staff authentication.
  - Touch-first responsive interface (>= 44x44px touch targets, no layout shift).

### R3. Web PWA Standalone Runtime
- Fully validated Web App Manifest (manifest.webmanifest) with standalone display, shortcuts, and icon assets.
- Production Service Worker (sw.js) with cache-first and stale-while-revalidate strategies for assets.
- Offline IndexedDB Mutation Outbox with auto-draining upon reconnection.

### R4. Universal Cross-Platform Verification Suite
- Comprehensive automated verification suite:
  - Cross-platform build scripts (npm run build, packaging configs).
  - Validation of PWA manifests, icons, and native hardware wrapper interfaces.
  - Monorepo typecheck (npm run typecheck), CSS tokens check (node scripts/check-css-tokens.mjs), and UTF-8 encoding check (npm run check:encoding).

## Acceptance Criteria

### Multi-Platform Packaging & Runtime Integrity
- [ ] Desktop packaging contracts and hardware bridge configs are valid and typed.
- [ ] Mobile Capacitor / Android WebView configuration is complete with DataMatrix camera scanner bridge.
- [ ] PWA Web Manifest is valid and passes standalone installability checks.
- [ ] Full monorepo typecheck (npm run typecheck) and encoding tests (npm run check:encoding) pass with 0 errors.
- [ ] All 10 CRM themes render with compliant WCAG AAA contrast and >= 44x44px touch targets.

## 2026-08-22T20:06:33Z

# DENTE CRM Multi-Domain Autonomous Swarm — Teamwork Execution

Working directory: C:\Clinic_MVP\dental-crm
Integrity mode: development

## Requirements

### R1. Clinical EMR, Odontogram & SOAP Protocol 043/u
- Touch-first responsive tooth formula with 1-click pathology selection.
- Automatic ICD-10 binding per tooth (K02, K04, K05, K08).
- Order 1094n statutory prescription generation and Articaine max safe dosage calculator (mg/kg).

### R2. Finance, 54-FZ Fiscalization & Doctor Payroll
- Multi-tender split payment (Cash, Card, SBP QR, Advance offset, Family wallet).
- FFD 1.2 tags (1214, 1212, 1030) and dynamic FNS QR verification string.
- T-51 doctor payroll calculation deducting lab costs and materials.

### R3. Inventory, Order 804n Clinical Writeoff & Inter-Branch Transfers
- Procedure BOM auto-writeoff for dental services (A16.07.002.001).
- FEFO expiration sorting and бракераж of expired batches.
- Statutory acts generation: Form 0504230, M-11, TORG-2 discrepancy acts, and TORG-13 transfer notes.

### R4. SanPiN 3.3686-21 Sterilization & Autoclave Log
- Form 257/u digital autoclave log with 5-point chamber chemical indicator audit (KT-1..KT-5).
- Form 366/u pre-sterilization cleansing (ПСО) quality control tests (Azopyram, Phenolphthalein, Sudan III).
- Pure TypeScript vector DataMatrix & Code128 kraft package label generation.

### R5. Telephony, Schedule & Multi-Platform Offline Resilience
- WebRTC SIP integration with incoming call HUD, patient debt/last visit preview, and 1-click booking.
- Chair and doctor collision prevention with Postgres 18 exclusion constraints and 0–100 waitlist matching.
- Offline-first IndexedDB CRDT mutation queue with automatic background sync upon reconnection.

## Acceptance Criteria

### Verification Gates
- [x] All packages (@dental/shared, @dental/api, @dental/web) pass npm run typecheck with 0 errors.
- [x] check:encoding passes on all 3420+ source files (UTF-8 clean).
- [x] check:css-tokens verifies all 6900+ var() usages resolve across all 10 clinical themes.
- [x] All domain unit and integration test suites pass with Exit Code 0.
## 2026-08-22T20:33:42Z

# DENTE CRM — Full Autonomous Engineering & Multimodal Verification Swarm

Working directory: C:\Clinic_MVP\dental-crm
Integrity mode: development

Perform comprehensive engineering, verification, and autonomous visual audits across all 5 core clinical and operational domains of the DENTE Dental CRM platform.

## Requirements

### R1. Clinical EMR, Odontogram & SOAP Protocol 043/u
- Standardized odontogram with fast pediatric (51–85) vs permanent (11–48) dentition toggles, mixed dentition tooth replacement stages (6–12 years), and 140px minimum tooth height.
- Clinical SOAP Protocol 043/u generator with 11 standardized complaint presets, automated ICD-10 tooth diagnosis auto-binding (K02.1, K04.0, K04.5, K05.3, K08.1), and Order 1094n Form 107-1/u statutory prescriptions.
- Articaine 4% safety dosage engine (7.0 mg/kg adult, 5.0 mg/kg pediatric, 0.04 mg epinephrine ceiling for cardiovascular patients).

### R2. Finance, 54-FZ Fiscalization & Doctor Payroll
- 54-FZ FFD 1.2 QR code validation (t, s, fn, i, fp, n) with kopeck-exact arithmetic.
- Split-payment processing (Cash, SBP QR, Card, Family Wallet balance).
- Statutory Form T-51 doctor payroll calculation with automatic lab CAD/CAM & material expense deduction.

### R3. Inventory, Order 804n Clinical Writeoff & Inter-Branch Transfers
- Automated BOM material write-off based on Ministry of Health Order 804n service codes (A16.07.002.001 Composite filling, A16.07.030.001 Anesthesia).
- Statutory TORG-13 inter-cabinet and inter-branch transfer forms, and TORG-2 discrepancy acts.
- Expiration tracking with FEFO (First-Expired, First-Out) and nurse re-stock alerts.

### R4. SanPiN 3.3686-21 Sterilization & Autoclave Log
- Form 257/u digital autoclave cycle logger with 5-point chemical indicator validation (KT-1..KT-5, class 4/5 integrators) and spore tests.
- Form 366/u Pre-Sterilization Cleansing (PSO) quality control (1% statutory sampling, Azopyram, Phenolphthalein, Sudan III).
- Pure TypeScript vector DataMatrix 2D & Code128 1D thermal label printers for kraft packages with 50/60/180-day sterility limits.

### R5. Telephony, Schedule & Multi-Platform Resilience
- SIP WebRTC softphone with 48x48px mobile floating action button (FAB) inside React Portal with safe-area-inset support.
- Schedule conflict detection using Postgres 18 tsrange exclusion constraints for doctors, chairs, assistants, and patients.
- Waitlist quick-fill matching engine with 0–100 score priority ranking.

## Acceptance Criteria

### Automated Verification Gates
- [ ] TypeScript Typecheck: npm run typecheck exits with code 0 across all workspaces (@dental/shared, @dental/api, @dental/web).
- [ ] Encoding: npm run check:encoding reports 0 issues across all repository files.
- [ ] CSS Design Tokens: node scripts/check-css-tokens.mjs verifies 0 unresolved variables across all 10 clinical themes.
- [ ] Automated Test Suites: 100% pass rate across domain test suites (@dental/shared, @dental/api, @dental/web).
- [ ] Pre-commit Iron Gate: all 5 pre-commit checks pass cleanly.
- [ ] Visual Proof: 4-state visual confirmation (Mobile Light, Mobile Dark, PC Light, PC Dark) inspected and verified.
