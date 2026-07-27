# P7-cron-margin — black box

- **Packet**: P7-cron-margin
- **Claim**: `apps/api/src/scripts/cronAnalyticsWorker.ts`
- **Gate**: `npm run typecheck -w @dental/api`
- **HEAD at start**: 94c6caa15a1dfcbf1774942a62b7a3dd8e4bdb2c (packet cited f09869601 — tree moved)
- Claimed file was CLEAN at start (`git status --porcelain` empty for it).

## Milestones

- STARTED — 2026-07-28
- AUTHORITY READ — .agents/AGENTS.md, .agents/INDEX.md, .agents/BILLING_AND_FINANCE.md (all complete)
- DEFECT CONFIRMED — cronAnalyticsWorker.ts:118 `margin: Number(row.revenue) * 0.4, // Simplified margin heuristic`
  and :119 `completionRate: 85,`. Dossier/packet citation is ACCURATE, line-for-line.
  Extra finding same file: line 93 hardcoded hex palette `["#14b8a6",...]` written into
  `chairUtilizationJson.fill` — static hex persisted to DB, bypasses theme tokens.

## Census results (evidence on disk, do not redo)

- ZERO IMPORTERS of cronAnalyticsWorker.ts — CONFIRMED. Only hits: its own `export`,
  a comment at db/schema.ts:2100-2101, and stale `scratch/` files. No import statement anywhere.
- SECOND WRITER to the same table exists and is WORSE: `apps/api/src/services/biAnalyticsWorker.ts:259`.
  Not in my claim. Reported as found-not-fixed.
- COST DATA: does not exist. Read-only census vs 127.0.0.1:5432 (cost-data-census.cjs):
  inventory_transactions 0, inventory_items 0, procedure_material_rules 0,
  doctor_commissions 0, pricelist_doctor_payrolls 0. payments(paid)=8.
  => option (a) "compute a real margin" is IMPOSSIBLE. Cost=0 would be a fabricated 0.
- COMPLETION DATA: EXISTS AND IS REAL (schema-reality-check.cjs):
  appointments total 27, completed 13, all 27 with doctor_user_id.
  statuses: completed 13, planned 5, cancelled 4, no_show 3, confirmed 2.
  => completionRate MUST be computed for real, not nulled.
- UNIT CONTRACT: analyticsDoctorMetrics.ts:117-118 — completionRate is PERCENTAGE POINTS
  (85 == 85 %). NOT the 0..1 fraction used by managerReports.ts:255. Do not copy that one.
  margin is a RUBLE AMOUNT (formatMarginCell -> formatRub -> "+X ₽").
- HAZARD CONFIRMED: analyticsDoctorMetrics.ts:224-226 `nullableNumber` passes finite numbers
  through untouched, so `margin: revenue*0.4` and `completionRate: 85` WOULD render as
  green profit. The web sanitizer only blocks strings. Packet's claim is accurate.

## DECISION: option (b), with completionRate computed for real

- margin -> null (no cost data anywhere; 0 is forbidden as a stand-in for unknown)
- completionRate -> real completed/total*100 per doctor, null when the doctor has 0 appointments
- NOT (a): all five cost tables empty.
- NOT (c) delete: 3 of 4 aggregations in this file are honest real queries and are
  methodologically BETTER than the sibling service's (which invents LTV *1.5/*2/*3,
  pads funnel with `|| 1`, and falls back to demo chairs). Deleting would destroy honest
  work and would not remove the sibling's worse fabrication.
- Hardcoded hex `fill` palette (line 93) is the ratified repo convention
  (routes/analytics.ts:92-95 does the same). Pre-existing debt, NOT fixed, out of scope.

- EDIT WRITTEN — cronAnalyticsWorker.ts. Extracted pure `buildDoctorProfitabilityRow()`
  + interfaces `DoctorProfitabilityQueryRow` / `DoctorProfitabilitySnapshotRow` so the
  logic is testable without a DB (same pattern as services/biAnalyticsWorker.ts).
  SQL rewritten into two CTEs (doctor_revenue / doctor_appointments) because completion
  rate measured over the paid-invoice inner join would be ~100% by construction.

- GATE PASSED — `npm run typecheck -w @dental/api` EXIT=0, no errors.
- COMMITTED aa649990557f886d93fdd88e54d89029228cffc8
  subject: `[ARCHON] fix(аналитика): 40 % выручки писались в срез BI как прибыль врача`
  1 file changed, 117 insertions(+), 15 deletions(-). Only my file. No mojibake.
  TREE IS CLEAN for my claim. Nothing of mine is left uncommitted.

- PROVEN — UNIT: 14/14 pass, exit 0
  `node --import tsx --test apps/api/src/scripts/tests/cronAnalyticsWorker.test.ts`
- PROVEN — DB (read-only, no INSERT): readonly-query-probe.ts against 127.0.0.1:5432.
  CTE SQL valid. Real rates: Смирнова 8/15 -> 53.33, Гаврилов 5/12 -> 41.67. margin null.
  Also proved COUNT(*) arrives as STRING ("15"), numeric revenue as NUMBER.
- COMMITTED (2nd) 1e1605c6178a04f480a503b7e3dfcdd30730a3e1
  subject: `[ARCHON] test(аналитика): срез BI не проверялся на выдуманные числа`
  2 files: cronAnalyticsWorker.ts (comment accuracy) + tests/cronAnalyticsWorker.test.ts
- TYPECHECK re-run after 2nd edit: EXIT=0.

- FULL SUITE — `npm test -w @dental/api`: tests 873, pass 872, fail 1.
  The 1 failure is NOT mine: tests/routes/dayConfirmations.test.ts:85 computes "tomorrow"
  from UTC+24h while the route uses Europe/Moscow; fails daily between 21:00-24:00 UTC.
  My file has zero importers and cannot affect it.
- DONE — handoff.md written.

## Commits (all landed)

1. `aa649990557f886d93fdd88e54d89029228cffc8` fix — margin/completionRate fabrication removed
2. `1e1605c6178a04f480a503b7e3dfcdd30730a3e1` test — 14 node:test guards + comment accuracy
3. `198da887c5719a112f3413425a30ba7542789e15` docs — this black box, handoff, 3 read-only probes

PACKET CLOSED. Nothing of mine left uncommitted. Claimed file
`apps/api/src/scripts/cronAnalyticsWorker.ts` is clean at HEAD.

## Old notes: proofs (commit already landed, these cannot lose work)

- write node:test for buildDoctorProfitabilityRow, run with
  `node --import tsx --test apps/api/src/scripts/tests/cronAnalyticsWorker.test.ts`
- DB: do NOT run the worker — it INSERTs into bi_analytics_snapshots against the live
  shared DB. Will label NOT VERIFIED with the exact command instead.
