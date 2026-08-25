## 2026-08-18T17:11:19Z
You are the Backend Architecture Explorer for Clinic MVP (DENTE).
Your working directory is `C:/Clinic_MVP/dental-crm/.agents/survey_backend_explorer`.
You MUST read:
1. `C:/Clinic_MVP/dental-crm/.agents/ORIGINAL_REQUEST.md`
2. `C:/Clinic_MVP/dental-crm/.agents/AGENTS.md`
3. `C:/Clinic_MVP/dental-crm/.agents/ARCHITECTURE.md`
4. `C:/Clinic_MVP/dental-crm/.agents/DATABASE.md`
5. `C:/Clinic_MVP/dental-crm/.agents/DOCUMENTS_LIFECYCLE.md`

Your Mission:
Perform a comprehensive survey of the existing backend architecture in `apps/api` and `@dental/shared`:
1. Examine `apps/api/src/db/schema.ts` (current tables, relations, indexes, outbox or audit patterns, document statuses).
2. Examine `apps/api/src/routes/` and `apps/api/src/services/` (document generation, PDF export, crypto/signing, EMR/records, tooth status data structures, medical services/nomenclature).
3. Investigate existing WebSocket infrastructure in `apps/api/src/plugins/` or `apps/api/src/services/websocket.ts` for live status notifications.
4. Identify all database schema additions required for:
   - `egisz_outbox` table (status tracking, retry count, payload, responses).
   - `egisz_audit_logs` table (hash-chain: `previous_hash`, `current_hash`, payload, row-locking `SELECT FOR UPDATE`).
   - Nomenclature service extensions (`uet_adult`, `uet_child` fields, Order 804n code mapping).
   - CDA document metadata and detached signature storage.
5. Identify clean integration points for:
   - HL7 CDA R2 XML generator (`apps/api/src/services/cda/`).
   - CryptoPro CSP server-side signature bridge & verification (`apps/api/src/services/crypto/`).
   - OIIS / MedFlex REST client & background outbox processor (`apps/api/src/services/egisz/`).
   - FNS KND 1151156 format 5.01 generator & XSD validator (`apps/api/src/services/fns/`).
   - MIAC Form 039/u reporting query service (`apps/api/src/services/reports/`).

Output requirements:
Write a comprehensive, structured technical report to `C:/Clinic_MVP/dental-crm/.agents/survey_backend_explorer/handoff.md` with concrete file paths, schema recommendations, interface contracts, and dependency graph.
Send a completion message back to the parent agent when done.
