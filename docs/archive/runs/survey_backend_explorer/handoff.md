# 🏛️ Backend Architecture Survey & Integration Technical Report
**Target System:** DENTE Dental CRM (`apps/api`, `packages/shared`)  
**Scope:** EGISZ SEMD 108, Dual CAdES-BES UKEP Signatures, OIIS/MedFlex REST Client & Outbox Queue, FNS KND 1151156 Tax Deduction, MIAC Form 039/u & Order 804n UET Aggregator, SHA-256 Hash-Chained Audit Trail.  
**Working Directory:** `C:/Clinic_MVP/dental-crm/.agents/survey_backend_explorer`

---

## 1. Observation

Direct code inspection of `apps/api` and `packages/shared` established the following verified architectural facts:

### 1.1 Database Schema & ORM Layout (`apps/api/src/db/`)
* **Schema Decomposition:** `apps/api/src/db/schema.ts` delegates to modular domain schemas in `apps/api/src/db/schema/` (`_common.ts`, `auth.ts`, `billing.ts`, `clinical.ts`, `communications.ts`, `imaging.ts`, `inventory.ts`, `patients.ts`, `schedule.ts`, `system.ts`, `index.ts`).
* **Active Service Catalog Table:** The active nomenclature catalog used across clinical workflows, odontogram, pricing, and treatment items is `serviceCatalogItems` (`service_catalog_items` in `apps/api/src/db/schema/clinical.ts:92`). It defines `basePriceRub`, `priceRub`, `category`, `specialty`, `durationMinutes`, `taxDeductible`, `taxDeductionCode`, and `isActive`. It lacks `order804nCode`, `uetAdult`, `uetChild`, `isDecree458Expensive`, and `nsiServiceId`.
* **Document Storage & UKEP Fields:** `generatedDocuments` (`generated_documents` in `apps/api/src/db/schema/clinical.ts:344`) contains `signatureSvg` (canvas data-URL) and `cryptoSignaturePkcs7` (single text column). It lacks structured dual detached signature metadata (Doctor UKEP vs MO Clinic UKEP), CDA XML snapshot storage, and direct foreign key linkage to an EGISZ outbox queue.
* **Current EGISZ State in DB:** `egiszLogs` (`egisz_logs` in `apps/api/src/db/schema/clinical.ts:1201`) and `egiszBlankPermissions` (`egisz_blank_permissions` in `apps/api/src/db/schema/clinical.ts:1155`) exist. `egisz_logs` currently stores only simple status logging (`Pending`, `Sent`, `Error`, `Accepted`), lacks queue scheduling, exponential backoff retry metadata, lease locks (`locked_at`, `locked_by`), and structured REMD registration statuses (`QUEUED`, `VALIDATING`, `REGISTERED_IN_REMD`, `DELIVERED_TO_EPGU`).
* **Outbox Design Reference:** `communicationOutbox` (`communication_outbox` in `apps/api/src/db/schema/communications.ts:829`) serves as the production-proven transactional outbox pattern in DENTE, with `attempts`, `maxAttempts`, `nextAttemptAt`, `lockedAt`, `lockedBy`, and compound tenant unique deduplication keys.
* **Row-Level Security (RLS):** Database enforces `FORCE ROW LEVEL SECURITY` across 147 tables with `tenant_isolation` policies (`apps/api/src/db/rls.ts`, migrations 0157-0160). Any newly created table must define `ENABLE ROW LEVEL SECURITY`, `FORCE ROW LEVEL SECURITY`, and compound tenant policies with `app.current_tenant` and `app.superuser_bypass`.

