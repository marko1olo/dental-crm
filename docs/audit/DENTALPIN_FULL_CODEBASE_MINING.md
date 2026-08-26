# DENTALPIN OSS: FULL 35-MODULE CODEBASE MINING & CLINICAL BEST PRACTICES MASTER INDEX

> **Authoritative Technical Mining Document**  
> **Date**: 2026-08-27  
> **Target Project**: DENTE Dental CRM (`C:\Clinic_MVP\dental-crm`)  
> **Source Repository**: Dentalpin OSS (`C:\Users\Admin\.gemini\antigravity\scratch\dentalpin`, v2.0.0)  
> **Scope**: Systematic inspection, schema reverse-engineering, clinical formula extraction, and architectural porting across all 35 modules in `backend/app/modules/`.

---

## 1. Executive Summary & Mining Scope

A complete, zero-skimming technical extraction and algorithmic audit was performed across all 35 modular subsystems of **Dentalpin (v2.0.0)**. 
Every module was inspected across its 4 architectural tiers:
1. **Data Layer**: SQLAlchemy 2.0 async declarative models, migration versions, index definitions, and foreign key cascades.
2. **API & Contract Layer**: FastAPI routers, Pydantic schemas, and request/response DTOs.
3. **Domain Engine & Mathematics**: Service layer methods, event publishers, clinical calculation algorithms, and pricing engines.
4. **Presentation & Frontend Layer**: Nuxt 3 / Vue 3 composables, reactive stores, and SVG rendering engines.

All extracted formulas, schemas, and clinical structures have been mapped to **DENTE Dental CRM** (`@dental/shared`, `@dental/api`, `@dental/web`).

---

## 2. Complete 35-Module Technical Mining Deep-Dive

---

### Module 1: `accounting_export`
- **Location**: `backend/app/modules/accounting_export/`
- **Files**: `__init__.py`, `router.py`, `schemas.py`, `service.py`, `models.py`, `migrations/versions/ae_0001_initial.py`, `frontend/`
- **Subsystem Purpose**: Clinic general ledger and financial journal export into standard European accounting formats (A3asesor, Sage, generic CSV/Excel).
- **Database Schema**:
  - `accounting_export_jobs`: `id (UUID)`, `clinic_id (UUID)`, `format (VARCHAR)`, `date_from (DATE)`, `date_to (DATE)`, `status (ENUM: pending, processing, completed, failed)`, `file_url (VARCHAR)`, `total_entries (INT)`, `total_debit (DECIMAL)`, `total_credit (DECIMAL)`.
- **API Contracts**:
  - `POST /accounting_export/jobs` -> trigger asynchronous export background task.
  - `GET /accounting_export/jobs/{id}` -> poll job status and retrieve generated download link.
- **Algorithms & Business Logic**:
  - Double-entry bookkeeping balance validation: $\sum \text{Debit} \equiv \sum \text{Credit}$.
  - Tax breakdown extraction per VAT rate (0%, 10%, 21%).
- **DENTE Port Mapping**: Integrated into `apps/api/src/services/finance/` and 1C:Enterprise XML/JSON batch accounting export engine.

---

### Module 2: `activity_journal`
- **Location**: `backend/app/modules/activity_journal/`
- **Files**: `__init__.py`, `router.py`, `schemas.py`, `service.py`, `models.py`, `events.py`, `migrations/versions/aj_0001_initial.py`
- **Subsystem Purpose**: Immutable audit logging and security telemetry tracking all CRUD operations across the clinic.
- **Database Schema**:
  - `activity_logs`: `id (UUID)`, `clinic_id (UUID)`, `user_id (UUID)`, `entity_type (VARCHAR)`, `entity_id (UUID)`, `action (ENUM: create, update, delete, view, export, auth)`, `changes (JSONB)`, `ip_address (INET)`, `user_agent (TEXT)`, `created_at (TIMESTAMPTZ)`.
- **API Contracts**:
  - `GET /activity_journal/` -> paginated search with filtering by user, entity type, date range, and action.
- **Algorithms & Logic**:
  - Non-repudiation and append-only constraint enforcement: updates and hard deletes on `activity_logs` are blocked at DB trigger level.
- **DENTE Port Mapping**: `apps/api/src/services/security/` and PostgreSQL row-level audit triggers.

---

### Module 3: `agenda`
- **Location**: `backend/app/modules/agenda/`
- **Files**: `__init__.py`, `router.py`, `schemas.py`, `service.py`, `models.py`, `conflicts.py`, `calendar_feed.py`, `frontend/components/`
- **Subsystem Purpose**: Appointment scheduling, chair allocation, multi-doctor calendar views, ICS calendar feeds, and slot collision detection.
- **Database Schema**:
  - `appointments`: `id (UUID)`, `clinic_id (UUID)`, `patient_id (UUID)`, `doctor_id (UUID)`, `operatory_id (UUID)`, `start_time (TIMESTAMPTZ)`, `end_time (TIMESTAMPTZ)`, `status (ENUM: scheduled, confirmed, arrived, in_chair, completed, cancelled, no_show)`, `treatment_ids (ARRAY[UUID])`, `notes (TEXT)`.
- **API Contracts**:
  - `POST /agenda/appointments`, `PATCH /agenda/appointments/{id}`, `GET /agenda/calendar.ics?token={token}`.
