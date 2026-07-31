# Complete Audit & Reconnaissance Report: Requirement R2 (Clinical Seed Expansion & Realistic Demo Data)

**Target Scope**: Milestone 1 - Reconnaissance on Requirement R2  
**Working Directory**: `C:\Clinic_MVP\dental-crm\.agents\explorer_m1_r2`  
**Date**: 2026-07-31  

---

## Executive Summary

This reconnaissance audit evaluates the existing seed data, database schema (Drizzle ORM over PostgreSQL 18), TypeScript type contracts, state JSON files, and route generators for clinical, administrative, and financial records in DENTE Dental CRM.

Key Findings:
1. **Existing Prototype State (`apps/api/.data/dental-crm-state.json`)**: Contains only **3 patients**, all with `administrativeProfile: null`. It has minimal appointments (3), documents (3), payments (1), and active visits (1).
2. **Screenshot Demo Seed (`apps/api/src/scripts/seedOpsScreenshotDemo.ts`)**: Populates 14 patients under organization `d0000000-0000-4000-8000-00000000d001`. However, these entries populate only basic columns (`fullName`, `birthDate`, `phone`, `email`). They **lack** `administrativeProfile` (passport, INN, SNILS, OMS/DMS, addresses, legal representative info) and lack complete clinical EMK records, tooth formulas, work acts, 54-FZ fiscal receipt details, NDFL KND 1151156 tax payloads, and EGISZ CDA snapshots.
3. **Schema Readiness**: The database schema (`apps/api/src/db/schema.ts`) and shared types (`packages/shared/src/index.ts`) already support all required clinical and administrative fields (including `administrativeProfile` JSONB, FDI tooth formula `tooth_states`, EMK `visits`, `generated_documents` with `completed_works_act`, 54-FZ details in `payments`, NDFL KND 1151156 XML generator `taxXml.ts`, and EGISZ CDA R2 generator `egiszCdaGenerator.ts`).
4. **Actionable Roadmap**: To expand seed data to **at least 15 complete realistic patients**, a comprehensive seed expansion spec must be populated with full demographic profiles, multi-specialty EMK visits, FDI tooth formula histories (teeth 11-48), 54-FZ fiscal receipts, work acts, NDFL KND 1151156 certificates, and EGISZ CDA XML export compatibility.

---

## 1. Audit of Existing Seed Scripts & State Files

### 1.1 `apps/api/.data/dental-crm-state.json`
- **Purpose**: File-based persistence storage loaded by `loadPersistentState()` in `apps/api/src/persistentState.ts:238` and migrated to PostgreSQL via `apps/api/src/scripts/migrateStateToDb.ts:57`.
- **Current Inventory**:
  - **Patients**: 3 entries (`Иванова Марина Сергеевна`, `Петров Алексей Николаевич`, `Садыкова Эльмира Рустамовна`).
  - **Administrative Profiles**: `administrativeProfile: null` for all 3 patients.
  - **Appointments**: 3 entries.
  - **Documents**: 3 entries.
  - **Payments**: 1 entry.
  - **Visits**: 1 active visit (patient `3ebb4567-7777-4f19-8c23-2a78c9962796`).

### 1.2 `apps/api/src/scripts/seedOpsScreenshotDemo.ts`
- **Purpose**: Dedicated seed script to create demo organization `d0000000-0000-4000-8000-00000000d001` ("Демо-клиника для снимков") for UI testing and visual screenshot audits.
- **Current Inventory**:
  - **Patients (14 total)**:
    - 2 duplicate testing entries (`DUPLICATE_REAL` орлова марина петровна, `DUPLICATE_KIN` Орлов Кирилл Сергеевич)
    - 4 recall testing entries (`RECALL_DUE`, `RECALL_OVERDUE`, `RECALL_LOST`, `RECALL_NEVER`)
    - 8 main list entries (`PATIENT_NAMES`: Орлова М.П., Ковалёв С.И., Белкина А.Д., Тихонов А.О., Савельева О.И., Громов И.А., Юдина Е.Л., Панфилов Р.В.)
  - **Deficiencies**:
    - None of the 14 patients have `administrativeProfile` populated (Passport, INN, SNILS, OMS/DMS, addresses are all null/missing).
    - `visits` and `treatmentItems` are generated procedurally (lines 446-497) without rich clinical narrative (complaint, anamnesis, objective status, ICD-10 diagnosis).
    - No `tooth_states` (odontogram) records are seeded.
    - No `generated_documents` (completed works acts, contracts, consents) are seeded.
    - Payments populate `amountRub` but lack detailed 54-FZ fiscal receipt metadata (`fiscalReceiptNumber`, `fiscalReceipt`, `fiscalReceiptUrl`).
    - No NDFL certificates (`tax_deduction_certificate` / KND 1151156) are seeded.
    - No EGISZ CDA XML snapshots are available.

