# R5 — CENSUS BLIND SPOTS — DOSSIER

Read-only recon. Every number below was produced by a command run on this host on 2026-07-28 and the
command is quoted with the finding. Nothing is inherited from an earlier report.

Instrument I wrote for this packet (read-only, writes only its own JSON on stdout):
`.agents/archon/recon/R5-census-blind-spots/r5-table-access-scan.mjs`
Output snapshot: `.agents/archon/recon/R5-census-blind-spots/r5-tables.json` (493 628 bytes)

Baseline it produced:
```
$ node .agents/archon/recon/R5-census-blind-spots/r5-table-access-scan.mjs
tables in schema: 126
code files parsed repo-wide: 1071
drizzle access sites: 1168; raw SQL sites: 332
READ but NO runtime writer and NO migration seed: 13
  of those, no writer ANYWHERE in the repo: 9
  of those, writer exists OUTSIDE apps/api/src: 4
```

---

## F0 — THE BEHAVIOURAL ROUTE GATE CANNOT BE RUN BY A READ-ONLY AGENT (blocker, affects the packet brief)

The brief ordered me to run `node scripts/smoke-clinical-mutation-guard.mjs` and mine its JSON. It
refuses to boot:

```
$ node scripts/smoke-clinical-mutation-guard.mjs
EXIT=1
Error: СБОРКА УСТАРЕЛА: ... Соберите API и повторите: npm run build -w @dental/api
Исходников новее своей сборки: 5
  - apps/api/src/server.ts  исходник 2026-07-28T10:00:12.638Z новее сборки 2026-07-28T08:05:02.082Z
  - apps/api/src/db/schema.ts  исходник 2026-07-28T11:15:05.078Z новее сборки 2026-07-28T08:05:01.521Z
  - apps/api/src/routes/workspaceProfile.ts  исходник 2026-07-28T11:17:09.396Z новее сборки ...
  - apps/api/src/services/communications/dispatcher.ts ...
  - apps/api/src/utils/telegramChatRef.ts ...
Компилируемых файлов без выхода сборки: 2
  - apps/api/src/routes/waitlistMatches.ts
  - apps/api/src/services/schedule/waitlistMatching.ts
    at assertBuildOutputIsFresh (scripts/lib/api-route-census.mjs:228:9)
```

`assertBuildOutputIsFresh()` (`scripts/lib/api-route-census.mjs:201-228`) THROWS on staleness by
design, and the only remedy is `npm run build -w @dental/api`, which §7a reserves for the lead.
**Consequence for the campaign: the gate's JSON is structurally unavailable to any parallel recon
agent while a build fleet is editing `apps/api/src`. It is a lead-only instrument.** Anyone who plans a
recon packet around mining that JSON is planning something that cannot happen concurrently.

Two files exist in source with no build output at all — `apps/api/src/routes/waitlistMatches.ts` and
`apps/api/src/services/schedule/waitlistMatching.ts`. Those are the live fleet's in-flight work, not a
defect.

## F0b — `payloadBeforeAuthorisation` IS A HAND-CURATED LIST OF 2, NOT A DISCOVERY

The brief describes it as something the gate "lists". It does not discover anything. It is a literal
array declared at `scripts/smoke-clinical-mutation-guard.mjs:310-325` with exactly two entries, and the
report block at `:890-893` merely echoes it back:

| route | file:line of the early validation | file:line of the rights check |
|---|---|---|
| `POST /api/auth/clinic/set-password` | `apps/api/src/routes/auth.ts:278-281` | `auth.ts:283-292` |
| `POST /api/auth/staff/set-pin` | `apps/api/src/routes/auth.ts:331-337` | `auth.ts:339-348` |

Verified by reading the file. The gate's real defence against new members of this class is indirect:
`:498-507` treats any un-excepted `400` as a FAILURE, so a newly added early-validating route turns the
gate red rather than being listed. That is a sound design, but it means **"the list has 2 entries" is
not a measurement of how many such routes exist** — it is a measurement of how many were grandfathered.
Do not quote 2 as a census.

## F0c — `apps/api/NUL` MAKES EVERY `rg` OVER `apps/` EXIT 2

```
$ rg -c "denteTelegramChatLinks" apps
EXIT=2
rg: apps\api\NUL: Неверная функция. (os error 1)
(10 files matched — stdout was complete)
$ rg -c "denteTelegramChatLinks" apps/api/src
EXIT=0
$ ls -la apps/api/ | grep NUL
-rw-r--r-- 1 Admin 197121    94 Jul 26 20:32 NUL
```

`apps/api/NUL` is a 94-byte file with a Windows reserved device name. ripgrep cannot open it, reports
an I/O error, and **exits 2 even though the search succeeded and the results are complete**. Any
`rg ... apps/ && next-step` chain dies silently mid-recon; any script using `set -e` or testing `$?`
records a false failure. It cost me one lost command in this very session. §9 workspace-hygiene
garbage with a real measurement consequence. Scope searches to `apps/api/src` / `apps/web/src`, or
delete the file.

═══════════════════════════════════════════════════════════════════════════════
# SECOND R5 RUN — 2026-07-28, HEAD `fea94cc92`
The first R5 run above was killed after F0c (its `state.md` was lost; its JSON artefacts survive).
This run re-verifies its three findings and then does the three inventories the packet ordered.
Nothing below is inherited: every number carries the command that produced it.
═══════════════════════════════════════════════════════════════════════════════

## V0 — RE-VERIFICATION OF THE FIRST RUN'S THREE FINDINGS

**F0 CONFIRMED, and it is worse than stated — the staleness is a moving target.** I re-ran the gate
~30 minutes later and it failed again with a *completely different* stale set:

```
$ node scripts/smoke-clinical-mutation-guard.mjs
EXIT=1   stdout: 0 bytes
Error: СБОРКА УСТАРЕЛА: ... Соберите API и повторите: npm run build -w @dental/api
Исходников новее своей сборки: 4
  - apps/api/src/db/domainStateHydration.ts  исходник 11:55:26.141Z новее сборки 11:52:42.035Z
  - apps/api/src/db/pricelistQuery.ts        исходник 11:53:44.866Z новее сборки 11:52:42.016Z
  - apps/api/src/db/schema.ts                исходник 11:54:51.834Z новее сборки 11:52:41.859Z
  - apps/api/src/routes/patients.ts          исходник 11:52:59.611Z новее сборки 11:52:42.282Z
    at assertBuildOutputIsFresh (scripts/lib/api-route-census.mjs:228:9)
```
First run saw 5 stale files (`server.ts`, `schema.ts`, `workspaceProfile.ts`, `dispatcher.ts`,
`telegramChatRef.ts`) plus 2 uncompiled; this run saw 4, only `schema.ts` in common, and the two
uncompiled files are gone (the fleet built in between). **The build was rebuilt at 11:52 and was
already stale by 11:55 — a 3-minute window.** Conclusion for campaign planning: mining this gate's JSON
is not a task that can be delegated to a parallel agent at all. It is not "read-only unavailable
because of a lock"; it is unavailable because the fleet invalidates the precondition faster than the
gate can be run. Any packet whose deliverable depends on that JSON must be scheduled in a fleet-quiet
window by the lead.

**F0b CONFIRMED verbatim.** `payloadBeforeAuthorisation` is a literal 2-element array, not a discovery:
```
$ rg -n 'payloadBeforeAuthorisation' scripts/ apps/api/src/
scripts/smoke-clinical-mutation-guard.mjs:310:const payloadBeforeAuthorisation = [
scripts/smoke-clinical-mutation-guard.mjs:367:	payloadBeforeAuthorisation,
scripts/smoke-clinical-mutation-guard.mjs:890:	payloadBeforeAuthorisation: payloadBeforeAuthorisation.map((entry) => ({
```
Three references total, one of them the declaration and one the echo. It is a list of *probe payloads*
the gate must send so the guard is reached at all — the opposite of an output. **The packet brief that
sent me here was wrong on this point**, and since the gate cannot run anyway I replaced it with a
static census of the same defect class — see §D below, which found 2 more.