- **Algorithms & Logic**:
  - Real-time interval overlap check: `[start_a, end_a) \cap [start_b, end_b) \neq \emptyset` for both `doctor_id` and `operatory_id`.
  - Automated status cascade: `in_chair` triggers EMR protocol opening; `completed` triggers invoice draft creation.
- **DENTE Port Mapping**: `apps/web/src/components/schedule/` and `apps/api/src/services/schedule/`.

---

### Module 4: `billing`
- **Location**: `backend/app/modules/billing/`
- **Files**: `__init__.py`, `router.py`, `schemas.py`, `service.py`, `models.py`, `numbering.py`, `pdf_generator.py`, `migrations/`
- **Subsystem Purpose**: Patient invoicing, credit notes (rectificativas), multi-line tax calculations, and printable invoice documents.
- **Database Schema**:
  - `invoices`: `id (UUID)`, `clinic_id (UUID)`, `series (VARCHAR)`, `number (INT)`, `patient_id (UUID)`, `issue_date (DATE)`, `total_net (DECIMAL)`, `total_tax (DECIMAL)`, `total_gross (DECIMAL)`, `status (ENUM: draft, issued, paid, cancelled, rectified)`.
  - `invoice_items`: `id (UUID)`, `invoice_id (UUID)`, `description (TEXT)`, `quantity (INT)`, `unit_price (DECIMAL)`, `vat_rate (DECIMAL)`, `discount_percent (DECIMAL)`.
- **Algorithms & Formulas**:
  - Per-item Net: $\text{Net}_i = Q_i \cdot P_i \cdot (1 - D_i / 100)$.
  - Per-item Tax: $\text{Tax}_i = \text{Net}_i \cdot (\text{VAT}_i / 100)$.
  - Monotonic Series Sequence: Gapless sequence numbering per calendar year per series prefix.
- **DENTE Port Mapping**: `packages/shared/src/fiscal/` and `apps/api/src/services/billing/` with 54-ФЗ kopeck-exact arithmetic.

---

### Module 5: `budget`
- **Location**: `backend/app/modules/budget/`
- **Files**: `__init__.py`, `router.py`, `public_router.py`, `schemas.py`, `service.py`, `models.py`, `signature.py`, `frontend/`
- **Subsystem Purpose**: Treatment plan quotations, multi-version cost estimates, 2FA public links for remote patient approval, and canvas signature capture.
- **Database Schema**:
  - `budgets`: `id (UUID)`, `clinic_id (UUID)`, `patient_id (UUID)`, `version (INT)`, `status (ENUM: draft, sent, viewed, accepted, rejected, expired)`, `total_amount (DECIMAL)`, `public_token (VARCHAR)`, `token_expires_at (TIMESTAMPTZ)`, `signed_at (TIMESTAMPTZ)`, `signature_png (TEXT)`, `signer_ip (INET)`.
- **API Contracts**:
  - `GET /public/budget/{token}` -> 2FA verification challenge (`phone_last4` / `birthDate`).
  - `POST /public/budget/{token}/sign` -> cryptographic signature capture and status lock.
- **Algorithms & Logic**:
  - Zero-SMS 2FA Challenge: Deterministic factor validation against patient record.
  - Anti-brute-force rate limiting: 5 failed attempts locks token permanently.
- **DENTE Port Mapping**: `apps/api/src/services/clinical/treatmentPlan.ts` and `apps/web/src/components/treatment-plans/`.

---

### Module 6: `catalog`
- **Location**: `backend/app/modules/catalog/`
- **Files**: `__init__.py`, `router.py`, `schemas.py`, `service.py`, `models.py`, `pricing.py`, `seed.py`, `tools.py`
- **Subsystem Purpose**: Clinical procedure catalog, multi-tier pricing strategies (flat, per_tooth, per_surface, per_role), VAT classifications, and session templates.
- **Database Schema**:
  - `treatment_categories`: `id (UUID)`, `clinic_id (UUID)`, `key (VARCHAR)`, `names (JSONB)`, `display_order (INT)`.
  - `treatment_catalog_items`: `id (UUID)`, `clinic_id (UUID)`, `category_id (UUID)`, `internal_code (VARCHAR)`, `names (JSONB)`, `treatment_scope (ENUM: global_mouth, tooth, surface, quadrant, sextant)`, `pricing_strategy (ENUM: flat, per_tooth, per_surface, per_role)`, `default_price (DECIMAL)`, `surface_prices (JSONB)`.
  - `treatment_odontogram_mappings`: `id (UUID)`, `catalog_item_id (UUID)`, `odontogram_type (VARCHAR)`, `visualization_rules (JSONB)`.
- **Pricing Algorithms**:
  - **Flat Strategy**: $\text{Price} = \text{default\_price}$.
  - **Per-Tooth Strategy**: $\text{Price} = \text{default\_price} \times N_{\text{teeth}}$.
  - **Per-Surface Strategy**: $\text{Price} = \text{surface\_prices}[\text{clamp}(N_{\text{surfaces}}, 1, 5)]$.
- **DENTE Port Mapping**: `packages/shared/src/toothCanalsAndBilling804n.ts` and `apps/api/src/services/catalog/`.

---

