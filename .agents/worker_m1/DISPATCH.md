## 2026-08-18T17:21:45Z
You are the Implementation Worker for Milestone 1 (M1: Database Schema, Cryptographic SHA-256 Audit Trail & Service Nomenclature Extensions) in Clinic MVP (DENTE).
Your working directory is `C:/Clinic_MVP/dental-crm/.agents/worker_m1`.

You MUST read before starting work:
1. `C:/Clinic_MVP/dental-crm/.agents/ORIGINAL_REQUEST.md`
2. `C:/Clinic_MVP/dental-crm/PROJECT.md`
3. `C:/Clinic_MVP/dental-crm/.agents/AGENTS.md`
4. `C:/Clinic_MVP/dental-crm/.agents/survey_backend_explorer/handoff.md`
5. `C:/Clinic_MVP/dental-crm/.agents/survey_spec_miner/handoff.md`

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_preview_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

Your Write Scope (Exclusive Ownership):
- `apps/api/src/db/schema/clinical.ts`
- `apps/api/src/services/egisz/EgiszAuditService.ts`
- `apps/api/src/services/egisz/EgiszAuditService.test.ts`

Task Requirements:
1. In `apps/api/src/db/schema/clinical.ts`:
   - Add `egiszOutboxStatus` enum: `queued`, `validating`, `signing_pending`, `ready_for_dispatch`, `sending`, `registered_in_remd`, `delivered_to_epgu`, `failed`, `rejected_by_remd`.
   - Add `egiszOutbox` table (`egisz_outbox`) with all fields: `id` (uuid primary key default sql`uuidv7()`), `organizationId`, `visitId`, `documentId`, `patientId`, `doctorId`, `docTypeNsiCode` (default "108"), `status`, `payloadXml`, `payloadHashSha256`, `doctorSignaturePkcs7`, `doctorCertSerial`, `doctorCertSubject`, `doctorSignedAt`, `moSignaturePkcs7`, `moCertSerial`, `moCertSubject`, `moSignedAt`, `remdDocumentId`, `remdTransactionId`, `attempts`, `maxAttempts`, `scheduledAt`, `nextAttemptAt`, `lockedAt`, `lockedBy`, `lastErrorClass`, `lastErrorMessage`, `gatewayResponseJson`, `dedupeKey`, `createdAt`, `updatedAt`, with indexes and unique constraint on `(organizationId, dedupeKey)`.
   - Add `egiszAuditLogs` table (`egisz_audit_logs`) with all fields: `id`, `organizationId`, `sequenceNumber` (bigint mode number), `previousHash`, `currentHash`, `eventType`, `entityType`, `entityId`, `patientId`, `actorUserId`, `actorIpAddress`, `actorUserAgent`, `payloadJson`, `payloadSha256`, `createdAt`, with indexes on `(organizationId, sequenceNumber)` unique, `(organizationId, currentHash)` unique.
   - Add nomenclature fields to `serviceCatalogItems`: `order804nCode` (text), `uetAdult` (numeric mode number default 0), `uetChild` (numeric mode number default 0), `isDecree458Expensive` (boolean default false), `nsiServiceId` (text).
   - Add document fields to `generatedDocuments`: `cdaXmlSnapshot`, `cdaXmlSha256`, `cdaTemplateOid`, `cdaDocumentVersion`, `doctorSignaturePkcs7`, `doctorCertSerial`, `doctorCertSubject`, `doctorSignedAt`, `moSignaturePkcs7`, `moCertSerial`, `moCertSubject`, `moSignedAt`, `egiszOutboxId`.
2. In `apps/api/src/services/egisz/EgiszAuditService.ts`:
   - Implement `appendEgiszAuditLog(tx, params)` using PostgreSQL `SELECT ... FOR UPDATE` row locking on tenant's tail sequence number.
   - Implement deterministic JSON canonicalization for payload SHA-256.
   - Implement SHA-256 calculation: `current_hash = SHA256(previous_hash + ":" + sequence_number + ":" + organization_id + ":" + event_type + ":" + entity_type + ":" + entity_id + ":" + payload_sha256 + ":" + timestamp_iso + ":" + actor_user_id)`.
   - Genesis block: 64 zero characters (`0000000000000000000000000000000000000000000000000000000000000000`).
   - Implement `verifyAuditLogIntegrity(tx, organizationId)` which verifies the unbroken cryptographic chain across all rows for the organization.
3. In `apps/api/src/services/egisz/EgiszAuditService.test.ts`:
   - Write comprehensive unit tests testing:
     a. Genesis hash initialization.
     b. Sequential hash chaining across multiple entries.
     c. Deterministic canonical JSON and payload hash.
     d. Chain verification passes for valid sequence.
     e. Chain verification fails and identifies tampered row if data or hash is altered.
     f. Multi-tenant isolation (each org has its own independent hash chain starting at genesis).
4. Run verification gates:
   - `npm run check:encoding`
   - `npm run typecheck`
   - Run vitest on `apps/api/src/services/egisz/EgiszAuditService.test.ts`

Output: Write report to `C:/Clinic_MVP/dental-crm/.agents/worker_m1/handoff.md` and send message with completion status.