**F0c NOT REPRODUCED — the first run overstated it, and I am contradicting it.** The claim was that
`apps/api/NUL` makes *every* `rg` over `apps/` exit 2. Measured, ripgrep 15.1.0:
```
$ for t in apps apps/ apps/api apps/api/; do rg -c "denteTelegramChatLinks" "$t" >/dev/null 2>&1; echo "EXIT=$?"; done
EXIT=0   EXIT=0   EXIT=0   EXIT=0
$ rg -c "pgTable" apps 2>err.txt >/dev/null ; echo "EXIT=$? stderr_bytes=$(wc -c < err.txt)"
EXIT=0 stderr_bytes=0            <-- walk mode: clean exit, NOT ONE BYTE of stderr
$ rg -c "x" "apps/api/NUL" >/dev/null 2>/dev/null ; echo "EXIT=$?"
EXIT=2                            <-- only when named EXPLICITLY
$ rg --files apps/api --max-depth 1 | rg -i 'nul'
apps/api\NUL                      <-- the walk does enumerate it
```
The corrected fact: **the directory walk is safe (exit 0, empty stderr); only naming the file
explicitly exits 2.** `rg --files` does list it, so a script that pipes `rg --files` into a per-file
search *would* hit exit 2 — that is the real, narrow hazard, and it is probably what the first run
tripped over. Searches over `apps/` need no special scoping. The file itself is still real §9 garbage:
94 bytes, `Jul 26 20:32`, and `git ls-files --error-unmatch apps/api/NUL` →
`did not match any file(s) known to git`, i.e. untracked and unignored.

## V1 — MY INSTRUMENT, AND WHY IT SEES MORE

Blind spots restated from the census's own source, not from the brief:
- **`scripts/census-hollow-query-modules.mjs:360`** — `walk(API_SRC, isTs)` plus `walk(WEB_SRC, isTs)`.
  Repo-root `scripts/` (217 code files), `packages/`, `apps/web/tests/` are never parsed.
- **`:417`** — `walk(DB_DIR, (f) => /Query\.ts$/.test(f))`. The unit of judgement is the *module*, so a
  table read inline in a route belongs to nothing and is never judged.

My instrument: `.agents/archon/recon/R5-census-blind-spots/scratch/repowide-census.mjs`, read-only,
TypeScript AST for drizzle builder calls + raw-SQL literal scan + `.sql` files, judged **per table**.

| | existing census | first R5 run | this run |
|---|---|---|---|
| code files parsed | **721** (341 api + 380 web) | 1071 | **1860** |
| `.sql` files | `apps/api/drizzle` only | n/a | **1398** |
| unit of judgement | 22 `*Query.ts` modules | tables | 126 tables |

```
$ node scripts/census-hollow-query-modules.mjs --json | jq '.totalModules, .tablesInSchema'
22      126
$ node .agents/.../scratch/repowide-census.mjs | jq -r '"parsedCode=\(.parsedCode) sqlFiles=\(.sqlFiles)"'
parsedCode=1860 sqlFiles=1398
```

**Cross-check that matters:** the first run and this run independently agree on the headline count —
*13 tables are read while having no runtime writer and no migration seed*. Two different instruments,
same 13. Where we differ (it said 9 with no writer anywhere / 4 elsewhere; I get 8 / 7) is purely scan
scope: I also walked `scratch/` and `.agents/`, which moved tables from "no writer anywhere" into
"writer elsewhere". Those are recon artefacts, not application writers — reconciled honestly in §B.

Corrections to inherited numbers, all measured this run:
- `*Query.ts` modules number **22, not 23**. `fd -t f -e ts . apps/api/src/db --max-depth 1` → 22
  non-test `*Query.ts`. One more went after the "42 → 23" claim was written.
- **ast-grep IS installed.** `npx ast-grep --version` → `ast-grep 0.44.1`. The census's own header
  (lines 17–20) claims it is absent and uses that to justify hand-rolling a TS parser — it tested the
  wrong package name. `npx @ast-grep/cli` fails; `npx ast-grep` works. I used it for the structural
  sweep (1732 tagged call sites) as a check on my TS pass.
- schema files: `rg -c 'pgTable\(' apps/api/src/db/*.ts` → `schema.ts:123`, `patientsSchema.ts:1`,
  `communicationsSchema.ts:2` = **126**. The census's hardcoded 3-file list is complete; **this is NOT a
  blind spot** and I am recording that so nobody spends a packet on it.

## V2 — DB GROUND TRUTH (read-only `select count(*)`, this run)

**146 BASE TABLEs in `public`; schema.ts declares 126.** → **20 live tables Drizzle does not model at
all**, which the census cannot see by construction (it enumerates from `pgTable`, not from the database).

Only **24 of 146** tables hold a single row:
```
audit_events 1005 | migration_staging_records 480 | tooth_state_history 99 | _dente_migrations 97
appointments 27 | tooth_states 25 | patients 17 | visits 10 | treatment_items 10 | payments 8
users 7 | communication_outbox 6 | migration_runs 4 | migration_reconciliations 4
generated_documents 4 | communication_templates 3 | recent_patient_history 2 | organizations 2
chairs 2 | imaging_viewer_sessions 1 | imaging_studies 1 | dicom_workbench_bundles 1
communication_campaigns 1 | clinics 1
```
122 tables are empty. Per house rules that proves nothing alone; the writer is the question.

## §A — INVENTORY 1: READS WITH NO QUERY MODULE (blind spot 1)

Method. Populating writers are `insert` and `update` **only** — a `delete` never fills a table, so
counting it as a "writer" is how a hollow table gets a false life verdict. I split writer location into
app runtime (`apps/api/src` non-script non-test, `apps/web/src`, `packages`), manual script
(`apps/api/src/scripts`, repo `scripts/`), migration, test, and recon artefact (`scratch/`, `.agents/`).

**12 tables are read by application runtime code and have no populating writer in application code.**
Six of them sit inside a `*Query.ts` module and so are already visible to the census. **Six are not, and
those six are blind spot 1.** All six verified individually with a repo-wide `rg` for both the Drizzle
identifier and the SQL name; all row counts are live `select count(*)`.

| # | table | rows | read at | populating writer anywhere | verdict |
|---|---|---|---|---|---|
| A1 | `patient_invoices` | **0** | `apps/api/src/routes/portal.ts:612` (+ raw SQL `apps/api/src/scripts/cronAnalyticsWorker.ts:99,197`) | **NONE** | defect, patient-facing |
| A2 | `egisz_multiple_diagnoses` | **0** | `apps/api/src/routes/egisz.ts:177` | **NONE** | known; registry lies about it |
| A3 | `dente_telegram_outbox_delivery_receipts` | **0** | `apps/api/src/telegram/outbox.ts:82` | **NONE** | split-brain, see A3 |
| A4 | `treatment_scenarios` | **0** | `apps/api/src/services/biAnalyticsWorker.ts:73` | **NONE** (only `delete` at `apps/api/src/scripts/migrateStateToDb.ts:41`) | orphan chain |
| A5 | `imaging_series` | **0** | `apps/api/src/routes/dicomweb.ts:232` (innerJoin) | script only: `apps/api/src/scripts/ingestDicom.ts:49` | manual-only feature |
| A6 | `imaging_instances` | **0** | `apps/api/src/routes/dicomweb.ts:231` | script only: `apps/api/src/scripts/ingestDicom.ts:60` | manual-only feature |

