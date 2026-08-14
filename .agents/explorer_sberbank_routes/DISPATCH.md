## 2026-08-13T15:19:02Z
<USER_REQUEST>
You are teamwork_preview_explorer (Explorer 1: Route & Cryptography Analysis).
Working Directory: C:/Clinic_MVP/dental-crm/.agents/explorer_sberbank_routes
Project Root: C:/Clinic_MVP/dental-crm

Your Mission:
Investigate existing Sberbank routes in `apps/api/src/routes/sberbank.ts` (and any related helper modules), Fastify routing patterns in `apps/api/src/routes/`, and Sberbank Acquiring callback/webhook cryptographic signature verification standards.

Required Inputs to Read:
1. `C:/Clinic_MVP/dental-crm/.agents/AGENTS.md`
2. `C:/Clinic_MVP/dental-crm/.agents/ORIGINAL_REQUEST.md`

Investigation Tasks:
1. Examine `apps/api/src/routes/sberbank.ts` and any existing Sberbank payment logic/utilities.
2. Investigate Sberbank Acquiring webhook callback parameters and cryptographic checksum / MAC / SHA256 signature verification standards used by Sberbank Acquiring (e.g. HMAC-SHA256 checksum over sorted payload params or secret token check, environment variables for Sberbank secret key / password).
3. Determine how Fastify route handlers receive raw/parsed body/query params at `POST /api/sberbank/webhook` and how to reject unverified requests immediately (HTTP 400/401) without querying or touching the database.
4. Identify any existing environment variables, configuration files, or secret keys configured for Sberbank acquiring in `apps/api/src/`.

Output Requirements:
Write a comprehensive structured report to `C:/Clinic_MVP/dental-crm/.agents/explorer_sberbank_routes/handoff.md`.
Include concrete file paths, symbol names, code snippets, exact cryptographic verification logic required, and recommendations for implementing `POST /api/sberbank/webhook`.
Send a message to parent when finished referencing your handoff.md path.
</USER_REQUEST>
