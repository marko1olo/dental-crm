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

## Lead-owned, not delegated

- [ ] Re-run both capture pipelines, MD5-audit personally, read the unjudged plates
      (`visit`, `documents`, `finance`, `imaging`, `communications`, `settings`, `marketing`,
      `shift`, `schedule`, night theme, 720×1100).
- [ ] Authoritative `npm run typecheck` at cycle end (agents' concurrent runs are noisy by construction).
- [ ] `.agents/DATABASE.md` is **fully stale** — describes PGlite, an in-process engine, and states
      "There are no network ports (e.g. 5432)". A subagent ordered to read it complete is actively
      misled. Same defect class as the known `.agents/AGENTS.md:7` contradiction. Fix the rule.
- [ ] Tell the user to rotate the two PATs in `.git/config`.
