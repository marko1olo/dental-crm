# ARCHON — campaign ledger

Item → commit-hash. Append-only. Written by the lead, not by subagents.
Never store secrets, tokens, or raw logs here.

---

## Session start state (2026-07-28, local ~00:30 Samara)

- `HEAD` at start of campaign: **`f09869601`** — "Отправка в MAX по официальному протоколу; VK честно
  помечен долгом". This is **two commits ahead of the dossier baseline `807124fd5`**; `33bfaa5c5`
  (manager reports) landed in between, so the Manager Reports lane the dossier flagged as DIRTY is now
  **committed and free**.
- Live services confirmed by the lead personally:
  - API `127.0.0.1:4100/api/health` → **200**, `{"ok":true,"service":"dental-crm-api"}`
  - Web `127.0.0.1:5173/` → **200**
  - 12 `node.exe` processes live. Dev server is UP — do not start a second one.
- 221 untracked entries. `git add .` remains a catastrophe.

### DIRTY AT SESSION START — DO NOT TOUCH, NOT AUTHORED BY THIS FLEET

Real uncommitted feature work from a prior session, 222 insertions / 62 deletions across 6 files
(communications delivery console + DICOM source capability). Left alone deliberately:

| File | Δ |
|---|---|
| `apps/api/src/routes/communicationsOutbox.ts` | +50 |
| `apps/api/src/services/communications/dispatchWorker.ts` | +52 |
| `apps/web/src/App.tsx` | +22 |
| `apps/web/src/SettingsView.tsx` | ±104 |
| `apps/web/src/components/communications/MessageDeliveryConsole.tsx` | +36 |
| `apps/web/src/components/settings/sources/SourcesDicomCapability.tsx` | +20 |

Plus permanent churn, never stage: `apps/api/.data/dental-crm-state.json`,
`apps/api/.data/speech-key-health.json`, `apps/web/tsconfig.tsbuildinfo`, `scratch/audit-settings-props.mjs`.

**Consequence: `App.tsx` is unavailable this session.** Any packet needing a new root view is blocked
until that work is committed or reverted by its author. Backlog item 7 (five unreachable views) is
therefore deferred, not forgotten.

### Dossier anchors re-verified by the lead before fan-out

| Dossier claim | Status at `f09869601` |
|---|---|
| `AnalyticsDashboardView.tsx:45-46` `margin: number; completionRate: number` | CONFIRMED |
| `:438` `+{formatRub(doc.margin)}` in `.margin-positive` | CONFIRMED |
| `:452` `{doc.completionRate}%`, red because `null>=60` is false | CONFIRMED |
| `:88` `await res.json()` untyped | CONFIRMED |
| portal.ts `"0000"` default | CONFIRMED — **drifted to `:53-55`**, dossier said `:51-62` |
| portal.ts `{success:true, message:"OTP sent"}` sending nothing | CONFIRMED at `:77` |
| `workspaceRouteErrorBoundary.tsx:22` renders `error.stack` | CONFIRMED |
| 3× `smoke-workspace-live-*.mjs` resolve `apps/web/node_modules/vite/bin/vite.js` | CONFIRMED (`:36`, `:43`, `:44`) |
| `cronAnalyticsWorker.ts` `revenue * 0.4` / `completionRate: 85` | CONFIRMED at `:118-119` |
| `documentQuery.ts:190` `issuedByUserId: "doctor"` | CONFIRMED |
| `syncDaemon` zero live call sites | CONFIRMED — only `syncEngine.ts`, `tsconfig.json`, and stale `scratch/` refs |

Dossier is accurate. Only correction: portal.ts line numbers shifted ~4 lines up.

---

## CYCLE 1 — dispatched

Eight one-defect packets, disjoint file claims, all targets verified clean before dispatch.

