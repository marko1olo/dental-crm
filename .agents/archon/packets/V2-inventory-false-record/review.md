# ADVERSARIAL REVIEW — V2-inventory-false-record

Reviewer: adversarial, did not write the code. Posture: disbelief; every claim reproduced or marked
UNTESTABLE. Read-only on source throughout — no edit/fix/commit/revert/`git add` on any tracked file.
`git diff HEAD -- apps/api/src/routes/diary.ts apps/api/src/tests/routes/diarySigningCeremony.test.ts
apps/api/src/tests/routes/diaryDeductionProof.ts` is EMPTY at the end. No server was started or
restarted (one was already listening on 4100). All my scratch lived in gitignored
`apps/api/.tmp-v2rev/` and is deleted.

Spec: `.agents/archon/packets/U5-diary-lock-ceremony/review.md`, read COMPLETE.
Authority read complete: `.agents/AGENTS.md`, `.agents/INDEX.md`, `.agents/CLINICAL_RULES.md`.
Commits under attack: `8784cb065` (code+tests) · `27cdd0bb4` (live-HTTP proof mode) ·
`40486bfa8` (record correction) · `647c7010e` (marker on the false commitmsg) · `c2d02c619` (state).
HEAD during review: `545d2e02d` — three other packets sit on top of V2.

## VERDICT: SOUND_WITH_NITS

I could not break a single claim. Both counterfactuals reproduce digit for digit through a harness
that shares no import-rewriting with the builder's; the historical defect reproduces a second,
independent way (pre-U5 router driven via `/lock`); the record correction lands in every place the
false claim is actually read; and I closed one of the packet's own NOT-PROVEN items in its favour over
real HTTP. Eight nits below. One of them — N1 — is a behavioural cost of the widening that the packet
never names, in the MONEY lane. It does not reach NEEDS_REWORK because it is not creatable through the
product and is no worse than the pre-U5 baseline, but the lead should dispatch it.

---

## 0. Parentage, scope, transport

- `1f65d674b^` = `0112f293e`; `8784cb065^` = `20b60d571`; `87e367c40^` = `01f7a797b`. All as stated.
- `git diff 1f65d674b 8784cb065^ -- apps/api/src/routes/diary.ts` is **EMPTY** — the file at
  `8784cb065^` is byte-identical to `1f65d674b`. No third party touched it in between.
- `git show --name-only` per commit matches the claimed FILES CHANGED exactly. Zero `dist/` paths, no
  `.data/*.json`, no `tsbuildinfo`, no `scratch/**`, no other agent's source, in all five.
- Author `marko1olo` on all five. Conventional Commits, `[ARCHON] ` prefix present on all five,
  Russian scope naming the defect (§12).
- **Stale-dist trap checked, not assumed.** PID 18916 on 4100 is
  `node --require .../tsx/preflight.cjs --import .../tsx/loader.mjs src/server.ts`, child of PID 9904
  = `tsx watch src/server.ts`. It runs SOURCE. `apps/api/dist/routes/diary.js` IS stale (08:21, and
  `grep -c isNull` = 0) but **nothing in this packet's proof chain loads dist** — the server and every
  test run through tsx. No rebuild was needed and the live numbers below are the committed source.
  Note the child PID was created at **10:05 today**, i.e. `tsx watch` does respawn the process; the
  builder's phrasing "server NOT restarted" is true of the supervisor, loose about the worker.

## 1. THE RECORD DEFECT — CONFIRMED, reproduced independently

Method, deliberately NOT the builder's: `git show <rev>:apps/api/src/routes/diary.ts` into a
per-revision shim tree `apps/api/.tmp-v2rev/hist/<rev>/` whose `db/`, `security/`, `utils/` and
`accessGuard.ts` are one-line `export *` re-exports of the real modules. Router and test file are
therefore byte-for-byte copies with **zero import rewriting** — the test file is the committed blob,
`md5 0a7abb3f…`; the extracted HEAD router is `md5 7ee38a46…` = the working-tree `diary.ts`.
Control run first, so the plumbing is not what makes anything red.

