# U1-identity-verified — adversarial review

Reviewer: independent (did not write this code). Posture: disbelief.
Reviewed commits: dfe75e1bb, 31f8a2e37, feb39fe35, e14c09862
Repo HEAD at review time: e14c09862

STATUS: COMPLETE

---

## 1. DEFECT REAL BEFORE THE COMMIT? — CONFIRMED

`git show dfe75e1bb^:apps/api/src/security/identity.ts` — I counted the lines myself:

- pre-fix lines **107-113** are exactly:
  ```
  107  if (!identity.organizationId && devHeaderOrgAllowed()) {
  108    const headerOrg = headerValue(request, ORGANIZATION_HEADER);
  109    if (headerOrg) {
  110      identity.organizationId = headerOrg;
  111      identity.verified = false;
  112    }
  113  }
  ```
- pre-fix lines **132-142** are exactly `requireOrganizationId`, whose only test is
  `if (!identity.organizationId)` → 401 AuthRequired. `verified` is never read.

The cited line numbers are not approximate — they are exact. No inflation.

`git grep -n "\.verified" HEAD -- apps/api/src` → 5 hits: writes at identity.ts:157, 165, 178,
the NEW read at identity.ts:192, and one test assertion at tests/security.test.ts:129.
Before the fix that is **3 writes, 1 read, and the only read is in a test**. Zero production
consumers, exactly as claimed.

Production fail-fast quoted correctly: `git grep -n` puts `"DENTE_DEV_ALLOW_HEADER_ORG"` at
**server.ts:95**, inside the `unsafeFlags` array (server.ts:90-98), and the
`throw new Error("Небезопасные флаги разработки включены в production: ...")` sits at
server.ts:102-104 (claim said "100-105" — the enclosing `if (isProduction)` block, close enough
to be honest). So the hole is latent in production, live only in dev with the flag on. The
packet states this accurately and does not oversell.

## 2. MEASUREMENTS — REPRODUCED

| Claim | My re-measure | Verdict |
|---|---|---|
| requireOrganizationId: 89 lines / 17 files | `git grep -c` at **dfe75e1bb^** → LINES=89, files=17 | EXACT (pre-fix baseline, as a blast-radius measurement should be) |
| same at HEAD | 91 lines / 18 files (+1 line in identity.ts comment, +1 new test file) | consistent |
| `.verified`: 3 writes + 1 test read, 0 prod consumers | confirmed above | EXACT |
| 9 test files depend on DENTE_DEV_ALLOW_HEADER_ORG | 8 with `= "1"` + patientRecall.test.ts:42 via `process.env = { ...originalEnv, DENTE_DEV_ALLOW_HEADER_ORG: "1" }` = 9 pre-existing | EXACT (my first regex missed patientRecall; the builder's list is right) |
| `request.user` has no real production reader | `git grep "request.user"` in apps/api/src non-test → migration/llmClient.ts:126 (an LLM chat message object, unrelated) plus two comments. **No production code dereferences request.user.organizationId.** | CONFIRMED — dropping the org cannot 500 |

## 3. PROOF AUDIT — RE-RAN EVERY COMMAND

- `node --import tsx --test apps/api/src/tests/security/unverifiedOrganizationMutation.test.ts`
  → **tests 6, pass 6, fail 0, skipped 0, TRUE_EXIT=0**. All six named subtests printed ✔,
  including the two that need PostgreSQL. Matches the claim exactly; nothing silently skipped.
- `npm run typecheck -w @dental/api` → **TRUE_EXIT=0**, clean.
- `npm test -w @dental/api` → **tests 958, suites 156, pass 958, fail 0, cancelled 0,
  skipped 0, TRUE_EXIT=0.** Matches the claim exactly.
  The run DID print a `✖ failing tests:` section with two entries — but both are **after-hook
  teardown FK collisions**, not test failures: portalOtp.test.ts:147 `delete from organizations
  where id = ...901` blocked by `patients_organization_id_organizations_id_fk`, and
  speechTranscribeChunkAccess.test.ts:106 `delete from patients where organization_id = ...901`
  blocked by `portal_otp_codes_patient_id_fkey`. The two suites share org UUID
  `dce70000-...-901`/`-902` and race each other's cleanup. Nothing to do with identity.ts (which
  performs no DB work at all). The builder **disclosed** this noise in its own claim rather than
  hiding it. Not a regression, not a fabrication.