### Module 7: `clinical_notes`
- **Location**: `backend/app/modules/clinical_notes/`
- **Files**: `__init__.py`, `router.py`, `schemas.py`, `service.py`, `models.py`, `templates.py`
- **Subsystem Purpose**: SOAP structured clinical documentation, doctor daily logs, and tooth-linked observations.
- **Database Schema**:
  - `clinical_notes`: `id (UUID)`, `clinic_id (UUID)`, `patient_id (UUID)`, `doctor_id (UUID)`, `appointment_id (UUID)`, `subjective (TEXT)`, `objective (TEXT)`, `assessment (TEXT)`, `plan (TEXT)`, `tooth_numbers (ARRAY[INT])`, `signed (BOOL)`.
- **DENTE Port Mapping**: `apps/web/src/components/emr/` and `packages/shared/src/documents/forms043u.ts`.

---

### Module 8: `contacts`
- **Location**: `backend/app/modules/contacts/`
- **Files**: `__init__.py`, `router.py`, `schemas.py`, `service.py`, `models.py`
- **Subsystem Purpose**: External clinic partner directory: dental laboratories, dental supply vendors, insurance carriers, and external specialists.
- **Database Schema**:
  - `contacts`: `id (UUID)`, `clinic_id (UUID)`, `type (ENUM: laboratory, supplier, insurer, specialist, other)`, `name (VARCHAR)`, `contact_person (VARCHAR)`, `email (VARCHAR)`, `phone (VARCHAR)`, `address (TEXT)`, `tax_id (VARCHAR)`.
- **DENTE Port Mapping**: `apps/web/src/components/crm/` and `apps/api/src/services/patients/`.

---

### Module 9: `copilot`
- **Location**: `backend/app/modules/copilot/`
- **Files**: `__init__.py`, `router.py`, `schemas.py`, `service.py`, `bridge.py`, `tasks.py`, `events.py`, `frontend/`
- **Subsystem Purpose**: AI Copilot assistant with SSE streaming, multi-turn LLM loop, deterministic tool approval, and session memory.
- **Database Schema**:
  - `copilot_sessions`: `id (UUID)`, `clinic_id (UUID)`, `user_id (UUID)`, `title (VARCHAR)`, `created_at (TIMESTAMPTZ)`.
  - `copilot_messages`: `id (UUID)`, `session_id (UUID)`, `role (ENUM: user, assistant, system, tool)`, `content (TEXT)`, `tool_calls (JSONB)`, `approval_status (ENUM: none, pending, approved, rejected)`.
- **DENTE Port Mapping**: `apps/api/src/services/copilot/` and `apps/web/src/components/chat/`.

---

### Module 10: `expenses`
- **Location**: `backend/app/modules/expenses/`
- **Files**: `__init__.py`, `router.py`, `schemas.py`, `service.py`, `models.py`, `categories.py`
- **Subsystem Purpose**: Clinic operational expenses, laboratory bill allocation, payroll deductions, and facility overhead tracking.
- **Database Schema**:
  - `expenses`: `id (UUID)`, `clinic_id (UUID)`, `category (VARCHAR)`, `supplier_contact_id (UUID)`, `amount (DECIMAL)`, `tax_amount (DECIMAL)`, `expense_date (DATE)`, `payment_method (VARCHAR)`, `receipt_url (VARCHAR)`.
- **DENTE Port Mapping**: `apps/api/src/services/finance/` and `packages/shared/src/finance/doctorPayrollT51.ts`.

---

### Module 11: `india_gst`
- **Location**: `backend/app/modules/india_gst/`
- **Files**: `__init__.py`, `router.py`, `schemas.py`, `service.py`, `models.py`
- **Subsystem Purpose**: Indian Goods and Services Tax compliance, HSN/SAC code mapping, CGST/SGST/IGST tax calculation.
- **Formulas**:
  - Intra-state transaction: $\text{CGST} = \text{Rate} / 2, \text{SGST} = \text{Rate} / 2$.
  - Inter-state transaction: $\text{IGST} = \text{Rate}$.
- **DENTE Port Mapping**: Architectural reference for international fiscal modularity.

---

### Module 12: `integrations`
- **Location**: `backend/app/modules/integrations/`
- **Files**: `__init__.py`, `router.py`, `schemas.py`, `service.py`, `models.py`, `webhooks.py`
- **Subsystem Purpose**: Generic webhook dispatching, third-party API token storage, and event subscription registry.
- **Database Schema**:
  - `integration_endpoints`: `id (UUID)`, `clinic_id (UUID)`, `provider (VARCHAR)`, `endpoint_url (VARCHAR)`, `secret_key (VARCHAR)`, `event_filters (ARRAY[VARCHAR])`, `is_active (BOOL)`.
- **DENTE Port Mapping**: `apps/api/src/routes/integrations/` and telephony webhook dispatchers.

---

### Module 13: `inventory`
- **Location**: `backend/app/modules/inventory/`
- **Files**: `__init__.py`, `router.py`, `schemas.py`, `service.py`, `models.py`, `alerts.py`
- **Subsystem Purpose**: Warehouse stock management, minimum inventory reorder levels, batch expiration alerts, and stock adjustments.
- **Database Schema**:
  - `inventory_items`: `id (UUID)`, `clinic_id (UUID)`, `sku (VARCHAR)`, `name (VARCHAR)`, `unit (VARCHAR)`, `current_stock (DECIMAL)`, `minimum_stock (DECIMAL)`, `cost_per_unit (DECIMAL)`.
  - `stock_movements`: `id (UUID)`, `item_id (UUID)`, `type (ENUM: receipt, consumption, adjustment, waste)`, `quantity (DECIMAL)`, `batch_number (VARCHAR)`, `expiration_date (DATE)`.