### 1.2 WebSocket Infrastructure (`apps/api/src/services/websocketBroker.ts` & `apps/api/src/routes/websocket.ts`)
* **Endpoint & Protocol:** `/api/ws/schedule` over `@fastify/websocket`.
* **Tenant Isolation:** Client connects and transmits an initial `AUTH` frame within 10 seconds containing `clinicToken` and `staffToken`. `identityFromTokens` validates the tokens via `getRequestIdentity()`, responding with `AUTH_OK` and mapping the socket to `organizationId` and optional `patientId`.
* **Broadcasting Methods:** `wsBroker.broadcastToOrganization(organizationId, message)` and `wsBroker.broadcastToPatient(organizationId, patientId, message)` are operational and ready for live status pushes (`EGISZ_DOCUMENT_STATUS_CHANGED`).

### 1.3 CDA Generator (`apps/api/src/services/cda/`)
* **Existing Structure:** Modular CDA generator exists (`index.ts`, `schema.ts`, `header.ts`, `body.ts`, `author.ts`, `patient.ts`, `signature.ts`, `util.ts`).
* **Current SEMD Code & Template:** `util.ts:54` currently defines `SEMD_TEMPLATE_CONSULTATION = "1.2.643.5.1.13.13.11.1527"` and LOINC `74208-1`. It requires alignment with Template `1.2.643.5.1.13.13.11.108` (Dental SEMD 108) with all 5 mandatory sections:
  1. Complaints / Anamnesis (LOINC `10164-2`)
  2. Dental Status / Odontogram with 5-surface FDI ISO 3950 table (LOINC `74208-1` / `29545-1`)
  3. ICD-10 Diagnosis (LOINC `29548-5` / `29308-4`, CodeSystem `1.2.643.5.1.13.13.11.1005`)
  4. Services Rendered under Order 804n (LOINC `47519-4`, CodeSystem `1.2.643.5.1.13.13.11.1070`)
  5. Recommendations & Regimen (LOINC `55109-3` / `18776-5`).
* **Tooth Surface Definitions in `@dental/shared`:** `packages/shared/src/index.ts:4143-4243` already provides standardized FDI tooth numbers (`VALID_FDI_TOOTH_NUMBERS`) and surfaces (`occlusal`, `mesial`, `distal`, `buccal`, `lingual`, `palatal`, `incisal`, `root`).

### 1.4 FNS KND 1151156 Tax Generator (`apps/api/src/services/fns/`)
* `decree458Categorizer.ts` implements Decree 458 Item 4 logic (Order 804n code prefixes `A16.07.054`, `A16.07.055`, `A16.07.040`, keywords, and VK protocol justification) to split expenses into Code 1 vs Code 2.
* `fnsKnd1151156Builder.ts` generates format 5.01 XML (`UT_SVOPLMEDUSL_1_278_00_05_01_02`).

### 1.5 Reports & Analytics (`apps/api/src/services/reports/`)
* `managerReports.ts` contains reporting utilities for revenue timeline, doctor performance, chair load, and appointment funnels. MIAC Form 039/u monthly doctor journal query service is ready to be structured as `MiacForm039uService.ts`.

---

## 2. Logic Chain

1. **EGISZ REMD Legal Requirement:** Under Federal Law No. 323-FZ and Government Decree No. 555, medical organizations must register electronic medical records (СЭМД) in the Unified State Health Information System (ЕГИСЗ РЭМД). For dental clinics, consultation protocols must conform to SEMD Template 108 (`1.2.643.5.1.13.13.11.108`) signed with dual CAdES-BES detached signatures (Doctor UKEP + Clinic MO UKEP).
2. **Transactional Outbox Requirement:** Network calls to external state gateways (OIIS / MedFlex / N3.Health) during user HTTP requests are prone to timeouts and distributed inconsistencies. Storing outgoing packages in `egisz_outbox` in the same database transaction as the signed clinical record guarantees at-least-once delivery, deterministic retries, lease locking, and live status tracking without blocking HTTP threads.
3. **Cryptographic Audit Hash-Chain Requirement:** Regulatory compliance (152-FZ, 323-FZ) and forensic non-repudiation require that audit logs cannot be altered retroactively even by privileged database administrators. By maintaining an immutable SHA-256 hash chain in `egisz_audit_logs` where each record embeds `previous_hash` and `current_hash = SHA256(previous_hash || seq || payload_sha256)`, any row tampering, deletion, or insertion breaks the mathematical chain and is immediately detectable.
4. **Nomenclature & UET Requirement:** MIAC Form 039/u reporting calculates doctor productivity in UET (Условные единицы трудоемкости) under Order 804n. Extending `service_catalog_items` with `uet_adult`, `uet_child`, `order_804n_code`, and `is_decree_458_expensive` provides direct database-level aggregation for Form 039/u while simultaneously empowering FNS KND 1151156 automated tax categorization.