| the packet's own 9-case suite run against | result | exit |
|---|---|---|
| working tree, direct (`npm`-style invocation) | tests 9 / pass 9 / fail 0 | 0 |
| HEAD router via my shim harness (control) | tests 9 / pass 9 / fail 0 | 0 |
| `0112f293e` = `1f65d674b^` | **pass 6 / fail 3** | 1 |
| `20b60d571` = `8784cb065^` | **pass 8 / fail 1** | 1 |

Assertion values I saw at `1f65d674b^`:

```
✖ правило с отрицательным списанием ... actual: 16, expected: 10    (stock ROSE 10 -> 16)
✖ правило со списанием 0 ...            actual: 1,  expected: 0     (junk 0-quantity movement row)
✖ ничьё правило материалов (NULL) ...   actual: 10, expected: 6     (no deduction at all)
✔ пустая полка не даёт подписать приём и не восстанавливает остаток   <- PASSES at the parent
```

That last green line is the whole packet. **The defect commit `1f65d674b` names — an empty shelf
gaining stock — does not reproduce at its own parent**, while the defect it never mentions does. The
U5 reviewer was right; the builder's reproduction is honest. At `8784cb065^` the single red is the
org-less rule with `actual: 10, expected: 6`, confirming the negative/zero defects were already closed
at HEAD before this packet, exactly as declared.

**Second, independent reproduction** — the pre-U5 router (`01f7a797b` = `87e367c40^`) driven through
the packet's own harness with `V2_SIGN_VIA=lock`, pointed at my shim tree so no source file was
written:

```
[normal +2]       stock 10 -> 6   [{"quantity":"-4","type":"auto_deduct"}]
[negative -3]     stock 10 -> 16  [{"quantity":"6","type":"auto_deduct"}]     <- POSITIVE "deduction"
[zero 0]          stock 10        [{"quantity":"0","type":"auto_deduct"}]     <- junk row
[orgless rule +2] stock 10 -> 6   [{"quantity":"-4","type":"auto_deduct"}]    <- deducted BEFORE U5
[fractional 1.5]  HTTP 400 with the RAW driver text "Failed query: update \"inventory_items\" ... 8.5"
```

Every historical figure in the packet is reproducible two different ways. The `orgless` line also
proves the regression attribution: U5's org-scoping is what disabled deduction, it was not
pre-existing. The `fractional` line shows the old `catch (err: any)` leaking schema in a 400 — a U5
fix, and it dates the fractional failure as pre-existing.

## 2. THE `||` -> `??` NO-OP — CONFIRMED at source

- `node_modules/drizzle-orm/pg-core/columns/numeric.js`, drizzle-orm **0.45.2**, `class PgNumeric`:
  `mapFromDriverValue(value) { if (typeof value === "string") return value; return String(value); }`.
  Read, not inferred. Exactly as quoted in the packet.
- The raw driver here returns numerics as NUMBERS (`numeric_zero: 0 typeof=number`), so the ORIGINAL
  commit's premise is TRUE at the driver layer and IRRELEVANT: drizzle stringifies to `"0"`, which is
  truthy, before the route sees it. `||` could not fall through.
- `schema.ts:399` `numeric(10,2).notNull().default("1")`; `schema.ts:1532`
  `numeric("stock_quantity",{precision:10,scale:3}).default("0")` — **no `.notNull()`**;
  `schema.ts:1684` `numeric(12,4).notNull().default("1.0000")`. The builder's correction to the
  packet brief ("declare all three NOT NULL with defaults" is inaccurate for `stockQuantity`) is
  CORRECT, and its replacement argument holds: string when present, indistinguishable on NULL, and
  NOT NULL in the live column anyway.
- Machine-checked by the 9th case, which passes at HEAD and at both parents — a gate on the
  *reasoning*, not on a fix. Described as exactly that. No fix is claimed that was not made.

