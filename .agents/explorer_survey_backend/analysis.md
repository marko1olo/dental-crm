# 🏛️ DENTE Backend Architecture & Refactoring Survey (R1 / TASK-1.3 & R2 / TASK-2.1–2.3)

**Document Version:** 1.0.0  
**Date:** 2026-08-16  
**Auditor Archetype:** Teamwork Preview Explorer (`explorer_survey_backend`)  
**Repository Scope:** `apps/api` (Fastify, Drizzle ORM, PostgreSQL 18)  
**Constitutional Authority:** `.agents/AGENTS.md` (Mandate 8b: Zero Mocks, Zero Sycophancy, Verified Line Numbers, Kopeck-Exact Accounting)

---

## 1. Executive Summary

This investigation provides a comprehensive architectural survey and technical blueprints for:
1. **R1 / TASK-1.3 (Fiscal Print Buffer):** Offline 54-FZ KKT resilience buffer (`fiscal_receipt_queue`), handling hardware timeouts without rolling back financial records, and implementing queue inspection/retry endpoints.
2. **R2 / TASK-2.1 (Drizzle Schema Decomposition):** Modularization of the 6,346-line monolithic `apps/api/src/db/schema.ts` (150 tables, 47 enums, 7 relations) into 10 domain sub-modules under `apps/api/src/db/schema/` with 100% backward-compatible root re-exports in `index.ts`.
3. **R2 / TASK-2.2 (Domain Service Layer Extraction):** Extraction of business logic from fat routes (`imaging.ts` 9,598 lines, `smartImports.ts` 8,512 lines, `diary.ts` 2,317 lines) into clean service classes under `apps/api/src/services/`.
4. **R2 / TASK-2.3 (PostgreSQL Background Jobs Queue):** Replacement of in-memory Node.js `setInterval` timers in `backupWorker.ts`, `biAnalyticsWorker.ts`, and `recallScheduler.ts` with a transactional job queue (`system_background_jobs`) utilizing `SELECT ... FOR UPDATE SKIP LOCKED` single-runner guarantees.

---

## 2. R1 / TASK-1.3: Fiscal Print Buffer Architecture

### 2.1. Current Implementation Audit
- **`apps/api/src/routes/sbpQr.ts` (`POST /api/billing/fiscalize-receipt` lines 232–564):**
  - Performs patient and invoice validation.
  - Checks idempotency against `payments.clientMutationId`.
  - Executes a single database transaction (`db.transaction` lines 348–546) locking patient (Level 3) and invoice, inserting `payments`, updating `generatedDocuments.status = 'issued'`, inserting `cashLedger`, and inserting `digitalReceiptDispatches`.
  - Simulates fiscal signing synchronously in memory via `computeFiscalSign` and `buildOfdVerificationUrl`.
  - **Defect:** If connected to a physical KKT (Atol/Shtrih-M) and the printer is offline, jammed, or unpowered, the entire request fails. If physical printing was attempted inside the transaction, network timeouts would hold database locks; if done after, print failures are untracked and receipts are lost.
- **`apps/api/src/routes/billing.ts` (`POST /api/billing/payments` lines 535–640) & `apps/api/src/db/billingQuery.ts` (`createPaymentInDb` lines 210–434):**
  - Validates overpayment against visit charges and document amounts.
  - Inserts `payments` record with `paidAt: defaultNow()` and updates document status.
  - **Defect:** Zero integration with physical fiscal printing queue. Cash desk operators have no mechanism to retry failed receipt prints.

### 2.2. Target Schema: `fiscal_receipt_queue`
To be added in `apps/api/src/db/schema/system.ts` (or `schema/billing.ts`) and exported via `apps/api/src/db/schema/index.ts`:

