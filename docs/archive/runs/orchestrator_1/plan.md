# Execution Plan: DENTE Universal Multi-Platform & Network Resilience Architecture

## Overview
Comprehensive implementation and empirical verification of the 4 core pillars of DENTE Dental CRM:
1. Universal Multi-Platform Portability (Web PWA, Desktop Windows .EXE, Mobile Android .APK)
2. 3-Tier Network & Hardware Topology (Autonomous In-Cabinet Offline, Clinic LAN Hardware, Remote Cloud Sync)
3. Strict Financial Idempotency & CRDT Field-Level Merging (Composite Idempotency-Key, LWW CRDT)
4. Automated Verification & Resilience Test Suite (Cross-Platform Suite, Typecheck, CSS tokens, UTF-8 encoding)

## Milestones

### Milestone 1: Universal Multi-Platform Portability (R1)
- [x] Task 1.1: Web & PWA (`apps/web`): Valid Web App Manifest (`manifest.webmanifest`), Service Worker cache strategies, offline IndexedDB outbox.
- [x] Task 1.2: Desktop Windows Executable (`electron/`): Standalone runtime harness, hardware integration contracts (COM/USB TWAIN sensors, TCP sockets for ATOL/Shtrikh-M KKT, local folder watching for Visiograph/PACS).
- [x] Task 1.3: Mobile Android & Tablet UI (`android/`, Capacitor): Touch-first responsive interface (>= 44x44px touch targets), GS1 DataMatrix scanner (Честный ЗНАК / МДЛП), biometric PIN lock, adaptive tooth formula scaling.

### Milestone 2: 3-Tier Network & Hardware Topology (R2)
- [x] Task 2.1: Tier 1 (Autonomous Offline): Offline Form 043/u SOAP, odontogram pathologies, 107-1/u prescriptions, offline mutation queue with transparent LocalStorage fallback.
- [x] Task 2.2: Tier 2 (Local Clinic Subnet LAN / Wi-Fi): Direct network printing on fiscal registers (АТОЛ ДТО 10 / Штрих-М) with non-blocking `hardware_offline` buffer queue, local radiology viewing (`local_offline_available`), local Asterisk WebRTC SIP telephony with automatic failover to cloud webhooks.
- [x] Task 2.3: Tier 3 (Remote Cloud Synchronization): Bi-directional replication with PostgreSQL, background queue draining, catch-up pull delta.

### Milestone 3: Strict Financial Idempotency & CRDT Field-Level Merging (R3)
- [x] Task 3.1: Composite `Idempotency-Key` (`<uuid>#<sha256(canonicalJson(payload))>`) across financial transactions and mutations.
- [x] Task 3.2: Exactly-once execution for re-sent offline payments and invoices, eliminating double charges and duplicate fiscal receipts.
- [x] Task 3.3: Field-Level Last-Write-Wins (LWW) CRDT merging for concurrent edits by doctors and receptionists.

### Milestone 4: Automated Verification & Resilience Test Suite (R4)
- [x] Task 4.1: Run `npm run verify:cross-platform` (all 8 cross-platform packaging, bridge, and resilience suites).
- [x] Task 4.2: Run `npm run check:encoding` across monorepo files.
- [x] Task 4.3: Run `npm run typecheck` across all packages (`@dental/shared`, `@dental/api`, `@dental/web`).
- [x] Task 4.4: Run `npm run lint` (encoding, tracked-ignored, dynamic-imports, env-contract, typecheck).
- [x] Task 4.5: Run unit & integration test suites (`@dental/shared` 292 tests, `@dental/web` 2885 tests, compliance & sync API tests 16 tests).