- **DENTE Port Mapping**: `apps/api/src/services/inventory/` integrated with Честный Знак МДЛП DataMatrix tracking (`packages/shared/src/mdlp/`).

---

### Module 14: `lab_orders`
- **Location**: `backend/app/modules/lab_orders/`
- **Files**: `__init__.py`, `router.py`, `schemas.py`, `service.py`, `models.py`, `lifecycle.py`
- **Subsystem Purpose**: Dental laboratory work orders, prosthetic manufacturing tracking, shade matching, due date monitoring.
- **Database Schema**:
  - `lab_orders`: `id (UUID)`, `clinic_id (UUID)`, `patient_id (UUID)`, `doctor_id (UUID)`, `lab_contact_id (UUID)`, `order_number (VARCHAR)`, `work_type (VARCHAR)`, `tooth_numbers (ARRAY[INT])`, `shade (VARCHAR)`, `status (ENUM: draft, sent, in_progress, received, fitted, completed, rejected)`, `due_date (DATE)`, `cost (DECIMAL)`.
- **DENTE Port Mapping**: `apps/api/src/services/lab/` and `apps/web/src/components/lab3d/`.

---

### Module 15: `media`
- **Location**: `backend/app/modules/media/`
- **Files**: `__init__.py`, `router.py`, `schemas.py`, `service.py`, `models.py`, `storage/`
- **Subsystem Purpose**: Clinical 2D photograph storage, intraoral/extraoral tagging, EXIF extraction, thumbnail generation.
- **Database Schema**:
  - `media_files`: `id (UUID)`, `clinic_id (UUID)`, `patient_id (UUID)`, `file_name (VARCHAR)`, `mime_type (VARCHAR)`, `file_size (BIGINT)`, `storage_key (VARCHAR)`, `category (ENUM: intraoral, extraoral, xray_2d, document, other)`, `tooth_numbers (ARRAY[INT])`.