```typescript
export const fiscalReceiptQueue = pgTable(
	"fiscal_receipt_queue",
	{
		id: uuid("id").primaryKey().default(sql`uuidv7()`),
		organizationId: uuid("organization_id")
			.notNull()
			.references(() => organizations.id, { onDelete: "cascade" }),
		paymentId: uuid("payment_id")
			.notNull()
			.references(() => payments.id, { onDelete: "cascade" }),
		cashDeskId: varchar("cash_desk_id", { length: 64 }).notNull(),
		receiptPayload: jsonb("receipt_payload")
			.$type<{
				operationType: "income" | "income_return" | "expense" | "expense_return";
				taxationSystem: string;
				customerContact: string;
				cashierFullName: string;
				cashKopecks: number;
				electronicCardKopecks: number;
				sbpKopecks: number;
				prepaidKopecks: number;
				totalKopecks: number;
				taxDeductionSummaryCode: string;
				items: Array<{
					name: string;
					priceKopecks: number;
					quantity: number;
					amountKopecks: number;
					subject: string;
					method: string;
					vatRate: string;
					measure: string;
					medicalServiceCodeMzk?: string | null;
				}>;
			}>()
			.notNull(),
		status: varchar("status", { length: 32 })
			.$type<"pending_print" | "printed" | "hardware_offline" | "failed">()
			.notNull()
			.default("pending_print"),
		fiscalDocumentNumber: varchar("fiscal_document_number", { length: 64 }),
		fiscalStorageNumber: varchar("fiscal_storage_number", { length: 64 }),
		fiscalSign: varchar("fiscal_sign", { length: 64 }),
		errorMessage: text("error_message"),
		retryCount: integer("retry_count").notNull().default(0),
		createdAt: timestamp("created_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
		updatedAt: timestamp("updated_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
	},
	(table) => ({
		idxFiscalQueueOrgStatus: index("idx_fiscal_queue_org_status").on(
			table.organizationId,
			table.status,
		),
		idxFiscalQueuePayment: index("idx_fiscal_queue_payment").on(
			table.paymentId,
		),
	}),
);
```

### 2.3. Migration Specification
- Next migration file: `apps/api/drizzle/0171_fiscal_receipt_queue.sql`
- Journal update in `apps/api/drizzle/meta/_journal.json`:
  ```json
  {
    "idx": 171,
    "version": "7",
    "when": 1786982400000,
    "tag": "0171_fiscal_receipt_queue",
    "breakpoints": true
  }
  ```

### 2.4. Hardware Timeout & Non-Blocking Workflow
```
[POST /api/billing/fiscalize-receipt]
   │
   ├── 1. Begin DB Transaction
   │      ├── Lock Patient (Level 3) & Invoice
   │      ├── Insert `payments` (Status: paid)
   │      ├── Insert `cashLedger` & update `generatedDocuments`
   │      └── Insert `fiscal_receipt_queue` (Status: 'pending_print')
   ├── 2. Commit DB Transaction (Financial state is guaranteed!)
   │
   └── 3. Dispatch to Physical KKT Driver / Local Agent (with 5000ms timeout)
          ├── [SUCCESS] ──► UPDATE `fiscal_receipt_queue` SET status = 'printed',
          │                 fiscalDocumentNumber = ..., fiscalSign = ...
          │                 UPDATE `payments` SET fiscalReceiptNumber = ...
          │
          └── [TIMEOUT / OFFLINE] ──► UPDATE `fiscal_receipt_queue`
                                      SET status = 'hardware_offline',
                                          errorMessage = 'KKT connection timed out (5000ms)',
                                          retryCount = retryCount + 1
                                      (NO DB ROLLBACK! Payment remains intact)
```

### 2.5. API Endpoints Contract
1. **`GET /api/billing/fiscal-queue/pending`**
   - Headers: `x-dente-clinic-token` or JWT (`organizationId` resolved via `accessGuard`)
   - Query params: `cashDeskId?: string`
   - Response: `200 OK` with `{ items: FiscalQueueItem[], total: number }` (items where `status IN ('pending_print', 'hardware_offline')`).
2. **`POST /api/billing/fiscal-queue/:id/retry`**
   - Params: `id: string` (UUID)
   - Action: Loads queue item with `organizationId` compound check, attempts hardware dispatch. On success sets `printed`; on failure sets `hardware_offline` or `failed` and increments `retryCount`.
3. **`POST /api/billing/fiscal-queue/retry-all`**
   - Body: `{ cashDeskId?: string }`
   - Action: Iterates through pending/offline items sequentially for the cash desk, executing print dispatches.

---

## 3. R2 / TASK-2.1: Drizzle Schema Decomposition

### 3.1. Current Monolith Metrics
- Location: `apps/api/src/db/schema.ts`
- Total Lines: **6,346**
- File Size: **238 KB**
- Entities Census:
  - Tables (`pgTable`): **150**
  - Enums (`pgEnum`): **47**
  - Relations (`relations`): **7**
  - Type definitions & interfaces: 30+

### 3.2. Target Modular Structure (`apps/api/src/db/schema/`)
The decomposition divides the 150 tables into 10 domain sub-modules:

```
apps/api/src/db/schema/
├── index.ts              # 100% backward-compatible root re-exports
├── _common.ts            # Base enums, timestamp helpers, audit primitives
├── auth.ts               # 6 tables: organizations, clinics, users, userInvitations, portalOtpCodes, singleSessionEnforcements + 3 relations
├── patients.ts           # 16 tables: patients, patientConsents, patientDuplicateMergeQueues, familyGroups, familyRecommendationSources, patientArchiveReasonsAndBlacklists, recentPatientHistory, patientReclamations, dadataGeocodedAddresses, loyaltyPrograms, patientBonusBalances, bonusTransactions, referralCampaigns, patientReferralCodes, patientReferrals, patientCommunicationConsents + patientsRelations
├── schedule.ts           # 13 tables: chairs, clinicChairs, appointments, appointmentWaitlists, appointmentChannelInheritances, quickAppointmentConfirmations, urgentScheduleRequests, confirmationPerformanceReports, scheduleClipboardItems, scheduleTimeReservations, externalScheduleActionLogs, uisMassAppointmentConfirmations, yandexCalendarSyncs + chairsRelations, appointmentsRelations
├── billing.ts            # 14 tables: payments, patientInvoices, cashLedger, sberbankTransactions, ndflTaxCalculators, doctorCommissions, pricelistDoctorPayrolls, services, serviceCatalogItems, kkmItemQuantityUnits, advanceDepositTaggings, digitalReceiptDispatches, insuranceContracts, fiscalReceiptQueue
├── clinical.ts           # 38 tables: visits, visitTemplates, visitDiaries, visitDiaryRevisions, visitExaminationPhotoLinks, toothStates, toothStateHistory, extendedOdontogramStates, perioCharts, treatmentPlans, treatmentPlanItemsNew, treatmentPlanStages, treatmentPlanLockTokens, treatmentPlanPrintOdontograms, alternativeTreatmentPlans, treatmentItems, treatmentScenarios, clinicalTasks, clinicalRules, clinicalAuditLogs, customExaminationFormCatalogs, nonDentalExaminationForms, mkb10AutoDirectories, egiszLogs, egiszBlankPermissions, egiszMultipleDiagnoses, labOrders, labItems, labOrderEvents, anesthesiaLogs, implantCatalogItems, patientImplantInstallations, implantIsqMeasurements, drugCatalog, drugInteractions, patientDrugAllergies, electronicPrescriptions, electronicPrescriptionItems, generatedDocuments + visitsRelations
├── imaging.ts            # 12 tables: attachments, imagingStudies, imagingSeries, imagingInstances, imagingAnnotations, xrayScans, imagingViewerSessions, dicomWorkbenchBundles, bulkImageOperationLogs, patientCtPlannings, diagnocatReports, diagnocatAiFindings
├── inventory.ts          # 6 tables: inventoryItems, inventoryTransactions, procedureMaterialRules, sterilizationLogs, preSterilizationCleaningLogs, autoclaveDailyTests
├── communications.ts     # 28 tables: communicationTemplates, communicationTasks, communicationEvents, communicationOutbox, communicationSettings, messageTemplateCatalogs, denteTelegramBotConfigs, denteTelegramLinkCodes, denteTelegramChatLinks, denteTelegramWebhookEvents, denteTelegramOutboxDeliveryReceipts, denteMaxBotConfigs, denteWhatsappBotConfigs, uisOmniMessengerQueues, uisCallSpeechTranscripts, uisSmsChatQuotas, previousChatDialogHistories, messengerFileAttachments, messengerInboundEvents, chatMessageDispatchStatuses, collaborativeChatProcessingStates, patientCommunicationTimelines, crmEmailDispatchLogs, crmLeads, patientTaskTickets, landingFieldMappings, lostPatientsFilters, rebookingConversionRules, prodoctorovSyncExports
└── system.ts             # 13 tables: auditEvents, aiJobs, systemRamWatchdogs, outgoingNotifications, biAnalyticsSnapshots, migrationRuns, migrationStagingRecords, migrationQuarantineRecords, migrationEntityLinks, migrationReconciliations, clinicWorkflows, patientServiceLineages, systemBackgroundJobs
```

### 3.3. Backward Compatibility Strategy
- `apps/api/src/db/schema/index.ts` uses `export * from "./auth.js"`, `export * from "./patients.js"`, etc.
- `apps/api/src/db/schema.ts` either acts as a clean proxy (`export * from "./schema/index.js";`) or all imports resolve to `apps/api/src/db/schema/index.js` cleanly.
- `apps/api/src/db/client.ts` (`export const dbRaw = drizzle(pool, { schema });`) will consume the unified `schema` object without any breaking changes.