(continued below)

## 4. IS THE FIX REACHABLE? — CONFIRMED, traced myself

- `getRequestIdentity` is called in the global `onRequest` hook at **server.ts:310** (I read
  server.ts:303-311 directly). Every request goes through it.
- `registerClinicalRoutes(app)` is at **server.ts:356**, registered on the ROOT instance — so the
  builder's test (bare Fastify + real `registerClinicalRoutes`) is faithful to how the real server
  wires these routes.
- `requireOrganizationId` is imported into accessGuard.ts:5 **under the alias
  `requireVerifiedOrganizationId`** and is what `requireResolvedOrganizationId` (:108),
  `requireClinicalReadContext` (:152) and `requireClinicalMutationContext` (:163) actually call.
  So the one edit covers the whole accessGuard family. Not dead code.
- Live dev server on 127.0.0.1:4100 answers; `GET /api/health` → 200.

## 5. BYPASS ATTEMPTS — I RAN A 14-CASE MATRIX. THE GUARD HELD.

Probe: my own Fastify 5.8.5 app (version confirmed from
`apps/api/node_modules/fastify/package.json`) with the REAL `registerClinicalRoutes`, listening on
127.0.0.1, `DENTE_DEV_ALLOW_HEADER_ORG=1`, `DENTE_CLINICAL_ALLOW_UNGUARDED_MUTATIONS=1`,
`DENTE_CLINICAL_ALLOW_UNGUARDED_READS=1`, no admin secret. Attacker org
`dce70000-0000-4000-8000-0000000009e1`, which exists in no `organizations` row.

| # | Attack | Observed |
|---|---|---|
| A1 | POST /api/clinical/rules/evaluate, header only, no token | **401 UnverifiedOrganizationCannotMutate** |
| A2 | POST /api/clinical/rules, header only, body `{}` | 400 ClinicalRuleValidationError (see nit 1) |
| A3 | PATCH /api/clinical/rules/:id, header only | **401 UnverifiedOrganizationCannotMutate** |
| A4 | POST /api/clinical/phase-completions, header only | **401 UnverifiedOrganizationCannotMutate** |
| A5 | GET /api/clinical/tasks, header only | 200 (read deliberately kept — see §7) |
| B1 | POST evaluate + garbage clinic token `not.a.token` | **401 UnverifiedOrganizationCannotMutate** |
| B2 | POST evaluate + token FORGED with the wrong secret | **401 UnverifiedOrganizationCannotMutate** |
| B3 | POST evaluate + EXPIRED but correctly-signed token | **401 UnverifiedOrganizationCannotMutate** |
| B4 | POST evaluate + VALID token for org A **and** header naming org B | 200 — the **token wins**, the header is ignored because `if (!identity.organizationId && devHeaderOrgAllowed())` never runs. No cross-tenant escalation. |
| B5 | POST evaluate, no headers at all | 401 **AuthRequired** — the two refusal reasons are genuinely distinguishable, as claimed |
| C1 | POST evaluate, header value padded with spaces | 401 UnverifiedOrganizationCannotMutate |
| C2 | POST evaluate, header name `X-Organization-Id` (different case) | 401 UnverifiedOrganizationCannotMutate |
| D1 | raw socket, lowercase verb `post` (to dodge `READ_ONLY_METHODS` uppercasing) | 400 Bad Request from node's HTTP parser — never reaches Fastify |
| E | **keep-alive socket, then `server.close()`, then pipeline a mutation while `listening === false`** | first response 200, `listening=false` confirmed, then **ECONNRESET** — Fastify destroyed the socket. **Attack did not land.** |