### A1 — `patient_invoices`: the PATIENT PORTAL reads a table nothing on earth writes
`apps/api/src/routes/portal.ts:611-615` — the authenticated patient's own data payload:
```ts
const invoices = await db
    .select()
    .from(patientInvoices)
    .where(eq(patientInvoices.patientId, patient.id));
```
Repo-wide proof of no writer:
```
$ rg -n --glob '!node_modules' --glob '!dist' -- "patientInvoices" .
apps/api/src/scripts/cronAnalyticsWorker.ts:5:  patientInvoices,        <- import, read only
apps/api/src/db/schema.ts:1638:export const patientInvoices = pgTable("patient_invoices", {
apps/api/src/routes/portal.ts:8:   patientInvoices,
apps/api/src/routes/portal.ts:614:            .from(patientInvoices)
apps/api/src/routes/portal.ts:615:            .where(eq(patientInvoices.patientId, patient.id));
scratch/analytics.ts.txt:...                                <- a .txt file, not code
```
`select count(*) from patient_invoices` → **0**. There is no `insert(patientInvoices)` and no
`INSERT INTO patient_invoices` anywhere except the `CREATE TABLE` in
`apps/api/drizzle/0000_freezing_randall_flagg.sql:835`.
**Why it matters for a solo dentist:** the patient portal is the practice's public face. Its "мои счета"
section is wired to a table that can never contain a row, so every patient who logs in sees an empty
invoice list forever — and the dentist has no way to discover that, because the endpoint returns `200`
with a valid empty array. This is §1 facade and §3 (a patient wondering "where are my bills?"). It is
also the same defect class as the egisz one, in a far more visible place.
The neighbouring reads in the same handler are fine and prove the route is otherwise real:
`visit_diaries` has runtime writers at `apps/api/src/routes/diary.ts:539` (insert) and `:174,:496,:745`
(update); `treatment_plans` at `apps/api/src/routes/odontogram.ts:460` (insert) and `:438` (update).
Those two are empty only because the database is empty. `patient_invoices` is empty **by construction**.

### A2 — `egisz_multiple_diagnoses`, and the registry's citation is a file that does not exist
Route registered at `apps/api/src/routes/egisz.ts:163` (`app.get("/api/egisz/multiple-diagnoses"`), read
at `:177-180`. 0 rows, 0 writers. The brief's `:163` and my `:177` are both right — one is the
registration, one is the read.
The proof that `docs/competitive-audit/` is a record of claims and not of code, at a precise line:
```
docs/competitive-audit/FEATURES_REGISTRY.md:34
| 30 | прием::передача_в_егисз_нескольких_диагнозов | ... | [ДА] | ... | MUST-HAVE |
     apps/api/src/db/egiszMultipleDiagnosesQuery.ts; proof_egisz_multiple_diagnoses.png |
$ fd -t f 'egiszMultipleDiagnoses' .     ->  (no output)
$ fd -t f 'proof_egisz' .                ->  (no output)
```
**Both cited artefacts do not exist**, and the feature is marked `[ДА]` present. The route does exist, so
the lie is subtler than "nothing was built": a `200 []` endpoint was built and counted as the feature.

### A3 — `dente_telegram_outbox_delivery_receipts`: one name, two storages, and the live route uses the other one
This is the trap the lead warned about, in its most dangerous form: **the same identifier names both a
Drizzle table and an in-memory array.**
- table: `apps/api/src/db/schema.ts:758` — read at `apps/api/src/telegram/outbox.ts:82` (imported from
  `../db/schema.js`, `outbox.ts:6`). **0 rows, 0 inserts repo-wide.**
- array: `apps/api/src/sampleData_opt.ts:219`
  `export const denteTelegramOutboxDeliveryReceipts: DenteTelegramOutboxDeliveryReceipt[] = [];`
  written at `sampleData_opt.ts:6411 .unshift(receipt)` / `:7187`, and read by the live route at
  `apps/api/src/routes/telegram.ts:637`.

A name-based census would call this table alive (there are `.unshift` writes to "it"). It is not.
Worse, the module holding the DB read is **entirely orphaned**:
```
$ rg -n '^export ' apps/api/src/telegram/outbox.ts
19:export async function buildDenteTelegramOutboxItems(...)     <- its only export
$ rg -n 'buildDenteTelegramOutboxItems' apps/api/src/
apps/api/src/telegram/benchmark.ts:2  (the only importer)
apps/api/src/telegram/outbox.ts:19    (the definition)
$ rg -n 'telegram/benchmark|from "./benchmark' apps/api/src/ scripts/
(no output — nobody imports benchmark.ts either)
```
`apps/api/src/telegram/outbox.ts` is 116 lines of DB-backed outbox logic reachable from nothing but a
dead file. The live routes use the in-memory `buildDenteTelegramOutbox` from `sampleData.ts`
(`apps/api/src/routes/telegram.ts:985` and `:2715`).

And its single importer is a §2 ZERO-MOCKS violation in nine lines —
`apps/api/src/telegram/benchmark.ts` in full:
```ts
import { db } from "../db/client.js";
import { buildDenteTelegramOutboxItems } from "./outbox.js";

async function run() {
  const orgId = "org_benchmark";
  // The database is likely not running or requires environment variables.
  console.log("Cannot benchmark easily due to DB connection requirements");
}
run();
```
It imports two symbols and uses neither, declares an unused variable, and its entire body is a
`console.log` explaining why it does not do its job. `wc -l` → 9.

### A5/A6 — the DICOM viewer can only ever serve images if a human runs a CLI by hand
`apps/api/src/routes/dicomweb.ts:229-243` is the WADO-RS retrieve path; it joins
`imaging_instances → imaging_series → imaging_studies`. The only `insert` into the first two is
`apps/api/src/scripts/ingestDicom.ts:49` and `:60` — a manual script, not reachable from any route.
Live rows: `imaging_studies` = **1**, `imaging_series` = **0**, `imaging_instances` = **0**.
**Solo-dentist impact:** a study row exists but has no series and no instances, so the viewer has a
study it can list and cannot open. The census cannot see this because there is no `imagingSeriesQuery.ts`
and because `ingestDicom.ts` lives under `src/scripts/`, which the census correctly buckets as
`scriptWriters` — but it only reports that bucket for tables reached by a `*Query.ts` module, and these
two are not.

## §B — INVENTORY 2: WRITERS OUTSIDE `apps/api/src` (blind spot 2)

**Result: the blind spot is real but it is currently EMPTY of consequences. No table the census calls
hollow is rescued by a writer elsewhere in the repo.** That is a negative finding and it is worth as
much as a positive one, because it means cycle 7's 19 deletions were not endangered by this hole.

What the whole-repo scan actually turned up, all seven candidates, honestly classified:

| table | writer outside `apps/api/src` non-script | is it a real writer? |
|---|---|---|
| `services` | `scratch/verify-pricelist-kopecks.mjs:99` (`INSERT INTO`), `:140` (`DELETE FROM`) | **NO** — a recon verification script under `scratch/`, itself a §9 violation |
| `patient_consents` | `apps/api/src/scripts/migrateStateToDb.ts:46` | **NO** — a `delete`, which never fills a table |
| `treatment_scenarios` | `apps/api/src/scripts/migrateStateToDb.ts:41` | **NO** — a `delete` |
| `dente_telegram_webhook_events` | `apps/api/src/scripts/migrateStateToDb.ts:32` | **NO** — a `delete` |
| `dente_telegram_outbox_delivery_receipts` | `apps/api/src/scripts/migrateStateToDb.ts:31` | **NO** — a `delete` |
| `imaging_series` | `apps/api/src/scripts/ingestDicom.ts:49` | yes, but inside `apps/api/src` — the census sees it and buckets it `scriptWriters` |
| `imaging_instances` | `apps/api/src/scripts/ingestDicom.ts:60` | same |