### 1.3 Other Seed Scripts (`apps/api/src/scripts/`)
- `seedAuth.ts`: Creates default admin/doctor users and PIN hashes.
- `seedPglite.ts`: Test utility for Pglite (Note: Pglite is NOT used in production; Drizzle operates over native PostgreSQL 18 on `127.0.0.1:5432`).
- `seedTemplates.ts`: Populates protocol templates and communication message templates.

---

## 2. Patient Schema & Fields Audit (Passport, SNILS, OMS, DMS)

### 2.1 Database Schema (`apps/api/src/db/schema.ts`)
The `patients` table is defined at line 426:
```typescript
export const patients = pgTable("patients", {
  id: uuid("id").primaryKey().defaultRandom(),
  organizationId: uuid("organization_id").notNull().references(() => organizations.id),
  status: patientStatus("status").notNull().default("active"),
  fullName: text("full_name").notNull(),
  birthDate: text("birth_date"),
  phone: text("phone"),
  email: text("email"),
  notes: text("notes"),
  administrativeProfile: jsonb("administrative_profile").$type<PatientAdministrativeProfile | null>(),
  familyGroupId: uuid("family_group_id"),
  mergedIntoPatientId: uuid("merged_into_patient_id"),
  isSynced: boolean("is_synced").notNull().default(false),
  version: integer("version").notNull().default(1),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow()
});
```

### 2.2 `PatientAdministrativeProfile` TypeScript Contract (`packages/shared/src/index.ts:2580`)
All administrative, identification, and insurance details are encapsulated inside `administrativeProfile` JSONB column:

```typescript
const patientAdministrativeProfileBaseSchema = z.object({
  identityDocument: z.string().trim().max(240).nullable().default(null),
  taxpayerInn: z.string().trim().regex(/^\d{10}$|^\d{12}$/).nullable().default(null),
  registrationAddress: patientAdministrativeTextSchema,
  residentialAddress: patientAdministrativeTextSchema,
  insurancePolicyNumber: z.string().trim().max(120).nullable().default(null),
  snils: z.string().trim().max(40).nullable().default(null),
  legalRepresentativeFullName: z.string().trim().max(240).nullable().default(null),
  legalRepresentativeRelationship: z.string().trim().max(120).nullable().default(null),
  legalRepresentativeIdentityDocument: z.string().trim().max(240).nullable().default(null),
  legalRepresentativePhone: z.string().trim().max(80).nullable().default(null),
  preferredDocumentRecipient: z.string().trim().max(240).nullable().default(null),
  preferredAppointmentWeekdays: z.array(weekdayIndexSchema).max(7).default([]),
  preferredAppointmentStart: clockTimeSchema.nullable().default(null),
  preferredAppointmentEnd: clockTimeSchema.nullable().default(null),
  preferredAppointmentNote: patientAdministrativeTextSchema,
  dataProcessingBasisNote: patientAdministrativeTextSchema,
  orthodonticProgress: patientAdministrativeTextSchema
});
```

### 2.3 Field Specification Mapping