No credential-shape attack got a write through. `verifyToken` failing (garbage/forged/expired) falls
through to the header path and is then blocked, rather than being upgraded to verified.

**Residual risk on attack E, stated honestly:** I proved `listening` is false during shutdown, and I
could not get a request served in that window because Fastify 5 reset the connection. An attacker
with a request already in flight at the instant `close()` lands is a race I did not demonstrate and
cannot rule out. It requires the dev flag on, local network reach, and sub-millisecond timing during
a shutdown. Narrow; not a blocker.

## 6. THE DESIGN HYPOTHESIS — INDEPENDENTLY RE-PROVEN, AND EXTENDED

I wrote my own probe on Fastify 5.8.5. `request.server.server.listening`:

```
before listen (inject)      ROOT=false   ENCAPSULATED(prefix)=false
after listen  (inject)      ROOT=true    ENCAPSULATED(prefix)=true
after listen  (real socket) ROOT=true    ENCAPSULATED(prefix)=true
```

The builder's claim is reproduced. I also tested something the builder did not: **encapsulated
plugin contexts**. server.ts registers inventory/portal/public-booking/telephony/max/whatsapp via
`app.register(..., { prefix })`, where `request.server` is the child instance. `request.server.server`
still resolves there, so the guard neither over-blocks those routes nor silently degrades. Had it
not resolved, `serverAcceptsNetworkConnections` returns `true` — i.e. it **fails closed**, which is
the correct direction anyway.

## 7. WHAT THE FIX DOES **NOT** CLOSE — and whether that is acceptable

With `DENTE_DEV_ALLOW_HEADER_ORG=1`, a caller with **no credential at all** can still `GET` any
tenant's data by naming its UUID in the header (my A5: HTTP 200). That is precisely the IDOR the
file's own header comment claims to have fixed ("любой человек мог отправить чужой UUID организации
и **прочитать**/изменить карты пациентов другой клиники"). So the read half of the original IDOR
remains open whenever the flag is on.

This is **not** a deviation from orders: the brief explicitly offered the choice "or it keeps working
for genuinely dev-only read paths while a new explicit accessor is required for anything that
mutates", and the load-bearing requirement was "an unverified header-supplied organization must not
be able to write clinical data". The builder took the sanctioned option and said so plainly. The
cross-tenant read is a pre-existing, flag-gated, dev-only exposure that this packet narrowed rather
than widened. It should be a follow-up packet, not a rework of this one.

## 8. NULL-PROPAGATION AUDIT — the risk the fix creates, checked route by route

The fix does not 401; it **nulls `identity.organizationId`**. Everything downstream must handle null.
I checked every direct reader:

- `accessGuard.resolveOrganizationId` (accessGuard.ts:97) returns the raw value. Its five callers in
  `routes/diary.ts` (:53, :74, :105, :234, :429) and five in `routes/templates.ts` (:17, :45, :66,
  :109, :141) all do `if (!orgId) return reply.code(403).send({ error: "OrgRequired" })`.
- `routes/workspaceProfile.ts:22` has its **own local duplicate** `resolveOrganizationId` (a
  pre-existing second owner, not introduced here) — it also reads the assembled identity, so it is
  covered by the fix, and all five call sites (:434, :462, :478, :517, :548) do
  `if (!organizationId) return reply.code(401).send({ error: "Unauthorized" })`.
- `accessGuard.requireResolvedStaffOrAdminOrganizationId` 401s on null.
- `request.user`: the only non-comment occurrence in apps/api/src outside tests is
  `migration/llmClient.ts:126`, `{ role: "user", content: request.user }` — an LLM chat message
  object, unrelated to Fastify. **Nothing dereferences `request.user.organizationId`.** No 500 path,
  no unscoped query, no `WHERE organization_id IS NULL` leak.

This is the fact that vindicates the design choice: an accessor-only fix would have left
workspaceProfile's local duplicate and diary/templates reading a live unverified org.

