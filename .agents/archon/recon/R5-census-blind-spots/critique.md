# CRITIQUE — R5 CENSUS BLIND SPOTS DOSSIER

Completeness critic, read-only, 2026-07-28. Every number below was produced by a command I ran myself
on this host. Where I agree with the dossier I say so and show the command; agreement is not inherited.

Instruments I wrote (read-only, in this packet dir):
- `.agents/archon/recon/R5-census-blind-spots/critic-namescan.mjs` — name-level mention scan per table
- `.agents/archon/recon/R5-census-blind-spots/critic-get-writes-depth2.mjs` — GET/HEAD write scan with
  a **receiver-based** write filter and **configurable call-graph depth**, no leading-slash filter

**VERDICT: USABLE_WITH_GAPS.** This is the strongest dossier I have audited in this campaign. Its three
most load-bearing numbers re-derive exactly. Its three most consequential `file:line` claims land on the
exact lines. Its `methodLimits` is genuinely self-incriminating rather than decorative. But it contains
one **fabricated user-facing detail inside its #1 ranked packet**, one **headline enumeration that is
provably incomplete**, and its own instrument **inherited the exact design flaw it was sent to expose**.

---

## §1 — WHAT I RE-DERIVED AND CONFIRMED

I picked the load-bearing numbers and re-measured them without using the recon's scripts.

| claim | my command | result |
|---|---|---|
| 126 tables in the Drizzle model | `rg -c 'pgTable\(' apps/api/src/db/*.ts` | 123+1+2 = **126 CONFIRMED** |
| 146 BASE TABLEs in `public` | read-only `information_schema.tables` | **146 CONFIRMED**, 0 views, 1 schema |
| 20 live tables outside the model | actual **set difference**, not 146−126 | **20 CONFIRMED**, and 0 model tables missing from the DB |
| 22 `*Query.ts` modules (not 23) | `ls apps/api/src/db/*Query.ts \| wc -l` | **22 CONFIRMED** |
| census verdicts 4/2/14/1/1 | re-ran `node scripts/census-hollow-query-modules.mjs --json` | **CONFIRMED**; the 6 survivors are exactly the 4 ПУСТОТЕЛЫЙ + 2 СМЕШАННЫЙ it names |
| 44 tables with zero reads and zero writes | independent name-level scan over 1552 files | **CORROBORATED** — 0 of the 44 has a name-level mention in any live app dir |
| `patient_invoices` has no populating writer | `rg 'patient_invoices'` + `rg 'patientInvoices'` repo-wide | **CONFIRMED** — only `CREATE TABLE` + drizzle/meta snapshots + the 6 code hits it lists |
| row counts (13 tables spot-checked) | my own read-only `select count(*)` | **CONFIRMED** incl. `patient_invoices` 0, `cash_ledger` 0, `imaging_viewer_sessions` 1, `visit_templates` 0 |

**The three most consequential `file:line` claims — I opened all three and they are exact:**

1. `apps/api/src/db/imagingQuery.ts:179-212` — read-then-insert. Select at **:180-184**, `.limit(1)` with
   no `ORDER BY`, insert at **:203**, no transaction, no `onConflictDoNothing`. Line-for-line as described.
   The absent unique index re-verified by my own `pg_indexes`/`pg_constraint` read: only a PK on `id`.
2. `apps/api/src/routes/templates.ts:14` — guard at `:15-18`, auto-seed at `:20-31`, `catch` swallowing
   into `app.log.warn` at `:27-29`, then re-select and `return reply.send({ templates })`. Exact.
3. `apps/api/src/routes/auth.ts:277-305` — `const body` at `:278` (destructure only), rights `403` at
   **:298-301**, body validation `400` at **:305**. Rights genuinely precede body. **G8 is well-founded.**

Also confirmed independently: `LostPatientsFiltersWidget.tsx` is orphaned (143 lines; only its own
declaration plus four comment references, zero imports, zero JSX) — **G5 is a sound zero-risk deletion**;
`treatment_scenarios` read at `biAnalyticsWorker.ts:73` with only a `delete` at `migrateStateToDb.ts:41`;
`egisz.ts:163` registration / `:177-180` read; zero `HEAD` routes in `apps/api/src`.