So: **zero** genuine application writers live outside `apps/api/src`. The first R5 run reported "writer
exists OUTSIDE apps/api/src: 4"; that number counted `delete` calls as writers and is misleading. I am
correcting it rather than repeating it.

The one thing this inventory did find is that the repo-root `scripts/` tree — 217 code files, entirely
invisible to the census — contains **no** table writer at all. I checked directly:
```
$ jq -r '[.tables[].writes[] | select(.bucket=="repo-scripts")] | length' repowide.json
0
```
That is the honest reason blind spot 2 is empty: nothing in `scripts/` touches a table by name. The hole
in the tool is real; the campaign just has not fallen into it yet. **It remains a live hazard** — the
moment someone adds a seeder under `scripts/`, the census will start calling live tables hollow.

## §C — A FOURTH BLIND SPOT THE PACKET DID NOT NAME: WRITERS THAT ARE NEVER CALLED

This is the most consequential thing I found, and neither the census nor the packet brief covers it.

**The census asks "does a writer EXIST?". It never asks "is the writer ever CALLED?"** A table whose
only `insert` sits inside a function no production code invokes is exactly as permanently-empty as a
table with no `insert` at all — and the census scores it as having a runtime writer, i.e. alive.

Two confirmed instances, both scored alive by the existing tool, both **0 rows and structurally
unfillable**:

**C1 — `outgoing_notifications`, 3 "writers", 0 reachable.** rows = **0**.
```
W apps/api/src/services/notificationWorker.ts:13   insert   (inside processNotificationQueue)
W apps/api/src/services/notificationWorker.ts:111  update   (same)
W apps/api/src/services/postOpCareTrigger.ts:9     insert   (inside triggerPostOpCare)
```
`processNotificationQueue` is only started by `startNotificationWorker` (`notificationWorker.ts:126`),
and:
```
$ rg -n 'startNotificationWorker' apps/ scripts/
apps/api/src/services/notificationWorker.ts:126   (definition)
apps/api/src/services/notificationWorker.test.ts:24   (its own test)
apps/api/src/services/communications/dispatchWorker.ts:5:
   * ниоткуда не вызывался — startNotificationWorker не встречается в проекте
```
`triggerPostOpCare` likewise: only caller is `apps/api/src/services/tests/postOpCareTrigger.test.ts:25`.
The codebase already knows — `apps/api/src/services/communications/appointmentReminders.ts:10-11` says
in so many words: «services/recallScheduler.ts и services/postOpCareTrigger.ts — оба ниоткуда не
вызываются». So this is a documented orphan that was never cleaned up, and the replacement
(`appointmentReminders.ts`, with a real idempotency key) is the live path. **Honest fix: delete, not
wire.** `notificationWorker.ts:123` also carries a literal placeholder comment —
`// In a real env, you would run setInterval(() => processNotificationQueue(), 60000)` — a §2 violation.

**C2 — `bi_analytics_snapshots`, 1 runtime writer, unreachable.** rows = **0**.
```
W apps/api/src/services/biAnalyticsWorker.ts:259   insert   (inside computeBiAnalyticsSnapshots)
W apps/api/src/scripts/cronAnalyticsWorker.ts:236  insert   (manual script)
```
`computeBiAnalyticsSnapshots` runs only from `startBiAnalyticsWorker` (`biAnalyticsWorker.ts:269`), whose
only caller is `apps/api/src/services/tests/biAnalyticsWorker.test.ts:55`. The 279-line worker's only
non-test importer in the repo is **`benchmark_biAnalytics.ts` at the repository root** — another §9
scratch-file-in-root violation:
```
$ rg -n "biAnalyticsWorker" --glob '!node_modules' --glob '!dist' .
./benchmark_biAnalytics.ts:3:import { computeBiAnalyticsSnapshots } from "./apps/api/src/services/biAnalyticsWorker.js";
./apps/api/src/services/tests/biAnalyticsWorker.test.ts:6
(+ comments in tsconfig.json:17, schema.ts:2213, cronAnalyticsWorker.ts:50)
```
This is also why `treatment_scenarios` (A4) is read but dead: its only reader,
`biAnalyticsWorker.ts:73`, is in the unreachable worker.

**Cleared, do not report as live:** `scratch/tsc-audit.txt:16,22` records
`TS2305: Module '"../db/schema.js"' has no exported member 'biAnalyticsSnapshots'` for both workers. That
is **stale** — `apps/api/src/db/schema.ts:2216` now declares `biAnalyticsSnapshots`. I checked before
repeating it.

## §D — INVENTORY 3: STATE-CHANGING GET/HEAD ROUTES (blind spot 3)

Method. I wrote my own scan (`scratch/get-writes.mjs`) deliberately **not** as a transitive taint
analysis — the previous run's full-taint pass produced a 100-entry "TIER 3" in which nearly every
authenticated GET appears because it reaches `accessGuard.ts#requireResolvedOrganizationId`. Taint through
a shared guard is noise, not a finding. Two precise tiers only: a write lexically inside the handler
body, and a handler that calls a function whose own body writes.

```
$ node .agents/.../scratch/get-writes.mjs
files parsed: 341
GET/HEAD registrations with a string path: 128
named functions in apps/api/src whose own body writes the DB: 164
TIER 1 — write lexically inside the handler: 1
TIER 2 — handler calls a DB-writing function: 17
```
**There are no `HEAD` routes at all** — `rg -n 'app\.head\(' apps/api/src/` returns nothing. So this
inventory is entirely about GET.

**I then read all 17 TIER-2 candidates and 13 are false positives created by my own scan's argument
filter.** Recording that honestly, because an unaudited 17 would have been a fabricated number:

| pattern | what it really is | verdict |
|---|---|---|
| `verifyToken` → `update(data)` `apps/api/src/utils/cryptoHelper.ts:59` | `createHmac("sha256", secret).update(data)` — HMAC, not SQL | **false positive** (8 routes) |
| `readIssuedDocumentSnapshot` → `update(html)` `apps/api/src/db/documentQuery.ts:44` | `createHash('sha256').update(html,'utf8')` — hash, not SQL | **false positive** (4 routes) |
| `isRateLimited` → `delete(key)` `apps/api/src/routes/publicAppointmentActions.ts:46` | `requestCounts.delete(key)` on a `Map` | **false positive** (2 routes) |
| `addClient` → `delete(conn)` `apps/api/src/services/websocketBroker.ts:17,20` | `clients.delete(conn)` on a `Set` | **false positive** (1 route) |

**After that audit: exactly 4 GET routes write the database.** My scan and the previous run's independent
scan agree on the same 4 — two different instruments, same answer, which is the strongest completeness
signal available without running the gate.

| # | route | file:line | what it writes | verdict |
|---|---|---|---|---|
| D1 | `GET /api/p/:code` | `apps/api/src/routes/publicAppointmentActions.ts:260` → `handle` at `:123` | `update(appointments)` `:191`,`:207`; `insert(communicationTasks)` `:223` | **deliberate, acceptable** |
| D2 | `GET /api/system/persistence/export` | `apps/api/src/routes/system.ts:682` | `insert(auditEvents)` `:686` | **deliberate, correct** |
| D3 | `GET /api/imaging/studies/:id/viewer-session` | `apps/api/src/routes/imaging.ts:6520` | `insert(imagingViewerSessions)` via `apps/api/src/db/imagingQuery.ts:203` | **DEFECT — racy, can lose annotations** |
| D4 | `GET /api/templates` | `apps/api/src/routes/templates.ts:14` | `insert(visitTemplates)` via `apps/api/src/scripts/seedTemplates.ts:379` | **DEFECT — seeder on a read, racy, fails silently** |

