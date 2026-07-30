# ADVERSARIAL REVIEW — P7-cron-margin

Reviewer: adversarial (did not write the code). Posture: disbelief. Read-only on source.
Commit under attack: `aa649990557f886d93fdd88e54d89029228cffc8` (+ the three follow-ups it needs).
Review DB: native PostgreSQL 18 at `127.0.0.1:5432/dental_crm`, read-only SELECT only.

## VERDICT: **NEEDS_REWORK**

Every single proof the builder claimed **reproduces exactly**. This is the first packet in this
campaign where the evidence survived re-execution byte for byte, including the DB probe output.
The ordered part of the job — kill `margin: revenue * 0.4`, kill `completionRate: 85` — is done
correctly, is genuinely proven, and the cost-data census is real and is the most valuable artefact
in the packet.

The rework is not about the ordered change. It is about the **unordered SQL rewrite** the builder
shipped alongside it. That rewrite converted an honestly-empty result into two rows that assert
**`revenue: 0`** for two doctors who have **44 000,00 ₽ and 23 400,00 ₽ of paid money** in the
`payments` ledger. That is a fabricated zero in a money field, which is the one thing step 3 of the
packet named as FORBIDDEN, introduced by the very commit sent to remove a fabrication.

---

## 0. What the commit set actually is

`aa6499905` contains **one file**. The builder actually shipped **four** commits:

| hash | subject | files |
|---|---|---|
| `aa6499905` | `[ARCHON] fix(аналитика): 40 % выручки писались в срез BI как прибыль врача` | `cronAnalyticsWorker.ts` (+117 −15) |
| `1e1605c61` | `[ARCHON] test(аналитика): срез BI не проверялся на выдуманные числа` | `cronAnalyticsWorker.ts` (+15 −2, comments), `scripts/tests/cronAnalyticsWorker.test.ts` (new, 166 lines) |
| `198da887c` | `[ARCHON] docs(пакет P7): чёрный ящик и отчёт по выдуманной прибыли в срезе BI` | 7 packet files |
| `c199d0dab` | `[ARCHON] docs(пакет P7): в чёрном ящике не было хешей собственных коммитов` | 3 packet files |

Code at HEAD is the union of the first two. Judgement is on HEAD, both diffs read in full.

---

## 1. THE KILL SHOT — a new fabricated zero, in the money field, in the same function

### What the old query produced on live data

```
### OLD query (pre-commit) on demo org d0000000-...-00000000d001
[]
```
Zero rows. `doctorProfitabilityJson = []`. The snapshot got an empty array. Honest emptiness.

### What the new query produces on the same data

