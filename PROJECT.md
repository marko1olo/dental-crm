# Project: EGISZ, SEMD 108, FNS Tax, and Legal Compliance

## Architecture
DENTE Dental CRM monorepo with Fastify backend (`apps/api`), React frontend (`apps/web`), shared contracts (`packages/shared`), and native PostgreSQL 18 with Row-Level Security.

### Subsystem Interaction & Data Flow
```
[React Web Client]
  ├── Tooth Chart & FDI 5-Surface Odontogram (ISO 3950)
  ├── Doctor UKEP Signing (CryptoPro Browser Plugin / Rutoken CAdES-BES)
  ├── FNS Tax Application & KND 1151156 Preview
  ├── 4 Specialty IDS Forms & Refusal Speech Scripts
  └── Live WebSocket Status Updates (/api/ws/schedule)
         │
         ▼ (HTTP JSON REST / WebSocket)
[Fastify API Backend]
  ├── EGISZ Controller & Document Routes (/api/egisz, /api/documents)
  ├── SEMD 108 HL7 CDA R2 Generator & Validator (apps/api/src/services/cda/)
  ├── Dual CAdES-BES & CryptoPro Bridge (apps/api/src/services/crypto/)
  ├── FNS Tax KND 1151156 Generator & XSD Validator (apps/api/src/services/fns/)
  ├── MIAC Form 039/u SQL Reporting Aggregator (apps/api/src/services/reports/)
  ├── OIIS / MedFlex Gateway Outbox Processor (apps/api/src/services/egisz/)
  └── SHA-256 Cryptographic Hash-Chain Ledger (egisz_audit_logs)
         │
         ▼
[PostgreSQL 18 Database]
  ├── egisz_outbox (status queue, lease lock, dedupe)
  ├── egisz_audit_logs (previous_hash -> current_hash with SELECT FOR UPDATE)
  ├── service_catalog_items (order_804n_code, uet_adult, uet_child, is_decree_458_expensive)
  └── generated_documents (dual detached signature metadata, CDA XML snapshots)
```

## Feature Inventory
| # | Feature | Description | Milestone | Source |
|---|---------|-------------|-----------|--------|
| 1 | DB Schema & Migrations | `egisz_outbox`, `egisz_audit_logs`, `service_catalog_items` UET fields, `generated_documents` UKEP fields, RLS policies | M1 | Backend Survey |
| 2 | SHA-256 Audit Hash Chain | Cryptographic immutable hash chain with PostgreSQL `SELECT FOR UPDATE` row locking | M1 | R6 / Spec Miner |
| 3 | SEMD 108 CDA R2 Generator | HL7 CDA R2 XML generator for Minzdrav Template `1.2.643.5.1.13.13.11.108` | M2 | R1 / Spec Miner |
| 4 | 5-Surface Odontogram Encoder | FDI ISO 3950 5-surface table (V, L/P, O/I, M, D) & condition codes in CDA Section 2 | M2 | R1 / Spec Miner |
| 5 | FRNSI/FRMO/FRMR Validator | Strict OID dictionary validation and SNILS checksum verification | M2 | R1 / Spec Miner |
| 6 | C14N XML Canonicalization | Deterministic XML normalization prior to Streebog-256 hashing | M2 | R2 / Spec Miner |
| 7 | Doctor UKEP Client Signing | CryptoPro browser plugin bridge generating detached CAdES-BES signatures | M3 | R2 / Frontend Survey |
| 8 | MO Clinic UKEP Server Bridge | Server-side CryptoPro CSP adapter for Medical Organization signature | M3 | R2 / Backend Survey |
| 9 | CAdES-BES GOST Verifier | Verification of GOST R 34.10-2012 / 34.11-2012 detached signatures & certificate trust | M3 | R2 / Spec Miner |
| 10 | OIIS Gateway REST Client | REST client for MedFlex / N3.Health (`POST /cdagen/api/Emd/SendEmd`) with sandbox mode | M4 | R3 / Backend Survey |
| 11 | EGISZ Outbox Queue & Worker | Background poller tracking `QUEUED` -> `VALIDATING` -> `REGISTERED_IN_REMD` -> `DELIVERED_TO_EPGU` | M4 | R3 / Backend Survey |
| 12 | Live WebSocket Status Stream | WebSocket dispatcher via `wsBroker` and frontend hook for real-time document status | M4 | R3 / Frontend Survey |
| 13 | FNS KND 1151156 Generator | XML generator for FNS Order EA-7-11/824@ (Format 5.01) with integer kopecks | M5 | R4 / Spec Miner |
| 14 | Decree 458 Code Categorizer | Automated classification of services into Code 1 (Standard) vs Code 2 (Expensive) | M5 | R4 / Spec Miner |
| 15 | FNS XSD Schema Validator | Schema validation against official `UT_SVOPLMEDUSL_1_278_00_05_01_02.xsd` | M5 | R4 / Spec Miner |
| 16 | Order 804n UET Coefficients | Service nomenclature with adult (`uet_adult`) and child (`uet_child`) labor units | M6 | R5 / Spec Miner |
| 17 | MIAC Form 039/u SQL Aggregator | Monthly doctor journal query service aggregating patients, UET, and nosologies | M6 | R5 / Backend Survey |
| 18 | MIAC Form 039/u CMO UI | Chief Medical Officer reporting panel for Form 039/u in frontend | M6 | R5 / Frontend Survey |
| 19 | 4 Specialty IDS Templates | Informed Consent forms (Therapy/Endo, Surgery/Implants, Prosthetics, Orthodontics) in DocumentsView | M7 | R7 / Frontend Survey |
| 20 | Staff Speech Scripts | Administrator/Doctor guidance drawer for patient refusal handling (323-FZ, 152-FZ, KoAP 14.1) | M7 | R7 / Spec Miner |
| 21 | Full E2E Test Suite | Comprehensive 4-tier requirement-driven E2E tests + Tier 5 adversarial hardening | M8 | Testing Track |

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| M1 | Database Schema & Audit Trail | Drizzle schema additions (`egisz_audit_logs`, `egisz_outbox`, `service_catalog_items` UET, `generated_documents`), migration SQL, RLS, SHA-256 hash-chain service | none | DONE |
| M2 | Dental SEMD 108 CDA R2 | CDA R2 generator for Template `1.2.643.5.1.13.13.11.108`, 5 mandatory sections, FDI ISO 3950 5-surface table, OID validation, C14N canonicalization | M1 | PLANNED |
| M3 | Dual CAdES-BES & CryptoPro | Doctor client-side signing bridge, server-side MO CryptoPro bridge, GOST R 34.10/34.11 CAdES-BES detached signature verifier | M2 | PLANNED |
| M4 | OIIS Gateway Outbox & WebSocket | OIIS REST client (`/cdagen/api/Emd/SendEmd`), background outbox poller, WebSocket live status pushes, frontend monitor hook | M1, M3 | PLANNED |
| M5 | FNS Tax KND 1151156 Generator | FNS format 5.01 XML builder, Decree 458 Code 1 / Code 2 auto-categorization, integer kopecks, official XSD validation | M1 | PLANNED |
| M6 | MIAC Form 039/u & UET Reports | SQL aggregation query service for Form 039/u-02, UET calculations, REST endpoint, CMO reporting UI | M1 | PLANNED |
| M7 | Legal Consents & Speech Scripts | 4 specialty IDS templates in DocumentsView, refusal speech scripts drawer under 323-FZ / 152-FZ / KoAP | M1 | PLANNED |
| M8 | Final Integration & E2E Test Suite | 100% E2E test suite execution across Tiers 1-4 + Tier 5 adversarial hardening, zero lint/type errors, git commit | M1-M7 | PLANNED |