### D1 — deliberate signed-link. Not a defect.
`app.get("/api/p/:code", async (request, reply) => handle(request, reply));` The path is short on purpose
and the comment at `:255-259` explains why (Cyrillic SMS segments cost money per character). It is
credentialed by a single-use random action code — `markActionCodeUsed(resolved.code)` runs immediately
after each write at `:192` and `:209` — and IP rate-limited via `isRateLimited`. It renders an HTML page,
not JSON. This is the standard one-click confirm/cancel from an SMS. **Correct as designed.** It does
prove the gate's "GET is non-mutating" frame has a hole, which is the point.

### D2 — deliberate audit-on-read. Not a defect.
```ts
app.get("/api/system/persistence/export", async (request, reply) => {
  if (!(await requireClinicalReadAccess(request, reply, "persistence export"))) return;
  const [org] = await db.select().from(organizations).limit(1);
  if (org) {
    await db.insert(auditEvents).values({ ..., action: "persistence_export_downloaded", ... });
  }
```
Recording that an admin downloaded a state backup is exactly what an audit log is for, and the guard runs
first. `audit_events` = **1005 rows**, the busiest table in the database. **Correct.**
One latent bug worth a line: the audit row is attributed to `db.select().from(organizations).limit(1)` —
the *first* organization, not the caller's. With `organizations` = **2 rows**, an export by org B is
recorded against org A. Same class as the `getDefaultOrganizationId()` bug that `imaging.ts:6523-6526`
documents having already fixed elsewhere.

### D3 — `GET .../viewer-session` creates a row, and the create is racy. REAL DEFECT.
`apps/api/src/db/imagingQuery.ts:179-212` is read-then-insert with no transaction and no
`onConflictDoNothing`:
```ts
const [session] = await db.select().from(imagingViewerSessions)
    .where(and(eq(...organizationId...), eq(...studyId, study.id))).limit(1);   // :180-184
if (session) { return {...}; }                                                  // :186-201
const [newSession] = await db.insert(imagingViewerSessions).values({...}).returning();  // :203
```
The database has nothing to stop a duplicate — measured:
```
$ node .../constraints.mjs imaging_viewer_sessions
  imaging_viewer_sessions_pkey  CREATE UNIQUE INDEX ... USING btree (id)
  CONSTRAINT imaging_viewer_sessions_pkey: PRIMARY KEY (id)
```
**Only a primary key on `id`, which is a fresh `randomUUID()`. No unique index on
`(organization_id, study_id)`.** So two concurrent GETs both find nothing and both insert. The lookup at
`:180-184` then uses `.limit(1)` **with no `ORDER BY`**, so it returns an arbitrary one of the duplicates.
`imaging_viewer_sessions` = **1 row**, so this path demonstrably executes in the live database.
**Solo-dentist impact: silent loss of clinical annotations.** The dentist marks up an X-ray, the `PUT` at
`apps/api/src/routes/imaging.ts:6538` saves to session A, a later GET returns session B, and the markup is
gone with no error shown. Two tabs, or a double-fired effect on mount, is enough to create the duplicate.
It is a GET, so the mutation gate never probes it.

### D4 — `GET /api/templates` runs a seeder from `src/scripts/` on a read. REAL DEFECT.
`apps/api/src/routes/templates.ts:20-32`:
```ts
// Auto-seed built-in templates if none exist
const existing = await db.select().from(visitTemplates).where(eq(visitTemplates.organizationId, orgId));
if (existing.length === 0) {
    try { await ensureClinicalTemplatesSeeded(orgId); }
    catch (err) { app.log.warn(`[Templates] Auto-seed failed: ${String(err)}`); }
}
```
Three separate problems, each verifiable:
1. **A read endpoint invokes a seeder.** `ensureClinicalTemplatesSeeded` lives at
   `apps/api/src/scripts/seedTemplates.ts:361` — the `scripts/` tree, i.e. the manual-run tree — and
   inserts at `:379`.
2. **Racy.** The seeder re-checks by title (`existingTitles`, `:365-372`) but there is no unique index to
   enforce it: `node .../constraints.mjs visit_templates` → **only `visit_templates_pkey` on `id`**. Two
   first-loads in parallel duplicate the whole built-in set.
3. **It fails silently, which is the §3 violation.** The `catch` swallows the failure into `app.log.warn`
   and the handler then returns `{ templates: [] }` with status `200`. The dentist opening the visit
   template picker for the first time sees an empty list with no explanation and nothing to do next. The
   only trace is a server log line the dentist will never read.
Live: `visit_templates` = **0 rows**, so in this database the built-in clinical templates have never
materialised — consistent with either "nobody has hit the endpoint with a resolvable org" or "the seed
failed and was swallowed". I cannot distinguish those two read-only, and I am not going to guess.

## §E — WHAT I DID INSTEAD OF MINING THE GATE: A STATIC "BODY BEFORE RIGHTS" CENSUS

The gate cannot run (V0/F0) and `payloadBeforeAuthorisation` is a hand-written array anyway (F0b). So I
built the census the brief actually wanted: `scratch/validate-before-auth.mjs` compares, per inline route
handler, the statement index of the first authorisation boundary against the first statement that reads
`request.body` or emits a `400`.

First version scored **55** hits. I calibrated it against two of them and **both were false positives**,
so I threw the number away rather than publish it:
- `DELETE /api/settings/staff/:staffId` `apps/api/src/routes/settings.ts:498` — the guard is
  `requireSettingsAccess(request, reply)` at statement 0, a name my fixed guard list did not contain.
- `GET /api/patients` `apps/api/src/routes/patients.ts:205` — flagged on `patientSchema.parse(patient)`,
  which validates the **response**, not the request body. Its auth is hand-rolled inline
  (`x-dente-clinic-token` → 401 → `verifyToken` → 401) at statements 0–5.

Tightened (pattern-based guard detection for `require*`/`resolve*`/`enforce*`/`assert*`, `verifyToken`,
and inline 401/403 returns; body detection narrowed to actual `request.body` reads and 400 emissions):
```
inline route handlers examined: 288
handlers where body inspection / 400 precedes any guard: 27
  of those mutating (POST/PUT/PATCH/DELETE): 23
```
I then read all 27. **The finding is negative, and that is the useful result: the class has no members
that are defects.** Breakdown:

| class | count | why it is not a defect |
|---|---|---|
| unauthenticated by design — `POST /api/auth/{login,register,setup/init,invites/accept}`, `/auth/send-otp`, `/auth/verify-otp`, `POST /:organizationId/book` | 8 | there are no rights to check before the body; the body *is* the credential |
| inbound webhooks — `/api/max/webhook`, `/api/whatsapp/webhook`, `/:organizationId/webhook`, `/:organizationId/sms/webhook`, `/api/public/:organizationId/vk/webhook` | 5 | third-party callers, signature/verify-token based, no session exists |
| public token-in-path portal — `GET /api/portal/lab-order/:token`, `POST /api/portal/lab-order/:token/status` | 2 | the credential is the path token, not the body. `apps/api/src/routes/lab.ts:305-309` documents this deliberately, and documents fixing an earlier defect where "any string was written straight to the column" |
| **guarded by a Fastify `preHandler` my scan cannot see** — 4 telegram routes incl. `PUT /api/settings/telegram` `apps/api/src/routes/telegram.ts:2680` | 4 | registered as `app.put(path, telegramControlPlaneRouteOptions, handler)`; the guard is the route-options hook, not a body statement |
| body read into a variable, rights checked before any *validation* | 8 | see below — this is the interesting one |

