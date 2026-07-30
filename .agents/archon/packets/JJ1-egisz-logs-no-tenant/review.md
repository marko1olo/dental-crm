# JJ1-egisz-logs-no-tenant — adversarial review of 73c20dba9

Reviewer: adversarial, read-only. Did not write this code. Every claim below was re-derived by my own
command, not taken from the author's inventory.

## Scope mismatch, recorded first
My brief's five mandated checks are MONEY-formatting checks (guards.ts, formatKopecksRu, integer-kopeck
comparisons). This commit touches `apps/api/src/db/schema.ts`,
`apps/api/drizzle/0145_egisz_logs_organization_id.sql` and two packet docs. **No money file is in the
diff.** The author flagged this mismatch in their own inventory rather than inventing money conversions
to match the checklist — correct behavior. I ran all money checks anyway; results below.

## VERDICT: SOUND_WITH_NITS

Nothing REVERT-grade. No comparison changed, no tolerance introduced, no money touched at all.
Withheld from SOUND for one reason: **there is no regression gate** (no test added; both cited signals
behave identically on revert), plus a latent unapplied-migration hazard.

---

## Check 1 — Did it miss a site?

**Money (as literally mandated).** My own grep over `guards.ts` at HEAD:
- `rg -o '\$\{[^}]*(Rub|Kopecks|amount|price|total)[^}]*\}'` → **24 money interpolations, all 24 wrapped**
  in `moneyRubText` / `moneyKopecksText`.
- Raw hunt `... | rg -v 'moneyRubText|moneyKopecksText'` → **exit 1, zero raw sites.**
- Broader net, every `руб.`/`₽` line containing an interpolation, minus wrapped ones → **exit 1, zero.**

MY NUMBERS: **0 raw / 24 wrapped**, versus the brief's "11 raw + 4 correct at dispatch". That conversion
landed in OTHER commits — `guards.ts` is NOT in 73c20dba9 (`git show --name-only | rg guards` → exit 1).
Nothing was missed and nothing was this packet's to convert.

**This packet's actual site inventory (re-derived).**
- `apps/api/drizzle/0000_freezing_randall_flagg.sql:521-529` — `CREATE TABLE egisz_logs`, exactly 7
  columns, no `organization_id`. Confirmed by my own read. Unchanged by the commit (correct: applied
  migration, sha256-checked by the runner).
- `apps/api/src/db/schema.ts:1928` — declaration added. Table was previously undeclared.
- `rg "egisz_logs" --glob '!apps/api/drizzle/**'` → the ONLY hits repo-wide are the new declaration and a
  comment at `apps/web/src/components/integrations/egiszAvailability.ts:80`. **No code inserts into or
  reads this table**, so no call site needed updating and the new `NOT NULL` cannot break an existing
  write path. No site missed.

## Check 2 — Did it touch a money COMPARISON?

**NO.** Grep of every added line for `[<>]=?|===|!==|Math.abs|Math.round|epsilon|EPSILON|tolerance`
returns only false positives: `=>` arrows in `references(() => organizations.id)` and `<имя>` inside a
Russian comment. Whole-diff grep for `formatKopecks|kopeck|руб|₽|toFixed|amount|price|sum|total|cost|money`
→ **exit 1, no match anywhere in the commit.**

The gate is intact at HEAD, unmodified: `guards.ts:51-52`
`function moneyRubEquals(kopecks, rub) { return kopecks === parseKopecks(rub); }` — integer kopecks,
strict `===`, no epsilon. No tolerance introduced anywhere in this commit.

## Check 3 — Did it convert something that is NOT money?

**NO conversions of any kind in this diff.** Verified the specific traps:
- `guards.ts:744` `строка ${index + 1}` is still a bare line number, unwrapped. Correct.
- The only quoted literal added is `"Pending"` — an enum VALUE that matches DDL
  (`"status" "egisz_status_enum" DEFAULT 'Pending' NOT NULL`), not display text.

## Check 4 — Would its test fail if the fix were reverted?

**NO TEST WAS ADDED.** Stated plainly. The commit adds zero test files (`git show --stat`: schema.ts,
0145.sql, state.md, commitmsg.txt).

Both cited "signals" are ceremony with respect to this fix:
- `enumContractDrift.test.ts` — I ran it: `TRUE_EXIT=0`, tests 5 / pass 5 / fail 0. Reproduces the
  author's claim. But `rg -in 'egisz' apps/api/src/tests/enumContractDrift.test.ts` → **exit 1, no
  mention of egisz at all.** It passed before this commit and passes after. **No assertion in it can
  break on revert.**
- `smoke-schema-column-parity.mjs` — I ran it: `TRUE_EXIT=1`, and `rg -in egisz` on the output → exit 1,
  egisz_logs absent from the reported tables. Reproduces the author's claim exactly. But it is red either
  way from other packets' debt (patient_task_tickets, portal_otp_codes, …), and its own header states the
  reverse direction — column in DB but not declared — is explicitly **not** an error. Revert is invisible
  to it too.