---

## 4. R2 / TASK-2.2: Fastify Service Layer Extraction

### 4.1. Analysis of Fat Routes

#### A. `apps/api/src/routes/imaging.ts` (9,598 lines, 340 KB)
- **Route registration:** Starts only at line 8,717 (`registerImagingRoutes`).
- **Lines 1–8,716:** Massive internal engine containing:
  - DICOM binary parsing, tag extraction, transfer syntax decoding (`parseDicomFileDirectly`, `extractDicomMetadata`).
  - 3D MPR slice calculations, Hounsfield windowing, progressive render cache plans (`buildRenderCachePlan`, `calculateMprReadiness`).
  - 3D Surface Model (STL / OBJ / PLY) vertex loading and bounding box calculations (`processCtSurfaceModel`).
  - VisioGraph & local DICOM directory watcher/scanner (`scanLocalDicomFolder`).
- **Target Services to Extract:**
  1. `DicomParserService` (`apps/api/src/services/imaging/DicomParserService.ts`): Stream/file parsing, tag extraction, syntax decoding.
  2. `DicomMprPlannerService` (`apps/api/src/services/imaging/DicomMprPlannerService.ts`): MPR coordinate transformations, slice generation, density sampling.
  3. `DicomWorkbenchBundleService` (`apps/api/src/services/imaging/DicomWorkbenchBundleService.ts`): Bundle packaging, multi-series manifest composition.
  4. `ImagingStudyService` (`apps/api/src/services/imaging/ImagingStudyService.ts`): Study metadata persistence, patient image gallery queries.
  5. `LocalFolderScannerService` (`apps/api/src/services/imaging/LocalFolderScannerService.ts`): Filesystem watcher, auto-ingestion of new X-ray/visigraph captures.

#### B. `apps/api/src/routes/smartImports.ts` (8,512 lines, 312 KB)
- **Route registration:** Starts at line 7,930 (`registerSmartImportRoutes`).
- **Lines 1–7,929:** Monolithic data import pipeline:
  - Custom parsers for Dental4Windows (D4W), IDENT (CSV/XLSX), InfoDent, 1C Dental.
  - Fuzzy header matching, Cyrillic encoding repair, data normalization.
  - Price/money integer-kopeck converter, staging table reconciliation, quarantine classifier.
- **Target Services to Extract:**
  1. `SmartPricelistImportService` (`apps/api/src/services/imports/SmartPricelistImportService.ts`): Pricelist spreadsheet parser, category mapper, price calculator.
  2. `LegacyMigrationParserService` (`apps/api/src/services/imports/LegacyMigrationParserService.ts`): D4W/IDENT/1C parser engines.
  3. `ImportReconciliationEngine` (`apps/api/src/services/imports/ImportReconciliationEngine.ts`): Multi-tenant entity matching, deduplication, staged record batch commit.

#### C. `apps/api/src/routes/diary.ts` (2,317 lines, 99 KB)
- **Route registration:** Starts at line 924.
- **Lines 1–923:**
  - SOAP protocol template parser and validator.
  - Deterministic SHA-256 canonical digest builder for UKEP / PEP signatures.
  - Automated material deduction rule calculator on diary lock.
- **Target Services to Extract:**
  1. `ClinicalDiaryService` (`apps/api/src/services/clinical/ClinicalDiaryService.ts`): Diary CRUD, revisions, ICD-10 linking.
  2. `DiarySigningCeremonyService` (`apps/api/src/services/clinical/DiarySigningCeremonyService.ts`): Deterministic SHA-256 digest computation, signature verification, lock enforcement.
  3. `ClinicalInventoryAutoWriteoffService` (`apps/api/src/services/clinical/ClinicalInventoryAutoWriteoffService.ts`): Material usage deduction execution upon signature.

---

## 5. R2 / TASK-2.3: PostgreSQL Background Jobs Queue

### 5.1. Audit of Current Workers
- **`backupWorker.ts` (725 lines):** Uses `setInterval` (24h). Reset on server restart; in multi-replica deployments, multiple instances would trigger simultaneous uncoordinated `pg_dump` operations.
- **`biAnalyticsWorker.ts` (636 lines):** Uses `setInterval` (1h). Multi-replica setups insert duplicate snapshot rows.
- **`recallScheduler.ts` (151 lines):** `processOsteointegrationRecalls` is currently an uncalled static method (only executed in tests).
- **`dispatchWorker.ts` (321 lines):** Communication queue loop.