| Domain Field | Target Column / Property | Standard Format & Example |
|---|---|---|
| **Passport (Паспорт РФ)** | `administrativeProfile.identityDocument` | `"Паспорт РФ 45 10 123456 выдан ГУ МВД России по г. Москве 15.05.2015 код 770-001"` |
| **INN (ИНН физлица)** | `administrativeProfile.taxpayerInn` | 12 digits: `"771234567890"` (validated by regex `/^\d{10}$|^\d{12}$/`) |
| **SNILS (СНИЛС)** | `administrativeProfile.snils` | `"123-456-789 01"` (normalized by `normalizeSnils` to 11 digits) |
| **OMS Policy (ОМС)** | `administrativeProfile.insurancePolicyNumber` | `"ЕНП 7700001234567890"` (16-digit unified policy) |
| **DMS Policy (ДМС)** | `administrativeProfile.insurancePolicyNumber` | `"ДМС СПАО ИНГОССТРАХ #77-889900/26"` |
| **Reg. Address (Регистрация)** | `administrativeProfile.registrationAddress` | `"125009, г. Москва, ул. Тверская, д. 12, кв. 45"` |
| **Res. Address (Проживание)** | `administrativeProfile.residentialAddress` | `"125009, г. Москва, ул. Ленина, д. 5, кв. 12"` |
| **Gender (Пол)** | `administrativeProfile.gender` (passthrough JSON property) | `"male"` \| `"female"` (read by `readGenderFromProfile` in `routes/egisz.ts:344`) |
| **Legal Rep (Представитель)** | `legalRepresentativeFullName`, `legalRepresentativeRelationship`, `legalRepresentativeIdentityDocument`, `legalRepresentativePhone` | Full details for pediatric/minor patients |

---

## 3. Audit of Clinical, Financial, and Administrative Schema & Generators

### 3.1 EMK Visits & Objective Findings (`visits` Table)
- **Schema Location**: `apps/api/src/db/schema.ts:484`
- **Fields**:
  - `status`: `"draft"` | `"signed"` | `"voided"`
  - `complaint`: Text (e.g., `"Жалобы на острую ноющую боль в области 36 зуба, усиливающуюся от горячего"`)
  - `anamnesis`: Text (e.g., `"Ранее зуб лечен по поводу кариеса 2 года назад. Боли появились 3 дня назад"`)
  - `objectiveStatus`: Text (e.g., `"Зуб 36: глубокая кариозная полость на окклюзионной поверхности, зондирование болезненно по всему дну, перкуссия слабоболезненна"`)
  - `diagnosis`: Text (Must include ICD-10 code, e.g., `"K04.0 Пульпит"`)
  - `treatmentPlan`: Text (e.g., `"Эндодонтическое лечение 36 зуба, обработка каналов, пломбирование Гуттаперчей"`)
  - `doctorSummary`: Text (e.g., `"Назначены анальгетики. Явка на повторный приём через 3 дня"`)
  - `signedAt`: Timestamp (Set when status is `"signed"`)

### 3.2 Tooth Formula Statuses (`tooth_states` Table)
- **Schema Location**: `apps/api/src/db/schema.ts:1707` & `apps/api/src/routes/odontogram.ts:74`
- **FDI Tooth Numbers**: 11-18, 21-28, 31-38, 41-48 (Permanent), 51-55, 61-65, 71-75, 81-85 (Pediatric).
- **Valid States (`toothStateValues`)**:
  - `"Caries"` (Кариес)
  - `"Pulpitis"` (Пульпит)
  - `"Missing"` (Отсутствует)
  - `"Crown"` (Коронка)
  - `"Implant"` (Имплантат)
  - `"Filled"` (Пломба)
  - `"Healthy"` (Здоров)
  - `"Planned_Implant"` (Планируемый имплантат)
- **Surfaces**: JSON array of string codes, e.g., `["O"]`, `["M", "D"]`, `["O", "V", "L"]`.
- **History Tracking**: `tooth_state_history` table (`schema.ts:1734`) records immutable audit logs of state transitions (`previousState`, `newState`, `changedByUserId`, `visitId`).