---

## 3. Caveats

* **CryptoPro CSP Environment:** Server-side execution of CryptoPro CSP binaries (`csptest`, `cryptcp`) depends on the host operating system having CryptoPro CSP 5.0+ installed with a valid clinic license. If server binaries are not installed or if running in a lightweight container, a software fallback verification module (ASN.1 parser + GOST 34.11-2012 / 34.10-2012 verification) is required for development, CI/CD, and test suite execution.
* **OIIS / MedFlex Sandbox vs Production:** In development environments without live EGISZ credentials (`EGISZ_N3_BASE_URL`, `EGISZ_N3_GUID`), the OIIS Gateway client must support a configurable mock/sandbox transport adapter to allow end-to-end status lifecycle testing (`QUEUED` -> `VALIDATING` -> `REGISTERED_IN_REMD` -> `DELIVERED_TO_EPGU`).
* **PostgreSQL RLS Enforcement:** When creating new tables (`egisz_outbox`, `egisz_audit_logs`), migrations must include `ALTER TABLE ... ENABLE ROW LEVEL SECURITY; ALTER TABLE ... FORCE ROW LEVEL SECURITY;` and create `tenant_isolation` policies, otherwise cross-tenant isolation tests will fail.

---

## 4. Conclusion & Architectural Blueprints

### 4.1 Database Schema Extensions (DDL & Drizzle Definitions)

#### A. `egisz_outbox` Table Definition (`apps/api/src/db/schema/clinical.ts`)
```typescript
export const egiszOutboxStatus = pgEnum("egisz_outbox_status_enum", [
	"queued",
	"validating",
	"signing_pending",
	"ready_for_dispatch",
	"sending",
	"registered_in_remd",
	"delivered_to_epgu",
	"failed",
	"rejected_by_remd",
]);

export const egiszOutbox = pgTable(
	"egisz_outbox",
	{
		id: uuid("id").primaryKey().default(sql`uuidv7()`),
		organizationId: uuid("organization_id")
			.notNull()
			.references(() => organizations.id),
		visitId: uuid("visit_id")
			.notNull()
			.references(() => visits.id, { onDelete: "cascade" }),
		documentId: uuid("document_id").references(() => generatedDocuments.id),
		patientId: uuid("patient_id")
			.notNull()
			.references(() => patients.id, { onDelete: "cascade" }),
		doctorId: uuid("doctor_id")
			.notNull()
			.references(() => users.id),
		docTypeNsiCode: text("doc_type_nsi_code").notNull().default("108"),
		status: egiszOutboxStatus("status").notNull().default("queued"),
		payloadXml: text("payload_xml").notNull(),
		payloadHashSha256: text("payload_hash_sha256").notNull(),
		doctorSignaturePkcs7: text("doctor_signature_pkcs7").notNull(),
		doctorCertSerial: text("doctor_cert_serial").notNull(),
		doctorCertSubject: text("doctor_cert_subject").notNull(),
		doctorSignedAt: timestamp("doctor_signed_at", { withTimezone: true }),
		moSignaturePkcs7: text("mo_signature_pkcs7"),
		moCertSerial: text("mo_cert_serial"),
		moCertSubject: text("mo_cert_subject"),
		moSignedAt: timestamp("mo_signed_at", { withTimezone: true }),
		remdDocumentId: text("remd_document_id"),
		remdTransactionId: text("remd_transaction_id"),
		attempts: integer("attempts").notNull().default(0),
		maxAttempts: integer("max_attempts").notNull().default(5),
		scheduledAt: timestamp("scheduled_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
		nextAttemptAt: timestamp("next_attempt_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
		lockedAt: timestamp("locked_at", { withTimezone: true }),
		lockedBy: text("locked_by"),
		lastErrorClass: text("last_error_class"),
		lastErrorMessage: text("last_error_message"),
		gatewayResponseJson: jsonb("gateway_response_json"),
		dedupeKey: text("dedupe_key").notNull(),
		createdAt: timestamp("created_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
		updatedAt: timestamp("updated_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
	},
	(t) => ({
		orgDedupeUnique: unique("egisz_outbox_org_dedupe_unique").on(
			t.organizationId,
			t.dedupeKey,
		),
		pollIdx: index("egisz_outbox_poll_idx").on(
			t.organizationId,
			t.status,
			t.nextAttemptAt,
		),
		patientIdx: index("egisz_outbox_patient_idx").on(
			t.organizationId,
			t.patientId,
		),
		visitIdx: index("egisz_outbox_visit_idx").on(t.organizationId, t.visitId),
	}),
);
```

