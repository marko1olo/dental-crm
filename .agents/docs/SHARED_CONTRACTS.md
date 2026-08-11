# Shared Contracts & Infrastructure (`packages/shared/src`)

The `shared` package is the central repository for domain models, validation schemas (Zod), and utility functions. It enforces data consistency between the API, the database, and the frontend client.

## Core Principles
1. **Single Source of Truth**: Rules like FDI tooth numbering (`VALID_FDI_TOOTH_NUMBERS`) and financial validation exist here to avoid duplicated logic and sync issues between frontend and backend.
2. **Strict Financials (Kopecks)**: To prevent floating point arithmetic losses, money is stored and computed in kopecks (integers). The system bans fractional pennies.

## Key Modules

### 1. Money Engine (`money.ts` & `utils/money.ts`)
Avoids floating-point math issues (`0.1 + 0.2`). Money logic operates on integers (kopecks) up to `2^53` and correctly serializes to PostgreSQL's `numeric(12, 2)`.

- **Key Schemas**: `moneyRubSchema` (ensures precision exactly to a kopeck), `positiveMoneyRubSchema`, `nonNegativeMoneyRubSchema`.
- **Core Types**: `Kopecks` (number alias, always integer).
- **Core Utils**: 
  - `parseKopecks()`: Parses database strings safely without `parseFloat`.
  - `splitKopecks()`: Divides sums perfectly, distributing remainders into the first parts (e.g., 100/3 = 34, 33, 33).
  - `kopecksToNumericString()`: Converts kopecks back to `numeric` compatible string.
  - `percentageOfKopecks()`: Handles basis points (1% = 100 bp).
  - `sumKopecks()`, `multiplyKopecks()`, `kopecksToWholeRubles()`.

### 2. Migration Engine (`migration.ts`)
Defines the schema for the data import and validation tool from legacy systems.

- **Status & Routing Enums**: `MigrationRunStatus`, `MigrationSourceKind`, `MigrationEntityKind`, `MigrationQuarantineReason`.
- **Mapping Contracts**: `MigrationTargetField`, `MigrationFieldLineage`, `MigrationColumnMapping` (records the history of how a column was mapped, by whom, and its confidence).
- **Checks & Reporting**: `MigrationReconciliationReport` guarantees row-count and exact-kopeck monetary preservation (`sourceMoneyTotalRub`, `loadedMoneyTotalRub`). API payload schemas for analyzing and rolling back runs.

### 3. Core Domain Schemas (`index.ts`)
The `index.ts` file (~11,300 lines) is a massive aggregate of domain entities and state machines.

- **Patient & Visit Models**: `patientStatusSchema`, `appointmentStatusSchema`, `visitStatusSchema`.
- **Clinical Contracts**:
  - `fdiToothNumberSchema`: Strict list of allowed adult and baby teeth (FDI ISO 3950). Rejects invalid teeth (e.g., `19`, `30`).
  - `clinicalToothRowSchema`, `treatmentPlanPayloadSchema`.
  - Structured documentation templates: `outpatientMedicalCard025uPayloadSchema`, `dentalMedicalCard043uPayloadSchema`.
- **Documents & Workflows**: 
  - `documentKindSchema` (lists 30+ official forms and clinical templates).
  - Metadata linking documents to their legal basis (e.g., Минздрав N 1051н, ФНС КНД 1151156) with `documentKindSourceUrls` and `DocumentKindSourceMetadata`.
- **Clinic Resources**: `clinicProfileSchema`, `staffMemberSchema`, `chairSchema`, `shiftIntelligenceSchema` (workload/schedule state).
- **Pricelist & Services**: `serviceCatalogItemSchema`, `dentalPricelistItemSchema`, and speech recognition gateway endpoints/status schemas (`SpeechTranscriptionChunk`).

### 4. Utilities (`utils/*.ts`)
- **Strings (`strings.ts`)**: Fast CSV parsing (`splitLine`), and exact Russian document format checkers (`isValidRussianSnils`, `isValidRussianInn`, `isValidRussianPassport`).
- **Dates (`dates.ts`)**: `normalizeDate` to convert incomplete `D/M/YYYY` or `DD.MM.YYYY` into standard `YYYY-MM-DD`.
