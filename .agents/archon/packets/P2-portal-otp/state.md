# P2-portal-otp — black box

PACKET: P2-portal-otp
CLAIM: apps/api/src/routes/portal.ts (+ IF REQUIRED apps/api/src/db/schema.ts + one new apps/api/drizzle/*.sql)
GATE: npm run typecheck -w @dental/api

## Milestones
- STARTED 2026-07-28 — packet dir created, nothing read yet, nothing edited.
- AUTHORITY READ — .agents/AGENTS.md (163 lines), .agents/INDEX.md (29), .agents/TELEPHONY_AND_PORTAL.md (84) read complete.
- HEAD at start: 0b208ef17edba4b8e145bbdbb3e42ea68cd87267 (NOT f09869601 — other agents have committed since the dossier).
- Claimed files CLEAN at start (git status --porcelain on portal.ts / schema.ts / drizzle/ returned empty).
- DEFECT CONFIRMED — apps/api/src/routes/portal.ts
  - :51-60 configuredPortalOtpCode(); :53-56 `if (process.env.NODE_ENV !== "production") { return code || "0000"; }`
    -> ONE GLOBAL STATIC CODE "0000" on this disk (NODE_ENV=development).
  - :77 `return { success: true, message: "OTP sent" };` with comment at :75-76 admitting nothing is sent. Facade.
  - :92-103 verify compares the single global constant; :113-139 then issues a 12h portal session for
    whichever patient matches the phone suffix. Live medical-record bypass.
  - DOSSIER DRIFT: dossier cited :51-62. Real bypass block is :53-56. Packet brief's "drifted up ~4 lines" is right.

## Investigation results (recorded before editing)
- NO existing OTP / verification-code store anywhere in apps/api/src. `rg -i otp` matched only
  "snapshotPath" substrings. Closest analogue is `dente_telegram_link_codes` (schema.ts:612) —
  codeFingerprint + expiresAt + usedAt. Not reusable (telegram subject linking, unique fingerprint
  constraint, different lifecycle). => A NEW TABLE IS GENUINELY REQUIRED. schema.ts + drizzle/0133 in play.
- Max existing migration ordinal = 0132 (`0132_transactional_reply_intent.sql`). New file = 0133.
- smsTransport.ts is at apps/api/src/smsTransport.ts — NOT apps/api/src/services/ as the packet brief said.
  DOSSIER/BRIEF CORRECTION.
- MACHINE_DELIVERABLE_CHANNELS is at channelRouter.ts:43, NOT :213. DOSSIER/BRIEF CORRECTION.
- Existing seam to use: resolveChannelCredentials(orgId) + sendThroughChannel({channel:"sms"}) —
  channelRouter.ts:88 / :155. SMS creds come from env (channelRouter.ts:111 -> readSmsCredentialsFromEnv).
- A REAL global IP rate limiter already covers /api/portal/ at 30/min: security/rateLimit.ts:79.
  The bespoke `otpRequestCounts` Map in portal.ts:28 duplicates it AND never prunes (unbounded memory
  growth per distinct IP). Removing it; per-IP stays covered by the registered global limiter.
- PBKDF2 COST MEASURED on this host: PBKDF2-SHA512 100k = 37.6 ms BLOCKING per call; HMAC-SHA256 = 0.002 ms.
  Verdict: 37.6 ms is acceptable — same cost /api/auth/clinic/login already pays via verifyCredential.
  Using hashCredential/verifyCredential as instructed. Exactly ONE PBKDF2 call per verify attempt.
- .env defines NODE_ENV but NO DENTE_SMS_* and NO PORTAL_MVP_OTP_CODE => SMS is unconfigured on this disk.

## Progress
- MIGRATION APPLIED. `npm run db:migrate:check` -> "[migrate] будет применён: 0133_portal_otp_codes.sql /
  Всего файлов: 91, к применению: 1, уже было: 90". Then `npm run db:migrate` -> "[migrate] применён:
  0133_portal_otp_codes.sql / применено: 1, уже было: 90". Table portal_otp_codes now exists in the live DB.
- EDIT WRITTEN — 3 files:
  - apps/api/drizzle/0133_portal_otp_codes.sql (new table + 2 indexes + 4 CHECK constraints incl.
    code_hash LIKE '%:%' AND length >= 96, which makes storing a plaintext code a DB error)
  - apps/api/src/db/schema.ts (portalOtpCodes appended at end of file)
  - apps/api/src/routes/portal.ts (send-otp / verify-otp rewritten; /me and /documents untouched)
- Design landed: per-request+per-patient CSPRNG randomInt code, 6 digits, TTL 300s, max 5 attempts,
  60s resend cooldown, 5 per hour, PBKDF2 hash only, single-use via conditional UPDATE, real SMS via
  resolveChannelCredentials + sendThroughChannel. Dev fallback = per-request random code to server log
  only (never in HTTP body), unreachable when NODE_ENV=production. Bespoke leaky IP Map deleted.
- Uniform-response decision recorded in code comments: send-otp returns identical 202 for unknown /
  ambiguous / throttled; honest 503/502 only for server-side gateway facts. Residual leak during a
  gateway outage is named explicitly in a comment rather than hidden.

- GATE PASSED — `npm run typecheck -w @dental/api` EXIT 0.
- COMMITTED d719cb192da8a63fca2d128374c480df7429daf1 — verified with `git log -1 --stat`:
  Russian subject intact (no mojibake), exactly 3 files, 614 insertions / 81 deletions.
  Pre-commit "IRON GATE" ran gitleaks: "no leaks found". Biome skipped (not on PATH) — as expected.

## Proofs found TWO more real defects — both fixed in a second commit
1. LEAK I INTRODUCED: send-otp added `"delivery"` only in the patient-found branch, so a known number
   and an unknown number returned different JSON. Caught by the live probe, not by typecheck.
2. PRE-EXISTING, MUCH WORSE: findUniquePatientByPhone used ilike(patients.phone, '%'||suffix) against
   the RAW column. Phones are stored "+7 916 555-11-22", which never ends in 10 consecutive digits.
   Measured on the live DB: 13 of 16 patients with a phone = 81% could NEVER be found. send-otp would
   have answered 202 and sent nothing for them — and my neutral response made it invisible.
   Fixed with regexp_replace on both sides; "exactly one match or refuse" preserved.

- PROVEN:
  - TYPECHECK: `npm run typecheck -w @dental/api` EXIT 0 (twice — after each commit).
  - UNIT: `node --import tsx --test src/tests/routes/portalOtp.test.ts` -> pass 7 / fail 0.
  - API (live 127.0.0.1:4100): "0000" -> 401 InvalidOtp. Formatted phone -> 202. Unknown phone body
    BYTE-IDENTICAL to known phone body.
  - DB (127.0.0.1:5432): rows show channel/delivery_status/attempt_count/expiry; code_hash always
    matches ^[0-9a-f]{64}:[0-9a-f]{128}$; rows storing anything else = 0.
  - Adjacent: enumContractDrift + routeRegistrationCoverage -> pass 5 / fail 0.
  - check-encoding.mjs still RED only on the known baseline file; 0 hits for "portal".

- COMMITTED (second) e14bc316a844cceb2d19361ce7f80503d1c0f13e

## COLLISION — MUST BE REPORTED
Commit e14bc316a also contains `delete apps/web/src/components/analytics/LostPatientsFiltersWidget.tsx`,
which is NOT mine. Another agent had already STAGED that deletion in the shared git index; `git commit -F`
commits the whole index, not just the paths I passed to `git add`. The deletion is self-consistent (the
widget has no remaining imports, only explanatory comments), so the tree is not broken — the damage is
attribution only. NOT reverted: rewriting history under three concurrent agents is worse than a
mis-attributed deletion. Process note for the fleet: explicit `git add` does NOT protect you here.

## Cleanup
- Deleted the 2 portal_otp_codes probe rows I created against the shared dev DB. Test cleans up its own
  org/patient (verified leftover = 0). Tree clean for all four of my files.

- DONE.