**My own discipline note:** two candidate findings of mine died on inspection — `analytics_snapshots` and
`doctor_payrolls` appeared to be touched by live code, but they are substrings of `bi_analytics_snapshots`
and `pricelist_doctor_payrolls`. A PCRE2 lookbehind check returned empty for both. That is the campaign's
signature disease and I am recording that I nearly committed it.

---

## §2 — WHAT IS WRONG

### B1. FABRICATED USER-FACING DETAIL, inside the #1 ranked packet (most serious)

The dossier's headline and G1 state as fact:

> "Its «мои счета» section is wired to a table that can never contain a row, so **every patient who logs
> in sees an empty invoice list forever**" (§A1) / "Patients log in, open «my bills», and see nothing"

Three separate parts of that are not supported:

- **The string «мои счета» does not exist anywhere in the repo.** `rg -ni 'мои счет|мои счёт|my bills'`
  over `apps/web/src` and `apps/api/src` returns **nothing**. A quoted Russian UI label was invented.
- **There is no invoice list.** In `apps/web/src/components/PatientPortal.tsx` the `invoices` array is
  read at `:249-250` and used at **`:262-264` only**, to compute `paid`, which renders at **`:491-492`**
  as «Оплачено» `{money(paid)}`. There is no rendered bill list to be empty. The real symptom is a
  **money figure permanently reading 0 ₽**, and therefore «Остаток» equal to the full treatment cost.
- **No patient reaches this component in the shipped web app.** `PatientPortal` has exactly **one**
  import and **one** JSX usage in the whole repo:
  `apps/web/src/components/settings/SettingsTelegramTab.tsx:5` and **`:626`** — inside a modal gated by
  `showPatientPortalPreview` and titled **«Превью Портала Пациента»**, reached from a «Предпросмотр»
  button in staff settings. There is no router in `apps/web` (`rg 'react-router|<Route'` → nothing;
  `main.tsx` mounts a single `AppShell`), and `patientPortalBaseUrl` is an operator-configured external
  URL. So the audience of the wrong number is the **dentist previewing**, not the patient.

The underlying defect is real and worth reporting: a live endpoint feeds a money figure from a table
nothing can populate, and `PatientPortal.tsx:258-259` shows someone already "fixed" the field name
(`i.amount` → `total_rub`) so «Оплачено» would work — **a prior fix aimed at the wrong root cause, which
is a sharper finding than the one the dossier wrote.** But the severity story, the audience, and the
proposed fix ("take it off the patient's screen") all rest on a surface that was never opened. The
dossier's own `methodLimits` #10 predicts this exact failure; the finding text ignores its own warning.

### B2. "Exactly 4 GET routes write the database" is 5 — and the hole is an undeclared limit

The dossier calls blind spot 3 "fully enumerated" and treats two independent scans agreeing on 4 as
"the strongest completeness signal available". I found a fifth.

`apps/api/src/routes/communicationReceipts.ts:96`
```
app.get("/api/communications/receipts/smsc", handleSmsc);
```
`handleSmsc` (`:79`) calls `applyReceipts([receipt])` at `:90`; `applyReceipts`
(`apps/api/src/services/communications/deliveryReceipts.ts:236`) does
`.update(communicationOutbox)` at **:268** and **:281**. `communication_outbox` holds **6 rows** — a live
table. Verdict: **deliberate** (the comment at `:94-95` says SMSC calls back by GET or POST depending on
the account setting), so the ratio becomes 3 deliberate / 2 defects — but the *enumeration* was the
deliverable, and it was short.

**Root cause, and it is not the one the dossier declared.** `scratch/get-writes.mjs:129` reads
`if (ts.isArrowFunction(handler) || ts.isFunctionExpression(handler))`. When the handler is passed **by
identifier**, `direct` stays `[]` and `calls` stays empty, so the route is scanned as if it had no body.
My scan found **8 such GET routes**:
`communicationReceipts.ts:96`, `documents/taxXml.ts:33`, and `speech.ts:313,314,315,317,318,319`.
I read all 8; only `handleSmsc` writes (the seven others are guard-then-read).

