# V5-payload-before-auth — state

STATUS: DONE — COMMITTED 06246d053 (fix) + dd91e67a2 (test), PROVEN, handoff.md written.
Proof labels earned: UNIT VERIFIED (load-bearing, fails on 06246d053^), API VERIFIED (127.0.0.1:4100),
SMOKE VERIFIED (gate ok:true after rebuild — but its payloadBeforeAuthorisation list is a hardcoded
literal and CANNOT shrink from an auth.ts edit; that is a packet error, see handoff «Долг» п.3),
TYPECHECK VERIFIED. NOT claimed: DB VERIFIED, UI VERIFIED, and a clean `npm test` verdict (the suite
is flaky right now from concurrent shared-PostgreSQL teardown collisions in three files that are not
mine and pass standalone).
Full record: handoff.md in this directory.

(historical) STATUS: STARTED (RESUMED — predecessor instance died at DEFECT CONFIRMED)
RESUME NOTE: everything below the line "## AUTHORITY READ" was written by a previous instance of this
packet that died. It is treated as a LEAD, not as evidence. Every line citation and every git fact is
being re-derived against live HEAD before any edit. New verified findings are appended under
"## RESUMED RUN".
HEAD recorded by predecessor (NOT trusted, HEAD moves): 8f56e5ae48eddc568304eaba5c3f09311e83b019
Claim: apps/api/src/routes/auth.ts + its node:test (apps/api/src/routes/auth.test.ts — exists already)
Gate: npm run typecheck -w @dental/api

## AUTHORITY READ
- .agents/AGENTS.md (full), .agents/INDEX.md (full), .agents/ARCHITECTURE.md (full).
- apps/api/src/routes/auth.ts (697 lines, full), apps/api/src/security/identity.ts (full),
  apps/api/src/utils/timingSafeSecretEqual.ts (full), apps/api/src/routes/auth.test.ts (full),
  scripts/smoke-clinical-mutation-guard.mjs (full), scripts/lib/api-route-census.mjs (full).