#### B. `egisz_audit_logs` Cryptographic Hash-Chain Table (`apps/api/src/db/schema/clinical.ts`)
```typescript
export const egiszAuditLogs = pgTable(
	"egisz_audit_logs",
	{
		id: uuid("id").primaryKey().default(sql`uuidv7()`),
		organizationId: uuid("organization_id")
			.notNull()
			.references(() => organizations.id),
		sequenceNumber: bigint("sequence_number", { mode: "number" }).notNull(),
		previousHash: text("previous_hash").notNull(),
		currentHash: text("current_hash").notNull(),
		eventType: text("event_type").notNull(),
		entityType: text("entity_type").notNull(),
		entityId: text("entity_id").notNull(),
		patientId: uuid("patient_id").references(() => patients.id),
		actorUserId: uuid("actor_user_id").references(() => users.id),
		actorIpAddress: text("actor_ip_address"),
		actorUserAgent: text("actor_user_agent"),
		payloadJson: jsonb("payload_json"),
		payloadSha256: text("payload_sha256").notNull(),
		createdAt: timestamp("created_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
	},
	(t) => ({
		orgSeqUnique: unique("egisz_audit_logs_org_seq_unique").on(
			t.organizationId,
			t.sequenceNumber,
		),
		orgHashUnique: unique("egisz_audit_logs_org_hash_unique").on(
			t.organizationId,
			t.currentHash,
		),
		orgCreatedIdx: index("egisz_audit_logs_org_created_idx").on(
			t.organizationId,
			t.createdAt,
		),
		patientIdx: index("egisz_audit_logs_patient_idx").on(
			t.organizationId,
			t.patientId,
		),
	}),
);
```

#### C. Nomenclature Service Extensions on `serviceCatalogItems`
```typescript
// Additions to serviceCatalogItems table in clinical.ts:
order804nCode: text("order_804n_code"),
uetAdult: numeric("uet_adult", { precision: 6, scale: 2, mode: "number" })
	.notNull()
	.default(0),
uetChild: numeric("uet_child", { precision: 6, scale: 2, mode: "number" })
	.notNull()
	.default(0),
isDecree458Expensive: boolean("is_decree_458_expensive")
	.notNull()
	.default(false),
nsiServiceId: text("nsi_service_id"),
```