The dossier's `methodLimits` #5 declares that computed *paths* and loop/array registrations are missed.
It never declares that a **non-inline handler** is missed. That is the hole that was actually non-empty.

Conversely, the limit it *did* worry about turned out to be empty: I re-ran my scan at `MAX_DEPTH=3` and
depth 2 and 3 add **nothing**. Its 1 TIER-1 + 3 depth-1 results reproduce exactly under a
receiver-based filter (`db|tx|trx|client|conn|database|schema`) with **zero false positives** — so its
manual audit that killed 13 of 17 was correct, and a cleaner filter reaches the same 4 without an audit.

### B3. "The money subsystem is schema-only end to end" is false

The dossier's headline says the money subsystem "is schema-only end to end" and G1 proposes to "finish
the money". There is a **live payments path**:
- `apps/api/src/db/billingQuery.ts:78` — `tx.insert(schema.payments)`
- `apps/api/src/routes/finance_family.ts:484` and `:617` — `.insert(payments)`
- `payments` holds **8 rows** (my own `select count(*)`)

What is true and narrower: the **invoice/cash-ledger model specifically** is dead, and it is a *second,
parallel, unused* money model beside a working `payments` path. That changes G1's honest content from
"build the money" to "the portal reads the dead model instead of the live one" — a much smaller and more
tractable packet, and a different fix.

Worse for the ranking: the repo has **already triaged this exact area, with reasons, and the dossier
never opened the file**. `apps/api/src/routes/clinical.ts:376-380` points at
`apps/web/src/FinanceView.tsx`, and `FinanceView.tsx:248-266` states that four finance cards were removed
because they "read tables nothing in the application writes — verified by searching all sources", naming
advance-deposit tagging, digital receipts and KKM units as **54-ФЗ cash-register work blocked on a
missing KKM driver**, and doctor payroll as blocked on a missing percentage field. All four of those
tables are in the dossier's own 44-untouched list, and `cash_ledger` is the same 54-ФЗ bucket.

So G1, ranked **highest**, is a fiscal-cash-register feature that the repo documents as blocked on
physical hardware, ranked above G2, which is silent loss of clinical annotations. That ordering is not
defensible for a solo dentist — a dentist legally cannot run an unregistered cash register, but can
absolutely lose an X-ray markup this afternoon.

### B4. The writer census is not repo-wide: a single dynamic writer touches 47 tables

`methodLimits` #2 says computed table access via `sql.identifier(...)` is invisible and "I did not
measure how much code does this, so I cannot bound the error". I bounded it.

`apps/api/src/services/patients/patientMerge.ts` discovers its target tables **at runtime from
`information_schema`** (every table with an FK to `patients.id`, plus every table with a `patient_id` or
`local_patient_id` column) and then writes to each through dynamic SQL:
```
:167   delete from ${sql.identifier(conflict.table)} d ...
:182   update ${sql.identifier(column.tableName)} set ${sql.identifier(column.columnName)} = ...
```
Reachable from a live route: `apps/api/src/routes/patientDuplicates.ts:110` calls `mergePatients`.

I ran that exact catalog query read-only. **It resolves to 47 distinct tables**, including
`patient_invoices`, `treatment_scenarios` and `outgoing_notifications` (findings A1, A4 and C1, all
reported as having no writer / no reachable writer), plus `diagnocat_ai_findings`,
`ndfl_tax_calculators` and `visit_examination_photo_links` — three members of the "44 tables neither read
nor written **anywhere** in 1860 code files" list.

**Fair reading, because this matters:** these are re-pointing `UPDATE`s (`set patient_id = primary where
patient_id = duplicate`), which cannot create a row. So A1's *conclusion* — `patient_invoices` can never
be populated — **survives**. But three things do not:
- The dossier's own stated rule is "populating writers are `insert` and `update` only". By its own rule
  this is a writer; it is excluded only because the instrument could not see it. Method and conclusion
  are inconsistent, and the inconsistency was hidden by the blind spot.