(the builder's own probe, re-run by me, output identical to its claim)
```
RAW : [{"name":"Смирнова Елена Владимировна","revenue":0,"total_appointments":"15","completed_appointments":"8"},
       {"name":"Гаврилов Никита Сергеевич","revenue":0,"total_appointments":"12","completed_appointments":"5"}]
SNAPSHOT WOULD BE:
 { "name": "Смирнова Елена Владимировна", "revenue": 0, "margin": null, "completionRate": 53.33 }
 { "name": "Гаврилов Никита Сергеевич",   "revenue": 0, "margin": null, "completionRate": 41.67 }
```

### Why that `0` is a lie

`patient_invoices` — the table the worker's revenue CTE reads — **has zero rows in the entire
database**:
```
### invoice visit linkage
[{"inv":0,"with_visit":0}]
### invoices by org/status
[]
```

The money is in `payments`, and it **is attributable per doctor** through exactly the join the live
honest route already uses:
```
### payments -> doctor via visits/appointments  (status='paid', demo org)
[{"full_name":"Гаврилов Никита Сергеевич","n":4,"revenue":"44000.00"},
 {"full_name":"Смирнова Елена Владимировна","n":4,"revenue":"23400.00"}]
### payments visit_id coverage
[{"n":8,"with_visit":8}]
```

So the committed worker writes **`revenue: 0` for a doctor with 44 000,00 ₽ of paid revenue.**

The source comment defends it:
```ts
// Ноль в выручке у такого врача не выдумка: оплаченных счетов у него
// действительно нет.
```
True about invoices. **False about revenue.** The field is named `revenue`, the UI column header is
«Выручка», and the doctor's paid revenue is 44 000 ₽. The query cannot distinguish "this doctor
billed nothing" from "the invoicing subsystem holds no data at all" — and today it is the second.
That is unknown rendered as `0`, the packet's named FORBIDDEN case.

### It is worse than an oversight — the builder applied the correct rule one line above

Inside the same function the builder wrote the right rule for completion:
```ts
completionRate: totalAppointments > 0 ? (completed/total)*100 : null,
```
with the comment «нечего считать ≠ посчитали и вышел ноль». That exact reasoning applies verbatim
to revenue and was not applied. `DoctorProfitabilitySnapshotRow.revenue` is typed `number`, not
`number | null`, so the type itself forecloses the honest answer.

### The builder read the file that gets it right and cited it as its own authority

`routes/analytics.ts` — the "honest route" the commit body, the source comment and the handoff all
cite as precedent — sources doctor revenue from **`payments`**, not invoices:
```
apps/api/src/routes/analytics.ts:102   revenue: sql`coalesce(sum(${payments.amountRub}),0)`
apps/api/src/routes/analytics.ts:172   totalRevenue: sql`coalesce(sum(${payments.amountRub}), 0)`
apps/api/src/routes/analytics.ts:226   total: sql`coalesce(sum(${payments.amountRub}), 0)`
```
…and it then **drops zero-revenue doctors entirely**: `.filter((x) => x.revenue > 0)`
(`routes/analytics.ts:135`). The builder cited `:127-132` of that same block for `margin: null` and
diverged from `:99-135` on the two points that create the new defect.

`payments` is the house convention. `patient_invoices.total_amount_rub` is used as a revenue source
by nobody in `apps/api/src` except the two sleeping BI workers. And the census the builder itself
wrote printed `8 payments (paid)` on the line directly under the five empty cost tables — the
evidence was in its own output and was read as "the numerator exists" rather than "the numerator I
am querying is not this one".

### The stated justification for the behaviour change is nullified by the consumer

The outer join is defended as rescuing a doctor's "perfectly measurable completion rate" from being
dropped. The consumer discards it anyway:
```tsx
apps/web/src/pages/AnalyticsDashboardView.tsx:487
{data.doctorProfitabilityJson.filter((x) => x.revenue > 0).length > 0 ? (
    <DoctorProfitabilityTable rows={data.doctorProfitabilityJson} />
) : ( <EmptyState title="Закрытых приёмов пока нет" ... /> )}
```
On today's data every row is `revenue: 0`, so the guard fails and the empty state renders — the
rescued completion rates are shown to nobody. The behaviour change bought zero user-visible benefit
and cost one false monetary assertion persisted to the database.

Worse, note the pre-existing UI inconsistency: the guard filters, the table receives the
**unfiltered** array. So the moment a single invoice exists, `DoctorProfitabilityTable` renders
*all* rows — including every `0 ₽` row the new outer join manufactures.

### Severity calibration (why NEEDS_REWORK and not REVERT)

The new defect lives in the same dead file with the same "one import re-arms it" latency as the
original. Reverting restores `margin: revenue * 0.4` + `completionRate: 85`, which is a larger lie.
The correct move is forward, and the rework is small: two lines of SQL and one type.

---

## 2. PROOF AUDIT — every claim re-executed

| # | Builder claim | Command I ran | Result |
|---|---|---|---|
| 1 | TYPECHECK VERIFIED, EXIT=0, zero errors | `npm run typecheck -w @dental/api` | **REPRODUCES.** `tsc -p tsconfig.json --noEmit`, `EXIT=0`, no output. |
| 2 | UNIT VERIFIED, 14/14 pass | `node --import tsx --test apps/api/src/scripts/tests/cronAnalyticsWorker.test.ts` | **REPRODUCES.** `ℹ tests 14 / ℹ pass 14 / ℹ fail 0`, `EXIT=0`. All six named tests present and green. |
| 3 | DB VERIFIED read-only probe, exact quoted RAW/SNAPSHOT output | `node --import tsx .agents/archon/packets/P7-cron-margin/readonly-query-probe.ts` | **REPRODUCES CHARACTER-FOR-CHARACTER**, incl. `53.333333333333336` / `41.66666666666667` and `OK: ни одной строки с числом в поле прибыли`, `EXIT=0`. Probe SQL diffed against the worker's SQL — identical. Probe does NOT call `runBiAnalyticsAggregation` and performs no INSERT — the read-only claim is true. Builder quoted only the demo org; the first org returns 0 rows (harmless omission). |
| 4 | Cost census: 5 cost tables at 0, payments(paid) 8 | `node .agents/archon/packets/P7-cron-margin/cost-data-census.cjs` | **REPRODUCES exactly.** I independently confirmed `patient_invoices` is also 0 — which the census did **not** probe, and which is the hole. |
| 5 | Completion data real: 27 appts / 13 completed / 27 with doctor | own read-only SQL against 5432 | **REPRODUCES.** `{"total":27,"with_doc":27}`; status dist `completed 13, planned 5, cancelled 4, no_show 3, confirmed 2`. `'completed'` is a valid `appointment_status` enum label (verified in `pg_enum`). |
| 6 | SUITE 873 tests / 872 pass / 1 fail, failure not mine | `npm test -w @dental/api` | **REPRODUCES.** `ℹ tests 873 / ℹ pass 872 / ℹ fail 1`. Failure is `apps/api/src/tests/routes/dayConfirmations.test.ts:217`, `+ '2026-07-29' / - '2026-07-28'` — a UTC-vs-Moscow date-boundary test, unrelated. Attribution correct. |
| 7 | Zero importers | `rg -n --hidden --glob '!node_modules' --glob '!.git' "cronAnalyticsWorker\|runBiAnalyticsAggregation\|buildDoctorProfitabilityRow"` | **REPRODUCES.** No `import` in `apps/`, `scripts/`, `packages/`. Only: its own `export`, the new test, a comment at `db/schema.ts:2100-2101`, stale `scratch/`, packet docs. Pedantic addendum: the builder's own committed `readonly-query-probe.ts:13` now *is* an importer — but it is a packet artefact, not production. Note the builder's `rg` did not use `--hidden`, so it never searched `.agents/`; the conclusion survives anyway. |
| 8 | Git: Russian subjects intact, only own files, tree clean | `git show --name-only` ×4, `git status --porcelain <paths>`, byte-level mojibake scan | **REPRODUCES.** See §4. |

**Not one fabricated proof.** Every command exists, runs, and its output supports the sentence it
was attached to. Contrast with the campaign's history: this builder did not do that.

The builder's NOT-PROVEN list is also honest and correctly scoped: no snapshot INSERT was executed,
no UI claim was made, the string-return branch of `parseNumericMoney` is acknowledged as unit-only.
I verified the reason given for not running the INSERT is real — `runBiAnalyticsAggregation` does
`db.insert(biAnalyticsSnapshots)` at `:236` unconditionally.

---

## 3. ATTACK SURFACE

| # | Hypothesis | Result | Evidence |
|---|---|---|---|
| A1 | The defect was real at the cited line before this commit | **CONFIRMED** | `git show aa6499905^:apps/api/src/scripts/cronAnalyticsWorker.ts` → `margin: Number(row.revenue) * 0.4, // Simplified margin heuristic` and `completionRate: 85,` present verbatim at 118-119. Packet citation exact. |
| A2 | The fixed value is consumed on a route a real user can reach | **DISPROVED — it is dead code** | `rg "biAnalyticsSnapshots" apps/api/src apps/web/src packages` → 5 hits: schema decl, and 2 writers (`scripts/cronAnalyticsWorker.ts:236`, `services/biAnalyticsWorker.ts:259`). **Zero readers.** `rg "snapshot" apps/api/src/routes/analytics.ts` → nothing. Call chain terminates at `db.insert()`; nothing reads the row back. Builder disclosed this in NOT-PROVEN and in handoff §3. **However** the permanent commit body states «та же таблица и та же форма записи, **которую читает экран аналитики**» — the screen does not read that table. The false half is inherited from the lead's own packet brief, but it is now in the git record. |
| A3 | A fabricated constant survives in `margin` | **DISPROVED** | `margin: null` unconditional, `cronAnalyticsWorker.ts:84`. Unit grid over 7 revenue values + 3×3×2 grid asserts `=== null` and `!== revenue*0.4`. Live probe: both rows `"margin":null`. |
| A4 | `completionRate` is still a constant | **DISPROVED** | Live probe returns 53.333…% (8/15) and 41.666…% (5/12) — two different, arithmetically checkable values. Not 85. |
| A5 | The unit contract is wrong (fraction vs percentage points) | **DISPROVED — builder got the trap right** | `analyticsDoctorMetrics.ts:117-118` (doc for `formatCompletionRate` at :124) states «Значение — процентные пункты (85 означает 85 %)»; :129 does `Math.round(rate)` and prints `${rounded} %`. A 0..1 fraction would print «1 %». Builder's citation `:117-118` is precise — it points at the unit sentence, not the function. |
| A6 | **The commit introduces a fabricated 0 in a money field** | **CONFIRMED — see §1** | Old query on live data → `[]`. New query → 2 rows `revenue: 0`. `payments` join → Гаврилов 44 000,00 ₽ / Смирнова 23 400,00 ₽. `patient_invoices` count = 0 rows total. |
| A7 | The revenue source is against the codebase's own ratified convention | **CONFIRMED** | `routes/analytics.ts:102,172,226` all use `payments.amountRub`; `services/biAnalyticsWorker.ts:186` uses `payments.amountRub`. Only the two sleeping workers' invoice path uses `patient_invoices.total_amount_rub`, and only `cronAnalyticsWorker` still does. |
| A8 | The outer-join justification is nullified by the consumer | **CONFIRMED** | `AnalyticsDashboardView.tsx:487` guards on `.filter((x) => x.revenue > 0).length > 0`. All new rows are `revenue: 0` → empty state renders → the "rescued" completion rates are never displayed. |
| A9 | Hollow facade — `{success:true}` over a no-op, placeholder, hardcoded UUID/port/endpoint | **DISPROVED** | Function returns `void`, swallows errors into `console.error` (pre-existing, unchanged). No hardcoded UUID/port/endpoint added; `orgId` stays a parameter. The hardcoded demo UUID appears only in the handoff's *closing command*, not in source. |
| A10 | Second owner of an existing concept | **CONFIRMED (nit)** | `buildDoctorProfitabilityRow` (scripts) vs `doctorProfitabilityRow` (`services/biAnalyticsWorker.ts:152`) — two near-identically-named pure builders producing the same `doctor_profitability_json` shape with **incompatible semantics**: services returns `margin: kopecksToNumericString(...)` from invented 15 %/25 % basis points and `completionRate: paymentCount > 0 ? 100 : 0`. Two writers of one jsonb column pre-dated this commit; the commit adds a second *row-shape owner*, and the two now disagree on what the column means. |
| A11 | Deleted/renamed a field in the `useAppLogic.tsx` return block | **DISPROVED** | `useAppLogic.tsx` is not in any of the four commits (`git show --name-only`). Its dirty state in `git status` belongs to another agent. |
| A12 | Listener / interval / subscription without teardown | **DISPROVED** | No timers added. `readonly-query-probe.ts:71` calls `await pool.end()`; `cost-data-census.cjs:41` and `schema-reality-check.cjs` call `client.end()`. (The un-torn-down `setInterval` at `services/biAnalyticsWorker.ts:269-279` is pre-existing and outside scope — correctly reported as debt.) |
| A13 | Hardcoded hex colour added | **DISPROVED** | `colors = ["#14b8a6", …]` at `:175` is untouched pre-existing code and appears in neither diff. Builder flagged it as debt (handoff §5) rather than churning it. Correct call. |
| A14 | Hardcoded Russian literal without declared i18n debt | **DISPROVED, but the literal is unreachable** | `"Врач не указан"` (`:82`) is new and **is** declared (handoff §7), matching the existing `"Врач клиники"` in `routes/analytics.ts:124`. However `users.full_name` is `text("full_name").notNull()` (`schema.ts:245`) and the SQL selects `u.full_name` off an inner-scoped `users` row — `row.name` can never be null, so the `??` branch and its unit test (`test.ts:123-126`) exercise an impossible state. Dead defensive default. |
| A15 | Static px where a relative unit belongs | **DISPROVED** | No UI code in the diff. |
| A16 | Mojibake in the diff or the commit subjects | **DISPROVED** | Byte-level scan (`scratch/p7-mojibake.cjs`, regex `[РС][-ÿ]|вЂ|Ð[..]`): worker 0 lines / 1915 Cyrillic chars / no BOM; test 0 lines / 1370 Cyrillic chars / no BOM. All four commit subjects+bodies: 0 mojibake lines. Subjects render clean, e.g. `[ARCHON] fix(аналитика): 40 % выручки писались в срез BI как прибыль врача`. |
| A17 | `ORDER BY revenue DESC LIMIT 5` is now nondeterministic | **CONFIRMED (nit)** | With every row `revenue: 0` (today's exact state) the ORDER BY has no discriminator, so which 5 staff land in the "top 5" panel is arbitrary. Under the old inner join, every listed doctor had a real positive sum and the ordering was meaningful. |
| A18 | Kopeck/rounding rule violated (§8b, packet step 4) | **DISPROVED** | Nothing in the money arithmetic changed; `revenue` is still `Number(SUM(total_amount_rub))`. Note for the lead: the packet brief's premise is wrong about the live DB — `payments.amount_rub` and `patient_invoices.total_amount_rub` are both `numeric(12,2)`, not INTEGER (`information_schema`, and `schema.ts:460` `numeric(…scale: 2, mode:"number")`). Not the builder's error; the packet's. |
| A19 | Cost data actually exists somewhere and option (a) was possible | **DISPROVED — builder is right** | Census reproduces: `inventory_transactions` 0 (0 priced, 0 visit-attributed), `inventory_items` 0 (0 priced), `procedure_material_rules` 0, `doctor_commissions` 0, `pricelist_doctor_payrolls` 0. An honest margin is not computable. This is the packet's most valuable finding and it holds. |
| A20 | Option (c) (delete) should have been taken | **DISPROVED** | Sections 1-3 (cohort LTV, plan funnel, chair utilisation) query real tables with no invented multipliers, unlike `services/biAnalyticsWorker.ts` (`*1.5/*2/*3` LTV, `|| 1` funnel padding, demo chairs). Deleting would have removed the honest three and left the worse fabrication. Reasoning sound. |

---

## 4. GIT HYGIENE

**Clean.** `git show --name-only` on all four commits lists only the builder's own files:
- `aa6499905` → `apps/api/src/scripts/cronAnalyticsWorker.ts` only.
- `1e1605c61` → the worker + the new test only.
- `198da887c` / `c199d0dab` → only `.agents/archon/packets/P7-cron-margin/*`.

No `apps/api/.data/*.json`, no `apps/web/tsconfig.tsbuildinfo`, no `apps/api/dist/**`, no
`scratch/**`, no other agent's file — all of which are sitting dirty in the worktree and were
**not** swept in. `git status --porcelain` on the builder's paths is empty (the only untracked item
is this review file).

Conventional Commits: `fix(аналитика):` / `test(аналитика):` / `docs(пакет P7):`. The subject names
the defect («40 % выручки писались в срез BI как прибыль врача»), not "improve"/"update". Bodies
explain WHY at length (§12 satisfied). Russian subjects intact, no mojibake (A16).

One §9 nit: `commitmsg.txt`, `commitmsg2.txt`, `docsmsg.txt`, `docsmsg2.txt` (94 lines total) are
commit-message scratch buffers now permanently in git history. "Clean up any garbage files you
create before reporting completion."

---

## 5. REQUIRED REWORK

1. **Stop asserting `revenue: 0` from an empty table.** Source doctor revenue from `payments`
   (`status='paid'`, joined `payments.visit_id → visits.appointment_id → appointments.doctor_user_id`),
   exactly as `routes/analytics.ts:99-106` — the file already cited as this packet's precedent —
   already does. Verified to yield 44 000,00 ₽ / 23 400,00 ₽ on the live demo org.
2. **Or, if the invoice source is kept deliberately, make the unknown honest:** widen
   `DoctorProfitabilitySnapshotRow.revenue` to `number | null`, drop the `COALESCE(r.revenue, 0)`,
   and emit `null` when no revenue row exists — the same rule the builder correctly applied to
   `completionRate` one line above. `0` must mean "measured zero", never "no source".
3. **Justify or drop the outer join.** As shipped it rescues completion rates that
   `AnalyticsDashboardView.tsx:487` discards, at the price of manufacturing `0 ₽` rows. If it stays,
   add a deterministic tiebreak to `ORDER BY revenue DESC` (e.g. `, ap.total_count DESC, u.full_name`).
4. **Correct the commit-record overstatement** in the next packet's handoff: `bi_analytics_snapshots`
   has two writers and zero readers; the analytics screen does not read it. (The builder states this
   correctly in handoff §3 — the error is only in the commit body, and it originated in the brief.)
5. **Nits, optional:** the `"Врач не указан"` fallback and its unit test are unreachable
   (`users.full_name` is `NOT NULL`); delete the four `*msg*.txt` scratch files.

## 6. STANDING EXPOSURE (not this builder's, correctly reported by them)

`apps/api/src/services/biAnalyticsWorker.ts` writes the **same column** with
`MATERIAL_BASIS_POINTS = 1_500` / `COMMISSION_BASIS_POINTS = 2_500` (margin = exactly 60 % of
revenue, kopeck-precise arithmetic over an invented number) and
`completionRate: paymentCount > 0 ? 100 : 0` (`:175`). It also has an untorn-down hourly
`setInterval` (`:269-279`) that its own test calls for real. Zero importers today. This packet's
fix does not reach it. It needs its own packet.

---

## 7. APPENDIX — reproduction of the kill shot

Read-only. Run against `127.0.0.1:5432/dental_crm` with `psql` or any client.

```sql
-- (1) the revenue source the committed worker reads: EMPTY, whole database
SELECT count(*) AS invoices, count(visit_id) AS with_visit FROM patient_invoices;
--  0 | 0

-- (2) the revenue that actually exists, attributed per doctor by the same join
--     routes/analytics.ts:99-106 already uses
SELECT u.full_name, count(p.id) AS n, sum(p.amount_rub) AS revenue
FROM payments p
JOIN visits v      ON v.id = p.visit_id
JOIN appointments a ON a.id = v.appointment_id
JOIN users u        ON u.id = a.doctor_user_id
WHERE p.status = 'paid'
  AND p.organization_id = 'd0000000-0000-4000-8000-00000000d001'
GROUP BY u.full_name ORDER BY 3 DESC;
--  Гаврилов Никита Сергеевич  | 4 | 44000.00
--  Смирнова Елена Владимировна| 4 | 23400.00

-- (3) what the PRE-commit query returned on this same data
SELECT u.full_name AS name, COALESCE(SUM(i.total_amount_rub),0) AS revenue
FROM users u
JOIN appointments a    ON a.doctor_user_id = u.id
JOIN visits v          ON v.appointment_id = a.id
JOIN patient_invoices i ON i.visit_id = v.id
WHERE u.organization_id = 'd0000000-0000-4000-8000-00000000d001' AND i.status = 'paid'
GROUP BY u.id, u.full_name ORDER BY revenue DESC LIMIT 5;
--  (0 rows)   <-- honestly empty
```

(4) what the POST-commit query returns, via the builder's own committed probe:
`node --import tsx .agents/archon/packets/P7-cron-margin/readonly-query-probe.ts`
→ two rows, both `"revenue":0`.

`0 ₽` vs `44 000,00 ₽`. That is the finding.

---

*Reviewed read-only. No source file edited, nothing committed, staged, reverted or added.
Temporary probe scripts were written under `scratch/` and deleted after use; everything needed to
reproduce is in this appendix plus the builder's own committed probes.*
