## 2026-08-18T21:10:23+04:00

You are the Project Orchestrator for `C:/Clinic_MVP/dental-crm`.
Your working directory is `C:/Clinic_MVP/dental-crm/.agents/orchestrator_r17`. Create your plan.md, BRIEFING.md, and progress.md in this directory.

The verbatim user request is recorded in `C:/Clinic_MVP/dental-crm/.agents/ORIGINAL_REQUEST.md`.

## Mission Scope: Implementation of EGISZ, SEMD 108, FNS Tax, and Legal Compliance

### Requirements:
1. **R1. Dental SEMD 108 CDA R2 Generator & Validator**
   - Implement production-grade HL7 CDA R2 XML generator for Template 1.2.643.5.1.13.13.11.108 (Code 108: Dental Consultation Protocol) in `apps/api/src/services/cda/` with all 5 mandatory sections:
     - Complaints / Anamnesis
     - Dental Status with FDI ISO 3950 5-surface table (vestibular, lingual/palatal, occlusal/incisal, mesial, distal)
     - ICD-10 Diagnosis
     - Order 804n Services Rendered
     - Recommendations
   - Implement FRNSI/FRMO/FRMR OID validation.

2. **R2. Dual CAdES-BES Detached Signatures & CryptoPro Bridge**
   - Implement hybrid dual-signature pipeline:
     - Client-side detached signature (Doctor UKEP) via CryptoPro Browser Plug-in / Rutoken.
     - Server-side detached signature (Clinic Organization UKEP) via CryptoPro CSP adapter.
     - Full verification of GOST R 34.10-2012 / 34.11-2012 (Streebog-256) detached signatures.

3. **R3. OIIS Gateway REST Client (MedFlex / N3.Health) with Outbox Queue**
   - Implement Outbox pattern (`egisz_outbox` table and service) and REST API client (`POST /cdagen/api/Emd/SendEmd`).
   - Implement background poller tracking document statuses: `QUEUED` -> `VALIDATING` -> `REGISTERED_IN_REMD` -> `DELIVERED_TO_EPGU`.
   - Implement live WebSocket status updates for doctors.

4. **R4. FNS Tax Deduction Generator (Form KND 1151156, Format 5.01)**
   - Implement automated tax deduction XML generator according to FNS Order EA-7-11/824@ with automated categorization under Government Decree No. 458 into:
     - Code 1: Standard treatment (therapy, hygiene, fillings — 150k limit).
     - Code 2: Expensive treatment (dental implants, bone grafting, sinus-lift — unlimited).
   - Implement automated XSD validation against official `UT_SVOPLMEDUSL_1_278_00_05_01_02.xsd` schema.

5. **R5. MIAC Form 039/u & Order 804n UET Aggregator**
   - Add `uet_adult` and `uet_child` coefficients to service nomenclature.
   - Implement SQL aggregation queries for Chief Medical Officer (Form 039/u monthly doctor journal).

6. **R6. Cryptographic SHA-256 Hash-Chained Audit Trail**
   - Implement `egisz_audit_logs` table with row-level locking (`SELECT FOR UPDATE`) maintaining an immutable SHA-256 hash chain (`previous_hash` -> `current_hash`) for all PII and regulatory operations.

7. **R7. Legal Consent Package & Staff Speech Scripts**
   - Embed 4 specialty Informed Consent (IDS) templates (therapy, surgery/implantology, prosthetics, orthodontics) into DocumentsView.
   - Integrate administrator speech scripts for patient refusal handling based on 323-FZ, 152-FZ, and KoAP 14.1 pt 4.

## 2026-08-18T21:21:29+04:00

Продолжай выполнение задач проекта по интеграции ЕГИСЗ (СЭМД 108 CDA R2, CAdES-BES, N3/МедФлекс ОИИС), ФНС КНД 1151156, Формы 039/у и юридического комплаенса в DENTE CRM.
Продолжай Step 2 (Milestone Implementation M1–M7 and E2E Testing) согласно `PROJECT.md` и `plan.md`, соблюдая все стандарты Mandate 8b.