- "44 tables neither read nor written anywhere" is false as literally written, for at least 3 of the 44.
- **10 of the 47 are not in the Drizzle model at all** (`clinical_tasks`, `dental_lab_orders`,
  `drill_protocols`, `egisz_logs`, `ingested_patients_mapping`, `patient_anamnesis`,
  `payment_installments`, `scheduler_reservations`, `signed_outpatient_cards`, `ztl_lab_orders`). Drop any
  one as "dead" and patient merge fails at runtime with a SQL error. That is precisely the "a false
  hollow verdict is how real features get deleted" hazard the brief raised — arriving through a door the
  dossier never opened.

Related: the dossier's claim that its two runs are "two different instruments, same 13" and that this is
a completeness signal is weak. Both scans were written by the same agent in one session on the same
design assumption (enumerate from `pgTable`, resolve identifiers statically). Agreement between them
cannot detect a **shared** blind spot, and I have now shown a shared blind spot exists.

### B5. The row-count snapshot has already expired

I measure **25 non-empty tables and 121 empty**, not the dossier's 24/122. The extra one is
`appointment_waitlists = 1`. Cause is benign and traceable: the fleet was mid-build on
`apps/api/src/services/schedule/waitlistMatching.ts` — the very file the dossier's own §F0 quotes the
gate reporting as having no build output. `methodLimits` #9 predicts exactly this. Not an error, but the
dossier's list of 24 should not be quoted by the next agent as current.

### B6. Overstatements that survive into the summary

- **"TWO byte-identical GET routes"** (structured summary, "same guard, same comment"). Handler bodies
  are identical; the preceding comment tags are **not** — `clinical.ts:370` is
  `конструктор_типов_задач_без_привязки_к_визиту`, `:414` is
  `пользовательские_типы_задач_для_администраторов`. The dossier body says "identical apart from the
  path" (correct); the summary hardened it to "byte-identical" (wrong). The substance — 2 GETs, no
  POST/PUT/PATCH anywhere, 1 module, 1 widget in 3 views — I confirmed.
- **The ast-grep correction is inflated.** `npx ast-grep --version` → `0.44.1` confirmed; the header's
  availability premise is genuinely wrong. But the header at `:19-20` gives a **second, independent**
  reason for TypeScript — only a real parser dereferences `import { x as y }` and `import * as schema` to
  the true table name. That reason is sound. So "agents have been avoiding a mandated tool on a false
  premise" overstates it: the premise was false, the **conclusion was right**. G7(e) should fix the
  comment, not imply the tool choice was wrong.
- The brief asked for `ast-grep` as the primary structural instrument. The dossier used it as a
  cross-check on a hand-rolled TS parser, and its raw-SQL pass is a regex (`RX_RAW_WRITE`). Defensible
  and better-argued than the brief, but it is a substitution, not compliance.

---

## §3 — COVERAGE AGAINST THE BRIEF

| ordered | delivered |
|---|---|
| BS1 inventory: file:line, table, real row count, writer-exists proven repo-wide | **YES**, 6 entries, all four fields present. But scoped to the 126 modelled tables only, so structurally incomplete — see below |
| BS2: hollow tables re-checked against the WHOLE repo | **YES**, as a documented negative, with the prior run's "4 writers outside" correctly corrected to 0 |
| BS3: every other GET **or HEAD** route that writes, each classified with evidence | **PARTIAL** — HEAD correctly proven empty; GET enumeration is 5, not 4 (B2) |
| `smoke-clinical-mutation-guard.mjs` JSON, every `payloadBeforeAuthorisation` entry with file:line | **NOT DELIVERED, and correctly so.** It proved the gate cannot boot (twice, 30 min apart, different stale sets) and that the array is 2 hand-written probe payloads, not an output. Substituted a 288-handler static census, read all 27 hits, found 0 defects. This is the right call and the brief was wrong. |
| the five surviving hollow modules + mounting file:line + fix per module | **YES and better** — measured 6, and correctly refuted the brief's premise for `lostPatientsFiltersQuery` |
| ranked build packets | **YES**, 8, though G1's rank is wrong (B3) |
| explicit statement of what the method could miss | **YES**, 12 items — see §6 |