## 9. RED-GATE PROOF — the test CAN go red, and it reproduces the original 201

A gate nobody proved can go red is not a gate. I built an **out-of-repo** scratch tree
(`%TEMP%\u1probe\rg\api\src`, with `node_modules` junctions to the repo's root and api
node_modules — junctions removed afterwards with a non-recursive
`[System.IO.Directory]::Delete`, and both real `node_modules` verified intact at 475 / 14 entries),
copied `apps/api/src` into it, and replaced ONLY `security/identity.ts` with
`git show dfe75e1bb^:...` (175 lines vs 274 at HEAD). The repo itself was never touched.

Running the committed test against pre-fix code:

```
X живой сервер: клиническая запись по одному заголовку организации отклонена
X живой сервер: POST-чтение по одному заголовку организации тоже отклонено
+ живой сервер: запрос вообще без заголовков получает обычный AuthRequired
+ живой сервер: подписанный токен кабинета по-прежнему пишет
+ живой сервер: чтение по заголовку организации остаётся рабочим
+ app.inject без слушающего порта: заголовок организации работает и на POST
tests 6  pass 4  fail 2   TRUE_EXIT=1
    actual: 500,  expected: 401     <- POST /api/clinical/rules,          header only
    actual: 200,  expected: 401     <- POST /api/clinical/rules/evaluate, header only
```

Exactly the two refusal assertions go red and the four "preserved behaviour" assertions stay
green — the test is precisely targeted, not a blanket.

**And this independently reproduces the original defect, harder than the packet did.** Pre-fix,
the header-only `POST /api/clinical/rules` returned **500**, not 401 — because it got all the way
into `createClinicalRuleInDb` and the INSERT died on the organizations foreign key (the attacker
org exists in no `organizations` row). A credential-less request reached the database write. With
a real org UUID that is the 201 the S1 reviewer reported. Pre-fix `POST /rules/evaluate` returned
**200**: a full clinical rule evaluation for an org the caller merely named.

## 10. apply-dev-env.ps1 — BOTH the before and the after reproduced in a sandbox

Sandbox = temp dir with three fake ASCII `.env` files. **The real `.env` files were never run
against.** Copy verified byte-identical to the commit (md5 `7390c02876768384a061a255bea6b085` for
old, `1e5d8388582595243b5f26ee9fc3d1d0` for HEAD).

Environment claims: `powershell $PSVersionTable.PSVersion` -> **5.1.26100.8875**; `pwsh --version`
-> **not on PATH**. Old script first three bytes -> **35 32 226** (`# ` then 0xE2, no BOM). All three
reproduce exactly.

**BEFORE (`31f8a2e37^`):**
```
TRUE_EXIT=1
ParserError ... MissingEndCurlyBrace   at :47, :46, :48, :80
md5 of .env / .env.local / apps/api/.env: UNCHANGED (byte-identical before and after)
DENTE_DEV_ALLOW_HEADER_ORG assignments: 0 / 0 / 0
no .bak files -> the script never reached its first write
```
The line numbers 46/47/48/80 match the claim exactly. **The dossier's "One run by any developer
reopens the hole across the whole API" was FALSE, and the builder is right to correct it.** The
script could not execute a single statement on this machine. The intent to arm three env files was
real; the execution never was. This is a hard, reproducible correction of the brief, not a
rationalisation.

**AFTER (HEAD):** script contains **0 bytes above 0x7F**, no BOM.

