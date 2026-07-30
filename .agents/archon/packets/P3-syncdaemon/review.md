# ADVERSARIAL REVIEW — P3-syncdaemon

Reviewer: adversarial subagent (did not write the code). Posture: disbelief. Read-only on source.
Commit under attack: `c97ceb4d8136e70d4c764050403eae166e379b4a`
Deletion actually lives in: `8c87dcd931fd1841520ba3a8d3629b39cd75b952` (another agent's commit)
Repo HEAD at review start: `2cb0787d417defbaf22a561311876e09c3349e13`

**VERDICT: SOUND_WITH_NITS.**

Every claim in BUILDER CLAIMED PROVEN reproduced. I re-ran all seven, not similar commands — the same
ones. All three items the builder listed as NOT PROVEN, I closed myself against the live database and
the emitting build; all three came back clean. I found no fabrication in this packet. The nits below
are about evidence *framing*, history attribution, and pre-existing debt the builder surfaced honestly.

---

## 0. THE FIRST THING THAT MATTERS: THE COMMIT UNDER ATTACK CONTAINS NO DELETION

`c97ceb4d8` is 6 added / 2 removed **comment** lines in `apps/api/tsconfig.json`. Nothing else.

```
$ git show c97ceb4d8136e70d4c764050403eae166e379b4a --stat
 apps/api/tsconfig.json | 8 ++++++--
 1 file changed, 6 insertions(+), 2 deletions(-)

$ git show --pretty=format: --name-only c97ceb4d8136e70d4c764050403eae166e379b4a
apps/api/tsconfig.json
```

The 326-line deletion of `apps/api/src/services/syncDaemon.ts` is in a **different agent's commit**:

```
$ git show --stat 8c87dcd93
 .agents/AGENTS.md                   |   2 +-
 .agents/DATABASE.md                 | 115 +++++++++----
 apps/api/src/services/syncDaemon.ts | 326 ------------------------------------
```

The builder **disclosed this himself** — in BLOCKERS, in `handoff.md` §1, and in the body of his own
commit — and did not amend or rebase the other agent's history. I reproduced both stats and both are
exactly as described. Timeline is consistent: `8c87dcd93` at 00:45:22, `c97ceb4d8` at 00:47:38.

This is the opposite of the fabricated-proof disease. A reviewer handed a commit whose stat says
"1 file changed" and a report claiming a 326-line deletion would normally stop there and call it a lie.
It is not a lie — it is a swarm collision the builder reported before I could find it. Credit.

**What remains real:** `git log --follow apps/api/src/services/syncDaemon.ts` attributes the removal to
a docs commit about PGlite. The *why* exists only in the body of a commit that touches a different file.
That is a history defect, not a code defect. Remediation is the lead's call, per the blocker.

---

## 1. WAS THE DEFECT REAL? YES — CONFIRMED LINE BY LINE

I recovered the pre-deletion file (`git show 8c87dcd93^:apps/api/src/services/syncDaemon.ts`, 326
lines) and read it in full. Every claim in the brief holds at its cited line:

| Brief / builder claim | My verification |
|---|---|
| Zero network calls in the entire file | **CONFIRMED.** Imports are exactly `drizzle-orm` (`and, eq, inArray, ne, or`), `../db/client.js`, `../db/schema.js`. No `fetch`, no `http`, no `axios`, no `undici`. |
| `:185-196` `response` is a ternary; disabled-mock branch is a hardcoded literal | **CONFIRMED.** `const response = mockCloudExchangeEnabled() ? await mockCloudVaultExchange(...) : { success: true, cloudChanges: { patients: [], visitDiaries: [], toothStates: [], treatmentPlans: [], patientInvoices: [] } };` |
| `:198` `if (response.success)` is always true | **CONFIRMED.** `success` is hand-written in the literal above; the mock path also hardcodes `success: true` at its return. There is no code path where it is false. |
| `:200-233` five `db.update().set({ isSynced: true })` | **CONFIRMED.** `patients` :200-205, `visitDiaries` :206-211, `toothStates` :212-219, `treatmentPlans` :220-225, `patientInvoices` :226-233. |
| `mockCloudVaultExchange` SELECTs a real unpaid invoice and injects `status:"paid"`, `version+1` | **CONFIRMED.** `select().from(patientInvoices).where(ne(status,"paid")).limit(1)`, then pushes `{...targetInvoice, status:"paid", version: version+1, isSynced: true, updatedAt: new Date()}` into `cloudChanges.patientInvoices`. |
| Gate is `NODE_ENV!=="production" && DENTE_SYNC_MOCK_CLOUD_ENABLED==="1"` | **CONFIRMED**, `mockCloudExchangeEnabled()` at :20-25. |
| `startSyncDaemon` at :27, zero call sites | **CONFIRMED** — see §4 census. |

**The builder's beyond-the-brief finding is also real and is the worse half of the defect.** At :285-299,
inside `mergeTable`, when a "cloud" record arrives with `status === "paid"` and the local row is not
paid, the code executes:

```ts
await db.insert(cashLedger).values({
  invoiceId: record.id,
  paymentMethod: "card",
  amountRub: record.totalAmountRub,
  timestamp: new Date(),
});
```

The "cloud" record is the mock's own fabrication from :79-85. So with one env var, the module would have
invented a card payment in the cash book for an invoice nobody paid, then flipped that invoice to `paid`
at :277-280. That is money fabrication in an accounting table, not just a false backup flag. The builder
found this; the brief did not name it. Escalating rather than minimising is the correct behaviour and
I verified it at the line.

**Severity honesty check.** Both the brief and the builder state plainly that this was latent — zero call
sites, so no live damage. Neither oversells reachability. My database check (§6) proves zero records were
ever affected. The one place framing runs slightly hot is the commit subject, "медкарты помечались
выгруженными" (past tense), which reads as though real records were stamped; the body immediately
corrects this. Nit N5.

---

## 2. IS THE CHANGE A FIX TO DEAD CODE PRESENTED AS A PRODUCT FIX?

It is a **deletion of dead code, labelled as such, everywhere.** The commit body says «у startSyncDaemon
(:27) НОЛЬ точек вызова во всём репозитории» and «Живой код не тронут». The handoff repeats it. The lead
ordered exactly this. So the answer is: yes it is dead code, no it is not presented as a product fix.

Call chain, traced by me, terminates immediately:
- `startSyncDaemon` — defined, never called. Nothing imports the module.
- `runSyncCycle` — only reachable via `setInterval(runSyncCycle, 30000)` inside `startSyncDaemon`.
- No `services/index.ts` barrel exists to re-export it. No dangling name is left.
- `apps/api/src/server.ts` — zero references; its only dynamic import is `await import("./db/client.js")` at :536.
- Compiled production entry `apps/api/dist/server.js` — zero references.

---

## 3. HOLLOW-FACADE / ARCHITECTURE SWEEP ON THE DIFF

The entire diff is a JSON comment. Checked anyway:

| Probe | Result |
|---|---|
| Anything returning `{success:true}` over a no-op? | **No — the opposite.** This diff *removes* the file that did exactly that. Nothing new added. |
| Placeholder / magic constant / hardcoded UUID, port, endpoint? | **None.** No values added at all. |
| Fabricated `0` standing in for an unknown? | **None.** |
| Second owner of something that already had one? | **No — removes an owner.** Sync ownership drops from two dead modules to one (`syncEngine.ts`, §5). No duplicate helper, no parallel error vocabulary. |
| Any field deleted/renamed in `useAppLogic.tsx` return block? | **No.** Commit touches one file: `apps/api/tsconfig.json`. `apps/web` untouched. |
| Listener / interval / subscription without teardown? | **Net negative.** The deletion removes a `setInterval(..., 30000)` *and* its `clearInterval` teardown together. Nothing new registered. |
| Hardcoded hex colour / static px where relative belongs? | **N/A** — no UI, no CSS. |
| Hardcoded Russian literal without declaring i18n debt? | **N/A** — the Russian is a source-code comment in tsconfig, not user-facing text. No i18n surface. |
| `exclude` list semantics changed? | **No.** Diff confirms only comment lines moved. `"exclude"` array is byte-identical before and after. |

---

## 4. CENSUS — RE-RUN INDEPENDENTLY, REPRODUCES EXACTLY

```
$ rg -n "startSyncDaemon|stopSyncDaemon|runSyncCycle|SyncReport|mockCloudVaultExchange|syncDaemon" \
     --glob '!node_modules' --glob '!.git' --glob '!scratch/**' .
HANDOVER_AUDIT_2026-07-26.md:304, :306      <- prose
apps/api/tsconfig.json:22                   <- comment (the builder's own new line)
apps/api/src/services/syncEngine.ts:6       <- comment
apps/api/src/db/schema.ts:1391, :2126       <- comments
```

Zero `import`. Zero call. The builder's list was accurate down to the file:line, including the
`.dente-ops-shots/backup/schema.ts` dump — which I confirmed is untracked (`git ls-files` returns
nothing), i.e. a backup artifact and not source.

I went further than the builder on two axes:

**Compiled artifact.** `rg` over the whole of `apps/api/dist/` after a fresh emit finds three hits, all
comments, all in files unrelated to the daemon:
```
apps/api/dist/services/syncEngine.js:3   // This module replaces the old custom syncDaemon...
apps/api/dist/db/schema.js:1256          // services/syncDaemon.ts не компилировался...
apps/api/dist/db/schema.js:1940           * Без этого объявления не загружался services/syncDaemon.ts.
```
Zero executable references in the production artifact.

**Git history.** `git log --all --pretty=format: --name-only -- '*syncDaemon*'` returns exactly one path
ever: `apps/api/src/services/syncDaemon.ts`. **There was never a `syncDaemon.test.ts`.** The builder's
claim that no test was removed with the file is therefore not just unrefuted — it is impossible for it
to be false.

`apps/api/dist/services/syncDaemon.js`: `git ls-files` empty and `git log -- <path>` empty — the file was
**never tracked**. The builder's "untracked + gitignored, zero git effect" is precisely correct for that
path, even though 149 other `dist/` files *are* tracked (they predate `.gitignore:2`, which the builder
also flagged himself in handoff §4).

---

## 5. THE ORDERED syncEngine REPORT — DELIVERED, AND ACCURATE

Order step 2 required reading `syncEngine.ts` in full and reporting its status with evidence. It is not
in the PROVEN list handed to me, which initially looked like a missed deliverable. It is not missed —
it is `handoff.md` §2 of Blockers. I read `syncEngine.ts` (108 lines) myself before reading his report,
and everything he wrote checks out:

- Zero call sites: `rg "startSyncEngine|stopSyncEngine"` → only the two `export async function`
  definitions at :10 and :95. Nothing calls either.
- Excluded from typecheck. He cites `apps/api/tsconfig.json:32`; that is correct **at the parent commit**
  (`git show c97ceb4d8^:apps/api/tsconfig.json | grep -n syncEngine` → `32:`). It is now line 36 because
  his own comment added 4 lines above it. Pre-edit coordinates in a post-commit report — nit N3.
- Imports `@electric-sql/pglite` and `@electric-sql/pglite-sync`. **Neither is installed.**
  `rg "electric-sql" --glob package.json` → no hits; `ls node_modules/@electric-sql` → does not exist.
  The file would throw `ERR_MODULE_NOT_FOUND` on any real load.
- `ELECTRIC_SYNC_URL` is not set in `.env` or `apps/api/.env`, so even a successful import would take the
  early-return "Local-Only Isolated Mode" path.
- His verdict — **dead but not lying** — is correct. It writes nothing to the database, hardcodes no
  `success`, never touches `isSynced`. Its only fabrication-adjacent trait is the emoji-laden
  "🟢 Starting Commercial CRDT Sync" logging for an engine that cannot start.
- His extra find at `syncEngine.ts:42-43` is real: `orgIds.map(id => \`'${id}'\`).join(",")` builds a SQL
  `WHERE` by string concatenation. Values are self-owned UUIDs so it is not exploitable today, but the
  shape is wrong.

Next-packet candidate, correctly scoped and correctly deprioritised relative to P3.

---

## 6. PROOF AUDIT — EVERY CLAIM RE-RUN

### Claim 1 — TYPECHECK VERIFIED. **REPRODUCES.**
```
$ npm run typecheck -w @dental/api > /tmp/tc.txt 2>&1; echo "REAL_EXIT=$?"
REAL_EXIT=0
$ cat /tmp/tc.txt
> @dental/api@0.1.0 typecheck
> tsc -p tsconfig.json --noEmit
$ wc -c /tmp/tc.txt
64
```
64 bytes = the npm banner and nothing else. **Zero tsc diagnostics.** I captured the real exit code
(not `$?` after a pipe, which would report `tail`'s status). Nothing in the claimed file scope errors.
Concurrent-agent noise: none — the run is clean repo-wide for this project.

### Claim 2 — UNIT VERIFIED, 844/844. **REPRODUCES.**
```
$ npm test -w @dental/api > /tmp/test.txt 2>&1; echo "REAL_EXIT=$?"
REAL_EXIT=0
ℹ tests 844
ℹ suites 135
ℹ pass 844
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 20119.0166
```
Identical counts to the builder's (844/135/844/0/0/0). Duration differs (20119 vs 20560 ms) as it must
between runs — a *matching* duration would have been the suspicious result. **No test was lost:** git
history proves no `syncDaemon` test file ever existed (§4).

### Claim 3 — API VERIFIED, HTTP 200. **REPRODUCES — but the reasoning attached to it is oversold.**
```
$ curl -s -o /tmp/health.txt -w "HTTP_STATUS=%{http_code}\n" http://127.0.0.1:4100/api/health
HTTP_STATUS=200
$ cat /tmp/health.txt
{"ok":true,"service":"dental-crm-api","time":"2026-07-27T20:53:11.328Z"}
```
Status code quoted, body quoted. The builder's timestamp `2026-07-27T20:47:59Z` is internally consistent
with a commit at `Jul 28 00:47:38 +0400`, so no clock fabrication.

**Where I push back.** The builder calls this "load-bearing, not ceremonial" and "independently
corroborates the zero-call-site census". It does not carry that weight. A server whose module graph
*never contained the file* returns 200 whether or not it reloaded — the observation is consistent with
the claim rather than evidence for it. I checked the process table: the `tsx watch src/server.ts`
watchers were spawned at **27.07 04:55:18, 15:55:32 and 15:58:06** — all hours before the 00:45/00:47
deletion. A tsx child does exist from **28.07 00:56:19**, after the deletion, so *something* is serving
from a post-deletion tree; but that a reload occurred at the moment of the builder's 00:47:59 curl is
unproven. Claim is TRUE, inference is inflated. Nit N2 — flagged because in this codebase, evidence
that "coexists with" a claim being narrated as evidence that *proves* it is the exact failure mode that
beat three previous reviewers. The real gates here are the typecheck, the build, and the census.

### Claim 4 — CENSUS VERIFIED. **REPRODUCES EXACTLY.** See §4. Every file:line he listed is right.

### Claim 5 — "isSynced:true is now written by NO code path". **CONFIRMED, and I hardened it.**
```
$ rg -n "isSynced" -g '!*.md' apps packages scripts
apps/api/src/routes/workspaceProfile.ts:333       isSynced: false
apps/api/src/routes/odontogram.ts:341/:447/:468   isSynced: false
apps/api/src/tests/db/patientsQuery.test.ts:192   isSynced: false   (fixture)
apps/api/src/db/schema.ts:300/1319/1393/1435/1544 boolean("is_synced").notNull().default(false)
```
His list is exact. Three additional checks he did not run:
- **Raw SQL:** `rg "is_synced"` across `drizzle/`, `apps/api/drizzle/`, `apps/api/src/scripts/`,
  `scripts/`, excluding column definitions → **zero hits.** No migration or seed sets it true.
- **Frontend:** `rg "isSynced|is_synced" apps/web/src` → **zero hits.** No UI reads the column, so no
  user-visible "backed up" badge is now permanently stuck. The `Синхронизация` strings in
  `apps/web/src/workspaceContinuityStrip.tsx`, `useAppLogic.tsx:7137` and `VisitView.tsx:465` belong to
  an unrelated offline-queue / server-draft mechanism, not to this column.
- **Live DB defaults:** every one of the 14 tables carrying `is_synced` has `column_default = false`,
  `is_nullable = NO`. Nothing defaults it true.

The column is fully inert: no writer of `true`, no reader anywhere. Answer to the lead's question stands.

### Claim 6 — ENCODING VERIFIED. **REPRODUCES.**
```
$ node scripts/check-encoding.mjs > /tmp/enc.txt 2>&1; echo $?   -> 1
$ grep -c "tsconfig" /tmp/enc.txt                                -> 0
```
Exit 1 is pre-existing repo debt (28 flagged files, all in `scripts/`, `apps/api/src/migration/` etc.),
none of it his and the builder documented that gap himself in handoff §3.

Direct byte audit of his file:
```
apps/api/tsconfig.json
  hasBOM: false        first3bytes: 123 10 9   (= '{', LF, TAB)
  roundTripsAsUTF8: true    hasCRLF: false    brokenLines(mojibake regex): 0
  added lines: "// Четвёртый файл из того списка, src/services/syncDaemon.ts, удалён"
               "// байта — в файле не было ни одного сетевого вызова."
```
Real Cyrillic, real em-dash, UTF-8 no BOM, LF. Not mojibake.

### Claim 7 — COMMIT VERIFIED. **REPRODUCES.** See §7.

---

## 7. GIT HYGIENE

| Check | Result |
|---|---|
| Only the claimed file in the commit? | **Yes.** `git show --pretty=format: --name-only c97ceb4d8` → `apps/api/tsconfig.json`, one line. |
| Churn swept in (`apps/api/.data/*.json`, `*.tsbuildinfo`, `scratch/**`, `.dente-ops-shots/`)? | **None.** Grepped the name-only list for all four patterns → no match. Also checked `8c87dcd93` → no churn there either. |
| Another agent's file? | **No.** The builder even names an untracked neighbour file he found in his own directory (`apps/api/src/services/patients/recallCandidates.ts`) and confirms he did not stage it — I confirm it is not in the commit. |
| Conventional Commits? | **Yes.** `[ARCHON] fix(синхронизация): …` matches `^\[ARCHON\] (feat\|fix\|refactor\|chore\|docs\|…)(\(…\))?: .+`. |
| Subject names the DEFECT, not "improve/update/cleanup"? | **Yes.** «медкарты помечались выгруженными в облако после нуля отправленных байт» — states the lie the code told. 99 chars, long but specific. |
| Russian subject mojibake? | **No.** Read as raw bytes → `"[ARCHON] fix(синхронизация): медкарты помечались выгруженными в облако после нуля отправленных байт"`, zero mojibake-signature lines. Body likewise clean. |
| Body explains WHY (mandate 12)? | **Yes**, at length, with the line numbers of the deleted code and the history-collision disclosure. |
| Another agent's history rewritten? | **No.** `8c87dcd93` is untouched; the builder recorded the reason in his own commit instead. Correct call. |

---

## 8. CLOSING THE BUILDER'S THREE "NOT PROVEN" ITEMS — ALL CLEAN

The builder listed three gaps honestly instead of papering over them. I closed all three.

### NP-1: does the deletion break the *emitting* build? **NO.**
```
$ npm run build -w @dental/api > /tmp/build.txt 2>&1; echo "BUILD_EXIT=$?"
BUILD_EXIT=0
> @dental/api@0.1.0 build
> tsc -p tsconfig.json
```
Full emit, exit 0, no diagnostics. `apps/api/dist/services/syncDaemon.js` was not regenerated (source
gone) and no other emitted file references it (§4).

### NP-2: are any rows already stamped `is_synced = true`? **ZERO — and I checked 14 tables, not 5.**
Read-only query against `postgres://…@127.0.0.1:5432/dental_crm`:

```
appointments             total=    27  is_synced_true=0
clinics                  total=     1  is_synced_true=0
generated_documents      total=     0  is_synced_true=0
organizations            total=     2  is_synced_true=0
patient_invoices         total=     0  is_synced_true=0
patients                 total=    17  is_synced_true=0
payments                 total=     8  is_synced_true=0
tooth_states             total=    25  is_synced_true=0
treatment_items          total=    10  is_synced_true=0
treatment_plans          total=     0  is_synced_true=0
treatment_scenarios      total=     0  is_synced_true=0
users                    total=     7  is_synced_true=0
visit_diaries            total=     0  is_synced_true=0
visits                   total=    10  is_synced_true=0
```
**No medical record in the live database has ever been falsely stamped.** There is no residual poison
to clean up and the packet needs no follow-up data repair. The zero-call-site finding is corroborated
by the data, which is the strong corroboration the API-health curl was reaching for.

### NP-3: fabricated card payments in `cash_ledger`? **NONE — the table is empty.**
```
select id, invoice_id, amount_rub, timestamp from cash_ledger where payment_method='card' … -> []
select payment_method, count(*) from cash_ledger group by 1                                 -> []
select count(*) from patient_invoices where status='paid'                                   -> 0
```
Zero rows of any payment method. Zero paid invoices. The mock branch never ran.

---

## 9. NITS AND ESCALATIONS

| # | Nit | Owner |
|---|---|---|
| N1 | **History attribution.** The 326-line deletion is in `8c87dcd93` under a docs subject. `git log --follow` on the deleted path gives no clue why the daemon vanished; the reason lives in a commit that touches only `tsconfig.json`. Disclosed by the builder, not caused by him. | Lead's call |
| N2 | **Over-weighted evidence.** "API VERIFIED … load-bearing … independently corroborates the census" — the 200 is real but it is consistent-with, not proof-of. The `tsx watch` parents all predate the deletion; reload at the moment of his curl is unproven. Downgrade the language, keep the fact. | Builder, cosmetic |
| N3 | **Pre-edit line numbers in a post-commit report.** `tsconfig.json:17` and `:32` were correct before his own +4-line comment; they are now `:22` and `:36`. A future agent following the citations lands 4 lines off. | Builder, cosmetic |
| N4 | **Stale prose.** `HANDOVER_AUDIT_2026-07-26.md:304-306` still describes `syncDaemon` in the present tense. It is a dated audit report (a historical record, and not one of the "imports / test / tsconfig" references the order required to follow), so leaving it is defensible — but it will read as live to the next agent who greps. | Docs, out of packet scope |
| N5 | **Subject tense.** «медкарты помечались выгруженными» reads as though real records were stamped. My DB query proves none ever were. The body corrects it immediately. | Builder, cosmetic |
| N6 | **NEW, found by me — schema/DB drift.** The live database has `is_synced` on **14** tables; `apps/api/src/db/schema.ts` models it on **5**. Nine columns — `appointments`, `clinics`, `generated_documents`, `organizations`, `payments`, `treatment_items`, `treatment_scenarios`, `users`, `visits` — exist in PostgreSQL, are `NOT NULL DEFAULT false`, are absent from the Drizzle model, and now have no writer of `true` anywhere. Nine dead boolean columns in production. Out of scope (P2 owns `schema.ts`) but worth a packet. | Escalate |
| N7 | **Stale dist orphan remains.** `apps/api/dist/services/syncEngine.js` is the same class of artifact as the `syncDaemon.js` the builder swept — compiled output for a source file that `tsconfig` now excludes, so it is never regenerated and never cleaned. Not in scope; goes with the syncEngine packet. | Escalate |

---

## 10. REVIEWER-CAUSED WORKTREE CHURN — DISCLOSED

To close the builder's NP-1 I ran `npm run build -w @dental/api`, which emits. That rewrote **44 tracked
files under `apps/api/dist/`**; all 44 carry mtime `2026-07-28 00:54`, i.e. my build, not the builder's
work and not another agent's. They are **unstaged — I ran no `git add`, no commit, no revert, and edited
no source.** These are stale committed build artifacts being refreshed, but per `.agents/INDEX.md`
"Local Swarm Rules" a neighbouring agent doing `git add .` would sweep them into an unrelated commit.
Lead should be aware; `git checkout -- apps/api/dist` restores them if desired.

Scratch files I created for read-only DB/encoding queries under
`.agents/archon/packets/P3-syncdaemon/_rv/` are deleted at the end of this review.

---

## ATTACK SURFACE

| # | Hypothesis | Result | Evidence |
|---|---|---|---|
| H1 | The commit under attack does not actually contain the claimed deletion — the builder is describing work he did not commit | **CONFIRMED (but disclosed)** | `git show --stat c97ceb4d8` → `apps/api/tsconfig.json \| 8 ++++++--`, 1 file. Deletion is in `8c87dcd93` (`git show --stat 8c87dcd93` → `syncDaemon.ts \| 326 ------`). Builder disclosed this in BLOCKERS, in `handoff.md` §1 and in his commit body before I looked. |
| H2 | The defect was not real at the cited lines — the brief was recycled prose | **DISPROVED** | `git show 8c87dcd93^:apps/api/src/services/syncDaemon.ts` (326 lines) read in full. Ternary at :185-196, `if (response.success)` :198, five `set({isSynced:true})` :200-233, mock invoice injection :79-85, `cashLedger` insert :293-298. Every citation exact. |
| H3 | The file still exists / the deletion did not land | **DISPROVED** | `git ls-files apps/api/src/services/syncDaemon.ts` → empty. `ls` → No such file. `git log --all --pretty=format: --name-only -- '*syncDaemon*'` → one path, now absent. |
| H4 | TYPECHECK VERIFIED was never run or does not pass | **DISPROVED** | `npm run typecheck -w @dental/api` → `REAL_EXIT=0`, output 64 bytes (npm banner only), zero tsc diagnostics. |
| H5 | UNIT VERIFIED numbers are fabricated | **DISPROVED** | `npm test -w @dental/api` → `REAL_EXIT=0`; `tests 844 / suites 135 / pass 844 / fail 0 / cancelled 0 / skipped 0 / todo 0`. Counts identical to the claim; only `duration_ms` differs (20119 vs 20560), as it must. |
| H6 | A test that covered real behaviour was deleted with the daemon | **DISPROVED** | `git log --all --pretty=format: --name-only -- '*syncDaemon*'` returns exactly one path ever: the source file. No `syncDaemon.test.ts` has existed in any commit on any branch. |
| H7 | API VERIFIED has no real status code behind it | **DISPROVED (claim true)** | `curl -w "HTTP_STATUS=%{http_code}"` → `HTTP_STATUS=200`, body `{"ok":true,"service":"dental-crm-api","time":"2026-07-27T20:53:11.328Z"}`. |
| H8 | The API 200 does not prove what the builder says it proves | **CONFIRMED** | `Get-CimInstance Win32_Process`: all three `tsx watch src/server.ts` parents created 27.07 04:55:18 / 15:55:32 / 15:58:06 — before the 00:45 deletion. A server that never imported the file returns 200 regardless of reload. Consistent-with, not proof-of. Nit N2. |
| H9 | A live caller of the daemon survives somewhere (route, worker, script, barrel, dynamic import) | **DISPROVED** | `rg "startSyncDaemon\|stopSyncDaemon\|runSyncCycle\|SyncReport\|mockCloudVaultExchange\|syncDaemon"` over the repo → 6 hits, all comments/prose. No `services/index.ts` barrel. `apps/api/src/server.ts` sole dynamic import is `./db/client.js` at :536. `rg` over emitted `apps/api/dist/` → 3 hits, all comments. |
| H10 | `isSynced: true` is still written somewhere the builder missed (raw SQL, migration, seed, another service) | **DISPROVED** | `rg "isSynced" apps packages scripts` → only 4 `false` writes + 1 test fixture + 5 column defs. `rg "is_synced"` over `drizzle/`, `apps/api/drizzle/`, `apps/api/src/scripts/`, `scripts/` excluding column defs → zero. Live DB: all 14 tables `column_default=false`. |
| H11 | The DB already holds rows falsely stamped `is_synced = true` (builder's open gap) | **DISPROVED** | Read-only query on `dental_crm@127.0.0.1:5432` across **all 14** tables carrying the column: `is_synced_true=0` for every one (patients 17 rows, tooth_states 25, appointments 27, visits 10, users 7, payments 8, treatment_items 10, organizations 2, clinics 1, rest empty). |
| H12 | `cash_ledger` holds fabricated card payments from the mock branch (builder's open gap) | **DISPROVED** | `select … from cash_ledger where payment_method='card'` → `[]`; `select payment_method, count(*) … group by 1` → `[]` (table entirely empty); `select count(*) from patient_invoices where status='paid'` → `0`. |
| H13 | The deletion breaks the emitting production build (builder's open gap; typecheck is `--noEmit`) | **DISPROVED** | `npm run build -w @dental/api` → `BUILD_EXIT=0`, `tsc -p tsconfig.json` clean, no diagnostics. |
| H14 | The builder silently skipped ordered step 2, the syncEngine status report | **DISPROVED** | `handoff.md` §Blockers-2 (lines 141-158) reports it in full. I verified independently first: zero call sites for `startSyncEngine`/`stopSyncEngine`; `@electric-sql/pglite` absent from every `package.json` and from `node_modules/`; `ELECTRIC_SYNC_URL` unset; excluded at `tsconfig.json:32` at the parent commit. His verdict "dead but not lying" is correct. |
| H15 | The tsconfig edit changed build behaviour (touched `exclude`, not just the comment) | **DISPROVED** | Full diff of `c97ceb4d8` is 8 lines, all inside the `//` comment block at :14-25. The `"exclude"` array is byte-identical before and after. `npm run build` and `npm run typecheck` both exit 0. |
| H16 | The change is a hollow facade — new `{success:true}`, placeholder, magic constant, hardcoded UUID/port/endpoint, fabricated 0 | **DISPROVED** | The diff adds no code, no values, no identifiers — only a Russian comment. It *removes* the file that hardcoded `success:true`. |
| H17 | It creates a second owner / duplicate source of truth | **DISPROVED** | Removes one of two sync modules. No new helper, no parallel error vocabulary. Remaining `syncEngine.ts` is dead and untouched. |
| H18 | It deleted or renamed a field in the `useAppLogic.tsx` return block | **DISPROVED** | Commit touches exactly one file, `apps/api/tsconfig.json`. `apps/web/**` untouched. |
| H19 | It introduced a listener/interval/subscription without teardown | **DISPROVED** | Net −1 interval: the deletion removes `setInterval(runSyncCycle, 30000)` together with its `clearInterval` in `stopSyncDaemon`. Nothing registered. |
| H20 | It added a hardcoded hex colour, static px, or an undeclared i18n Russian literal | **DISPROVED** | No UI, no CSS, no user-facing string. The Russian is a tsconfig `//` comment. |
| H21 | Russian text in the diff or commit subject is mojibake | **DISPROVED** | `apps/api/tsconfig.json`: no BOM, first bytes `123 10 9`, round-trips as UTF-8, LF endings, 0 mojibake-signature lines. Subject read as raw bytes: `"[ARCHON] fix(синхронизация): медкарты помечались выгруженными в облако после нуля отправленных байт"`. Body clean. `node scripts/check-encoding.mjs` → `grep -c tsconfig` = 0. |
| H22 | Churn or another agent's file rode along in the commit | **DISPROVED** | `git show --pretty=format: --name-only c97ceb4d8` = one line. Grep for `.data/`, `tsbuildinfo`, `scratch/`, `dente-ops-shots` → no match. Same check on `8c87dcd93` → no match. |
| H23 | The builder rewrote another agent's history to hide the collision | **DISPROVED** | `8c87dcd93` intact, authored 00:45:22, still holds the deletion. `c97ceb4d8` authored 00:47:38 as a separate commit. No amend, no rebase. |
| H24 | The frontend surfaces `isSynced`, so freezing it at `false` breaks a user-visible state | **DISPROVED** | `rg "isSynced\|is_synced" apps/web/src` → zero hits. The `Синхронизация` strings in `workspaceContinuityStrip.tsx`, `useAppLogic.tsx:7137`, `VisitView.tsx:465` belong to an unrelated offline-queue mechanism. |
| H25 | `apps/api/dist/services/syncDaemon.js` was tracked, so deleting it from disk left an unreported staged/unstaged deletion | **DISPROVED** | `git ls-files apps/api/dist/services/syncDaemon.js` → empty; `git log -- <path>` → empty. Never tracked, despite 149 *other* `dist/` files being tracked (a legacy the builder flagged himself). |
| H26 | The 5 tables in the brief are the whole `is_synced` story | **DISPROVED — new finding** | `information_schema.columns` → 14 public tables carry `is_synced`; `schema.ts` models 5. Nine unmodelled dead columns. Not the builder's scope (P2 owns `schema.ts`); escalated as N6. |

---

## FINAL VERDICT: SOUND_WITH_NITS

The defect was real, worse than the brief said, and is now gone. Deletion was the right disposition: the
module had zero call sites, no cloud endpoint exists to implement against, and my database read proves it
never fired. Typecheck, unit suite, emitting build and census all reproduce; the two proofs the builder
could not run — the live DB state and the production build — I ran, and both came back in his favour.
Nothing in this packet is fabricated.

The nits are framing (N2, N3, N5), a history-attribution problem he reported rather than hid (N1), and
pre-existing debt he surfaced honestly (N4, N6, N7). None of them touches the correctness of the change.

Not SOUND, for one reason only: the builder narrated a piece of coexisting evidence (the health 200) as
independent proof of the call-site census. It happened to be a true claim about a true situation, so no
harm resulted — but in this repository that is the exact rhetorical move that has to cost something every
single time, or it comes back as a Vite error overlay with 56 filenames.

**Required rework: none blocking.** Two lead decisions outstanding: the `8c87dcd93` history attribution
(N1) and whether to open packets for `syncEngine.ts` (§5) and the nine orphan `is_synced` columns (N6).