**The one skipped question, and it is the structural one.** The brief ordered: "routes that query a table
directly where that table has no writer anywhere in the repo". The dossier's instrument enumerates
candidate tables from `pgTable`, exactly as the census it was sent to audit does. So the **20 live tables
outside the Drizzle model were never searched for reads-without-writers at all** — the inventory inherited
the root cause of the blind spot it was commissioned to work. `methodLimits` #8 declares the 20 tables as
"the largest known gap", but files it as a follow-up rather than recognising it invalidates §A's
completeness. Proof the class is non-empty: `clinical_tasks` is an unmodelled live table with a real
query module (`apps/api/src/db/clinicalTasksQuery.ts`, 230 lines, raw SQL, `INSERT` at `:177`) and a live
route — and it is invisible to `pgTable` enumeration in both instruments. It happens to be healthy, but
nothing in either method would have told us if it were not.

Also never opened, and directly load-bearing on the top-ranked packet: `apps/web/src/FinanceView.tsx`
(B3) and `apps/web/src/components/PatientPortal.tsx` (B1).

---

## §4 — INHERITED NUMBERS

**Clean, and unusually so.** `correctionsToRecord` states outright that `RECON_DOSSIER.md`,
`VISUAL_VERDICT.md` and `progress.md` were not read and no claim is made about them. Every headline
number carries a command, and I re-derived eight of them successfully (§1).

Positively: it *refused* several inherited numbers rather than repeating them — corrected "42 → 23" to 22,
corrected the prior run's "4 writers outside `apps/api/src`" to 0 (those were `delete`s), refuted its own
prior run's F0c, and explicitly cleared a stale `TS2305` error out of `scratch/tsc-audit.txt` before it
could be repeated. That is the opposite of this campaign's disease.

**On `docs/competitive-audit/`.** It is cited once, at §A2:
`docs/competitive-audit/FEATURES_REGISTRY.md:34`. This is **not disqualifying**, because the folder is
cited as the **target of falsification, not as a source of evidence**: the dossier runs
`fd -t f 'egiszMultipleDiagnoses'` → nothing and `fd -t f 'proof_egisz'` → nothing to prove both artefacts
the registry cites do not exist. Evidence *against* the registry, produced by command. I re-ran both;
both still return nothing.

One inference does lean on the registry without proof: §F6's causal story that the duplicate route
"is how the duplicate happened: two rows of the registry were implemented separately as two paths over one
function". The `#47` tags are in the code comments, but the two-registry-rows story is unverified.
Listing it as such.

---

## §5 — SEVERITY AND «mattersForSolo»

**Severity distribution is not "everything HIGH":** 5 HIGH, 6 MEDIUM, 3 LOW, 1 INFO. The gradient is
real — an unmounted 143-line widget is MEDIUM, a 9-line placeholder is LOW, an empty blind spot is INFO.
Two objections:

- **G2 should outrank G1.** G2 (annotation-losing race) rests on a measured fact — the absent unique
  index, which I re-verified. G1 rests on a fabricated screen (B1) and on "money is schema-only" which is
  false (B3), and its actual content is 54-ФЗ fiscal work the repo documents as blocked on a KKM driver.