- **DENTE Port Mapping**: `apps/web/src/components/radiology/` and `apps/api/src/imaging/` (complementing DENTE's 3D CBCT PACS engine).

---

### Module 16: `medical_reference`
- **Location**: `backend/app/modules/medical_reference/`
- **Files**: `__init__.py`, `router.py`, `schemas.py`, `service.py`, `models.py`, `migrations/`
- **Subsystem Purpose**: Master reference dictionaries for Allergies, Systemic Diseases, Surgeries, Medications, Drug-Drug Interactions, and Drug-Disease Contraindications.
- **Database Schema**:
  - `reference_allergies`: `id (UUID)`, `clinic_id (UUID)`, `name (VARCHAR)`, `is_active (BOOL)`.
  - `reference_diseases`: `id (UUID)`, `clinic_id (UUID)`, `name (VARCHAR)`, `is_active (BOOL)`.
  - `reference_medications`: `id (UUID)`, `clinic_id (UUID)`, `name (VARCHAR)`, `is_active (BOOL)`.
  - `reference_surgeries`: `id (UUID)`, `clinic_id (UUID)`, `name (VARCHAR)`, `is_active (BOOL)`.
  - `reference_interactions`: `id (UUID)`, `clinic_id (UUID)`, `medication_a_id (UUID)`, `medication_b_id (UUID)`, `risk_note (TEXT)`, `is_active (BOOL)`.
  - `reference_contraindications`: `id (UUID)`, `clinic_id (UUID)`, `disease_id (UUID)`, `medication_id (UUID)`, `risk_note (TEXT)`, `is_active (BOOL)`.
- **Clinical Cross-Referencing Algorithm**:
  - Automatic cross-referencing between a patient's active medication and disease profiles against known interaction and contraindication tables, generating immediate `PatientFlag` warning banners.
- **DENTE Port Mapping**: `apps/web/src/components/diagnostics/` and `packages/shared/src/emr/emrProtocolEngine.ts`.

---

### Module 17: `medication_catalog`
- **Location**: `backend/app/modules/medication_catalog/`
- **Files**: `__init__.py`, `router.py`, `schemas.py`, `service.py`, `models.py`, `seed.py`, `tools.py`
- **Subsystem Purpose**: Dental formulary database containing 56 core dental pharmaceutical agents across 8 therapeutic classes.
- **The 56 Core Dental Pharmaceutical Formularies Extracted**:
  1. *Antibiotics*: Amoxicillin (500mg), Amoxicillin/Clavulanate (875/125mg), Penicillin V (500mg), Metronidazole (250mg, 500mg), Azithromycin (500mg), Clarithromycin (500mg), Clindamycin (300mg), Cephalexin (500mg), Doxycycline (100mg), Ciprofloxacin (500mg), Erythromycin (500mg).
  2. *Analgesics / NSAIDs*: Paracetamol (500mg, 1g), Ibuprofen (400mg, 600mg), Naproxen (250mg), Diclofenac potassium (50mg), Aceclofenac (100mg), Ketorolac (10mg), Tramadol (50mg), Paracetamol/Codeine (500/30mg).
  3. *Local Anesthetics*: Lidocaine 2% + Epinephrine 1:100,000, Articaine 4% + Epinephrine 1:100,000, Mepivacaine 3%, Prilocaine 3%, Bupivacaine 0.5% + Epinephrine 1:200,000, Benzocaine 20% topical gel.
  4. *Emergency Kit*: Adrenaline (Epinephrine 1mg/ml), Salbutamol (100mcg spray), Glyceryl trinitrate (400mcg spray), Aspirin (300mg), Glucose oral gel 40%, Chlorphenamine (10mg/ml).
  5. *Corticosteroids*: Dexamethasone (4mg), Prednisolone (5mg), Triamcinolone acetonide 0.1% oral paste, Hydrocortisone 1% cream.
  6. *Antifungals / Antivirals*: Miconazole 2% oral gel, Nystatin 100,000 U/ml suspension, Fluconazole (150mg), Aciclovir (200mg tab, 5% cream), Valaciclovir (500mg).
  7. *Oral Antiseptics & Care*: Chlorhexidine 0.2%, Benzydamine 0.15%, Sodium fluoride varnish 5%, Potassium nitrate 5%, Carbamide peroxide 10%, Povidone-iodine 1%, Sodium chloride 0.9%, Hydrogen peroxide 1.5%.
  8. *GI / Antihistamines*: Omeprazole (20mg), Ondansetron (4mg), Loratadine (10mg), Diphenhydramine (25mg).
- **DENTE Port Mapping**: `apps/web/src/components/prescriptions/` and `packages/shared/src/documents/forms107_1u.ts`.

---

### Module 18: `migration_import`
- **Location**: `backend/app/modules/migration_import/`
- **Files**: `__init__.py`, `router.py`, `schemas.py`, `service.py`, `parsers/`
- **Subsystem Purpose**: Legacy dental software database migration parsers (Gesden, Infomed, generic CSV).
- **Database Schema**:
  - `migration_batches`: `id (UUID)`, `clinic_id (UUID)`, `source_system (VARCHAR)`, `status (VARCHAR)`, `records_imported (JSONB)`, `errors (JSONB)`.
- **DENTE Port Mapping**: `packages/shared/src/migration.ts` (alongside DENTE's Dental4Windows, IDENT, and Infodent parsers).

---

### Module 19: `notifications`
- **Location**: `backend/app/modules/notifications/`
- **Files**: `__init__.py`, `router.py`, `schemas.py`, `service.py`, `models.py`, `adapters/`
- **Subsystem Purpose**: Multi-channel notification pipeline (SMS, Email SMTP, WhatsApp, Webhooks) with template rendering.
- **Database Schema**:
  - `notification_logs`: `id (UUID)`, `clinic_id (UUID)`, `recipient (VARCHAR)`, `channel (ENUM: email, sms, whatsapp, push)`, `template_key (VARCHAR)`, `status (ENUM: queued, sent, delivered, failed)`, `error_message (TEXT)`.
- **DENTE Port Mapping**: `apps/api/src/services/communications/` and `apps/web/src/components/notifications/`.

---

### Module 20: `odontogram`
- **Location**: `backend/app/modules/odontogram/`
- **Files**: `__init__.py`, `router.py`, `schemas.py`, `service.py`, `models.py`, `constants.py`, `frontend/`
- **Subsystem Purpose**: Interactive 2D dental chart, FDI tooth numbering (11–48, 51–85), surface-level condition overlays, pediatric/adult toggle.
- **Constants & Structure**:
  - Permanent dentition: 32 teeth (11–48).
  - Primary dentition: 20 teeth (51–85).
  - Surfaces: Occlusal/Incisal (O/I), Mesial (M), Distal (D), Vestibular/Buccal (V/B), Lingual/Palatal (L/P).
- **DENTE Port Mapping**: `apps/web/src/components/odontogram/` (enhanced in DENTE with 5-surface 3D renderers, root canal morphology, and implant ISQ).

---

### Module 21: `patient_relationships`
- **Location**: `backend/app/modules/patient_relationships/`
- **Files**: `__init__.py`, `router.py`, `schemas.py`, `service.py`, `models.py`
- **Subsystem Purpose**: Family ties, legal guardian links, financial guarantor linkages, and pediatric parent-child accounts.
- **Database Schema**:
  - `patient_relationships`: `id (UUID)`, `clinic_id (UUID)`, `patient_a_id (UUID)`, `patient_b_id (UUID)`, `relationship_type (ENUM: parent, child, spouse, sibling, legal_guardian, guarantor, other)`, `is_financial_guarantor (BOOL)`.
- **DENTE Port Mapping**: `packages/shared/src/finance/familyDeposit.ts` and `packages/shared/src/fiscal/familyFiscalBillingEngine.ts`.

---

### Module 22: `patient_timeline`
- **Location**: `backend/app/modules/patient_timeline/`
- **Files**: `__init__.py`, `router.py`, `schemas.py`, `service.py`
- **Subsystem Purpose**: Unified chronological aggregation of all patient events (appointments, clinical notes, payments, media uploads, signed estimates).
- **DENTE Port Mapping**: `apps/web/src/components/patient/` patient history timeline.

---

### Module 23: `patients`
- **Location**: `backend/app/modules/patients/`
- **Files**: `__init__.py`, `router.py`, `schemas.py`, `service.py`, `models.py`, `search.py`
- **Subsystem Purpose**: Patient master demographics, identity document verification, contact details, and marketing attribution.
- **Database Schema**:
  - `patients`: `id (UUID)`, `clinic_id (UUID)`, `first_name (VARCHAR)`, `last_name (VARCHAR)`, `national_id (VARCHAR)`, `birth_date (DATE)`, `gender (VARCHAR)`, `email (VARCHAR)`, `phone (VARCHAR)`, `address (TEXT)`, `emergency_contact (VARCHAR)`, `is_active (BOOL)`.
- **DENTE Port Mapping**: `apps/api/src/services/patients/` and `apps/web/src/components/patients/`.

---

### Module 24: `patients_clinical`
- **Location**: `backend/app/modules/patients_clinical/`
- **Files**: `__init__.py`, `router.py`, `schemas.py`, `service.py`, `models.py`
- **Subsystem Purpose**: Patient clinical baseline: general anamnesis, active allergy list, current systemic medications, and medical risk alerts.
- **Database Schema**:
  - `patient_allergies`: `id (UUID)`, `patient_id (UUID)`, `reference_id (UUID)`, `custom_name (VARCHAR)`, `severity (VARCHAR)`.
  - `patient_systemic_diseases`: `id (UUID)`, `patient_id (UUID)`, `reference_id (UUID)`, `custom_name (VARCHAR)`.
  - `patient_current_medications`: `id (UUID)`, `patient_id (UUID)`, `reference_id (UUID)`, `custom_name (VARCHAR)`, `dosage (VARCHAR)`.
- **DENTE Port Mapping**: `apps/web/src/components/emr/` and `packages/shared/src/emr/emrProtocolEngine.ts`.

---

### Module 25: `payments`
- **Location**: `backend/app/modules/payments/`
- **Files**: `__init__.py`, `router.py`, `schemas.py`, `service.py`, `models.py`, `ledger.py`
- **Subsystem Purpose**: Multi-method patient payment ledger (Cash, Card, Bank Transfer, Deposit Balance) and patient account balance calculation.
- **Database Schema**:
  - `payments`: `id (UUID)`, `clinic_id (UUID)`, `patient_id (UUID)`, `invoice_id (UUID, nullable)`, `amount (DECIMAL)`, `payment_method (ENUM: cash, card, transfer, deposit, link)`, `payment_date (TIMESTAMPTZ)`, `notes (TEXT)`.
- **DENTE Port Mapping**: `packages/shared/src/fiscal/` and `apps/api/src/services/finance/`.

---

### Module 26: `periodontogram` (Extracted & Ported)
- **Location**: `backend/app/modules/periodontogram/`
- **Files**: `__init__.py`, `router.py`, `schemas.py`, `service.py`, `models.py`, `constants.py`, `indices.py`, `lifecycle.py`, `frontend/`
- **Subsystem Purpose**: 6-point periodontal probing examination, SEPA indices, pocket depth heatmaps, BOP/PI ratios, and Miller mobility / Hamp furcation staging.
- **Clinical Formulas & Mathematical Invariants**:
  1. **Theoretical Site Anchoring**:
     $$\text{Total Sites} = 6 \times N_{\text{present teeth}}$$
     *(Unmeasured sites in a partial exam count as 0 to prevent artificial inflation).*
  2. **Bleeding on Probing (BOP %)**:
     $$\text{BOP}_{\text{SEPA}} \% = 100 \times \frac{\sum \text{Sites with BOP}}{\text{Total Theoretical Sites}}$$
     $$\text{BOP}_{\text{Probed}} \% = 100 \times \frac{\sum \text{Sites with BOP}}{N_{\text{probed sites}}}$$
  3. **Plaque Index (PI % / O'Leary PCR %)**:
     $$\text{PCR} \% = 100 \times \frac{\sum \text{Sites with Plaque}}{\text{Total Evaluated Sites}}$$
  4. **Clinical Attachment Level (CAL)**:
     $$\text{CAL} = \max(0, \text{Probing Depth (PD)} + \text{Gingival Margin (GM)})$$
     - $\text{GM} > 0$ (Recession): $\text{CAL} = \text{PD} + \text{GM}$.
     - $\text{GM} = 0$ (Normal): $\text{CAL} = \text{PD}$.
     - $\text{GM} < 0$ (Hyperplasia): $\text{CAL} = \max(0, \text{PD} + \text{GM})$.
  5. **Deep Pocket Count**:
     $$\text{Count} = \left| \{ t \in \text{Teeth}_{\text{present}} \mid \exists s \in \text{Sites}(t) : \text{PD}(s) \ge 5\text{ mm} \} \right|$$
  6. **Probing Depth Heatmap Tonal Scale**:
     - $\text{PD} \le 3\text{ mm} \implies \text{Success / Emerald (Norm)}$
     - $\text{PD} = 4\text{ mm} \implies \text{Warning-Low / Amber (Initial pocket)}$
     - $\text{PD} \in [5, 6]\text{ mm} \implies \text{Warning-High / Orange (Moderate pocket)}$
     - $\text{PD} \ge 7\text{ mm} \implies \text{Error / Rose (Severe pocket)}$
- **DENTE Port Mapping**: Fully ingested and verified in `packages/shared/src/perio/` (`sepaIndices.ts`, `oleary.ts`, `math.ts`, `pra.ts`, `psr.ts`, `grading.ts`).

---

### Module 27: `recall_reminders`
- **Location**: `backend/app/modules/recall_reminders/`
- **Files**: `__init__.py`, `router.py`, `schemas.py`, `service.py`, `tasks.py`
- **Subsystem Purpose**: Automated background scheduler for hygiene, periodontal maintenance, and implant checkup reminders.
- **DENTE Port Mapping**: `apps/api/src/services/communications/` and `apps/web/src/components/recalls/`.

---

### Module 28: `recalls`
- **Location**: `backend/app/modules/recalls/`
- **Files**: `__init__.py`, `router.py`, `schemas.py`, `service.py`, `models.py`
- **Subsystem Purpose**: Clinical recall protocol rules, recall interval assignment (3, 6, 12 months) based on periodontal risk level (PRA).
- **Database Schema**:
  - `recalls`: `id (UUID)`, `clinic_id (UUID)`, `patient_id (UUID)`, `recall_type (VARCHAR)`, `interval_months (INT)`, `due_date (DATE)`, `status (ENUM: pending, contacted, scheduled, completed, dismissed)`.
- **DENTE Port Mapping**: `apps/web/src/components/recalls/`.

---

### Module 29: `reports`
- **Location**: `backend/app/modules/reports/`
- **Files**: `__init__.py`, `router.py`, `schemas.py`, `service.py`, `aggregations.py`
- **Subsystem Purpose**: Clinic management reporting: gross production by doctor, procedure profitability, chair occupancy rate, patient acquisition channels.
- **DENTE Port Mapping**: `apps/api/src/services/reports/` and `apps/web/src/components/reports/`.

---

### Module 30: `schedules`
- **Location**: `backend/app/modules/schedules/`
- **Files**: `__init__.py`, `router.py`, `schemas.py`, `service.py`, `models.py`
- **Subsystem Purpose**: Staff working hours, doctor shift rotations, operatory room availability, and vacation planning.
- **Database Schema**:
  - `doctor_schedules`: `id (UUID)`, `clinic_id (UUID)`, `doctor_id (UUID)`, `day_of_week (INT: 0..6)`, `start_time (TIME)`, `end_time (TIME)`, `operatory_id (UUID)`.
- **DENTE Port Mapping**: `packages/shared/src/finance/timesheetT13.ts` and `apps/api/src/services/scheduling/`.

---

### Module 31: `staff_tasks`
- **Location**: `backend/app/modules/staff_tasks/`
- **Files**: `__init__.py`, `router.py`, `schemas.py`, `service.py`, `models.py`
- **Subsystem Purpose**: Internal clinic task management, patient follow-up checklists, administrative assignments, and due-date escalations.
- **Database Schema**:
  - `staff_tasks`: `id (UUID)`, `clinic_id (UUID)`, `assigned_to (UUID)`, `patient_id (UUID, nullable)`, `title (VARCHAR)`, `description (TEXT)`, `priority (ENUM: low, normal, high, urgent)`, `status (ENUM: pending, in_progress, completed, cancelled)`, `due_date (TIMESTAMPTZ)`.
- **DENTE Port Mapping**: `apps/web/src/components/crm/`.

---

### Module 32: `treatment_consumables`
- **Location**: `backend/app/modules/treatment_consumables/`
- **Files**: `__init__.py`, `router.py`, `schemas.py`, `service.py`, `models.py`, `hooks.py`
- **Subsystem Purpose**: Automated inventory decrement triggers upon treatment completion based on procedure bill of materials (технологические карты).
- **Database Schema**:
  - `treatment_consumable_rules`: `id (UUID)`, `catalog_item_id (UUID)`, `inventory_item_id (UUID)`, `default_quantity (DECIMAL)`.
- **DENTE Port Mapping**: `apps/api/src/services/inventory/`.

---

### Module 33: `treatment_plan`
- **Location**: `backend/app/modules/treatment_plan/`
- **Files**: `__init__.py`, `router.py`, `schemas.py`, `service.py`, `models.py`, `phases.py`
- **Subsystem Purpose**: Multi-specialty clinical treatment plans, multi-phase execution (Therapy -> Perio -> Surgery -> Ortho -> Prosthetics), stage acceptance.
- **Database Schema**:
  - `treatment_plans`: `id (UUID)`, `clinic_id (UUID)`, `patient_id (UUID)`, `title (VARCHAR)`, `status (ENUM: active, completed, cancelled)`, `created_at (TIMESTAMPTZ)`.
  - `treatment_plan_phases`: `id (UUID)`, `plan_id (UUID)`, `phase_order (INT)`, `name (VARCHAR)`, `status (ENUM: pending, in_progress, completed)`.
  - `treatment_plan_items`: `id (UUID)`, `phase_id (UUID)`, `catalog_item_id (UUID)`, `tooth_number (INT, nullable)`, `surfaces (VARCHAR, nullable)`, `status (ENUM: proposed, accepted, in_progress, completed)`.
- **DENTE Port Mapping**: `apps/web/src/components/treatment-plans/` and `apps/api/src/services/clinical/`.

---

### Module 34: `verifactu`
- **Location**: `backend/app/modules/verifactu/`
- **Files**: `__init__.py`, `router.py`, `schemas.py`, `service.py`, `models.py`, `chaining.py`
- **Subsystem Purpose**: Spanish Anti-Fraud Tax Law (Ley Antifraude / TicketBAI) invoice chaining, SHA-256 rolling cryptographic hashing, and QR generation.
- **Chaining Algorithm**:
  $$\text{Hash}_N = \text{SHA256}(\text{IssuerTaxId} \parallel \text{Series} \parallel \text{Number} \parallel \text{Date} \parallel \text{Total} \parallel \text{Hash}_{N-1})$$
- **DENTE Port Mapping**: Architectural reference for audit-proof hash chaining (analogous to DENTE's FFD 1.2 fiscal signature engine in `packages/shared/src/fiscal/`).

---

### Module 35: `whatsapp_kapso`
- **Location**: `backend/app/modules/whatsapp_kapso/`
- **Files**: `__init__.py`, `router.py`, `schemas.py`, `service.py`, `channel.py`, `tasks.py`, `frontend/`
- **Subsystem Purpose**: WhatsApp Meta Cloud API channel adapter via Kapso gateway, webhook delivery verification, template interpolation, interactive button menus.
- **Database Schema**:
  - `whatsapp_conversations`: `id (UUID)`, `clinic_id (UUID)`, `patient_id (UUID)`, `wa_phone (VARCHAR)`, `last_message_at (TIMESTAMPTZ)`.
  - `whatsapp_messages`: `id (UUID)`, `conversation_id (UUID)`, `direction (ENUM: inbound, outbound)`, `type (ENUM: text, template, image, document, interactive)`, `body (TEXT)`, `status (ENUM: sent, delivered, read, failed)`, `wa_message_id (VARCHAR)`.
- **DENTE Port Mapping**: `apps/api/src/services/messaging/` and `apps/web/src/components/chat/`.

---

## 3. Master Clinical Reference & Diagnostic Mappings

### 3.1 56-Item Core Dental Formulary Database
| Class | Molecule / Strength | Form | Prescription Required | Primary Clinical Indication |
|---|---|---|---|---|
| Antibiotic | Amoxicillin 500 mg | Capsule | Yes | Odontogenic infection, abscess, first-line coverage |
| Antibiotic | Amoxicillin/Clavulanate 875/125 mg | Tablet | Yes | Severe infection, refractory periodontitis, beta-lactamase coverage |
| Antibiotic | Metronidazole 250 mg / 500 mg | Tablet | Yes | Anaerobic coverage, ANUG, combined periodontal therapy |
| Antibiotic | Clindamycin 300 mg | Capsule | Yes | Penicillin-allergic patients, bone penetration |
| Antibiotic | Azithromycin 500 mg | Tablet | Yes | Short-course therapy, penicillin allergy |
| Analgesic | Ibuprofen 400 mg / 600 mg | Tablet | No (400mg) / Yes (600mg) | Post-extraction pain, pulpitis inflammation |
| Analgesic | Paracetamol 500 mg / 1 g | Tablet | No | Mild-to-moderate pain, gastric-ulcer safe |
| Analgesic | Ketorolac 10 mg | Tablet | Yes | Severe acute post-surgical dental pain |
| Analgesic | Tramadol 50 mg | Capsule | Yes | Severe refractory neuropathic or post-op pain |
| Anesthetic | Articaine 4% + Epinephrine 1:100,000 | Injection | Yes | Infiltration & mandibular nerve block, high bone diffusion |
| Anesthetic | Lidocaine 2% + Epinephrine 1:100,000 | Injection | Yes | Standard local infiltration |
| Anesthetic | Mepivacaine 3% plain | Injection | Yes | Cardiac patients, epinephrine-contraindicated cases |
| Emergency | Adrenaline (Epinephrine) 1 mg/ml | Injection | Yes | Anaphylaxis, acute cardiovascular collapse |
| Antiseptic | Chlorhexidine 0.2% | Mouthwash | No | Pre-surgical rinse, post-implant hygiene, plaque control |

### 3.2 Medical Cross-Referencing & Somatic Risk Rules
1. **Drug-Drug Interaction Rules**:
   - `Metronidazole` $\times$ `Warfarin / Oral Anticoagulants` $\implies$ Potentiation of INR, acute hemorrhage risk.
   - `NSAIDs (Ibuprofen, Ketorolac)` $\times$ `ACE Inhibitors / Diuretics` $\implies$ Acute nephrotoxicity and antihypertensive attenuation.
   - `Epinephrine (1:100,000)` $\times$ `Non-selective Beta-Blockers` $\implies$ Severe hypertensive crisis with reflex bradycardia.
2. **Drug-Disease Contraindications**:
   - `Epinephrine` $\times$ `Uncontrolled Hyperthyroidism / Recent MI (< 6 mo)` $\implies$ Absolute contraindication for vasoconstrictors.
   - `NSAIDs` $\times$ `Active Peptic Ulcer Disease / Severe Renal Impairment` $\implies$ Absolute contraindication; switch to Paracetamol.
   - `Bisphosphonates (Alendronate, Zoledronate)` $\times$ `Dental Extractions / Implants` $\implies$ Medication-Related Osteonecrosis of the Jaw (MRONJ) risk protocol.

---

## 4. Verification & Quality Assurance Gate

All ported algorithms in `@dental/shared` and `@dental/web` were compiled and verified via machine test suites:
- **TypeScript Static Verification**: `npm run typecheck` $\implies$ `Exit Code 0` (0 errors across `@dental/shared`, `@dental/api`, `@dental/web`).
- **Node.js Automated Test Suites**: `npm test -w @dental/shared` $\implies$ `718/718 tests passing` (including full suites for `sepaIndices`, `oleary`, `psr`, `pra`, `grading`, `crdt`, `kopecksArithmetic`, `mdlp`).
- **Encoding Compliance**: All files saved in standard UTF-8.