## 3. THE NEW LIVE DEFECT — CONFIRMED, and its premise is now PROVEN, not inferred

The packet's own NOT-PROVEN item ("an org-less rule created through the REAL route rather than by an
equivalent direct INSERT") — I closed it. Temp org/service/shelf by SQL, then the PRODUCT route over
live HTTP with a staff token against the already-running server:

```
GET /api/health -> 200 {"ok":true,"service":"dental-crm-api",...}
POST /api/inventory/<org>/rules {quantityToDeduct: 2}  -> 200  body "organizationId":null
                                                          DB [{"organization_id":null,"qty":"2"}]
POST /api/inventory/<org>/rules {quantityToDeduct: 0}  -> 200  DB [{"organization_id":null,"qty":"1"}]
POST /api/inventory/<org>/rules {quantityToDeduct: -3} -> 200  DB [{"organization_id":null,"qty":"1"}]
CLEANUP {"organizations":4,"probe_orgs":0,"rules":0,"inventory_items":0,"services":0}
```

Three of the packet's claims fall out of that, all confirmed:
1. Every rule the product creates really does land with `organization_id` NULL. So at `8784cb065^`,
   signing a visit deducted NOTHING for any rule the product itself can create — HTTP 200, diary
   signed, audit written, shelf untouched. That is the packet's headline and it is real.
2. The "0 becomes 1" the false commit put on the READ side really lives on the WRITE side and is still
   there: asking for 0 stores 1. `routes/inventory.ts:403`/`:415` = `String(Math.max(1, …))`.
   Confirmed over HTTP, not by reading.
3. A negative rule **cannot** be created through the product (−3 stored as 1), so the negative-rule
   defect was direct-SQL/import/legacy only. The packet's reachability statement is accurate.

Reachability of rule creation is real and UI-borne: `apps/web/src/components/inventory/
useInventoryLogic.ts:152` POSTs that exact route. Legacy reachability too —
`drizzle/0000_freezing_randall_flagg.sql:907-913` creates `procedure_material_rules` with **no**
`organization_id` column at all, and `0118_align_tables_with_schema.sql:221` adds it nullable with no
backfill. The `IS NULL` tolerance is forced by the data, not invented.

**Containment of the widening, measured (my probe, in-process, HEAD router):**

| my case | HEAD | `8784cb065^` |
|---|---|---|
| org-less rule pointing at ANOTHER clinic's shelf | foreign stock **10 → 10**, 0 rows | 10 → 10, 0 rows |
| foreign-owned rule (`organization_id` set, not ours) | 10 → 10, 0 rows | 10 → 10, 0 rows |
| rule −3 × service quantity −2 (product = +6) | 10 → 10, 0 rows | **10 → 4, movement "−6"** |
| service quantity 0 | 10 → 10, 0 rows | 10 → 10, 0 rows |
| fractional service quantity 1.5 | 500, stock 10, 0 rows, diary unlocked | identical |
| owned rule **plus** an org-less twin on the same (service, item) | **10 → 2, TWO "−4" rows** | 10 → 6, one "−4" row |

Row 1 is the load-bearing safety result: the inventory read stays org-scoped, so the cross-tenant leak
`87e367c40` closed **stays closed**. Row 3 confirms the commit body's per-factor argument with real
numbers — the old product-only guard let `−3 × −2 = +6` through and deducted 6 nobody ordered. Row 6
is nit N1.

## 4. Proof audit — every claimed command re-run, true exit codes captured