#### D. Document Storage Extensions on `generatedDocuments`
```typescript
// Additions to generatedDocuments table in clinical.ts:
cdaXmlSnapshot: text("cda_xml_snapshot"),
cdaXmlSha256: text("cda_xml_sha256"),
cdaTemplateOid: text("cda_template_oid"),
cdaDocumentVersion: integer("cda_document_version").default(1),
doctorSignaturePkcs7: text("doctor_signature_pkcs7"),
doctorCertSerial: text("doctor_cert_serial"),
doctorCertSubject: text("doctor_cert_subject"),
doctorSignedAt: timestamp("doctor_signed_at", { withTimezone: true }),
moSignaturePkcs7: text("mo_signature_pkcs7"),
moCertSerial: text("mo_cert_serial"),
moCertSubject: text("mo_cert_subject"),
moSignedAt: timestamp("mo_signed_at", { withTimezone: true }),
egiszOutboxId: uuid("egisz_outbox_id"),
```

---

### 4.2 Modular Service Architecture & Integration Contracts

```
apps/api/src/
├── db/
│   └── schema/
│       └── clinical.ts                   # egisz_outbox, egisz_audit_logs, serviceCatalogItems additions
├── services/
│   ├── cda/                              # HL7 CDA R2 SEMD 108 Generator
│   │   ├── index.ts                      # generateDentalCdaXml, canonicalizeCdaXml
│   │   ├── schema.ts                     # egiszCdaParamsSchema (with FDI 5-surface & 804n services)
│   │   ├── header.ts                     # SEMD 108 Template OID (1.2.643.5.1.13.13.11.108)
│   │   ├── body.ts                       # 5 Mandatory Sections (Anamnesis, 5-surface Odontogram, ICD10, 804n, Recs)
│   │   ├── patient.ts                    # recordTarget / patientRole
│   │   ├── author.ts                     # author / custodian / legalAuthenticator
│   │   ├── validator.ts                  # FRNSI / FRMO / FRMR OID validation
│   │   ├── signature.ts                  # CAdES-BES schemas
│   │   └── util.ts                       # XML escaping, HL7 TS formatting, OID registry
│   ├── crypto/                           # CryptoPro CSP & CAdES-BES Signature Bridge
│   │   ├── CryptoProBridge.ts            # Server-side CSP MO signing adapter
│   │   ├── CadesBesVerifier.ts           # Detached signature verification (Doctor & MO)
│   │   └── GostDigest.ts                 # Streebog-256 / GOST 34.11-2012 hashing
│   ├── egisz/                            # EGISZ Outbox & OIIS Gateway
│   │   ├── OiisGatewayClient.ts          # MedFlex / N3.Health REST client
│   │   ├── EgiszOutboxService.ts         # Queueing, retries, status management
│   │   └── EgiszOutboxWorker.ts          # Background daemon & WebSocket dispatcher
│   ├── fns/                              # FNS KND 1151156 Tax Generator
│   │   ├── decree458Categorizer.ts       # Code 1 vs Code 2 expense partitioning
│   │   ├── fnsKnd1151156Builder.ts       # 5.01 XML builder
│   │   └── fnsXsdValidator.ts            # Official XSD schema validation
│   ├── reports/                          # Clinical & MIAC Reports
│   │   ├── managerReports.ts             # Operational manager analytics
│   │   └── MiacForm039uService.ts        # Form 039/u-02 doctor journal & UET aggregator
│   └── websocketBroker.ts                # Real-time WebSocket broadcasting
└── routes/
    ├── egisz.ts                          # /api/egisz/visits/:id/cda, /api/egisz/packages, outbox endpoints
    ├── documents/
    │   ├── signUkep.ts                   # Enhanced dual UKEP signing endpoint
    │   └── taxXml.ts                     # KND 1151156 export endpoint
    └── reports.ts                        # /api/reports/miac-039u endpoint
```

### 4.3 Key Interface Contracts