| Scenario | Claimed | I observed |
|---|---|---|
| default run | EXIT 0, dev flags 3/3, header-org 0/0/0, secret generated | EXIT 0, `DENTE_ALLOW_DEMO_LOGIN` 1/1/1, header-org **0/0/0**, `AUTH_TOKEN_SECRET` 1 line in apps/api/.env |
| secret value printed? | never printed | `grep -c 'AUTH_TOKEN_SECRET='` on stdout = **0** |
| second run | three `already set`, no duplication | exactly three `already set`; DEMO_LOGIN 1 line/file, AUTH_TOKEN_SECRET 1 line |
| `-AllowHeaderOrg` | red block; .env 0, .env.local 1, apps/api/.env 0 | red ARMING block printed; **0 / 1 / 0** |
| legacy-armed tree | warning names exactly apps/api/.env | warning listed **only** apps/api/.env; the operator file was left byte-for-byte alone |
| produced .env encoding | 0 bytes above 0x7F | **0** in all three (845 / 1176 / 921 bytes; the claim's 816/905 differ only because my seed content differs) |

**Is `-AllowHeaderOrg` a hollow facade?** No. I checked the target is really loaded:
`apps/api/src/env/loadServerEnv.ts:65-72` `baseEnvFiles()` returns
`cwd/.env.local`, `cwd/.env`, `cwd/../../.env.local`, `cwd/../../.env` — from `apps/api` the third
entry is the repo-root `.env.local` the script writes. Arming actually arms.

`Get-Random` -> `RandomNumberGenerator.Create()` for `AUTH_TOKEN_SECRET` is a real, unrequested
security improvement: a clock-seeded PRNG signing secret is forgeable.

## 11. GIT HYGIENE — CLEAN

```
dfe75e1bb  apps/api/src/security/identity.ts                                    (only)
31f8a2e37  apply-dev-env.ps1                                                    (only)
feb39fe35  apps/api/src/tests/security/unverifiedOrganizationMutation.test.ts   (only)
e14c09862  .agents/archon/packets/U1-identity-verified/{state,handoff,commitmsg*}  (only)
```
Grep across all four for `dist/`, `.data/`, `tsbuildinfo`, `scratch/`, `node_modules`, `.env`,
`.bak` -> **NONE**. No other author's work swept in, even though `a6a6f019b`, `e8be281d9` and
`637a83789` from other agents are interleaved in the same range. Subjects are Conventional Commits
in Russian and name the DEFECT, not the fix.

Working tree after my review is identical to how I found it (same 7 pre-existing modifications from
other authors, including the known non-fleet `DocumentsView.tsx` refactor).

**Mojibake / encoding:**
```
apps/api/src/security/identity.ts                     BOM=false brokenLines=0 cyrillic=3333 marks=0
apps/api/.../unverifiedOrganizationMutation.test.ts   BOM=false brokenLines=0 cyrillic=1814 marks=0
apply-dev-env.ps1                                     BOM=false brokenLines=0 cyrillic=0    marks=0
commit dfe75e1bb / 31f8a2e37 / feb39fe35 / e14c09862  all brokenLines=0, Cyrillic intact
```
The 3333 / 1814 figures match the claim exactly.

## 12. READ-ONLY SQL — closes the builder's own unproven item #2

Via the app's own db client (no credential handled or printed):
```
clinical_rules for builder ATTACKER_ORG ...09c1  -> 0
clinical_rules for MY probe org        ...09e1   -> 0
organizations row ...09c1 exists?                -> 0
organizations row ...09e1 exists?                -> 0
clinical_rules whose title looks like a probe    -> 0
total clinical_rules rows                        -> 0
```
No refused write persisted. The guard at clinical.ts:82 does precede `createClinicalRuleInDb` at
clinical.ts:84 — I read both lines. (Weak-positive caveat: the table is empty overall. The stronger
evidence is section 9 — pre-fix the same request produced an FK error from the INSERT, post-fix it
401s before any DB call.)

## 13. NITS — none of these is a blocker

**N1 (design, hardening).** The guard's discriminator is a **per-process** fact (`server.listening`)
standing in for a **per-request** one ("did this arrive over a socket"). A strictly better
per-request signal exists and I measured it on Fastify 5.8.5:
```
inject, BEFORE listen : ctor=MockSocket  isNetSocket=false  remotePort=undefined  request.ip=127.0.0.1  listening=false
inject, AFTER  listen : ctor=MockSocket  isNetSocket=false  remotePort=undefined  request.ip=127.0.0.1  listening=true
real socket           : ctor=Socket      isNetSocket=true   remotePort=53925      request.ip=127.0.0.1  listening=true
```
`request.raw.socket instanceof net.Socket` (and `remotePort === undefined`) separate inject from a
real socket **regardless of listening state**. The handoff says the difference is whether the
process is listening, and rules out `request.ip` and `NODE_ENV`; it did not test
`request.raw.socket`, so that framing slightly overstates that `listening` is the only
discriminator. Recommendation: keep `listening` and **AND** it with the socket check — defence in
depth, and it stays correct the day someone injects into the live server. Current behaviour fails
**closed**, so this is robustness, not a hole.

**N2.** `dfe75e1bb` is missing the mandated `[ARCHON] ` subject prefix. Self-disclosed in state.md
and handoff.md with a sound reason: `a6a6f019b` and `e8be281d9` from other agents landed after it,
so `--amend` would have rewritten another agent's commit. Correct call; disclosure beats a silent
history rewrite.

**N3.** With the flag on, a caller with no credential can still `GET` any tenant by UUID (my A5:
200). Brief-sanctioned and disclosed as debt, but the file's own header comment still claims the
read IDOR is fixed. Follow-up packet, not rework of this one.

**N4 (pre-existing, not this diff).** Payload validation runs BEFORE the auth guard in clinical.ts:
my A2 (`POST /api/clinical/rules`, header only, body `{}`) returned **400
ClinicalRuleValidationError**, not 401 — an unauthenticated caller can probe the request schema.
`clinical.ts` was not touched by this packet; the guard still blocks the write on a valid payload.

**N5 (pre-existing, adjacent).** `diary.ts:495` `POST /api/diaries/sync-progress` and `diary.ts:501`
`PUT /api/treatment-plans/:planId/signature` both `return reply.send({ success: true })` doing zero
work — hollow facades inside the census this packet measured. Out of scope here; someone should own
them.

**N6.** "server.ts:100-105 throws" is really the `if (isProduction)` block at 100-105 with the
`throw` at 102-104. Trivial.

**N7.** The "89 hits / 17 files" figure is the **pre-fix** baseline (reproduced exactly); at HEAD it
is 91/18. The handoff does not label it as a baseline. Immaterial.

## VERDICT: SOUND_WITH_NITS

I tried to destroy this and could not. Every load-bearing claim reproduced on the same command with
the true exit code; the central one reproduced twice over (the committed test passes 6/6 at HEAD and
fails 2/6 against pre-fix code, with the pre-fix failure showing the write reaching the database).
The one claim that contradicts the brief — that `apply-dev-env.ps1` never ran — is the
best-evidenced claim in the packet. Nothing here is fabricated proof: the packet's own
`НЕ ПРОВЕРЕНО` list is accurate, and one of its five items I was able to close myself with SQL.

The one thing I deliberately did NOT do: build the full `server.ts` app to prove the new refusal
branch on a real listening instance of the whole middleware stack. `buildServer()` starts cron and
sync daemons that would touch the shared dev database, and restarting the shared 4100 process is
forbidden. Instead I proved the branch on a listening socket with the REAL `routes/clinical.ts` and
verified statically that server.ts:310 (global onRequest hook) and server.ts:356 (root registration)
make that equivalent, plus that `request.server.server` resolves in encapsulated contexts too. That
gap is the lead's to close with one command, and the packet already names it.

---
Reviewer evidence artifacts (outside the repo):
`C:\Users\Admin\AppData\Local\Temp\u1probe\bypass.mjs`,
`C:\Users\Admin\AppData\Local\Temp\u1probe\encap.mjs`,
`C:\Users\Admin\AppData\Local\Temp\u1probe\transport.mjs`,
`C:\Users\Admin\AppData\Local\Temp\u1probe\sqlcheck.mjs`,
`C:\Users\Admin\AppData\Local\Temp\u1probe\mojibake.cjs`