| claim | my result |
|---|---|
| `npm run typecheck -w @dental/api` exit 0 | **exit 0**, clean, on the committed tree |
| `node --import tsx --test .../diarySigningCeremony.test.ts` 9 / 9 exit 0 | **exit 0, tests 9 / suites 1 / pass 9 / fail 0** |
| counterfactual `1f65d674b^` pass 6 / fail 3 exit 1 | **CONFIRMED**, same three cases, same values |
| counterfactual `8784cb065^` pass 8 / fail 1 exit 1, `actual: 10, expected: 6` | **CONFIRMED**, same value |
| `npm test -w @dental/api` 974 / 158 / 974 / 0 exit 0 | **run 2: exit 0, tests 974 / suites 158 / pass 974 / fail 0 — CONFIRMED. run 1: tests 974 / pass 973 / fail 1, exit 1** (see N3) |
| live column types, 6 columns | **CONFIRMED digit for digit** (below) |
| zero CHECK constraints on those tables | CONFIRMED — 0 over `inventory_items`, `procedure_material_rules`, `treatment_items`, `inventory_transactions` |
| no unique index on `visit_diaries.visit_id` | CONFIRMED — `pg_indexes` shows only `visit_diaries_pkey ON (id)` |
| API VERIFIED over live HTTP at 4100, five cases | **CONFIRMED, re-driven by me** (below) |
| in-process 500 leaks `Failed query: update "inventory_items"`, network anonymises to `{"error":"ServerError"}` | **CONFIRMED both ways** |
| `diaryDeductionProof.ts` not picked up by `npm test` | CONFIRMED — glob is `src/**/*.test.ts` (`apps/api/package.json:11`); also excluded from `tsc` by `exclude: ["src/tests", …]` |
| `?? inv.currentQty` was the only reader of `current_qty` | CONFIRMED — after the change `rg currentQty apps/api/src` = the schema declaration, three comments, two test fixtures. **Zero readers, zero writers in product code.** And `inventory_items` rows with `stock_quantity IS NULL` = **0**, so the removed branch was genuinely dead |
| single owner intact | CONFIRMED — non-test `apps/api/src` has exactly ONE `transactionType: "auto_deduct"` (`diary.ts:342`), ONE `isLocked: true` (`:177`), ONE `VISIT_SIGNED_AND_LOCKED` (`:387`), all inside `runDiarySigningCeremony` |
| self-declared deviation: `50781d8b6` amended to `8784cb065` | CONFIRMED — both objects exist with the **same tree `5d2c299d2…` and the same parent `20b60d571`**; only the committer timestamp and message differ. Message-only amend, exactly as disclosed |
| commitmsg files match what was committed | CONFIRMED — all five V2 files MATCH their commit messages after stripping the added `#` marker lines |
| baseline migration cited at `0000:907-913` | CONFIRMED verbatim |
| `routes/inventory.ts:410-417` omits `organizationId` | CONFIRMED (`:411-417` at HEAD; same hunk) and it is the ONLY insert/update site for that table in non-test source |

Live SQL at `127.0.0.1:5432`, my read:

```
inventory_items.current_qty                  numeric(10,3) nullable=YES default='0'::numeric
inventory_items.stock_quantity               integer       nullable=NO  default=0
inventory_transactions.quantity_changed      integer       nullable=NO
procedure_material_rules.organization_id     uuid          nullable=YES default=null
procedure_material_rules.quantity_to_deduct  integer       nullable=NO  default=1
treatment_items.quantity                     numeric(10,2) nullable=NO  default='1'::numeric
CHECK constraints on those tables: 0
pg_indexes visit_diaries: visit_diaries_pkey ON (id)   <- and nothing else
```

My live-HTTP re-drive (the `27cdd0bb4` mode), against the already-running server:

```
[normal +2]       200  stock 6   [{"quantity":"-4","type":"auto_deduct"}]  locked=true  completed  audit 1
[negative -3]     200  stock 10  []                                        locked=true  completed  audit 1
[zero 0]          200  stock 10  []                                        locked=true  completed  audit 1
[orgless rule +2] 200  stock 6   [{"quantity":"-4","type":"auto_deduct"}]  locked=true  completed  audit 1
[fractional 1.5]  500  {"error":"ServerError","message":"Сервер не выполнил действие. ..."}
                       stock 10, [], diary is_locked=false, treatment approved, audit 0  (full rollback)
CLEANUP {"own_org":0,"organizations":4,"inventory_items":0,"rules":0,"visit_diaries":0,"movements":0}
```