### 5.2. Target Schema: `system_background_jobs`
To be added in `apps/api/src/db/schema/system.ts`:

```typescript
export const systemBackgroundJobs = pgTable(
	"system_background_jobs",
	{
		id: uuid("id").primaryKey().default(sql`uuidv7()`),
		organizationId: uuid("organization_id").references(() => organizations.id, {
			onDelete: "cascade",
		}),
		queueName: varchar("queue_name", { length: 64 }).notNull(),
		taskName: varchar("task_name", { length: 128 }).notNull(),
		payload: jsonb("payload").notNull().default({}),
		status: varchar("status", { length: 32 })
			.$type<"pending" | "processing" | "completed" | "failed" | "dead_letter">()
			.notNull()
			.default("pending"),
		retryCount: integer("retry_count").notNull().default(0),
		maxRetries: integer("max_retries").notNull().default(3),
		scheduledFor: timestamp("scheduled_for", { withTimezone: true })
			.notNull()
			.defaultNow(),
		startedAt: timestamp("started_at", { withTimezone: true }),
		finishedAt: timestamp("finished_at", { withTimezone: true }),
		lockedBy: varchar("locked_by", { length: 128 }),
		lockExpiresAt: timestamp("lock_expires_at", { withTimezone: true }),
		lastError: text("last_error"),
		createdAt: timestamp("created_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
	},
	(table) => ({
		idxBackgroundJobsQueueStatus: index("idx_background_jobs_queue_status").on(
			table.queueName,
			table.status,
			table.scheduledFor,
		),
	}),
);
```

### 5.3. Atomic Single-Runner Job Claim Mechanism
Using PostgreSQL `FOR UPDATE SKIP LOCKED` guarantees that across $N$ API instances, exactly one worker claims any available job without race conditions or deadlocks:

```typescript
export async function claimNextBackgroundJob(
	queueName: string,
	workerId: string,
	lockDurationMs = 600_000,
): Promise<BackgroundJob | null> {
	return await db.transaction(async (tx) => {
		const lockExpiry = new Date(Date.now() + lockDurationMs);
		const [job] = await tx.execute(sql`
			WITH next_job AS (
				SELECT id
				FROM system_background_jobs
				WHERE queue_name = ${queueName}
				  AND status = 'pending'
				  AND scheduled_for <= NOW()
				ORDER BY scheduled_for ASC
				LIMIT 1
				FOR UPDATE SKIP LOCKED
			)
			UPDATE system_background_jobs
			SET status = 'processing',
			    started_at = NOW(),
			    locked_by = ${workerId},
			    lock_expires_at = ${lockExpiry}
			FROM next_job
			WHERE system_background_jobs.id = next_job.id
			RETURNING system_background_jobs.*;
		`);
		return (job as unknown as BackgroundJob) || null;
	});
}
```

### 5.4. Worker Migration Roadmap
1. Periodic jobs (backups, BI snapshots, osteointegration recalls) are scheduled into `system_background_jobs` with `scheduled_for = NOW() + INTERVAL '...'`.
2. A lightweight queue runner polls `claimNextBackgroundJob` with short idle backoff.
3. Upon job completion, runner sets `status = 'completed'` and schedules the next recurring instance.
4. Stale lock recovery: A sweep worker automatically resets jobs with `status = 'processing' AND lock_expires_at < NOW()` back to `pending`.

---

## 6. Verification and Risk Analysis

| Subsystem | Primary Risk | Mitigation |
|---|---|---|
| **Fiscal Queue (TASK-1.3)** | Financial records desynchronization on hardware disconnects | Queue item created in same DB transaction as `payments`; physical print dispatched post-commit with automatic offline state transitions. |
| **Schema Split (TASK-2.1)** | Circular type imports between sub-modules | Place shared base enums in `_common.ts`, relations in respective domain files with explicit typing, re-export all via `index.ts`. |
| **Service Layer (TASK-2.2)** | Breaking route contracts or payload structures | Service methods accept typed input schemas matching Fastify route validation; routes perform only validation and delegation. |
| **Job Queue (TASK-2.3)** | Stuck jobs on node crash | Time-bounded locks (`lock_expires_at`) with automatic stale recovery worker and exponential backoff retry policy. |
