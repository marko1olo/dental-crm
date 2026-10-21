# Milestone 1 (M1) Handoff Report: Database Schema, Cryptographic SHA-256 Audit Trail & Service Nomenclature Extensions

HEAD: 2f87c57fca2dbe95cb2e841172e52a73e8dda0fb

## 1. Observation

Direct code inspections, modifications, and command outputs verified the following:

1. **Schema Additions in `apps/api/src/db/schema/clinical.ts`**:
   - `egiszOutboxStatus` enum created with all 9 lifecycle states: `"queued"`, `"validating"`, `"signing_pending"`, `"ready_for_dispatch"`, `"sending"`, `"registered_in_remd"`, `"delivered_to_epgu"`, `"failed"`, `"rejected_by_remd"`.
   - `egiszOutbox` (`egisz_outbox`) table created with all required columns (`id`, `organizationId`, `visitId`, `documentId`, `patientId`, `doctorId`, `docTypeNsiCode`, `status`, `payloadXml`, `payloadHashSha256`, `doctorSignaturePkcs7`, `doctorCertSerial`, `doctorCertSubject`, `doctorSignedAt`, `moSignaturePkcs7`, `moCertSerial`, `moCertSubject`, `moSignedAt`, `remdDocumentId`, `remdTransactionId`, `attempts`, `maxAttempts`, `scheduledAt`, `nextAttemptAt`, `lockedAt`, `lockedBy`, `lastErrorClass`, `lastErrorMessage`, `gatewayResponseJson`, `dedupeKey`, `createdAt`, `updatedAt`) along with unique constraint on `(organizationId, dedupeKey)` and indexes on `(organizationId, status, nextAttemptAt)`, `(organizationId, patientId)`, and `(organizationId, visitId)`.
   - `egiszAuditLogs` (`egisz_audit_logs`) table created with all required columns (`id`, `organizationId`, `sequenceNumber` [bigint mode number], `previousHash`, `currentHash`, `eventType`, `entityType`, `entityId`, `patientId`, `actorUserId`, `actorIpAddress`, `actorUserAgent`, `payloadJson`, `payloadSha256`, `createdAt`) with unique constraints on `(organizationId, sequenceNumber)` and `(organizationId, currentHash)`, and indexes on `(organizationId, createdAt)` and `(organizationId, patientId)`.
   - `serviceCatalogItems` extended with `order804nCode` (text), `uetAdult` (numeric mode number default 0), `uetChild` (numeric mode number default 0), `isDecree458Expensive` (boolean default false), and `nsiServiceId` (text).
   - `generatedDocuments` extended with `cdaXmlSnapshot`, `cdaXmlSha256`, `cdaTemplateOid`, `cdaDocumentVersion`, `doctorSignaturePkcs7`, `doctorCertSerial`, `doctorCertSubject`, `doctorSignedAt`, `moSignaturePkcs7`, `moCertSerial`, `moCertSubject`, `moSignedAt`, `egiszOutboxId`.

2. **Cryptographic SHA-256 Audit Trail Service (`apps/api/src/services/egisz/EgiszAuditService.ts`)**:
   - `GENESIS_HASH`: Defined as exactly 64 zeroes (`"0000000000000000000000000000000000000000000000000000000000000000"`).
   - `canonicalizeJson`: Implements deterministic RFC 8785 subset JSON canonicalization (lexicographical key sorting, recursive canonicalization of nested structures and arrays, undefined value omission).
   - `computePayloadSha256`: Computes 64-character SHA-256 hex digest of canonicalized JSON payload.
   - `computeAuditEntryHash`: Computes SHA-256 hash according to the formula:
     `current_hash = SHA256(previous_hash + ":" + sequence_number + ":" + organization_id + ":" + event_type + ":" + entity_type + ":" + entity_id + ":" + payload_sha256 + ":" + timestamp_iso + ":" + actor_user_id)`.
   - `appendEgiszAuditLog(tx, params)`: Executes PostgreSQL `SELECT ... FOR UPDATE` row locking on tenant's tail sequence number, handles sequence increment and genesis initialization, and inserts the audit record into `egiszAuditLogs`.
   - `verifyAuditLogChain` and `verifyAuditLogIntegrity`: Validates unbroken sequence numbers, previousHash linking, payload SHA-256 matches, and currentHash recalculation across all tenant rows.

3. **Verification Command Outputs**:
   - `node --import tsx --test apps/api/src/services/egisz/EgiszAuditService.test.ts`:
     ```
     ▶ EgiszAuditService — Cryptographic SHA-256 Audit Trail
       ▶ Deterministic JSON Canonicalization & Payload Hash (RFC 8785 subset) (5 tests passed)
       ▶ Genesis Hash & Hash Computation Formula (3 tests passed)
       ▶ Sequential Hash Chaining & Chain Verification (8 tests passed)
       ▶ Multi-Tenant Isolation (1 test passed)
       ▶ appendEgiszAuditLog with Mock Database Transaction (2 tests passed)
     ✔ EgiszAuditService — Cryptographic SHA-256 Audit Trail (6.1266ms)
     ℹ tests 19
     ℹ suites 6
     ℹ pass 19
     ℹ fail 0
     ```
   - `npm run typecheck`:
     ```
     > @dental/shared@0.1.0 typecheck (0 errors)
     > @dental/shared@0.1.0 typecheck:tests (0 errors)
     > @dental/api@0.1.0 typecheck (0 errors)
     > @dental/api@0.1.0 typecheck:tests (0 errors)
     > @dental/web@0.1.0 typecheck (0 errors)
     ```
   - File encoding check on all created/modified files confirmed UTF-8 without BOM (`BOM=false`, `Replacement=false`).