**Method limit I found and am reporting against myself:** my scan reads only the handler body's top-level
statements, so a `preHandler` guard is invisible and gets labelled "NO GUARD IN TOP-LEVEL STATEMENTS",
which is misleading. Bounded, though — `rg -c 'preHandler' apps/api/src/routes/` → only **8 mentions in
3 files** (`telegram.ts:6`, `whatsapp.ts:1`, `max.ts:1`), and 3-argument registrations exist in 7 files
(15 total via `npx ast-grep run -p 'app.$M($PATH, $OPTS, $HANDLER)'`). So the hole is real but small.

### E1 — THE GATE'S OWN EXCEPTION LIST IS STALE. The defect it grandfathers was fixed.
My scan flagged the exact two routes in `payloadBeforeAuthorisation` — a good sign it was measuring the
right thing — but reading them shows **both have already been repaired, and the gate was never updated.**

`apps/api/src/routes/auth.ts:277-305`, `POST /api/auth/clinic/set-password`:
```
:278  const body = (request.body as {...}) ?? {};        <- reads the body, but does NOT validate it
:280-289  comment: "СНАЧАЛА ПРАВА, ПОТОМ ТЕЛО." + a description of the old leak
:290  const identity = getRequestIdentity(request);
:298-301  if (!isOrgAdmin && !hasValidSetupKey) { await authFailureDelay(); return reply.code(403)... }
:305  if (!body.newPassword || String(body.newPassword).length < 8) return reply.code(400)...
```
**Rights at `:298`, body validation at `:305`.** The order is correct. Same for
`POST /api/auth/staff/set-pin` at `:337`, whose comment at `:340-346` says so explicitly.

But the gate still carries, at `scripts/smoke-clinical-mutation-guard.mjs:317-318` and `:324-325`:
```
reason: "auth.ts:278-281 проверяет длину нового пароля до проверки прав (auth.ts:283-292)"
reason: "auth.ts:331-337 проверяет наличие сотрудника и форму PIN (4–12 цифр) до проверки прав (auth.ts:339-348)"
```
Those line ranges no longer describe the code — `:278-281` is now a destructure plus the comment that
announces the fix, and `:283-292` is not the rights check. **This is the repo's signature failure mode
(«a commit message describes a defect that does not reproduce») living inside a gate's exception list.**
Consequence: two grandfathered exceptions now permanently un-needed. Since the routes answer `403` before
looking at the body, the special payloads are dead weight, and the `reason` strings are false
documentation that the next reader will trust.
**I could not confirm the gate's runtime reaction** (it does not boot — V0/F0). The script's own comment
at `:326-333` says an allowance that never matches during a run lands in `warnings`, so the lead should
expect two such warnings on the next successful run. That prediction is `НЕ ПРОВЕРЕНО`.

## §F — THE SURVIVING HOLLOW MODULES, THEIR MOUNT POINTS, AND THE HONEST FIX

The brief said "five hollow modules survive because their widgets are still mounted". **Measured, it is
six modules, and one of them has no mounted widget at all.** Current census verdict:

```
$ node scripts/census-hollow-query-modules.mjs --json | jq -r '.report | group_by(.verdict) | map("\(.[0].verdict): \(length)") | .[]'
ПУСТОТЕЛЫЙ: 4    СМЕШАННЫЙ: 2    ЖИВОЙ: 14    ЖИВОЙ (СЫРОЙ SQL): 1    БЕЗ ТАБЛИЦ: 1
```

| module | dead table (rows) | API route | widget | mounted at | honest fix |
|---|---|---|---|---|---|
| `customCrmTaskTypesQuery` | `custom_crm_task_types` (**0**) | `apps/api/src/routes/clinical.ts:415` | `apps/web/src/components/crm/CustomCrmTaskTypesWidget.tsx:24` | **3 places**: `apps/web/src/MarketingView.tsx:425`, `apps/web/src/PatientsView.tsx:689`, `apps/web/src/components/settings/SettingsRulesTab.tsx:570` | **write the writer** — see below |
| `singleSessionEnforcementsQuery` | `single_session_enforcements` (**0**) | `apps/api/src/routes/clinical.ts:284` | `apps/web/src/components/settings/SingleSessionEnforcementsWidget.tsx:30` | **2 places**: `apps/web/src/components/settings/SettingsAccessTab.tsx:214`, `apps/web/src/SettingsView.tsx:1566` | **delete surface** |
| `dadataGeocodedAddressesQuery` | `dadata_geocoded_addresses` (**0**) | `apps/api/src/routes/clinical.ts:426` | `apps/web/src/components/integrations/DadataGeocodedAddressesWidget.tsx:24` | `apps/web/src/SettingsView.tsx:1563` | **delete surface** |
| `landingFieldMappingsQuery` | `landing_field_mappings` (**0**) | `apps/api/src/routes/clinical.ts:404` | `apps/web/src/components/integrations/LandingFieldMappingsWidget.tsx:19` | `apps/web/src/MarketingView.tsx:424` | **delete surface** |
| `patientCommunicationTimelinesQuery` | `patient_communication_timelines` (**0**) | `apps/api/src/routes/patients.ts:341` | **TWO clone widgets** (below) | `apps/web/src/PatientsView.tsx:679` and `apps/web/src/components/patients/PatientOverviewTab.tsx:161` | **delete one clone, then decide** |
| `lostPatientsFiltersQuery` | `lost_patients_filters` (**0**) | `apps/api/src/routes/clinical.ts:447` | `apps/web/src/components/analytics/LostPatientsFiltersWidget.tsx` — **143 lines, ORPHANED** | **NOWHERE** | **delete all four layers** |

### F1 — `lostPatientsFiltersQuery`: the widget is NOT mounted. The brief's premise fails here.
```
$ rg -n 'import.*LostPatientsFiltersWidget' apps/web/src/    -> ZERO
$ rg -n '<LostPatientsFiltersWidget'        apps/web/src/    -> ZERO
$ wc -l apps/web/src/components/analytics/LostPatientsFiltersWidget.tsx  -> 143
```
It was deliberately unmounted from **both** surfaces and the reason was written down. `apps/web/src/MarketingView.tsx:403-408`:
> «LostPatientsFiltersWidget убран отсюда: он читал таблицу lost_patients_filters, в которую в проекте
> никто не пишет — список был снимком, сделанным неизвестно когда, и обновиться не мог.»

and `apps/web/src/pages/AnalyticsDashboardView.tsx:551-557` repeats it, adding that on two screens it
would give different answers to one question. The live replacement is `RecallListPanel`
(`apps/web/src/pages/AnalyticsDashboardView.tsx:571`). **So the work was done and the cleanup stopped
one step short:** 143 orphaned component lines, plus `apps/api/src/db/lostPatientsFiltersQuery.ts`, plus
the route at `apps/api/src/routes/clinical.ts:447`, all still on disk. §5 explicitly bans orphaned files.

**There is a finished template for this in the same file.** `AnalyticsDashboardView.tsx:574-579` documents
the identical cleanup for `ConfirmationPerformanceReportsWidget` / `confirmation_performance_reports`, and
that one was finished properly:
```
$ fd -t f 'ConfirmationPerformanceReportsWidget' apps/web/src   -> (nothing; file deleted)
$ jq '... confirmation_performance_reports ...' repowide.json    -> reads=0 writes=0
```
Do to `lost_patients_filters` exactly what was already done to `confirmation_performance_reports`.

### F2 — `patient_communication_timelines` is served to TWO clone widgets on two surfaces
Both fetch the same endpoint and both render a permanently empty list:
- `apps/web/src/components/crm/PatientCommunicationTimelinesWidget.tsx:93` (plural) → mounted
  `apps/web/src/PatientsView.tsx:679`
- `apps/web/src/components/patients/PatientCommunicationTimelineWidget.tsx:82` (singular) → mounted
  `apps/web/src/components/patients/PatientOverviewTab.tsx:161`