## git state
- auth.ts CLEAN (git status --porcelain -- apps/api/src/routes/auth.ts => empty).
- scripts/smoke-clinical-mutation-guard.mjs CLEAN.
- Dirty in tree (not mine, do not touch): apps/api/.data/*.json, apps/web/tsconfig.tsbuildinfo,
  scratch/audit-settings-props.mjs.

## DEFECT CONFIRMED — exact lines at HEAD 8f56e5ae4
1. POST /api/auth/clinic/set-password (registered auth.ts:277)
   - auth.ts:278  body parse
   - auth.ts:279-281  `if (!body.newPassword || String(body.newPassword).length < 8)` -> 400 ValidationError
     "Новый пароль должен быть не короче 8 символов."
   - auth.ts:283-291  getRequestIdentity / isOrgAdmin / configuredAdminSetupKey / timingSafeSecretEqual
   - auth.ts:292-295  `if (!isOrgAdmin && !hasValidSetupKey)` -> 403 Forbidden
   => VALIDATION BEFORE AUTHORISATION. Packet citation 278-281 / 283-292 is ACCURATE.

2. POST /api/auth/staff/set-pin (registered auth.ts:325)
   - auth.ts:326  body parse
   - auth.ts:327-329  `if (!body.userId)` -> 400 "Не указан сотрудник."
   - auth.ts:330-332  `if (!body.newPin || !/^\d{4,12}$/...)` -> 400 "PIN должен состоять из 4–12 цифр."
   - auth.ts:334-341  identity / setup key
   - auth.ts:343-346  `if (!isOrgAdmin && !hasValidSetupKey)` -> 403 Forbidden
   => VALIDATION BEFORE AUTHORISATION. Packet citation "331-337 / 339-348" is OFF BY ~4 LINES and the
   phrase "checks that the employee exists" is WRONG: pre-guard code only checks that userId is PRESENT
   in the body. The DB existence lookup is auth.ts:348-357, already BEHIND the guard. So no
   employee-existence oracle exists; what leaks is the PIN policy shape + required field names.
   DOSSIER/gate reason text must be corrected, not the claim that the ordering is wrong.

## Same pattern elsewhere in auth.ts (packet step 2)
- POST /api/auth/staff/unlock: validation auth.ts:177-179 (400 ValidationError) BEFORE the clinic-token
  check auth.ts:186-188 (401 ClinicAuthRequired). THIRD instance, low value: no DB touch before the
  guard (DB select is 192, after), leaks only required field names. It is registered in the gate as
  unauthenticatedByDesign with expectedStatusCodes [400] (smoke script:138-143), so flipping it would
  make that gate entry stale and change a login-path response. REPORTED, NOT FIXED.
- Correct order already: /api/auth/invites/create (guard 551-553 before validation 554),
  /api/auth/user/me (626), /api/auth/user/update-password (auth 653 before validation 654-657),
  /api/auth/user/update-pin (auth 679 before validation 680-683).
- Not applicable (the body IS the credential / first-run): clinic/login, login, register, setup/init,
  invites/accept, GET status.

## Gate reality check (correction to the packet's proof plan)
The packet says the gate "already prints" the payloadBeforeAuthorisation list derived from behaviour.
IT DOES NOT. scripts/smoke-clinical-mutation-guard.mjs:273-288 is a HARDCODED accommodation list that
feeds a well-shaped payload so the probe can reach the guard. For the two routes to disappear from the
printed list, those two entries must be deleted from the script. Deleting them is also what turns the
gate into a regression test: with payload `{}` the routes must still answer 401/403 or the gate FAILS
at script:388. The gate loads apps/api/dist/server.js (api-route-census.mjs:26-32) => REBUILD dist
before every gate run.

## NEXT (about to run)
- live API before-probe: POST http://127.0.0.1:4100/api/auth/clinic/set-password and /api/auth/staff/set-pin
  with empty body, no credentials -> expect 400 ValidationError (the defect, observed).
- npm run build -w @dental/api, then node scripts/smoke-clinical-mutation-guard.mjs (BEFORE list).

═══════════════════════════════════════════════════════════════════════════════
## RESUMED RUN — independently re-derived, do not read the section above as evidence
STATUS: DEFECT CONFIRMED
HEAD now: c0d94fa9d9bbb4a60a48616c28bad9b3f5d72f5b  (predecessor's 8f56e5ae4 is stale — HEAD moved)

### git state re-checked at c0d94fa9d
- `git status --porcelain -- apps/api/src/routes/auth.ts apps/api/src/routes/auth.test.ts
   scripts/smoke-clinical-mutation-guard.mjs` => EMPTY. All three CLEAN. No collision.
- `git diff --cached --name-only` => EMPTY. Nothing staged by anyone at start.

### Read in full this run
.agents/AGENTS.md, .agents/INDEX.md, .agents/ARCHITECTURE.md,
apps/api/src/routes/auth.ts (697 lines), apps/api/src/routes/auth.test.ts (278),
apps/api/src/security/identity.ts (274), apps/api/src/security/authSecret.ts (125),
apps/api/src/utils/timingSafeSecretEqual.ts (8), scripts/smoke-clinical-mutation-guard.mjs (701).

### DEFECT 1 CONFIRMED — POST /api/auth/clinic/set-password (registered auth.ts:277)
- 278       body parse
- 279-281   `if (!body.newPassword || String(body.newPassword).length < 8)` -> 400 ValidationError
- 283-290   getRequestIdentity / isOrgAdmin / configuredAdminSetupKey / timingSafeSecretEqual
- 292-295   `if (!isOrgAdmin && !hasValidSetupKey)` -> 403 Forbidden
VALIDATION BEFORE AUTHORISATION. Packet citation 278-281 / 283-292 is ACCURATE.

### DEFECT 2 CONFIRMED (ordering) — POST /api/auth/staff/set-pin (registered auth.ts:325)
- 326       body parse
- 327-329   `if (!body.userId)` -> 400 "Не указан сотрудник."
- 330-332   `if (!body.newPin || !/^\d{4,12}$/.test(...))` -> 400 "PIN должен состоять из 4–12 цифр."
- 334-341   identity / setup key
- 343-346   `if (!isOrgAdmin && !hasValidSetupKey)` -> 403 Forbidden
VALIDATION BEFORE AUTHORISATION.
TWO PACKET/DOSSIER ERRORS, independently reconfirmed against the live file:
 (a) line numbers "331-337 / 339-348" are off by 4-6; real numbers are 327-332 / 343-346.
 (b) "checks that the employee exists" is FALSE. Pre-guard code only checks that `userId` is
     PRESENT in the body (327). The DB existence lookup is 348-357 and is ALREADY behind the
     guard (and only runs for isOrgAdmin). There is NO employee-existence oracle today. What
     actually leaks is the PIN policy shape + the required field names. The gate's own reason
     string repeats this error verbatim (smoke script:286).

### getRequestIdentity is DB-free (identity.ts:134-214)
Pure HMAC token verification + per-request cache. Moving it ahead of validation adds NO database
work to the anonymous path. The packet's "latent 500/side-effect surface ... touches the database
before authorisation" does not apply to either of these two handlers as written.

### Same pattern elsewhere in auth.ts (packet step 2) — full sweep of all 12 routes
- THIRD INSTANCE, reported not fixed: POST /api/auth/staff/unlock — validation 177-179 (400
  ValidationError) BEFORE the clinic-token check 186-188 (401 ClinicAuthRequired). DB select is
  192, already behind the guard. Leak = required field names only.
- Correct order already: /api/auth/invites/create (guard 551-553 before validation 554),
  /api/auth/user/me (626), /api/auth/user/update-password (auth 653 before validation 654-657),
  /api/auth/user/update-pin (auth 679 before validation 680-683).
- Not applicable, body IS the credential / first-run: clinic/login, login, register, setup/init,
  invites/accept, GET status.

### GATE REALITY — packet proof plan is impossible as written
`payloadBeforeAuthorisation` (smoke script:273-288) is a HARDCODED accommodation list, printed
verbatim into the report at script:678-681. It is NOT derived from behaviour. The packet's "the two
routes must disappear from its list ... the gate already prints it for you" cannot happen from an
auth.ts edit alone: the two entries must be DELETED from the script, and scripts/ is OUTSIDE my
file claim. Mechanics that matter: those two routes are in `probePayloads` only, NOT in
`exceptions` (script:304-313), so script:386-392 already demands 401/403 from them. After my fix
they answer 403 to an EMPTY body too, which is exactly what removing the entries would test.

### EDIT WRITTEN
Both handlers reordered in apps/api/src/routes/auth.ts: the identity/setup-key block and the
`if (!isOrgAdmin && !hasValidSetupKey)` refusal now run BEFORE any body validation. Body parse stays
first because `adminKey` is a CREDENTIAL carried in the body — it is read, never validated.
Post-guard validation order preserved verbatim for authorised callers.
Mojibake check on auth.ts: mojibake_lines=0.

### GATE PASSED
`npm run typecheck -w @dental/api` => TYPECHECK_EXIT=0 (twice: after the fix, and again after the test).

### COMMITTED
- 06246d0532ffce6adc18ae13c494debe7372bfba — fix, 1 file, +31/-9, only apps/api/src/routes/auth.ts.
- dd91e67a2eb677a6017406b26686517a5a163388 — test, 1 file, +298, only apps/api/src/routes/auth.test.ts.
Russian subjects intact in `git log -1 --stat`, no foreign files in either commit.

### PROOF: node:test is LOAD-BEARING (this is the load-bearing evidence)
`node --import tsx --test apps/api/src/routes/auth.test.ts` => tests 19, pass 19, fail 0, exit 0.
Against auth.ts from 06246d053^ (reverted in ONE atomic command, restored with `git checkout --`
in the same command; `git status --porcelain` empty afterwards):
  exit 1, and exactly the two anonymous-refusal tests fail with `actual: 400, expected: 403`.
  The four contract tests pass on BOTH revisions — that is what makes them a contract fixture.

### NEXT (slow commands, about to run in this order)
1. `npm run build -w @dental/api`   — MANDATORY: the gate loads apps/api/dist/server.js
   (api-route-census.mjs:26-32), so an unrebuilt dist would prove yesterday's code.
2. `node scripts/smoke-clinical-mutation-guard.mjs` — expect ok:true, no regression. The
   payloadBeforeAuthorisation list will STILL print both routes because it is a hardcoded literal,
   not a measurement. Report that as the packet/dossier correction, do NOT claim the list shrank.
3. read-only `node -e` probe against the REBUILT dist: empty body, no credentials -> must be 403.
4. `npm test -w @dental/api` summary.
5. live API probe against 127.0.0.1:4100 (tsx watch has picked up the source edit).