- `rg -ln 'egiszLogs|egisz_logs' apps/api/src/tests/` → **exit 1. No test anywhere references this table.**

This is partly inherent: a census driven by drizzle declarations cannot detect a *missing* declaration.
But the outcome stands — the fix ships with no regression gate.

## Check 5 — Attribution

`git log -1 --format=%(trailers) 73c20dba9` → **empty** (1 byte, bare newline). Body grep for
`Co-Authored-By|anthropic|generated with|claude` → no match. Author `marko1olo
<marko1olo@users.noreply.github.com>`. **Clean.**

## Mandated sweeps

- **`руб. ₽` double-currency:** no hits. `formatKopecksRu` returns `1 234,56 ₽` (comma decimal, NBSP, ₽)
  and is NOT used in guards.ts; guards.ts uses `kopecksToNumericString` → bare `900.13` immediately before
  ` руб.`. Correct helper for the slot.
- **Second money helper:** none. `moneyRubText`/`moneyKopecksText` are thin wrappers over
  `parseKopecks`/`kopecksToNumericString` imported from `@dental/shared` (verified import block).
- **Mojibake:** none in subject, body, or content. Russian renders correctly throughout.
- **English reaching a user:** none. Added English is SQL keywords, drizzle API, and the stored enum
  value `"Pending"`.

---

## Findings worth ARCHON's attention

1. **Latent sequencing hazard (highest real item).** schema.ts at HEAD declares `organization_id` on
   `egisz_logs`, but 0145 is NOT applied. The parity script's own header states the rule: a column
   declared in schema.ts but absent from the table makes *every* `select()` on that table fail entirely.
   Today zero callers exist, so nothing breaks. The first agent to query `egiszLogs` before 0145 is
   applied gets total failure on that table. **Apply 0145 before first use.**

2. **Disclosed type-safety loss (accepted, precedent verified).** `status: text` means TS types it
   `string`, so `"sent"` typechecks and fails only at the DB; `transactionId: text` over `varchar(255)`
   means >255 chars typechecks and fails only at the DB. I verified BOTH of the author's justifications
   rather than taking them: `rg -c varchar apps/api/src/db/schema.ts` → **exit 1, zero occurrences**
   (schema.ts genuinely never imports varchar), and `family_groups.name` is genuinely `text("name")` over
   a `varchar(255)` column. The underlying debt is real: no `egiszStatusSchema` exists in `@dental/shared`,
   so nothing shared type-guards ЕГИСЗ status.

3. **Comment precision nit.** Migration step 3 says the FK is "как у соседей по домену
   (egisz_blank_permissions, external_schedule_action_logs)". Those neighbours have **no named
   organization FK in the SQL migrations at all** (rg for their constraint names → no hits). The parity
   holds at the ORM layer only — `egiszBlankPermissions.organizationId` is indeed
   `.references(() => organizations.id)` with no `onDelete`, matching exactly. Loosely worded about SQL,
   not false about intent.

4. **FK on-delete is consistent, not an oversight.** No `ON DELETE` clause = NO ACTION, matching every
   other `organization_id` FK in 0000 (drill_protocols, family_groups, generated_documents all
   "ON DELETE no action") and the drizzle neighbour. Deleting an org with journal rows now RAISES rather
   than cascading, which matches the stated intent. Deliberate and consistent.

5. **Migration mechanics — verified sound.** `migrate.ts:66-89` discovers `drizzle/*.sql` by directory
   scan sorted on the leading number; it does **not** use `meta/_journal.json` (dead legacy, 28 stale
   tags, documented at migrate.ts:12-14). So the hand-written 0145 **will** be applied, and its absence
   from `_journal.json` is harmless. 0145 is the correct next number (0144 is highest at HEAD and in the
   working tree). Idempotency claim holds by construction: ADD COLUMN IF NOT EXISTS, UPDATE guarded on
   IS NULL, DO block guarded on pg_constraint, SET NOT NULL a no-op when already set.

   Residual, explicitly NOT execution-proven: the file carries no `--> statement-breakpoint`, so
   migrate.ts sends it as ONE query inside an explicit BEGIN/COMMIT. The step-1-DDL-then-step-2-UPDATE
   ordering still resolves because Postgres raw-parses a simple-query string syntactically up front but
   analyzes/plans each statement immediately before executing it. That is my static reading of Postgres
   semantics — **I did not apply the migration** (read-only remit), and nobody should count it as applied.

6. **Severity calibration, honestly.** The tenant hole was real but unexploited: nothing reads or writes
   `egisz_logs`, so no cross-clinic leak has actually occurred. The fix is correct-by-construction and
   closes the hole before the table gets its first consumer. Claim it as "closed before use", not as
   "stopped a live leak".

## Claims I could not reproduce
None. All of the author's claimed proofs that were checkable without writing to the DB reproduced,
including both exit codes and the negative egisz grep on the parity output.