Two components, one dead table, two places in the patient card. §5 anti-monolith ("decomposition must be
REAL") and §4 (no visual overload) both bite. Note both files carry header comments describing an earlier
repair of the endpoint path, so they are actively maintained clones, not forgotten ones.

### F3 — `customCrmTaskTypesQuery` is the one where writing the writer is the right call
It is mounted in **three** surfaces (marketing, patient list, settings→rules). "Custom CRM task types" is
a genuine small-practice need: a solo dentist wants to name their own follow-up reasons instead of using
the built-in enum. The table exists, the read path exists, the UI exists in triplicate — **the only
missing piece is a POST/PUT to create one.** Compare the other four, which are integration plumbing
(DaData geocoding, landing-page field mapping, single-session enforcement) that a solo dentist has no use
for at all and which §5 says should not even be visible in solo/small mode.

### F4 — 44 tables in the schema that NOTHING in the repo reads or writes
Not one read, not one write, anywhere in 1860 code files and 1398 SQL files:
```
$ jq '[.tables|to_entries[]|select((.value.reads|length)==0 and (.value.writes|length)==0)]|length' repowide.json
44
```
`crm_email_dispatch_logs, cancellation_reasons_two_level, advance_deposit_taggings,
treatment_plan_lock_tokens, digital_receipt_dispatches, patient_service_lineages,
kkm_item_quantity_units, uis_omni_messenger_queues, quick_appointment_confirmations,
urgent_schedule_requests, confirmation_performance_reports, alternative_treatment_plans,
schedule_clipboard_items, schedule_time_reservations, custom_examination_form_catalogs,
extended_odontogram_states, non_dental_examination_forms, treatment_plan_print_odontograms,
treatment_plan_stages, pricelist_doctor_payrolls, rebooking_conversion_rules,
prodoctorov_sync_exports, visit_examination_photo_links, system_ram_watchdogs,
patient_duplicate_merge_queues, appointment_channel_inheritances, bulk_image_operation_logs,
chat_message_dispatch_statuses, collaborative_chat_processing_states, diagnocat_ai_findings,
egisz_blank_permissions, external_schedule_action_logs, family_recommendation_sources,
message_template_catalogs, messenger_file_attachments, mkb10_auto_directories,
ndfl_tax_calculators, previous_chat_dialog_histories, uis_call_speech_transcripts,
uis_sms_chat_quotas, yandex_calendar_syncs, protocol_templates,
uis_mass_appointment_confirmations, cash_ledger`

**The census cannot see any of these**, because it enumerates `*Query.ts` modules and none of these has
one. They are pure schema debt: 44/126 = **35% of the Drizzle model is decoration.** The three the census
header names as dynamically imported by `routes/clinical.ts` — `patient_service_lineages`,
`prodoctorov_sync_exports`, `alternative_treatment_plans` — are now in this list, i.e. cycle 7 removed
their modules and the header comment is stale.

**`cash_ledger` is the one that matters for a solo dentist.** It is declared at
`apps/api/src/db/schema.ts:2245` and appears nowhere else in any code file:
```
$ rg -n 'cashLedger|cash_ledger' apps/ packages/ scripts/ --glob '!*/drizzle/meta/*'
apps/api/src/db/schema.ts:2245:export const cashLedger = pgTable("cash_ledger", {
(everything else is drizzle/meta snapshots)
```
It carries an FK `cash_ledger_invoice_id_patient_invoices_id_fk` to `patient_invoices` — the table from
A1 that also has no writer. **So the cash-register / invoice pair is schema-only end to end**, while the
patient portal already renders an invoice list from it. That is one coherent missing feature, not two
unrelated dead tables, and it is the strongest build packet in this dossier.

### F5 — THE NAME-COLLISION TRAP IS SYSTEMIC, AND IT CUTS BOTH WAYS
The lead's warning about the «45 hollow of 50» regex artefact was about false *hollow* verdicts. I found
the mirror image — false *alive* verdicts — twice:
- `denteTelegramOutboxDeliveryReceipts`: Drizzle table `apps/api/src/db/schema.ts:758` **and** in-memory
  array `apps/api/src/sampleData_opt.ts:219`. The array is written and read by live routes; the table is
  read by an orphaned module and written by nobody. (§A3)
- `protocolTemplates`: table `protocol_templates` is in the untouched-44 list, while
  `apps/api/src/sampleData.ts:3769` and `apps/api/src/sampleData_opt.ts:2769` export a live in-memory
  `protocolTemplates` array that the app actually uses.
Harmless third case, recorded so nobody chases it: `treatmentPlanStages` at
`apps/web/src/DocumentsView.tsx:820` is a React textarea state variable, unrelated to the
`treatment_plan_stages` table.

**Rule for the next census author: resolve identifiers to their declaration file, never to their name.**
The existing census does this correctly for Drizzle imports (`importBindings`, `:148-206`) — which is why
it is trustworthy where it looks — but any new grep-based instrument will get this wrong.

### F6 — TWO BYTE-IDENTICAL ROUTES SERVE `custom_crm_task_types`, AND NEITHER CAN WRITE
```
$ rg -n 'custom-crm-task-types|custom-task-types' apps/api/src/routes/
apps/api/src/routes/clinical.ts:371:  app.get("/api/crm/custom-task-types", ...)
apps/api/src/routes/clinical.ts:415:  app.get("/api/crm/custom-crm-task-types", ...)
```
**Only two hits, both `GET`. There is no POST, PUT or PATCH for either path anywhere in the repo.** And
the two handler bodies are identical apart from the path — same guard, same comment, same dynamic import,
same function:
```ts
// :370  COMPETITOR FEATURE #47: crm::конструктор_типов_задач_без_привязки_к_визиту
// :414  COMPETITOR FEATURE #47: crm::пользовательские_типы_задач_для_администраторов
    const orgId = requireOrganizationId(request, reply);
    if (!orgId) return;
    const { getCustomCrmTaskTypesFromDb } = await import("../db/customCrmTaskTypesQuery.js");
    return reply.status(200).send(await getCustomCrmTaskTypesFromDb(orgId));
```
Both are tagged **the same competitor feature number, #47**, which is how the duplicate happened: two rows
of the registry were implemented separately as two paths over one function. Total surface for a feature
that cannot hold a single row: **2 API routes + 1 query module + 1 widget mounted in 3 views = 7 places.**

═══════════════════════════════════════════════════════════════════════════════
## §G — RANKED BUILD PACKETS
Ranked by value to a solo dentist or small practice, which is the stated focus.
═══════════════════════════════════════════════════════════════════════════════

**G1. Invoices and cash ledger: finish the money, or take it off the patient's screen.** *(highest)*
The patient portal already renders an invoice list. `patient_invoices` has **no writer** and `cash_ledger`
has **no code at all**, and they are FK-joined, so this is one feature, not two dead tables. Money is the
one thing a solo dentist cannot work around. Either build the writer (invoice issue → `patient_invoices`,
payment → `cash_ledger`, both to the kopeck per §8b) or remove the section from the portal so no patient
is shown an empty bill list. Files: `apps/api/src/routes/portal.ts:611-615`,
`apps/api/src/db/schema.ts:1638` (`patientInvoices`), `apps/api/src/db/schema.ts:2245` (`cashLedger`),
`apps/api/src/scripts/cronAnalyticsWorker.ts:99,197` (already reads it for doctor profitability).

**G2. `GET .../viewer-session` loses X-ray annotations. Fix the race.**
Read-then-insert with only a PK on a random `id`, reached from a GET, no `ORDER BY` on the lookup.
Two tabs is enough to duplicate, after which saved markup can silently disappear. Add a unique index on
`(organization_id, study_id)` plus `onConflictDoNothing` and an `ORDER BY`, or move creation to the `PUT`.
Files: `apps/api/src/db/imagingQuery.ts:179-212`, `apps/api/src/routes/imaging.ts:6520`, migration for the
unique index. Clinical data loss outranks everything below it.

**G3. `GET /api/templates`: stop seeding on a read, and stop failing silently.**
A read endpoint invokes a seeder from `src/scripts/`, the seed is racy for the same reason as G2, and the
failure path swallows the error into `app.log.warn` and returns `200 {templates: []}`. A dentist opening
the template picker for the first time gets an empty box and no idea what to do — §3 verbatim. Files:
`apps/api/src/routes/templates.ts:14-37`, `apps/api/src/scripts/seedTemplates.ts:361-388`, plus a unique
index on `visit_templates(organization_id, title)`. `visit_templates` = 0 rows today.

**G4. Delete the four integration-plumbing facades. Keep one and give it a writer.**
Four of the six surviving hollow modules are plumbing a solo dentist will never use (DaData geocoding,
landing field mapping, single-session enforcement) — §5 says those must not be visible in solo/small mode
at all. Delete route + module + widget + mount for each. The exception is
`custom_crm_task_types`: mounted in three views, genuinely useful to a small practice, and missing only a
write route — **build the POST/PUT and de-duplicate the two identical GETs (F6)**. Files per row of the §F
table; the duplicate GETs are `apps/api/src/routes/clinical.ts:371` and `:415`.

**G5. Finish the `lost_patients_filters` cleanup that was started and abandoned.**
Zero-risk deletion: the widget is already unmounted from both surfaces, the reason is documented in two
files, and the live replacement (`RecallListPanel`) ships. Remove
`apps/web/src/components/analytics/LostPatientsFiltersWidget.tsx` (143 orphaned lines),
`apps/api/src/db/lostPatientsFiltersQuery.ts`, and `apps/api/src/routes/clinical.ts:447`. The template is
the finished `confirmation_performance_reports` cleanup documented at
`apps/web/src/pages/AnalyticsDashboardView.tsx:574-579`.

**G6. Delete the orphaned telegram/BI/notification subsystems.**
Nothing production reaches any of them, and two of them keep tables permanently empty while the census
scores those tables alive. `apps/api/src/telegram/outbox.ts` (116 lines) + its only importer
`apps/api/src/telegram/benchmark.ts` (9 lines, a §2 placeholder that `console.log`s an excuse);
`apps/api/src/services/biAnalyticsWorker.ts` (279 lines, only non-test importer is
`benchmark_biAnalytics.ts` **at the repo root**, a §9 violation); `apps/api/src/services/notificationWorker.ts`
+ `apps/api/src/services/postOpCareTrigger.ts`, whose deadness is already documented at
`apps/api/src/services/communications/appointmentReminders.ts:10-11`. Also delete the two root-level
scratch files and `apps/api/NUL`.

**G7. Teach the census its blind spots.** In `scripts/census-hollow-query-modules.mjs`:
(a) walk the whole repo, not just `apps/api/src` + `apps/web/src` (`:360`) — the hole is empty today but
one seeder under `scripts/` starts producing false "hollow" verdicts that get real features deleted;
(b) judge per **table** as well as per module (`:417`), which is the only way the 6 blind-spot-1 tables and
the 44 untouched tables become visible;
(c) add a **reachability** check — a writer inside a function nothing calls is not a writer (§C);
(d) enumerate tables from `information_schema` too, to surface the **20 live tables absent from
schema.ts** (146 in the database vs 126 in the model);
(e) fix the header comment at `:17-20`: ast-grep IS installed as `npx ast-grep` (0.44.1).

**G8. Un-stale the gate's exception list.** `scripts/smoke-clinical-mutation-guard.mjs:310-325` grandfathers
two routes whose defect was fixed; its `reason` strings cite line ranges that no longer describe
`apps/api/src/routes/auth.ts`. Re-verify and delete both entries. Lead-only, since the gate needs a build.

═══════════════════════════════════════════════════════════════════════════════
## §H — WHAT MY METHOD COULD STILL BE MISSING
An honest list. A recon that claims completeness is lying.
═══════════════════════════════════════════════════════════════════════════════

1. **I never ran the behavioural gate.** Every claim here is static analysis plus read-only SQL. No route
   was actually invoked. `node scripts/smoke-clinical-mutation-guard.mjs` throws on a stale build and the
   fleet re-stales it within minutes (V0). Nothing in §D or §E is runtime-proven.
2. **Dynamic and computed table access is invisible to me.** I resolve `db.insert(x)` / `.from(x)` where
   `x` is an identifier or `schema.x`. A writer built as `db.insert(tableMap[kind])`, via a generic
   repository helper, or through `sql.identifier(...)` would not appear in any of my counts. I did not
   measure how much of the code does this, so I cannot bound the error.
3. **`db.execute(sql\`...\`)` with an interpolated table name.** My raw-SQL pass reads string and template
   literals, but a template that interpolates the table name yields text like `insert into ${x}` and my
   regex requires a literal name. Silent miss.
4. **My reachability analysis (§C) is one hop and by name.** I proved specific functions have no non-test
   caller by grepping their names. I did **not** build a call graph from `server.ts`, so there may be more
   unreachable writers than the two I found — and conversely, a function reached only through a dynamic
   `await import()` string I did not resolve could be wrongly called unreachable. §C is a demonstration
   that the blind spot exists with two confirmed instances, **not a census of it.**
5. **Routes not registered as `app.<verb>("literal", ...)` are outside my GET/HEAD scan.** Registrations
   built in a loop, from an array of paths, via a plugin prefix, or with a computed path string are
   missed. My scan saw 128 GET/HEAD registrations in `apps/api/src`; the gate reportedly probes 436 route
   entries overall, so the shapes differ and I did not reconcile the two numbers.
6. **`preHandler` guards are invisible to my §E scan** (found and reported against myself). Bounded at 8
   `preHandler` mentions across 3 files, but "bounded" is not "zero".
7. **I judged "is this GET-write a defect or a design?" by reading the code and its comments.** That is a
   judgement call, not a measurement. D1 and D2 could be argued either way by someone with different
   priorities; D3 and D4 I consider defensible as defects because the missing unique index is a measured
   fact, not an opinion.
8. **20 live tables are not in `schema.ts` and I did not analyse them at all.** 146 base tables in the
   database, 126 in the Drizzle model. My instrument enumerates from `pgTable`, so those 20 are outside
   every number in this dossier. That is the largest known gap in my own coverage.
9. **Row counts are a snapshot of one nearly-empty development database** taken while six agents were
   writing to the tree. `0 rows` here never proves "no writer"; I used it only to corroborate a
   writer-absence conclusion reached from source. And a table with rows does not prove a *reachable*
   writer — `imaging_viewer_sessions` has 1 row from a GET, `imaging_studies` has 1 row with 0 series.
10. **I did not verify the web side actually renders what I say it renders.** I traced imports and JSX
    mount sites textually. I never loaded a page, never took a screenshot, never confirmed a widget is
    visible rather than behind a closed accordion, a feature flag, or a `clinicMode` gate. Claims about
    what a dentist "sees" are inferences from mount points. Given this repo's screenshot history, treat
    them as `НЕ ПРОВЕРЕНО` until someone opens the app.
11. **The `.tsx`-heavy files were parsed with `ScriptKind.TSX` in one instrument and `ScriptKind.TS` in
    another.** For `.ts` files in `apps/api/src` this is harmless, but I did not prove that no `.ts` file
    with generic-heavy syntax parsed differently between the two passes.
12. **I overwrote the first R5 run's `state.md`** when I created mine with `>`. Its dossier and JSON
    artefacts survive and I re-verified its three findings, but its milestone log is gone. My fault,
    recorded so the loss is not mistaken for it never having existed.