**Run:** `wf_da0d6ab1-799` · script `.agents/archon/cycle1.workflow.js` (checked in beside this ledger,
deliberately — it is the campaign's reproducible unit of work, not a scratch file).

**RESUME AFTER A DEATH** (credit exhaustion, crash, interruption):
`Workflow({scriptPath: ".agents/archon/cycle1.workflow.js", resumeFromRunId: "wf_da0d6ab1-799"})`
Completed agents return cached results instantly; only the dead ones re-run. Before assuming a cached
result is non-empty, read `journal.jsonl` in the run's transcript dir.

**Width:** two waves of four builders, not eight at once. Reviewers pipeline in behind each builder as
it lands, so peak concurrency is ~4–8 agents rather than 16. Narrower on purpose: fewer simultaneous
agents means a lower credit burn rate and fewer mid-flight deaths.

**Death-resilience contract imposed on every agent:**
1. Write `<packet dir>/state.md` as the FIRST action, before reading anything, and update it at every
   milestone (STARTED → AUTHORITY READ → DEFECT CONFIRMED → EDIT WRITTEN → GATE PASSED → COMMITTED
   `<hash>` → PROVEN → DONE), including a note before any slow command.
2. **Commit as soon as the code is right and the gate is green — before running the proofs.** Proofs
   then land in a second commit. The commit is the durable artifact; a perfect uncommitted edit is
   worth nothing and actively blocks the next agent, who may not touch a file it did not dirty.
3. Never leave the tree dirty at a controllable stopping point. `git stash` stays banned.
4. If throttled, stop expanding scope and land a truthful partial handoff.
So a dead agent leaves behind: a committed diff, a `state.md` saying how far it got, and no dirty tree.

| # | Packet | Lane | Commit | Status |
|---|---|---|---|---|
| P1 | Analytics `+null ₽` / raw exception | WEB | `2cb0787d4` | committed |
| P2 | Portal OTP `"0000"` bypass | COMMS/SEC | `d719cb192` | committed; **API VERIFIED by lead** |
| P3 | `syncDaemon` fake backup | PLATFORM | `c97ceb4d8` | committed, reviewed |
| P4 | Production stack-trace leak | WEB | `800bde54f` + `068cc6f0c` + `1530ccdc7` | committed; 2nd commit contaminated |
| P5 | 3× vite-path smoke bug | PROOF | — | wave 2, queued |
| P6 | `issuedByUserId: "doctor"` | DOCS | — | wave 2, queued |
| P7 | Invented 40% margin in cron worker | MONEY | — | wave 2, queued |
| P8 | `check-encoding` mojibake red | PROOF | — | wave 2, queued |

Only P2 was authorised to touch `db/schema.ts` / `apps/api/drizzle/` this cycle.

### P2 — verified by the lead personally, not accepted on the agent's word
Migration `0133_portal_otp_codes.sql` **is applied**: `npm run db:migrate:check` → "Всего файлов: 91,
к применению: 0, уже было: 91". This mattered — a new table that was written but never migrated would
have left the portal *more* broken than the bypass it replaced.

**API VERIFIED** against the live server at `127.0.0.1:4100`:
- `POST /api/portal/auth/send-otp` `{"phone":"79000000000"}` → **202 Accepted**, uniform response,
  `x-ratelimit-limit: 30`, and the full security header set (`nosniff`, `DENY`, HSTS, `no-store`,
  `no-referrer`). Uniform 202 for unknown/ambiguous/throttled means no patient-enumeration oracle.
- `POST /api/portal/auth/verify-otp` `{"phone":"79000000000","code":"0000"}` → **401 Unauthorized**.
- The only remaining `"0000"` in `routes/portal.ts` is inside a comment documenting the old defect.

Design the agent landed: per-request + per-patient CSPRNG `randomInt`, 6 digits, TTL 300 s, max 5
attempts, 60 s resend cooldown, 5/hour, PBKDF2 hash only, single-use via conditional UPDATE, real
delivery through `resolveChannelCredentials` + `sendThroughChannel`. Dev fallback is a per-request
random code written to the server log only — never in the HTTP body — and unreachable when
`NODE_ENV=production`. The SQL carries a CHECK constraint (`code_hash LIKE '%:%'` and length ≥ 96) that
makes storing a plaintext code a **database error**, not merely a code-review question. It also deleted
a bespoke leaky in-memory IP map. The agent measured PBKDF2-SHA512 100k at **37.6 ms blocking per call**
before choosing, which is the kind of justification the brief demanded.

**P2 died mid-proofs** — after committing, before `handoff.md`. Its `state.md` records exactly where:
it was about to run the DB read, the API probe and the node:test. The durability protocol worked as
designed; I closed the API proof myself above. Still open: the node:test file and a DB read confirming
no plaintext is stored (the CHECK constraint makes that near-certain but it is not the same as
observing it).

### SECOND CONTAMINATION — and this one broke the build
`068cc6f0c` (P4's follow-up) swept in `git rm apps/web/src/components/visit/VisitDictation.tsx` — **399
lines belonging to the second author**, not to my fleet. Because the matching `VisitView.tsx` edit was
still uncommitted, HEAD was left importing a file that no longer existed at `VisitView.tsx:24` and
rendering it at `:337`. **Committed HEAD did not compile.** The working tree hid it, since the second
author's unsaved edit removes the import.
Repaired forward, not by rewriting shared history (a second author commits every few minutes and some
commits are pushed): `9d8a71f1c` restores the file as its own commit. The deletion is legitimate — the
second author is removing a duplicate dictation control — but it must land together with its
`VisitView.tsx` edit, as one commit, not in halves.
P4 itself flagged the contamination in its own `state.md` rather than hiding it. That is the reporting
standard working.

## INCIDENT 2026-07-28 00:45 — the lead swept another packet's work into his own commit

**What I did wrong.** I staged `.agents/DATABASE.md` and `.agents/AGENTS.md` with explicit paths, then
ran a bare `git commit -F`. A bare commit commits **the whole index**, not the paths you just added.
P3 had already run `git rm apps/api/src/services/syncDaemon.ts` (which stages instantly) and was
mid-typecheck. So commit **`8c87dcd93`**, whose subject is about database documentation, also contains
the 326-line deletion of `syncDaemon.ts`. That is a direct violation of `.agents/AGENTS.md` §8b
"Never sweep up another agent's unfinished work" — committed by the lead who wrote the rule into every
subagent prompt.

**Not repaired by rewriting history**, deliberately: a second author is committing to this branch every
few minutes and pushes, so a reset would be destructive to work that is not mine. The code state is
correct — the deletion was the intended outcome of P3 and it is real. What is damaged is attribution
and the review pipeline, which will be handed a hash that does not contain the change it is reviewing.
I review P3 by diff myself instead of trusting the hash.

**Root cause, and it generalises to the whole fleet:** the git index is *shared global state* across
every agent in one working tree. Any agent's `git commit` can absorb any other agent's staged work.
`git rm` makes this worse because it stages the instant it runs.

**Fix, applied to the workflow script for wave 2 and all later cycles:** commit with an explicit
pathspec — `git commit -F <msg> -- <paths>` — which limits the commit to those paths regardless of what
else is in the index, plus a mandatory `git diff --cached --name-only` inspection first.
Wave 1 was already in flight with the old recipe and was not killed to patch it; cross-contamination
between the four wave-1 packets is therefore possible and I verify their diffs personally.

## DOSSIER CORRECTIONS found by the lead (fix the dossier, not the code)

1. **`RECON_DOSSIER.md` §2 says "There are no git hooks. `.git/hooks/` is samples only, no `.husky`."
   WRONG.** `core.hooksPath` is set to `C:/Users/Admin/.git-hooks` — a global hook directory with
   `pre-commit`, `pre-push`, `post-commit`, `post-checkout`, `post-merge`. The pre-commit hook is
   "THE IRON GATE": it runs **gitleaks** (which is what protects the PATs in `.git/config` from being
   committed) and skips biome when absent. Commits ARE gated in this repo. `.git/hooks/` being empty
   is a red herring.
2. **The kopecks debt is partly closed already.** `apps/api/drizzle/0131_payments_amount_kopecks.sql`
   exists, and `apps/api/src/db/moneyTypeParsers.ts` registers `numeric` parsers before the pool is
   created (without it, numeric columns arrive as strings and sums concatenate). Backlog item 10 must
   be re-scoped against live column types, not planned from the dossier's blanket
   "amountRub is an integer everywhere".
3. **`.agents/AGENTS.md:7` and all of `.agents/DATABASE.md` were stale (PGlite).** Fixed in
   `8c87dcd93`. `DATABASE.md` had claimed "There are no network ports (e.g. 5432)" — actively
   misdirecting every agent ordered to read it complete.
4. **There is a SECOND ACTIVE AUTHOR in this tree tonight**, contradicting the ARCHON brief's "nobody
   else is working this repo tonight". Commits under `marko1olo` at 00:32, 00:35, 00:38, 00:38, with
   live edits to `apps/api/src/server.ts` and `apps/api/src/scripts/seedOpsScreenshotDemo.ts` at
   00:41–00:42. It works settings/communications/server; my packets are in
   analytics/portal/sync/docs/proof. **No claim overlap so far**, but the tree moves under the fleet
   and `server.ts` — a cross-lane seam — is currently dirty and unavailable.

## CYCLE 1 CLOSED — 22 `[ARCHON]` commits, all 8 packets landed

Run `wf_da0d6ab1-799` completed: 15 agents, 12 done, **3 killed by "Credit balance is too low"**
(P2 build, attack:P1, attack:P4). Credit death is now an observed fact of this campaign, not a theory.
**The durability protocol paid for itself:** P2 died mid-proofs but had already committed `d719cb192`
*and* `e14bc316a` (its 281-line `portalOtp.test.ts`), and its `state.md` recorded exactly which proof
step it was on. Nothing had to be re-derived.

Landed: analytics `+null ₽`, portal OTP bypass (×2 commits), syncDaemon deletion, production
stack-trace leak, 3× vite-path smokes, `issuedByUserId:"doctor"`, cron worker's invented 40 % margin,
encoding-guard mojibake — plus regression tests for the signer and the BI snapshot.

### THIRD CONTAMINATION — and it broke HEAD a second time
`e14bc316a` (P2) swept in `git rm apps/web/src/components/analytics/LostPatientsFiltersWidget.tsx`.
At HEAD the widget was gone while **`MarketingView.tsx:17,395` and `AnalyticsDashboardView.tsx:25,510`
still imported and rendered it**. Restored forward in `bb74658dc`; `npm run typecheck -w @dental/web`
then exit 0.
Three occurrences, one mechanism: **a bare `git commit` commits the shared index, and `git rm` stages
instantly.** All of cycle 1 ran with the old recipe because the fix was written after wave 1 launched.
Cycle 2's script mandates `git commit -F <msg> -- <paths>` plus a `git diff --cached --name-only`
inspection.
Note the deletion itself was *correct* — that widget reads `lost_patients_filters`, a table with no
writers, exactly the hollow-widget class in backlog item 8. It must land with both import removals in
one commit.

### NEW STANDING LEAD DUTY
**Verify HEAD compiles, not just the working tree.** The working tree hid both breakages because the
other author's uncommitted edits removed the imports. Check: for any file deleted in a recent commit,
`git grep -n "<BaseName>" HEAD -- apps/` must return nothing.

### Known churn, not ours to commit
`apps/api/dist/**` (44 files) is TRACKED and went dirty when the P3 reviewer ran
`npm run build -w @dental/api` as legitimate proof. Generated output; left alone.

## CYCLE 2 — dispatched, run `wf_2583cd41-191`, script `.agents/archon/cycle2.workflow.js`

Waves of 3 (narrowed from 4 after the credit deaths). Targets chosen to avoid the second author, who is
concentrated in `SettingsView.tsx`, `components/settings/**`, `components/communications/**`,
`App.tsx`, `MarketingView.tsx`, `VisitView.tsx`, `server.ts`.

| # | Packet | Why |
|---|---|---|
| C1 | `dicomweb.ts:7` — every DICOM UID serves the same `test.dcm` | Patient safety: a dentist can plan an implant against another patient's anatomy |
| C2 | `ClinicalRouter.ts` — phase-handoff tasks never persisted | A handoff that lives only in one HTTP response did not happen |
| C3 | Nav rail: 11 unlabelled icons, 3 identical sparkle glyphs | Lead's own read of 4 plates; `viewLabels`/`viewHints` already exist and are never rendered |
| C4 | Dictation transcripts in a module-level array, lost on restart | Medical documentation destroyed by a `tsx watch` reload |
| C5 | `Cornerstone3DViewer.tsx:230-232` — panoramic uses a fixed fake spline | Plausible image of nothing; ignores the drawn ROI |
| C6 | Finance: `3800` pre-filled in a money field with no patient selected | Found by the lead opening the plate; fabricated default in a money input |

## CYCLE 2 CLOSED — 17 commits, 12/12 agents, ZERO credit deaths, ZERO contaminations

Run `wf_2583cd41-191`. The pathspec commit rule worked: **no deletions, no swept-in files, HEAD stayed
compilable.** Both authoritative gates green afterwards — `tsc -b --noEmit` (web) and
`tsc -p tsconfig.json --noEmit` (api) both exit 0.

| Packet | Verdict | Outcome |
|---|---|---|
| C1 DICOM any-UID | SOUND_WITH_NITS | `f70a47ff2` + test `370fd2933` |
| C2 clinical handoff not persisted | SOUND_WITH_NITS | `2f18e4406` + `669c812a5` (cast bug) |
| C3 nav rail 11 blind icons | SOUND_WITH_NITS | `e71445757` + guard test `0500e257e` |
| C4 dictation lost on restart | **NEEDS_REWORK** | `1c9a05bb7`, `a8531562d` |
| C5 panoramic fake spline | **NEEDS_REWORK** | `3f773b3e0`, `f11754ea4` |
| C6 finance phantom amount | **NEEDS_REWORK** | `8f9243bdd`, `a4907fe62` |

### The reviewers earned their cost this cycle
- **C1 reviewer found two CONFIRMED holes the builder never reported.** (i) The demo-sample branch at
  `dicomweb.ts:204-207` never references `organizationId`: a second organization's validly-signed token
  returns **200 + 121,356 bytes of DICOM**, and so does a token carrying a UUID **present in no
  `organizations` row at all** — the route never validates that the org id resolves. (ii)
  `requireClinicalReadAccess`, the guard this route advertises, is **never exercised**: the tests set
  `DENTE_CLINICAL_ALLOW_UNGUARDED_READS=1` and clear the admin secret, and `apps/api/.env` does the
  same, so `accessGuard.ts:63` returns true unconditionally in all 9 tests. An untested guard is not a
  guard. Neither appeared in the builder's PROVEN/NOT PROVEN lists.
- **C4 reviewer caught a false handoff claim.** The handoff asserted «Текст не уничтожен»; the reviewer
  produced run output proving dictated text can still be destroyed, because
  `persistSpeechRecording` overwrites the durable envelope from a cache eviction may truncate.
- **C5 reviewer called it "the most honest packet" — every proof reproduced — and still failed it**,
  because `volume.voxelManager.getScalarData()` throws on every real CBCT volume, making the
  `volume_not_ready` guard unreachable. Passes every test, breaks on real data one line later.
- **C6 turned out better than the packet I wrote.** The `3800` I spotted on the plate was already
  fixed; the agent found the live defect instead — **a patient's payment amount and fiscal-receipt
  fields carried over to the NEXT patient** (`8f9243bdd`). Its own fix then introduced a mount-time
  wipe of the money input, which the reviewer caught.

## CYCLE 3 — dispatched, run `wf_3b16bb25-3a6`, script `.agents/archon/cycle3.workflow.js`

Rework first: a half-closed chain looks wired and is worse than an open one. Rework packets are given
the reviewer's `review.md` **as their specification**, and must mark every numbered item CLOSED /
DECLARED DEBT / DISPUTED-with-evidence — a silently ignored item is an automatic re-fail.

| # | Packet | Source |
|---|---|---|
| R1 | dictation: durable-envelope overwrite + false handoff claim | C4 review, 7 items, 2 blocking |
| R2 | panoramic: closed-contour fake tail + unreachable CBCT guard | C5 review, F1/F2 HIGH |
| R3 | finance: mount-time wipe regression + wrong reachability claim | C6 review, 2 blocking |
| R4 | DICOM cross-tenant leak + untested clinical-read guard | C1 review, both CONFIRMED |
| R5 | telegram: UTC digest dedup, fail-open `scheduledAt`, duplicate photo | dossier §5.7 |
| R6 | AssemblyAI 15 s cap + provider audio not deleted though `system.ts:409` says it is | dossier §5.7 |

## CYCLE 3 CLOSED — 19 commits, 12/12 agents, no deaths. 4 of 6 returned NEEDS_REWORK.

Run `wf_3b16bb25-3a6`. Both gates green after. R3 (finance) and R4 (DICOM tenant leak) came back
SOUND_WITH_NITS; R1, R2, R5, R6 returned NEEDS_REWORK. **That rate is not sloppy building — the
reviewers are driving live probes, `EXPLAIN (ANALYZE, BUFFERS)`, and 200-chunk load tests against the
real database, and they are finding things the builders genuinely missed.**

### THE FINDING OF THE NIGHT — verified by the lead personally
`apps/api/src/routes/speech.ts` guards **seven read endpoints** with `requireClinicalReadAccess`
(lines 151, 156, 161, 166, 179, 197, 213). Line 282 registers the one endpoint that **WRITES clinical
dictation into a patient's record**:
```
app.post("/api/speech/transcribe-chunk", { bodyLimit: speechJsonBodyLimitBytes() }, handleSpeechTranscribeChunk);
```
**No guard of any kind.** Lead probe with no token → **HTTP 400**, i.e. the request reached body
validation without ever being challenged for credentials; an unauthenticated request must get 401. A
reviewer independently drove it with no token and got **201 Created**, and its writes reached the DB.
The reads are guarded and the write is not.

### Combined with the R1 reviewer's CONFIRMED live reproduction, this is a patient-safety hole
The merge unions the stored envelope by `chunkIndex` **without re-checking identity**, and the 409
identity guard scans **only the hot in-memory cache** — so eviction silently disables it. Reviewer
PROBE 2 against the real DB, two visits of one organization, cache empty:
```
result_text: "VISIT-A DICTATION: patient A complaint.\nVISIT-B DICTATION: patient B complaint."
envelope visitIds: ["…400","…401"]   patient_id: …101   (patient A)
```
The row keeps patient A's label permanently. Reviewer's own framing: pre-R1 the row was relabelled to B
and A's text destroyed; post-R1 both patients' clinical text is merged into one document.

### Other confirmed findings from the R1 review
- Per-organization restore removed the global ceiling: `storage.ts:732-747` has no outer LIMIT where the
  pre-fix query had one. Ceiling is now ~**960 MB per organization**, hydrated eagerly at module import.
- `ai_jobs` has only `ai_jobs_pkey(id)`. `EXPLAIN` shows a **Seq Scan** on the envelope lookup; measured
  cost per chunk went 3.3 ms (first 20) → 10.45 ms (last 20), **3.2×**, on an otherwise empty table.
- A corrupted `input_text` permanently blocks durability for that recording, with no repair path.

### Dossier correction earned by an agent
**R5 proved the dossier WRONG**: the UTC-keyed Telegram daily-digest dedup it describes **does not exist
in the live path** (recorded in `0f3bc9c38`). R5 did land a real fix for the duplicate photo
(`370d2f10f`). Treat §5.7 of the dossier as unverified until each item is confirmed at a live line.

## TWO STRIKES INVOKED — dictation

C4 failed review. R1 reworked it and failed again, and its fix introduced a defect worse than the one it
closed. Per `.agents/AGENTS.md`-derived campaign rule, **no third patch of the same merge logic is
authorised.** Cycle 4 attacks the root instead: the missing auth gate (S1) and identity-validated-against-
a-cache-that-can-vanish (S2), as two separate packets in two separate files.

## CYCLE 4 — dispatched, run `wf_4aefbe51-758`, script `.agents/archon/cycle4.workflow.js`

| # | Packet | Why |
|---|---|---|
| S1 | Guard `POST /api/speech/transcribe-chunk` + census every unguarded mutating route (report only) | Unauthenticated write into a clinical record |
| S2 | Identity checked against the durable envelope, not the hot cache | Two patients' text merging into one record |
| S3 | Global restore ceiling + composite index on `ai_jobs(organization_id, input_storage_path)` | 960 MB/org and a Seq Scan on every chunk write |
| S4 | R2 rework: withdraw a measurement taken against a baseline the packet proves impossible | Proof honesty |
| S5 | R5 rework: fail-open `scheduledAt` | Reminder for next Tuesday sent tonight |
| S6 | R6 rework: provider audio deletion and the polling cap | `system.ts:409` claims a deletion it does not perform |

**Lead self-inflicted failure, recorded:** cycle 4's first launch died in 16 ms with
`perOrganizationLimit is not defined` — I wrote `${…}` inside a JS template literal in a packet brief and
it was parsed as an interpolation. Zero agents ran. Fixed and relaunched via `resumeFromRunId`. Standing
note for every future script: **escape `${` in brief text**.

## LEAD DIAGNOSIS WAS WRONG — corrected by packet S1, recorded per §4 T.A.R.S.

I wrote in this ledger and in the S1 brief that `POST /api/speech/transcribe-chunk` "has no guard of
any kind" and that `speech.ts` used only the read guard. **Both statements are false.**
`requireClinicalMutationAccess` was called as the **first line of the handler body**. I read the route
*registration* line and did not read the handler — the exact failure I have been ordering every
subagent not to commit (§ READ BEFORE WRITE: "Appending a quick-fix to the bottom of an unread file is
a critical compliance failure"). The observations were sound; the diagnosis attached to them was not.

**What was actually true** (S1, measured live, booleans only — no secrets printed):
1. `accessGuard.ts:31-33` returns **true for a credential-less request** when
   `DENTE_CLINICAL_ADMIN_SECRET` is unset and `DENTE_CLINICAL_ALLOW_UNGUARDED_MUTATIONS=1`. Measured on
   this host: secret configured = false, flag === "1" = true, NODE_ENV production = false. That is what
   produced my 400 and the reviewer's 201.
2. **Tenant-blind write, and this one is true in EVERY configuration.** No `organizationId` was ever
   resolved. Patient and visit were looked up by bare UUID, and `speech/storage.ts:404-425` derives the
   stored chunk's organization **from the client-supplied patientId/visitId**. So a caller could write
   into another clinic's patient record regardless of env flags.

**The cost of my error:** my framing pointed at a missing guard on one line. The second and more
serious half — the tenant-blind write — **could not have been found from the wording I gave.** The
agent found it by reading the handler I had not.

**And my systemic hypothesis was wrong too, which is worth as much.** S1's census: **183 mutating route
registrations across 63 files — 177 guarded, 6 without**, all six analysed line by line, with all five
script iterations and their false positives disclosed (including a pass that missed routes registered
on `server`). The `speech.ts` case was the **only** real asymmetry. There is no fleet-wide unguarded-
route epidemic. That negative result is a genuine finding and it removes a whole cycle I had queued.

Standing correction to my own method: **a route's guard lives in the handler, not the registration.**
Never diagnose auth from a `grep` of `app.post(`.

## CYCLE 4 + LEAD WORK — the shipped-build class, and two more lead errors

Run `wf_4aefbe51-758`. Wave 1 landed (S1 speech auth, S2 cross-patient merge, S3 index+RAM ceiling).
Wave 2 (S4/S5/S6) has been killed by "Credit balance is too low" **three times**. Nothing is lost —
`resumeFromRunId` replays the 6 completed agents from cache and only re-runs the dead ones.

### Lead errors, both caught by the S1 reviewer, both recorded per §4
1. **"No guard whatsoever" was false** — already recorded above. `requireClinicalMutationAccess` was the
   handler's first statement. I diagnosed auth from the registration line.
2. **"The dev server runs WITHOUT --watch" was false**, and I put it in every cycle-4 brief.
   `apps/api/package.json` declares `"dev": "tsx watch src/server.ts"` and `Launcher.ps1:272` runs it.
   The reviewer therefore **promoted** a NOT VERIFIED to **API VERIFIED**: `curl -X POST
   /api/speech/transcribe-chunk -d '{}'` → **401 `{"error":"AuthRequired"}`** on the live server. My
   wrong environment claim had told three agents not to attempt a proof that was available.

### The shipped-build defect class — found by review, closed by the lead
`apps/api/dist` was **tracked** (149 files) even though `.gitignore:2` says `dist/` — a gitignore rule
never applies to already-tracked files. The committed `dist/routes/speech.js` was built **before** the
speech fix: zero occurrences of the new guard, no organizationId predicate. And
`apps/api/package.json` declares `"start": "node dist/server.js"`. **`npm start` served the vulnerable
build that source had already fixed.** The live box escaped only because `Launcher.ps1` runs
`npm run dev`.

Verified safe before removing: `apps/api/Dockerfile:30` runs `npx turbo run build --filter=@dental/api`
itself; the four smokes that read `dist/server.js` demand a build explicitly («Build API first…»);
`git rm -r --cached` leaves the worktree untouched. Closed in `589d63a4d` → **0 tracked dist files**.

**Third lead error, self-caught:** the first attempt (`b96f6d04e`) did the OPPOSITE. I ran
`git rm -r --cached` and then committed **with a pathspec** — and `git commit -- <paths>` commits the
*working-tree* state of those paths, so it re-added the files instead of removing them. The very form I
mandate to protect the fleet from the shared index worked against the intent here. Correct procedure
for untracking: `git rm -r --cached`, inspect `git diff --cached --name-only` by eye, then commit
**without** a pathspec.

### Two broken gates fixed by the lead, with proof
- **`smoke-clinical-mutation-guard.mjs` counted prose as protection** (`ae5ce1759`). It matched textual
  occurrences of the guard name minus one for the import, so a JSDoc mention counted as a guarded
  route. Measured: `speech.ts` old counter **2** (expected 2 → green) vs real call sites **1**. Now it
  strips comments and counts `name(` call sites.
  **The gate is wrong in the other direction too, and that is the bigger finding:** it has long been red
  on `patients.ts must guard 3, found 0`, which is a FALSE ALARM. I read the handler (not the
  registration — lesson applied): `patients.ts` authenticates by hand — `x-dente-clinic-token`,
  `verifyToken(...)`, 401 `AuthRequired`/`AuthExpired` — and takes `organizationId` **from the
  signature-verified token payload**, never from a header. That makes it *stricter* than the shared
  helper and immune to the `identity.verified` bypass. **Two competing auth idioms coexist** (T5), and a
  gate that counts identifiers can never see this (T1).
- **`smoke-speech-route-validation.mjs` would have gone red on the next build** (`723e09fa3`). It sent
  only `x-dente-admin-secret`, no clinic token, so against fixed code it gets 401 before reaching
  validation — a payload-validation test accidentally testing auth. It passed only because it loads the
  compiled `dist`, which was pre-fix. Now it signs a real clinic token with the production primitive
  (2-segment HMAC, `TOKEN_SECRET()`), deliberately **not** via `x-organization-id` (that header is the
  T2 bypass).
  **SMOKE VERIFIED:** `npm run build -w @dental/api` exit 0 → rebuilt `dist/routes/speech.js` carries
  **12** guard/organizationId occurrences vs **0** in the old committed build → `git status` churn from
  the build is **0** (T3 paying off immediately) → `node scripts/smoke-speech-route-validation.mjs`
  exit 0, `{"ok":true,"checkedRoutes":[3],"rawValidationHidden":true}`.

### Deletion sweep — clean
The second author is deleting the hollow `db/*Query.ts` modules (backlog item 8). Scanned every
deletion across the last 25 commits for dangling references at HEAD: **zero**. `tsc` api exit 0.

## Lead-owned, not delegated

- [ ] Re-run both capture pipelines, MD5-audit personally, read the unjudged plates
      (`visit`, `documents`, `finance`, `imaging`, `communications`, `settings`, `marketing`,
      `shift`, `schedule`, night theme, 720×1100).
- [ ] Authoritative `npm run typecheck` at cycle end (agents' concurrent runs are noisy by construction).
- [ ] `.agents/DATABASE.md` is **fully stale** — describes PGlite, an in-process engine, and states
      "There are no network ports (e.g. 5432)". A subagent ordered to read it complete is actively
      misled. Same defect class as the known `.agents/AGENTS.md:7` contradiction. Fix the rule.
- [ ] Tell the user to rotate the two PATs in `.git/config`.

## CYCLE 4 CLOSED — 12/12 after three credit deaths. TWO STRIKES ESCALATED TO AREA LEVEL.

Run `wf_4aefbe51-758` needed **four launches**: one killed by my own `${}` interpolation bug before any
agent started, then three rounds of "Credit balance is too low". `resumeFromRunId` replayed the
completed agents from cache every time and only re-ran the dead ones — **nothing was ever re-derived**.
Final: 12 agents, 12 done, 0 errors.

Verdicts: S4 SOUND_WITH_NITS. **S1, S2, S5, S6 NEEDS_REWORK.**

### The hard call: freezing two areas
Counting by AREA rather than by packet: **speech/dictation has now failed review five times**
(C4 → R1 → S1 → S2 → S6) and **Telegram twice** (R5 → S5). S2 was itself the root-cause packet I created
*after* invoking two strikes on C4/R1 — and it came back needing rework. That is the signal to stop.

**Both areas are FROZEN.** Their residue is recorded as documented debt with file:line, not patched a
sixth time. The campaign rule is now: *two strikes applies per AREA, not per packet.* Unfreezing
requires a new root-cause argument, not another attempt.

This is not abandonment — those areas absorbed five cycles and produced real fixes (the cross-patient
merge, the tenant-blind write, the fail-open schedule, the duplicate photo, the AssemblyAI job loss).
It is a decision to stop paying compound interest on one subsystem while nine other defect classes sit
untouched.

### Working-tree breakage that is NOT ours
`npm run typecheck -w @dental/web` reports **6 errors**, all `Cannot find name 'AnamnesisField'` in
`apps/web/src/DocumentsView.tsx`. Investigated: the file is **dirty** (79 insertions, second author
mid-refactor extracting `components/documents/AnamnesisField.tsx`), and **at HEAD the symbol is not
used at all** — so HEAD is clean and the API gate is 0 errors. Left untouched and declared to the whole
fleet in the cycle-5 briefs so nobody "fixes" another author's in-flight work or blames themselves.

## CYCLE 5 — dispatched, run `wf_4b457d07-e96`, script `.agents/archon/cycle5.workflow.js`

Fresh ground only. Script assembled by reusing the proven LAW preamble verbatim and appending a
CORRECTIONS block, so the four lead errors found so far are stated as overrides rather than silently
edited away.

| # | Packet | Why |
|---|---|---|
| U1 | `identity.verified` is set and never read | A field designed for exactly this check, never enforced; `apply-dev-env.ps1` arms it in three env files |
| U2 | Guard gate that tests BEHAVIOUR | Current gate greens on prose and reds on correct hand-rolled auth; must app.inject every mutating route and assert 401 |
| U3 | Black rectangles over text + undefined-token guard | Lead saw it on a plate; 19 undefined `var()` names used 56 times is the disease, the black box is the symptom |
| U4 | One owner for the FAB corner | The mic FAB physically covers the treatment-plan «Сохранить» button — a control you cannot click |
| U5 | `diary.ts` POST signing skips the `/lock` ceremony | No inventory deduction, no audit entry; two paths, one meaning |
| U6 | `mutableStateSnapshot()` multi-MB write per action | 32 call sites; measure before fixing, and delete it if nothing reads it |

Every packet must report `measurements` as a first-class field this cycle — a performance or census
claim without a reproducible number is an opinion.

## CYCLE 5 CLOSED — 12/12, no deaths. U1 and U6 SOUND_WITH_NITS, four returned NEEDS_REWORK.

Run `wf_4b457d07-e96`. Both gates green afterwards (api 0, web 0 — the second author landed the
`AnamnesisField` import, so that pre-existing red is gone).

### CORRECTION TO THE RECORD — a commit in this repo describes a defect that does not reproduce
Commit `1f65d674b` claims «подписание приёма с пустой полки увеличивало остаток материала» and that a
0-deduction rule became a deduction of 1. **The U5 reviewer proved neither reproduces at
`1f65d674b^`:** the empty shelf returned `400 TransactionFailed` with stock 0, and the 0-rule deducted 0.

**The real defect was different and worse:** a **negative `quantity_to_deduct` raised stock from 10 to
16** and wrote a positive `auto_deduct` row, and a 0-rule wrote a junk 0-quantity movement row.

**The lead relayed that false subject line to the user as fact**, having read the commit subject without
verifying it — the exact failure this campaign exists to remove, produced by me rather than caught by
me. History is not being rewritten (the commit is pushed and a second author commits continuously); the
correction is recorded here, where the claim is read, and packet V2 carries it into the packet handoff.

### What the reviewers proved this cycle
- **U1 (SOUND_WITH_NITS) — the strongest review of the campaign.** The reviewer rebuilt the pre-fix
  state in an out-of-repo scratch tree with only `identity.ts` reverted and **reproduced the original
  defect end-to-end** (tests 6, pass 4, fail 2, true exit 1) — proving the committed test can actually
  go red. It then attacked with a forged-secret token, an expired token, a cross-tenant header, a
  ghost organization UUID absent from `organizations`, a padded header value, a different header case,
  and a raw socket using a lowercase verb to dodge method uppercasing. All refused.
  It also **disproved a dossier claim**: `apply-dev-env.ps1` does not "reopen the hole in one run" — the
  script has a `MissingEndCurlyBrace` ParserError and never executed; all three `.env` md5s were
  byte-identical before and after.
- **U2 built the behavioural gate and the lead verified it personally:** 481 route-table entries, 479
  probed, 186 mutating, 450 challenged, 553 ms, exit 0 — replacing a hardcoded table of 14 files with
  expected identifier counts. It declares its own blind spots (WebSocket upgrade points) rather than
  hiding them, and it immediately found a new class: **two routes validate the request body before
  checking rights** (`auth.ts:278-281` vs `283-292`; `auth.ts:331-337` vs `339-348`).
- **U4 closed the FAB overlap and introduced a regression doing it:** the corner reserve is applied
  twice at ≤840 px, so **~304 px of an 844 px phone viewport becomes reserve**, and the layout pass runs
  every scroll frame forcing 2 full layouts plus 5 hit tests. The lead reported that packet as a clean
  win before the review landed — premature, and corrected here.

### Lead work this cycle
- `71bbbb9e3` — the boot security banner listed «код портала по умолчанию 0000» **unconditionally**
  while the live server answers 401 to that code. An operator reads that line to understand the risk of
  their deployment and got a list that did not match the server. Replaced with the one real remaining
  relaxation, with its exact condition (`portal.ts:270`, `developerLogFallback`). Verified by rebuild:
  the banner now prints the truth, and build churn in git is 0.
- Found via that same banner that **a stale `dist` had hidden three separate defects** this campaign:
  a smoke green against a pre-fix build, this banner, and a route fix that never shipped through
  `npm start`. Cycle 6 packet V4 turns that into a dist-freshness gate.

## CYCLE 6 — dispatched, run `wf_196d8593-267`, script `.agents/archon/cycle6.workflow.js`

| # | Packet | Why |
|---|---|---|
| V1 | Corner reserve applied twice; 304 px of 844 px lost | The cure took a third of the phone; also a per-scroll-frame layout pass |
| V2 | Correct the false inventory defect record | A commit describes a defect that does not reproduce; the true one is a negative deduction raising stock |
| V3 | CSS-token guard misreads its own input | `.foo--bar:hover` read as a declaration; commented-out mentions silence real offenders |
| V4 | Harden the 479-route gate | **Add a dist-freshness gate** — a stale dist has hidden three defects; plus fail on level≥40 log records |
| V5 | Authorise before validating | Anonymous callers learn whether an employee exists and the exact PIN policy |
| V6 | 45 % dead width at 720×1100 | Half the width renders nothing at the tightest breakpoint |

**Assembly note for future cycles:** cycle 6 failed to launch once with
`Identifier 'REWORK_RULES' has already been declared` — the LAW preamble inherited from cycle 4 already
carried that constant. When reusing the preamble, check for identifier collisions before launching.

## CYCLE 6 — TWO STRIKES ON THE FLOATING CORNER. NO THIRD PATCH. REDESIGN.

Run `wf_196d8593-267`: 6/9 done, V4/V5/V6 killed by credits three times (resumed; nothing lost).

### The V1 review is the most destructive of the campaign, and it is right
It **CONFIRMED the builder's DISPUTE** — the previous reviewer's F2 mechanism was wrong. The reserve
reached the DOM **zero** times at ≤840 px, not twice: U4's rule matched `<main class="app-shell">` only
by the TYPE selector `main` (0,0,1), losing to `.app-shell` (0,1,0) at equal importance. An agent
correctly overturned a reviewer, with a brace-walk of `main.css` proving the enclosing `@media` is
unlayered so specificity decides. That is the DISPUTE-with-evidence path working exactly as designed.

But it then destroyed the fix on four counts, each measured:
1. **A NEW regression of the very defect class the packet exists to close.** At 1600×1100 the dock's
   `.omnibar-trigger-btn` (158×48) covers the Email `<label>` (coveredShare 0.443) and its `<input>`
   (0.242) — both under the 0.5 yield threshold, so the dock does not move.
   **`document.elementFromPoint` at the label's centre returns the button: clicking the middle of the
   Email label opens the omnibar instead of focusing the field.** Proven a regression from the
   builder's own BEFORE data — the parent lifted 46 px over exactly this element; HEAD sits on it.
2. **F1 is not closed.** The incoming-call toast (z-index 999999, `p-5` column) yields nothing:
   coveredShare 0.290 at height 120 px, 0.087 at 400 px — it would need to be ≤69 px tall to reach the
   0.5 threshold. Packet commit 2 broke what commit 1 claimed to fix, and the 54-test suite missed it
   because the new test never runs the toast rectangle through `cornerBlocksTarget`.
3. **The headline "295 → 90 hit tests" is misattributed.** The builder's own intermediate artifact shows
   fix 1 alone made it *worse*: 405/385/615 against a 295 baseline (+37 %/+31 %/+108 %). The win came
   from fix 2's area threshold suppressing re-sampling — a behaviour change, not a performance fix.
   (The `rectMs` improvement is real and reproduces: 19.34→0.27 ms.)
4. **The user-visible symptom is not closed.** 299 px of trailing dead space at 390×844 — **35 % of the
   viewport** — because three nested paddings stack: `.patients-panel` 20 + `.work-grid` 96 +
   `.workspace` 144.
Plus the new CSS gate is evadable three ways (a consumer in any of the ~35 `.css` files outside the two
scanned directories; the consumer moved back onto the outer box, since the assertion never checks WHICH
element; two declarations collapsed onto one line, since the counter is line-based).

### Verified by the lead personally
I re-ran `scratch/probe-corner-reserve.mjs` myself against the live pair. My numbers match the
reviewer's exactly: `reserveVar` **144 px at 390×844** and 840×900, 96 px at 1600×1100, `dockHosts` 1 at
all three. A 144 px reserve on an 844 px phone is 17 % of the screen before the other two paddings are
counted.

### THE ARCHITECTURAL CALL — the design is wrong, not the implementation
U4 and V1 are two strikes on the same area. Per the campaign rule, no third patch.

**A floating dock that measures the DOM every pass and lifts itself to dodge obstacles cannot be made
correct.** It is a heuristic fighting the layout: V1 proved it by *introducing* a click-blocking
regression on the Email field while removing the previous one. There will always be another element
under it, and the 0.5 coverage threshold is an arbitrary line that the incoming-call toast already
walks straight past. The reserve approach compounds it by stacking padding at three nesting levels.

**Cycle 8 gets a REDESIGN packet, not a fix packet.** The corner must stop floating over content:
on narrow screens its actions belong in the existing bottom navigation — which is genuinely good,
labelled, with a clear active state — and on wide screens in the header. No obstacle sampling, no
lifting, no per-pass geometry, no reserve padding. What is worth keeping from V1: the `rectMs`
improvement and the write-before-read removal.

Not reverting: V1's measured `rectMs` win is real, and a revert would restore the original overlap.
The area is FROZEN to patching until the redesign packet lands.

## THE CORNER: THE 0.5 THRESHOLD IS MATHEMATICALLY INCAPABLE. REDESIGN CONFIRMED.

Cycle 6 closed 11/12 (only `attack:V4` died on credits). The second V1 review proved the architectural
call harder than the lead had argued it, with live injection rather than reasoning:

**1. The builder's DISPUTE of the previous reviewer was CONFIRMED.** The reserve landed **zero** times at
≤840 px, not twice. Re-derived independently: `main.css:13013` is unlayered (brace-walked with comments
stripped; `@layer legacy` spans 417–655 and 14353–end, so 13013 falls outside), therefore specificity
decides and `.app-shell` (0,1,0) beats a bare `main` (0,0,1). An agent overturned a reviewer with
evidence. That path works.

**2. The F1 remedy is arithmetically inert.** The reviewer injected the incoming-call toast's exact
geometry and semantics into the live page (`role=dialog`, 384×224, `z-index:999999`, matching
`IncomingCallToast.tsx:67`) and fired the very `resize` event the dock registers. **Lift stayed 0** —
share 0.089 at 390×844, 0.155 at 1600×1100. Controls in the same run prove the machinery is live: the
same div at 384×60 → lift 60 px; a 160×44 button → lift 46 px. Running the shipped `cornerBlocksTarget`
across heights: share crosses 0.5 only at ≤69 px. The toast has a header row, a caller block and a
script list — a ≥120 px floor. **`CORNER_OBSTACLE_BLOCK_SHARE = 0.5` from fix 2 disabled the remedy
fix 1 shipped.**

**3. THE FINDING THAT ENDS THE DESIGN.** For an equal-height target, covered share is
`barWidth / targetWidth`. So **≥0.5 is structurally unreachable for any target wider than the bar
itself** — above 336 px at 390×844 (bar 168) and above 556 px at 1600×1100 (bar 278). Measured on real
elements: `button.primary-button` «Запись» is **364×44 on four of five routes**, giving a maximum share
of 168·44/(364·44) = **0.4615 — permanently un-yieldable.** The function's own doc comment defends the
0.5 constant by citing a small Save button, and the packet never measured a real button width.
**A threshold that cannot fire on the product's own primary button is not a safety mechanism.** No amount
of tuning fixes this; the geometry forbids it.

**4. The performance headline was misattributed**, confirmed from the builder's own intermediate artifact:
fix 1 alone took hit tests from 295 to 405/385/615 (+37 %/+31 %/+108 %) and `rectMs` to −64 %/−50 %/−90 %,
not the published −98 %/−96 %/−93 %. Both headline numbers were completed by fix 2's threshold
suppressing re-sampling — i.e. by the same behaviour change that produced failures 2 and 3. The 1600 hit
regression reproduces across four independent runs (+17 % to +41 %).

**5. The new CSS gate does go red** for U4's exact rule and for a deleted consumer — but stays green for a
consumer in an unscanned `.css` directory, for the consumer moved back onto the outer box (it never
checks WHICH element), and for two declarations on one line (line-based counter).

### Standing decision, unchanged and now proven
No third patch. **Cycle 8 gets a redesign**: the corner stops floating over content. Narrow screens →
its actions live in the bottom navigation (labelled, good, protect it). Wide screens → the header. No
obstacle sampling, no lifting, no per-pass geometry, no reserve padding, and no coverage threshold —
because the threshold is the thing that cannot work. Keep from V1: the `rectMs` improvement and the
write-before-read removal, both real.

## CYCLE 7 — dispatched, run `wf_210e8a1a-07d`, script `.agents/archon/cycle7.workflow.js`

First cycle authored under the Director's standing constitution and the amended `.agents/AGENTS.md §7a`.

**§7a compliance — the lead was violating it.** «One writer per gate»: `npm run typecheck`,
`npm run build`, migrations and seeds all touch shared state (`dist/`, `apps/web/tsconfig.tsbuildinfo`,
generated `packages/shared/dist/`, the single PostgreSQL on 5432). For six cycles three-to-four agents
per wave ran `npm run typecheck -w @dental/web` concurrently — and that command **writes**
`tsconfig.tsbuildinfo`. Likely source of the "errors in files I do not own" noise I had been attributing
to foreign edits. Corrected: agents run only their own single test file via
`node --import tsx --test`; the lead owns typecheck/build/suite/migrations and runs them serially; a
packet needing a build stops and records a blocker instead of taking the gate.
Also added per §7a: role, why-delegated, owned scope, **forbidden scope**, evidence standard, and the
explicit statement that subagent output is evidence and not authority.
And a defect in the lead's own prompt assembly: the reused preamble had accumulated cycle-5 corrections,
so the prompt simultaneously said "build freely" and "the build is not yours", plus a dead reference to
six `AnamnesisField` errors that no longer exist. An explicit supersession list now heads the block —
contradictory instructions in one prompt are a direct cause of an agent doing the wrong thing.

| # | Packet | Why |
|---|---|---|
| W1 | Hollow query modules, honest census via ast-grep | The lead's own "45 of 50" was a regex artefact; the method is the deliverable |
| W2 | `clinicMode` must really hide things | Default is `network_clinic` — a solo dentist gets a network-clinic surface |
| W3 | Five unreachable views, 4,689 lines | `App.tsx` free for the first time; route the real ones, delete the facades |
| W4 | Human error/empty/loading text | §3; the product already contains the standard to copy |
| W5 | Capture pipeline asserts `data-theme` | A light-theme plate was byte-identical to the night one |
| W6 | One monolith, really split | Every extracted component imported and used in the same commit, or it is an orphan |

## INCIDENT — the lead contaminated a commit a THIRD time, with the rule he wrote himself

`a457fb49f` was meant to carry two paths: the deletion of
`apps/web/src/components/schedule/ExternalScheduleActionLogsWidget.tsx` and its unmount from
`ScheduleView.tsx`. It also carries **the deletion of
`apps/web/src/components/documents/NdflTaxCalculatorsWidget.tsx`**, which was sitting staged in the
shared index from another author.

**Cause: I ran `git commit -F <msg>` without `-- <paths>`.** I authored the rule that forbids exactly
this — it is in every cycle script as «ALWAYS COMMIT WITH AN EXPLICIT PATHSPEC» — and I omitted it.
This is the third time I personally have done it (after `8c87dcd93` and the `dist` untracking attempt).

**Damage: bounded, and HEAD is NOT broken.** `git grep -n "NdflTaxCalculatorsWidget" HEAD` returns no
live import — only prose in `apps/api/src/tests/webCallsExistingRoutes.test.ts:57,257`, where the other
author documents that they deleted the widget «вместе с обещанием». So the deletion was intended by its
author; I committed it early, under a message about a different widget. Their matching test edit is
still uncommitted, so their change is now half-landed. The web gate was green before and after
(`npm run typecheck -w @dental/web` → 0 errors; the worktree already lacked the file when I ran it).

**Not amended:** the commit is pushed and a second author commits continuously. Recorded here instead.

**Procedural fix, on me:** printing `git diff --cached --name-only` in the SAME command as the commit is
useless — I saw the contamination in the output only after it had happened. From now on the sequence is
three separate steps: stage → inspect the staged list → commit **with a pathspec**. The pathspec alone
would have prevented it regardless of what else was in the index.

## STABILITY BASELINE — 2026-07-28, every gate measured by the lead in ONE pass

First time in the campaign that the entire gate set was run end to end and all of it was green. Every
number below is a TRUE exit code from a command the lead ran itself, not an agent's claim.

| gate | command | result |
|---|---|---|
| API alive | `curl /api/health` | **200** |
| Web alive | `curl :5173` | **200** |
| api typecheck | `npm run typecheck -w @dental/api` | exit 0, **0** errors |
| web typecheck | `npm run typecheck -w @dental/web` | exit 0, **0** errors |
| api suite | `npm test -w @dental/api` | exit 0, **996 / 996**, 162 suites |
| web suite | `npm test -w @dental/web` | exit 0, **620 / 620**, 98 suites |
| encoding | `npm run smoke:web-text-encoding` | exit 0, **0** mojibake |
| api build | `npm run build -w @dental/api` | exit 0, **0** git churn |
| route gate | `node scripts/smoke-clinical-mutation-guard.mjs` | exit 0, `ok: true`, **438** entries / **436** probed / **187** mutating / **407** challenged / `staleOutputCount: 0` / `missingOutputCount: 0` |
| HEAD consistency | every file deleted in the last 25 commits, whole-repo `git grep` | **zero** dangling references |

### The route gate went RED first, and that was the guard working
On the first pass it exited 1 and refused to run at all:
«СБОРКА УСТАРЕЛА: проверка подняла бы apps/api/dist/server.js, собранный до правок исходников, и её
вывод относился бы к прошлому состоянию кода.» It then listed **6 sources newer than their build output**
(`server.ts`, `schema.ts`, `routes/clinical.ts`, `routes/workspaceProfile.ts`,
`services/communications/dispatcher.ts`, `utils/telegramChatRef.ts`) and **2 compilable files with no
build output at all** (`routes/waitlistMatches.ts`, `services/schedule/waitlistMatching.ts` — new files
someone added and never built).

That is the dist-freshness guard ordered in cycle 6 after a stale `dist` had hidden four separate
defects. Without it, this run would have probed **yesterday's** compiled server and reported green — the
exact fabrication class the campaign exists to remove. The lead rebuilt (its gate under §7a, and free of
git churn now that `dist` is untracked) and the gate then passed honestly.

Note the guard's message quality: it names what is stale, by how much, and the single command that fixes
it. That is §3 applied to a developer tool, and it is why the guard was worth building rather than
merely tightening the old identifier-counting one.

### What this baseline does and does not prove
PROVEN: the tree compiles on both workspaces, 1,616 tests pass, the encoding guard is clean, the built
output matches source, every mutating route refuses an unauthenticated caller, and no deletion has left
a dangling reference.
NOT PROVEN by any of it: that a dentist's day works end to end. The gates are necessary and not
sufficient — the two price lists (Y1) and the inert clinic mode (Y2) are both invisible to every gate in
that table, which is precisely why they survived this long.