Every figure the packet reported over the network reproduces, including the anonymised error body.

## 5. Item-by-item audit of the specification (U5 review.md). Nothing silently ignored.

### REQUIRED REWORK 1-5

1. **False defect record — CLOSED, verified in every place claimed.** `U5/handoff.md:8-50` opens with
   a «⚠ ПОПРАВКА К ЗАПИСИ» block that quotes the false subject verbatim, names it false, and carries
   the measured three-version table. Items 12 and 13 of «Что было сломано» corrected in place
   (`:82-90`). «Коммит» (`:210-213`) marks the subject **ЗАГОЛОВОК ЛОЖНЫЙ** and supplies an honest
   title. `U5/state.md:6-8` corrected. `diary.ts:267-286` and
   `diarySigningCeremony.test.ts:539-547` replace the false narrative with the measured one. History
   not rewritten. `647c7010e` additionally marks `U5/commitmsg2.txt` — the verbatim false text this
   packet itself brought under version control. The V2 handoff opens (`:8-29`) with the note addressed
   to the lead for `progress.md`, naming the false sentence in quotes.
   `.agents/archon/progress.md:512-514` already carries the corrected framing.
2. **`||` -> `??` is a behavioural no-op — CLOSED**, stated plainly in the handoff, the commit body,
   the code comment and the test comment, with a *better* reason than the brief supplied, and with a
   test pinning the reason. See §2. Nowhere is it sold as a stock-integrity fix.
3. **Missing gate — CLOSED and PROVEN RED.** Cases for −3 and 0 exist and I watched them fail at
   `1f65d674b^` with `16 !== 10` and `1 !== 0`. This is the item packets most often fake; it is real.
4. **Reachability overstatement — CLOSED (retracted).** `U5/handoff.md:186-197` states plainly that
   the ceremony is not exercisable from any screen until debt #3, explains that the old closing
   command would have produced a false "the fix is broken" conclusion, and replaces it with a command
   that runs today. I ran the replacement; it works (§4).
5. **Concurrency NOT-PROVEN — CLOSED (struck).** `U5/handoff.md:198-201` records the reviewer's
   measurement (one 200, one 409, exactly one `auto_deduct`, stock 6) instead of an open unknown.

### U5 review §8 findings and §5/§7 notes

| item | disposition | my check |
|---|---|---|
| §8.1 `computeDiaryHash` seals only 5 fields | DECLARED DEBT + format-versioning proposal | Confirmed at `diary.ts:43-52`; untouched, correctly not changed inside this packet |
| §8.2 fractional consumption → 500 | DECLARED DEBT, measured, debt comment written at the write site | Reproduced at HEAD **and** at `8784cb065^`: pre-existing, rollback total |
| §8.3 `?? inv.currentQty` vs `inventory.ts:143` | CLOSED, and honestly labelled **dead-code** removal, not a live fix | Confirmed: live column NOT NULL, 0 NULL rows, 0 readers left |
| §8.4 misconfigured rules silently `continue`d | DECLARED DEBT, silence reduced, refuses to thread a logger through the ceremony on the fly | Fair; the CHECK proposal is the right home |
| §8.5 no unique index on `visit_diaries.visit_id` | DECLARED DEBT (PLAUSIBLE), not sold as proven | `pg_indexes` confirms; not reproduced by them, the U5 reviewer, or me |
| §7 `commissionPct "30.00"` etc. | DECLARED DEBT, untouched | Still at `diary.ts:372-376`; pre-existing, correctly not "fixed" by invention |
| §5 green that hides a broken cleanup | CONFIRMED and restated for future packets | Reproduced: my green run ALSO printed `✖ failing tests:` with a `patients_organization_id_organizations_id_fk` after-hook error in `portalOtp.test.ts` |
| §6 encoding / git hygiene | claimed clean | Verified independently (§6 below) |