### 3.3 Completed Works Acts (Акты выполненных работ)
- **Schema Location**: `apps/api/src/db/schema.ts:202` (`documentKind` enum `"completed_works_act"`)
- **Payload Structure**: `generated_documents.payload_json`
  - `contractNumber`, `contractDate`
  - `actNumber`, `actDate`
  - `patientName`, `patientPassport`, `patientAddress`
  - `doctorName`, `clinicName`
  - `services`: Array of `{ code, title, quantity, unitPriceRub, totalRub }`
  - `totalAmountRub` (Exact to the kopeck)

### 3.4 54-FZ Fiscal Receipts (Фискальные чеки 54-ФЗ)
- **Schema Location**: `apps/api/src/db/schema.ts` (`payments` table)
- **Fields**:
  - `amountRub`: Numeric / Double precision (Exact to kopeck)
  - `method`: `"cash"` | `"card"` | `"bank_transfer"` | `"online"` | `"insurance"` | `"family_wallet"`
  - `status`: `"paid"` | `"planned"` | `"refunded"` | `"voided"`
  - `fiscalReceiptNumber`: Text (e.g., `"Чек № 00042"`)
  - `fiscalReceiptIssuedAt`: Timestamp
  - `fiscalReceiptUrl`: Text (e.g., `"https://fns.gov.ru/receipt/..."`)
  - `fiscalReceipt`: JSONB (`FiscalReceiptDetails` object: FN number, FD number, FPD sign, TAX mode, line items with NDS/VAT).

### 3.5 NDFL Tax Certificates (КНД 1151156 XML)
- **Schema & Logic**: `apps/api/src/documents/taxXml.ts` (`buildKnd1151156Xml`)
- **Standard**: FNS Russia form KND 1151156 (Form 1184043 version 5.01 per Order ЕА-7-11/824@) for tax deduction claims from tax year 2024 onwards.
- **Validation Rules**:
  - Requires 12-digit Taxpayer INN (`taxpayerInn`).
  - Distinguishes Code 1 (ordinary medical treatment) vs Code 2 (expensive medical treatment) in integer kopecks.
  - Generates valid XML structure with root `<Файл>` and FNS headers.

### 3.6 EGISZ CDA XML Snapshots (СЭМД ЕГИСЗ CDA R2)
- **Schema & Logic**: `apps/api/src/services/egiszCdaGenerator.ts` (`generateDentalCdaXml`) & `apps/api/src/routes/egisz.ts:214` (`GET /api/egisz/visits/:visitId/cda`)
- **CDA R2 Header & Body**:
  - Root OID template `1.2.643.5.1.13.13.11.1527` (Dental Examination Protocol).
  - Patient SNILS (`patientSnils` from `administrativeProfile.snils`).
  - Patient Gender (`patientGender` code: `"1"` for male, `"2"` for female, `"0"` for other/null).
  - ICD-10 Diagnosis code extracted via regex `/\b([A-ZА-Я]\d{2}(?:\.\d{1,2})?)\b/`.
  - Doctor SNILS and Name (`doctorSnils`, `doctorName`).
  - Structured XML sections for Diagnosis, Anamnesis, and Treatment Plan.

---

## 4. Requirements Gap & Seed Expansion Plan (15 Complete Realistic Patients)

To transition from the sparse 3-patient prototype state to a robust clinical dataset, **15 complete realistic patients** must be specified and seeded with all required records.

### 4.1 Proposed 15-Patient Diversity Matrix