- **The fourth blind spot (never-called writers) is rated HIGH partly on impact ("appointment reminders
  can never fill"), but the dossier itself then shows the honest fix is deletion**, because
  `appointmentReminders.ts:10-11` documents the orphans and a live replacement with a real idempotency
  key already ships. A dead queue with a working replacement is not HIGH patient impact; its real value
  is METHODOLOGICAL (the census's "alive" verdict is untrustworthy), which the dossier does say. The
  severity is attached to the wrong justification.

**`mattersForSolo` is mostly genuine, not enterprise thinking dressed up.** It correctly separates a
solo dentist's real needs (naming your own follow-up reasons → build the writer; built-in clinical
templates so you don't retype visit notes; not losing an X-ray markup) from integration plumbing a
one-dentist practice will never touch (DaData geocoding, landing-page field mapping, single-session
enforcement — and it is right that §5 says solo mode should not display these). It is also honest enough
to write "Not at all directly" and "Not directly" on five findings instead of inventing patient impact.

Two places it slips into enterprise reasoning: `single_session_enforcements` (concurrent-session
policing is meaningless for one person, correctly slated for deletion — good) versus `cash_ledger`, where
"a practice that cannot issue an invoice or record a cash payment is not usable as a business system" is
enterprise framing: a Russian solo dentist's cash handling is 54-ФЗ + a physical fiscal device, not a
`cash_ledger` row, which is exactly what `FinanceView.tsx:265` already says.

---

## §6 — IS `methodLimits` HONEST?

**Yes — this is the best part of the dossier and it should be graded as such.** 12 items, specific,
each naming a mechanism rather than gesturing at uncertainty. It admits: never running the gate; that
`0 rows` never proves "no writer"; that §C is "a demonstration, NOT a census"; that judging
deliberate-vs-defect is taste not measurement; that it never loaded a page so every claim about what a
dentist *sees* is `НЕ ПРОВЕРЕНО`; that a first scan scored 55, calibration showed the first two hits were
false positives, and it **threw the number away rather than publish it**; and that it **overwrote the
previous run's `state.md`**. Self-incriminating disclosure of a destroyed artefact and a discarded number
is the signature of an honest instrument.

Three gaps in the list, all now closed above:
1. **Non-inline route handlers** are not declared anywhere, and that is the limit that was non-empty (B2).
2. **#2 declares the `sql.identifier` hole unbounded** — it is boundable, and it is 47 tables through 2
   sites in one live service (B4).
3. **#8 files the 20 unmodelled tables as a follow-up** when they invalidate the completeness of §A, the
   packet's primary deliverable (§3).

One item is self-undercutting: #11 (TSX-vs-TS `ScriptKind`) is theatre — every file in `apps/api/src` is
`.ts` and TSX/TS parse identically for this analysis. Padding a good list with a non-limit slightly
cheapens it.

---

## §7 — THE SINGLE MOST VALUABLE THING NOBODY HAS LOOKED AT

**Runtime-catalog-driven table access — code whose target tables exist only in the database, never in any
source file — and the deletion hazard it creates.**

Every instrument in this campaign, cycle 7's census and both R5 scans alike, enumerates candidate tables
from `pgTable` in `schema.ts` and then asks "who touches this identifier?". `patientMerge.ts` inverts the
direction: it asks the **database** which tables reference a patient and writes to whatever comes back. I
measured it at **47 tables, 10 of them absent from the Drizzle model**, reachable from
`routes/patientDuplicates.ts:110`.

Why this is the highest-value gap rather than a curiosity:
1. It is a **live deletion hazard with a concrete trigger.** The campaign's stated purpose is deciding
   what to delete. Ten tables that patient-merge writes to are invisible to every census, so a future
   "hollow" sweep can drop one and break patient merge at runtime, with no static signal beforehand.
2. It **inverts the census's question.** Enumerating from `information_schema` instead of from `pgTable`
   is already G7(d), but only as "surface the 20 missing tables". The stronger version is: enumerate
   from the catalog **and** resolve dynamic-identifier writers, then diff the two directions. That single
   change subsumes G7(a), (b) and (d).
3. Nobody has counted how many other `sql.identifier` / `sql.raw` / computed-table sites exist. I proved
   the class is non-empty and bounded one member at 47 tables; **the class itself is still unmeasured**,
   and it is the only remaining hole big enough to invalidate a deletion decision.

Second-most valuable, and cheap: **open the app.** Every claim in this dossier about what a user sees is
textual inference, and the one I checked — the patient portal — turned out to be a staff-side preview
modal rendering a wrong number rather than a patient-facing empty list (B1). One browser session would
have caught it. The dossier says this itself in `methodLimits` #10; nobody has acted on it.