#### 1. Hash-Chain Audit Logging Service (`apps/api/src/services/egisz/EgiszAuditService.ts`)
```typescript
export interface AppendAuditLogParams {
	organizationId: string;
	eventType: string;
	entityType: string;
	entityId: string;
	patientId?: string | null;
	actorUserId?: string | null;
	actorIpAddress?: string | null;
	actorUserAgent?: string | null;
	payload: Record<string, unknown>;
}

export async function appendEgiszAuditLog(
	tx: DbTransaction,
	params: AppendAuditLogParams,
): Promise<{ id: string; sequenceNumber: number; currentHash: string }> {
	// 1. Lock the latest row for this tenant
	const [lastRow] = await tx
		.select({
			sequenceNumber: egiszAuditLogs.sequenceNumber,
			currentHash: egiszAuditLogs.currentHash,
		})
		.from(egiszAuditLogs)
		.where(eq(egiszAuditLogs.organizationId, params.organizationId))
		.orderBy(desc(egiszAuditLogs.sequenceNumber))
		.limit(1)
		.for("update");

	const sequenceNumber = (lastRow?.sequenceNumber ?? 0) + 1;
	const previousHash =
		lastRow?.currentHash ??
		"0000000000000000000000000000000000000000000000000000000000000000";

	const canonicalJson = deterministicJsonStringify(params.payload);
	const payloadSha256 = crypto
		.createHash("sha256")
		.update(canonicalJson)
		.digest("hex");
	const now = new Date();

	const dataToHash = `${previousHash}:${sequenceNumber}:${params.organizationId}:${params.eventType}:${params.entityType}:${params.entityId}:${payloadSha256}:${now.toISOString()}:${params.actorUserId ?? ""}`;
	const currentHash = crypto
		.createHash("sha256")
		.update(dataToHash)
		.digest("hex");

	const [inserted] = await tx
		.insert(egiszAuditLogs)
		.values({
			organizationId: params.organizationId,
			sequenceNumber,
			previousHash,
			currentHash,
			eventType: params.eventType,
			entityType: params.entityType,
			entityId: params.entityId,
			patientId: params.patientId ?? null,
			actorUserId: params.actorUserId ?? null,
			actorIpAddress: params.actorIpAddress ?? null,
			actorUserAgent: params.actorUserAgent ?? null,
			payloadJson: params.payload,
			payloadSha256,
			createdAt: now,
		})
		.returning();

	return {
		id: inserted!.id,
		sequenceNumber,
		currentHash,
	};
}
```

#### 2. MIAC Form 039/u SQL Aggregation Contract (`apps/api/src/services/reports/MiacForm039uService.ts`)
```typescript
export interface Miac039uReportParams {
	organizationId: string;
	startDate: Date;
	endDate: Date;
	doctorUserId?: string;
	clinicId?: string;
}

export interface Miac039uDoctorSummary {
	doctorUserId: string;
	doctorName: string;
	specialty: string;
	totalVisits: number;
	primaryVisits: number;
	repeatVisits: number;
	adultVisits: number;
	childVisits: number;
	preventativeVisits: number;
	cariesFilledCount: number;
	pulpitisTreatedCount: number;
	periodontitisTreatedCount: number;
	teethExtractedCount: number;
	surgicalOperationsCount: number;
	anesthesiasCount: number;
	totalUetAdult: number;
	totalUetChild: number;
	grandTotalUet: number;
}
```

---

## 5. Verification Method

To independently verify these findings and blueprints:

1. **Schema Integrity & Relations:**
   Inspect schema structure:
   ```powershell
   Get-ChildItem apps/api/src/db/schema/
   rg "serviceCatalogItems|generatedDocuments|egiszLogs|communicationOutbox" apps/api/src/db/schema/
   ```
2. **CDA & FNS Existing Modules:**
   Inspect existing implementations and tests:
   ```powershell
   npm test -- apps/api/src/services/cda/util.test.ts
   npm test -- apps/api/src/services/fns/fnsTax.test.ts
   ```
3. **WebSocket Infrastructure:**
   Verify broker and auth handshake:
   ```powershell
   rg "wsBroker|registerWebsocketRoutes" apps/api/src/
   ```
4. **Encoding & Typecheck Gates:**
   Verify baseline repo health:
   ```powershell
   npm run check:encoding
   npm run typecheck
   ```