**Packet brief item 5 (CHECK-constraint proposal, not a migration): DELIVERED.** Three concrete
`ALTER TABLE … CHECK` statements with pre-flight counts, in `V2/handoff.md` debt #3. `schema.ts`
untouched — it appears in none of the five commits. The brief's own inaccuracy about
`schema.ts:1523` is corrected with evidence rather than parroted (§2).

## 6. Encoding, git hygiene, debris

- Mojibake scan over all five commit messages AND their full diffs (`[РС][-ÿ]`, `вЂ`, `Ð?`
  families): **0 suspect lines out of 2229**.
- Every committed blob of the 14 touched files: **no BOM, 0 CRLF, 0 mojibake lines.**
- The builder's extraction dir `apps/api/src/_v2tmp/` is gone, as claimed.
- `git diff HEAD` on the three code files is EMPTY — I changed nothing and neither did anyone else.
- **Fixture debris from this packet: none.** Final read after two full-suite runs, three
  counterfactual suite runs, two probe runs, one live-HTTP proof run and one live rule probe:
  `inventory_items 0`, `procedure_material_rules 0` (`organization_id IS NULL`: 0), `visit_diaries 0`,
  `inventory_transactions 0`, `service_catalog_items 0`, `clinical_audit_logs 0`,
  `doctor_commissions 0`, fixture-named organizations **0**, `visits 10`, `patients 18`,
  `treatment_items 10`, `users 7`.
- **Not the packet's, stated so it is not charged to them:** the shared index is NOT empty right now —
  another session has staged `apps/api/src/db/{advanceDepositTaggings,digitalReceiptDispatches,
  kkmItemQuantityUnits,pricelistDoctorPayrolls}Query.ts` deletions plus four
  `apps/web/src/components/finance/*Widget.tsx`. None of those files is in any V2 commit. `apps/api/NUL`
  is back on disk (it breaks `rg` at the repo root) and `apps/api/.dente-data/` is untracked;
  both pre-existing.

## 7. NITS (none of these is rework; N1 and N2 want a follow-up packet)

**N1. The widening's cost is never named: a (service, item) pair that has BOTH an owned rule and an
org-less twin now deducts TWICE.** Measured by me at HEAD: stock 10 → **2** with two "−4" movement
rows, against 10 → 6 at `8784cb065^`. Why it is a nit and not rework: `routes/inventory.ts:387-394`
looks up the existing rule by `(serviceId, inventoryItemId)` **ignoring organization**, so the product
can never create the pair — it needs direct SQL, an import, or a migration; and it is no worse than
pre-U5 (`87e367c40^` had no organization predicate at all and matched both rows too). Why it still
matters: it is a MONEY-lane double deduction on a signed visit, it is the exact "closed one hole,
opened a smaller one" shape, and the packet — whose own selling point is that U5 shipped an
unmeasured cost — ships one and does not mention it. One-line hardening: deduplicate the matched rules
by `inventoryItemId`, preferring the row that is ours.

**N2. Nothing gates the containment claim.** `diarySigningCeremony.test.ts` creates exactly ONE
organization (`:277`), and no test anywhere in the repo asserts that an org-less rule cannot drain a
foreign clinic's shelf. The packet's central safety argument — "the cross-tenant leak U5 closed stays
closed" — rests entirely on manual measurement (the builder's and mine). If a later edit widens the
`inventoryItems` read the way this one widened the rules read, **nothing in the suite goes red**. The
packet added a gate for the two defects the spec named, then left its own riskiest change ungated.