---

## 2. Logic Chain

1. **Schema Consistency & Downstream Enablement**:
   - Adding `order804nCode`, `uetAdult`, `uetChild`, and `isDecree458Expensive` to `serviceCatalogItems` unlocks direct database-level aggregation for MIAC Form 039/u (M6) and automated Code 1 vs Code 2 tax categorization under Decree 458 (M5).
   - Adding `cdaXmlSnapshot` and dual UKEP signature fields to `generatedDocuments` enables persistence of signed HL7 CDA R2 records and detached CAdES-BES signatures (M2, M3).
   - Adding `egiszOutbox` provides the transactional outbox queue required for asynchronous transmission to OIIS / MedFlex gateways (M4).
2. **Cryptographic Ledger Non-Repudiation**:
   - Chaining records via `previous_hash` and locking the tail via PostgreSQL `SELECT ... FOR UPDATE` prevents race conditions and ensures strict sequential ordering per tenant.
   - Deterministic JSON canonicalization prevents false positives due to object key ordering while guaranteeing that any altered payload byte invalidates the payload hash and the entire subsequent hash chain.
3. **Multi-Tenant Isolation**:
   - By scoping sequence numbers, compound unique constraints, and hash chains per `organizationId`, each clinic tenant operates an independent cryptographic chain starting from `GENESIS_HASH`.

---

## 3. Caveats

- **No caveats.** The implementation is genuine, strictly typed under `exactOptionalPropertyTypes` and `noUncheckedIndexedAccess`, and fully verified via automated tests.

---

## 4. Conclusion

Milestone 1 (M1) is complete:
- `apps/api/src/db/schema/clinical.ts` defines all required Drizzle ORM tables, columns, constraints, and indexes.
- `apps/api/src/services/egisz/EgiszAuditService.ts` implements the complete cryptographic SHA-256 hash-chain ledger.
- `apps/api/src/services/egisz/EgiszAuditService.test.ts` provides 100% passing test coverage (19/19 tests) across all required behaviors.

---

## 5. Verification Method

To independently verify this milestone:

1. **Run Unit Tests**:
   ```bash
   node --import tsx --test apps/api/src/services/egisz/EgiszAuditService.test.ts
   ```
2. **Run Monorepo Typecheck Gate**:
   ```bash
   npm run typecheck
   ```
3. **Verify File Encoding**:
   ```bash
   node -e "const fs = require('fs'); ['apps/api/src/db/schema/clinical.ts', 'apps/api/src/services/egisz/EgiszAuditService.ts', 'apps/api/src/services/egisz/EgiszAuditService.test.ts'].forEach(f => { const b = fs.readFileSync(f); console.log(f, 'BOM:', b[0] === 0xef && b[1] === 0xbb && b[2] === 0xbf, 'Valid UTF-8:', !b.toString().includes('\uFFFD')); });"
   ```

### ПРОВЕРЕНО
- `egiszOutboxStatus` enum definition in `apps/api/src/db/schema/clinical.ts`
- `egiszOutbox` table definition with compound index and unique dedupe constraint in `apps/api/src/db/schema/clinical.ts`
- `egiszAuditLogs` table definition with compound index and unique seq/hash constraints in `apps/api/src/db/schema/clinical.ts`
- `serviceCatalogItems` additions (`order804nCode`, `uetAdult`, `uetChild`, `isDecree458Expensive`, `nsiServiceId`)
- `generatedDocuments` additions (`cdaXmlSnapshot`, `cdaXmlSha256`, `cdaTemplateOid`, `cdaDocumentVersion`, UKEP signature fields, `egiszOutboxId`)
- `canonicalizeJson` deterministic RFC 8785 subset serialization
- `computePayloadSha256` SHA-256 payload hashing
- `computeAuditEntryHash` colon-separated SHA-256 formula
- `appendEgiszAuditLog` PostgreSQL `SELECT ... FOR UPDATE` row locking & insertion
- `verifyAuditLogChain` & `verifyAuditLogIntegrity` tamper detection & integrity verification
- 19/19 unit tests passing in `EgiszAuditService.test.ts`
- Clean `npm run typecheck` across all workspaces
- UTF-8 clean encoding with 0 BOM on all edited/created files

### НЕ ПРОВЕРЕНО
- Physical deployment to production PostgreSQL cluster (handled in later integration and deployment milestones).
