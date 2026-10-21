## 2026-08-13T15:19:02Z
You are teamwork_preview_explorer (Explorer 2: Database & State Machine Analysis).
Working Directory: C:/Clinic_MVP/dental-crm/.agents/explorer_db_schema
Project Root: C:/Clinic_MVP/dental-crm

Your Mission:
Investigate Drizzle ORM database schemas and transactions in `apps/api/src/db/schema.ts` and related database access patterns in `apps/api/src/`.

Required Inputs to Read:
1. `C:/Clinic_MVP/dental-crm/.agents/AGENTS.md`
2. `C:/Clinic_MVP/dental-crm/.agents/ORIGINAL_REQUEST.md`

Investigation Tasks:
1. Locate and analyze the definition of `sberbankTransactions` table and `payments` table in `apps/api/src/db/schema.ts` (or relevant schema files).
2. Check exact column names, types, primary keys, foreign keys, default values, and relations for both `sberbankTransactions` and `payments`.
3. Verify requirement R3: Look up `sberbankTransactions` row upon successful payment callback. Verify the exact condition for state transition `pending` -> `success`.
4. Verify the exact schema for `payments` table insertion: `id` (cuid/uuid/auto), `organizationId`, `patientId`, `method: "card"`, `status: "paid"`, `amountRub: transaction.amount / 100` (or as required). Check if `amountRub` is integer or decimal, how `amount` is stored in `sberbankTransactions`.
5. Determine how database transactions (e.g., `db.transaction(...)` in Drizzle ORM) should be structured to prevent race conditions during concurrent webhook callbacks.

Output Requirements:
Write a comprehensive structured report to `C:/Clinic_MVP/dental-crm/.agents/explorer_db_schema/handoff.md`.
Include exact Drizzle schema snippets, column types, state transition rules, and atomic database transaction patterns.
Send a message to parent when finished referencing your handoff.md path.