**N3. The claimed full-suite green is not deterministic, and I hit the red.** My run 1:
`tests 974 / suites 158 / pass 973 / fail 1`, **exit 1**, failing
`src/speech/tests/storageRestoreCeiling.test.ts` → «общее число поднятых записей не растёт с числом
клиник», `0 !== 1`. That file passes 3/3 exit 0 in isolation, so it is a shared-database/parallelism
flake on a globally-scoped ceiling — the speech module is frozen and is in none of these commits, so
it is not V2's defect. My run 2 reproduced the claim exactly (974/974, exit 0). Consequence for the
record: "`npm test` exit 0" is a coin flip in this repo, and the U5 reviewer's warning about that exit
code should be read as stronger than "hidden after-hook error".

**N4. `U5/commitmsg.txt:26-28`, newly brought under version control by `40486bfa8`, still sells the
org-scoping as a pure win** («чтения правил материалов и позиции склада ограничены организацией
дневника») with no marker — while `647c7010e` added exactly such a marker to its sibling
`commitmsg2.txt` on the stated principle that a repo-resident record must not be read as truth. By the
builder's own record-correction list this is the "MISLEADING" sentence. Corrected in `U5/handoff.md:
110-118`, not flagged in the file that now lives in the repo.

**N5. The documented reproduction recipe points the next agent into the compiled source tree.**
`diaryDeductionProof.ts:19-23` instructs `git show 1f65d674b^:… > apps/api/src/_v2tmp/hist_diary.ts`.
`git check-ignore` matches `.tmp*/` but **not** `src/_v2tmp/`, and `apps/api/tsconfig.json` has
`include: ["src"]`, so a forgetful follower gets a second copy of `diary.ts` into `git add -A` and
into `tsc`. My shim-tree method needed no source-tree write at all; an `apps/api/.tmp…/` path in the
recipe removes the hazard.

**N6. `U5/handoff.md:25` typo inside a corrective sentence:** «Пустая полка отвергалась И ДО
**коммента**» — should be «коммита». In the one paragraph whose job is precision about the record.

**N7. `V2/state.md` "Files left on disk" omits `commitmsg5.txt`** — the file created by the very
commit (`c2d02c619`) that rewrote that section. Self-referentially one line stale.

**N8. "organizations 4 (baseline)" is not a baseline, and this is not the builder's fault.** The four
survivors right now are `Стоматология, 1 кабинет` (2026-07-27, real seed), `Демо-клиника для снимков`
(created 10:05 today at server boot) and `dce70000-…-0901` / `dce70000-…-0902` (created **10:09
today, during my own test runs**) — the last two are portalOtp/speech fixtures whose teardown
FK-fails, so the suite recreates and abandons them every run. The count is stable at 4 by
coincidence, not by cleanliness. The substantive claim (zero rows of *their* fixtures) holds.

## 8. What the lead should NOT re-derive

- The record correction is real, complete, and lands in every place the false claim is read: U5
  handoff (opening block + items 12-13 + «Коммит» + «Что изменено»), U5 state, U5 commitmsg2 marker,
  `diary.ts` comment, test comment, and a note addressed to the lead at the top of the V2 handoff.
- Commit `1f65d674b` really does describe a defect that does not reproduce at its own parent — the
  empty-shelf invariant test is GREEN at `0112f293e`.
- Both real defects of that commit reproduce at the parent, two independent ways: negative
  `quantity_to_deduct` → stock 10 → 16 with a positive `"6"` `auto_deduct` row; 0-rule → junk `"0"`
  movement row. The new cases go red there (`pass 6 / fail 3`). I watched all of it.
- The `||` → `??` no-op is proven at source (`PgNumeric.mapFromDriverValue = String(value)`,
  drizzle 0.45.2) and at the driver layer, and pinned by a test.
- The org-less-rule defect, its fix and its containment are measured on live data and over real HTTP,
  and the premise is now PROVEN through the product's own route: rules are created with
  `organization_id` NULL, and that route silently stores 1 when asked for 0 or −3.
- typecheck exit 0; unit 9/9 exit 0; full suite 974/974 exit 0 (on the second of two runs — see N3);
  encoding clean; git hygiene clean; no fixture debris; the self-declared `--amend` deviation is
  truthful (identical tree, message-only).