## Interface Contracts

### 1. `egisz_audit_logs` Hash-Chain Contract
- `previous_hash`: 64-char hex SHA-256 of preceding tenant record (or 64 zeros for genesis).
- `current_hash = SHA256(previous_hash || sequence_number || organization_id || event_type || entity_type || entity_id || payload_sha256 || iso_timestamp || actor_user_id)`
- Concurrency: `SELECT sequence_number, current_hash FROM egisz_audit_logs WHERE organization_id = $1 ORDER BY sequence_number DESC LIMIT 1 FOR UPDATE`

### 2. SEMD 108 CDA R2 Contract
- Root Template: `1.2.643.5.1.13.13.11.108` (Dental Consultation Protocol), document type code `108`.
- 5 Sections:
  1. Anamnesis (LOINC `10164-2`)
  2. Dental Status (LOINC `29545-1`, FDI ISO 3950 5-surface observations V, L/P, O/I, M, D)
  3. ICD-10 Diagnosis (LOINC `29548-5`, OID `1.2.643.5.1.13.13.11.1005`)
  4. Services Rendered (LOINC `47519-4`, OID `1.2.643.5.1.13.13.11.1070`)
  5. Recommendations (LOINC `18776-5`)

### 3. Dual CAdES-BES Signature Contract
- Algorithms: GOST R 34.10-2012 (`1.2.643.7.1.1.1.1` 256-bit or `1.2.643.7.1.1.1.2` 512-bit) with GOST R 34.11-2012 Streebog-256 (`1.2.643.7.1.1.2.2`).
- Payload: C14N canonicalized XML.
- Storage: Base64 detached PKCS#7 in `doctor_signature_pkcs7` and `mo_signature_pkcs7`.

### 4. FNS Tax Deduction (KND 1151156 Format 5.01) Contract
- Root: `<Файл ИдФайл=... ВерсФорм="5.01">`, `<Документ КНД="1184043" ...>`.
- Expense Node: `<СведРасхУсл СуммаКод1="..." СуммаКод2="...">`.
- Categorization: Code 2 for implants (`A16.07.054`), sinus-lift (`A16.07.055`), bone grafting (`A16.07.041`/`040`), all-on-4/6; Code 1 for all standard therapy, hygiene, fillings, standard crowns.
- Math: exact integer kopecks.

### 5. MIAC Form 039/u Contract
- DTO: `Miac039uDoctorSummary` with total visits, primary/repeat, adult/child, adult/child UET totals, and nosology counts (caries, pulpitis, periodontitis, extractions, fillings, implants).

## Code Layout
- `apps/api/src/db/schema/clinical.ts`: Drizzle schema for `egisz_outbox`, `egisz_audit_logs`, `serviceCatalogItems` fields, `generatedDocuments` fields.
- `apps/api/src/services/cda/`: HL7 CDA R2 SEMD 108 generator, 5-surface table, validator, C14N.
- `apps/api/src/services/crypto/`: CryptoPro CSP adapter, CAdES-BES verifier, Streebog-256 digest.
- `apps/api/src/services/egisz/`: OIIS gateway client, outbox service & background worker.
- `apps/api/src/services/fns/`: FNS KND 1151156 builder, Decree 458 classifier, XSD validator.
- `apps/api/src/services/reports/`: MIAC Form 039/u aggregation service.
- `apps/api/src/routes/`: API routes for EGISZ, documents, tax XML, and reports.
- `apps/web/src/components/documents/`: Signing buttons, tax forms, IDS consent forms.
- `apps/web/src/components/egisz/`: SEMD 108 export modal & live status monitor.
- `apps/web/src/components/reports/`: MIAC Form 039/u reporting panel.
- `apps/web/src/components/legal/`: Refusal speech scripts slide-over drawer.
