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

## Lead-owned, not delegated

- [ ] Re-run both capture pipelines, MD5-audit personally, read the unjudged plates
      (`visit`, `documents`, `finance`, `imaging`, `communications`, `settings`, `marketing`,
      `shift`, `schedule`, night theme, 720×1100).
- [ ] Authoritative `npm run typecheck` at cycle end (agents' concurrent runs are noisy by construction).
- [ ] `.agents/DATABASE.md` is **fully stale** — describes PGlite, an in-process engine, and states
      "There are no network ports (e.g. 5432)". A subagent ordered to read it complete is actively
      misled. Same defect class as the known `.agents/AGENTS.md:7` contradiction. Fix the rule.
- [ ] Tell the user to rotate the two PATs in `.git/config`.