| # | Patient Full Name | Gender | Age / Category | Primary Specialty / Scenario | Insurance |
|---|---|---|---|---|---|
| 1 | **Иванова Марина Сергеевна** | Female | 38 y.o. (Adult) | Therapy: Deep Caries & Pulpitis (36, 37) | OMS (ЕНП) |
| 2 | **Петров Алексей Николаевич** | Male | 47 y.o. (Adult) | Orthopedics & Prosthetics: Zirconia Crown (11, 12, 21) | DMS (Ингосстрах) |
| 3 | **Садыкова Эльмира Рустамовна** | Female | 29 y.o. (Adult) | Hygiene & Periodontics: AirFlow & Scaling | Self-pay |
| 4 | **Ковалёв Сергей Иванович** | Male | 52 y.o. (Adult) | Surgery & Implantology: Nobel Biocare Implant (46) | Self-pay |
| 5 | **Белкина Анна Дмитриевна** | Female | 14 y.o. (Minor) | Orthodontics: Bracket System & Aligners | Minor (Legal Rep: Mother) |
| 6 | **Тихонов Артём Олегович** | Male | 8 y.o. (Pediatric) | Pediatric Dentistry: Primary Tooth Caries (54, 64) | Minor (Legal Rep: Father) |
| 7 | **Савельева Ольга Игоревна** | Female | 64 y.o. (Senior) | Complex Prosthetics: Clasp Denture | OMS + Self-pay |
| 8 | **Громов Илья Андреевич** | Male | 35 y.o. (Adult) | Emergency Surgery: Tooth Extraction (38 Impacted Wisdom) | Self-pay |
| 9 | **Юдина Екатерина Львовна** | Female | 41 y.o. (Adult) | Endodontics & Microscopic Re-treatment (26) | DMS (СОГАЗ) |
| 10 | **Панфилов Роман Викторович** | Male | 31 y.o. (Adult) | Aesthetic Dentistry: Ceramic Veneers (13-23) | Self-pay |
| 11 | **Зорина Татьяна Львовна** | Female | 40 y.o. (Recall Due) | Preventative Care & OPG Imaging | OMS |
| 12 | **Лапин Егор Дмитриевич** | Male | 48 y.o. (Recall Overdue)| Periodontal Maintenance & Vector Therapy | Self-pay |
| 13 | **Ветрова Ирина Павловна** | Female | 59 y.o. (Recall Lost) | Complete Removable Denture Adjustment | Self-pay |
| 14 | **Сомов Артур Вадимович** | Male | 34 y.o. (Complex Debt) | Multi-stage Treatment Plan with Partial Payments | Self-pay |
| 15 | **Орлова Марина Петровна** | Female | 55 y.o. (Duplicate Demo) | Pre-op CBCT Scan & NDFL Deduction Applicant | Self-pay |

### 4.2 Record Requirements per Patient
Each of the 15 patients will be seeded with:
1. **Full `administrativeProfile`**:
   - Passport series/number/issuer/date/code
   - 12-digit Taxpayer INN
   - 11-digit SNILS
   - OMS or DMS policy number
   - Full Registration & Residential addresses
   - Gender ("male" or "female")
   - Legal representative details for minors (patients #5 and #6)
2. **Clinical EMK Visits (`visits`)**:
   - 1 to 3 completed and signed visits per patient.
   - Comprehensive complaint, anamnesis, objective status, ICD-10 diagnosis, and treatment plan.
3. **Tooth Formula (`tooth_states` 11-48)**:
   - Full FDI tooth states populated per patient matching their clinical scenario.
   - Associated `tooth_state_history` audit records.
4. **Works Acts (`generated_documents`)**:
   - At least 1 issued `"completed_works_act"` document per patient with itemized services matching price catalog.
5. **54-FZ Fiscal Receipts (`payments`)**:
   - Paid payments with full fiscal details (`fiscalReceiptNumber`, `fiscalReceiptIssuedAt`, `fiscalReceiptUrl`, 54-FZ JSON details).
6. **NDFL Tax Certificates (КНД 1151156)**:
   - `"tax_deduction_certificate"` documents generated for 2024/2025/2026 tax years.
7. **EGISZ CDA XML Snapshots**:
   - Verified XML export via `/api/egisz/visits/:visitId/cda`.

---

## 5. Verification & Proof Method

1. **Schema Integrity Check**:
   - Command: `npm run check:encoding`
   - Command: `npx tsc --noEmit -p apps/api/tsconfig.json`
2. **State & Seed Script Verification**:
   - Verify `apps/api/.data/dental-crm-state.json` parsing via read-only Node script.
   - Run seed dry-run checks against PostgreSQL database instance.
3. **EGISZ & NDFL XML Export Verification**:
   - Validate XML generation using `buildKnd1151156Xml()` and `generateDentalCdaXml()`.
