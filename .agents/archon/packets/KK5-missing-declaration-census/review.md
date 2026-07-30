# Adversarial review — KK5 missing-declaration census
Reviewer: adversarial (did not write the code). Commit under review: 218e194d4 (HEAD=49ae30bbe).
Status: IN PROGRESS — written incrementally.

## 0. Scope reality check
Commit 218e194d4 touches ONE file: scripts/smoke-schema-missing-declarations.mjs (+95/-67).
The brief's FILES list also names the .test.mjs and state.md; those came from sibling commits
(3339ca1ce test, 49ae30bbe state.md). Reviewing the packet arc 920b19524..49ae30bbe.

The five mandated checks are written for a MONEY packet (guards.ts, formatKopecksRu, kopeck
comparisons). This packet is a schema-declaration census. I still ran each check to establish
applicability rather than taking the author's word for it. Results below.

## Check 1 — did it miss a money-in-text site? (my own grep, guards.ts at HEAD)
KK5 does not touch guards.ts at all (its 4 commits touch only the schema guard, its test, and
state.md). I re-derived anyway, per the brief.

My numbers at HEAD, apps/api/src/documents/guards.ts (1303 lines):
- money interpolations into user text: 22, ALL wrapped (20x moneyRubText, 2x moneyKopecksText)
- RAW money interpolations still in text: 0
- `rg --pcre2 '\$\{(?!moneyRubText|moneyKopecksText)[^}]*(Rub|amount|sum|total|paid|price|kopeck)…'`
  → no output
- wrapper-call arithmetic closes exactly: 26 total `money(RubText|KopecksText)(` matches
  = 24 in interpolations + 2 function definitions. No unaccounted call, no stray site.
- non-money interpolations left alone: `${documentLabel}` x5, `${index + 1}`, `${input.taxYear}`,
  `${application.requestedTaxYear}`, three `.join(", ")` lists.
VERDICT: sitesMissed = none. (Brief's "11 raw / 4 correct" describes an earlier dispatch state of a
DIFFERENT packet; at HEAD the file is fully converted by commits 185f181ac / d0c0d196d / a3f83ebeb.)

## Check 2 — money COMPARISON touched? NO.
`git show 218e194d4 | rg '===|!==|<=|>=|epsilon|tolerance|Math.abs|toFixed|0\.0'` on +/- lines → NONE.
The KK5 diff contains no comparison, no epsilon, no tolerance, no toFixed.
`moneyRubEquals` at HEAD is still `kopecks === parseKopecks(rub)` — integer kopecks, strict, no
epsilon. Not REVERT-grade.

## Check 3 — converted something that is NOT money? NO.
`${index + 1}` (guards.ts:744) is a line number and is still raw. Counts/years still raw. Nothing
non-monetary was pushed through a money helper.

## Check 5 — attribution: CLEAN.
`git log -1 --format=%(trailers) 218e194d4` → EMPTY (verbatim: empty string).
Same empty for 920b19524, 3339ca1ce, 49ae30bbe.
Body grep `-ci 'co-authored|anthropic|generated with|claude'` → 0 matches on all four.
Author on all four: marko1olo <marko1olo@users.noreply.github.com>.

## Sweeps
- `руб. ₽` / `₽ руб` across apps/ packages/ scripts/ → NONE.
- formatKopecksRu in guards.ts → not used (correct: decimal string belongs there).
- second money implementation → none; guards.ts imports parseKopecks/kopecksToNumericString/
  sumKopecks from `@dental/shared` only.
- mojibake in KK5 diff/subject → none found; Russian renders correctly.
- English string reaching a user → none in the KK5 diff (script is a dev guard, all output Russian).

## Check 4 — would the test fail if the fix were reverted? NO. Named assertion: NONE.
Decisive, non-mutating proof:
- `git diff --stat 3339ca1ce HEAD -- scripts/smoke-schema-missing-declarations.test.mjs` → EMPTY.
  The test file is byte-identical between 3339ca1ce and HEAD.
- 3339ca1ce is the PARENT-side commit: it PREDATES 218e194d4 in the log
  (920b19524 guard v1 → 3339ca1ce test → 218e194d4 this fix → 49ae30bbe state.md).
- `git show 218e194d4^:scripts/…mjs | rg -c 'sinceFileProblem|MIGRATION_FILES'` → 0.
  Both were introduced BY this commit.
⇒ The identical 5 assertions passed against the guard that carried the FALSE reasons and no
`since` field, and pass against the corrected one. `node --test` at HEAD: tests 5 / pass 5 / fail 0
(I ran it). No assertion breaks on revert. The commit's own proof of the new check ("since с
несуществующей миграцией валит прогон") was a manual edit-then-revert; nothing was left on disk.
`rg -i 'since|провенанс|миграц' <test>` → 1 hit, and it is `_dente_migrations` in an unrelated
assertion. The new provenance check has ZERO automated coverage.

## Finding — sinceFileProblem cannot detect a WRONG `since`, only a deleted file
I executed the SHIPPED function text (extracted from the file, real MIGRATION_FILES set):
  ACCEPTED  truthful since for analytics_snapshots (0000_freezing_randall_flagg.sql)
  ACCEPTED  0008_add_settings.sql  ← 0008 does NOT create analytics_snapshots
  ACCEPTED  the LAST migration in the tree
  REJECTED  0006_removed_by_squash.sql (nonexistent)
  REJECTED  missing since / permanent WITH since
The docstring at scripts/smoke-schema-missing-declarations.mjs:92-93 claims the check means the
provenance "не превращается в невидимое вранье при пересборке миграций". It does not: any existing
.sql filename passes. The stronger check is cheap — my own probe verified all 18 tables against all
103 migrations in well under a second (regex CREATE TABLE for that exact table in that exact file).

## Finding — the corrected header carries a WRONG number: "15 таблиц" should be 14
scripts/smoke-schema-missing-declarations.mjs:24 and the commit body both say
"15 таблиц — той же миграцией 0000". My independent derivation: 14 of the 18 ledger tables are
created by 0000. The other four: clinic_workflows→0008, signed_outpatient_cards→0002,
ztl_lab_orders→0006, treatment_plan_stages_auto_archive→0067. The author's OWN probe3.log lists
exactly those 14. `egisz_logs` is also created by 0000 but is declared and is NOT in the census, so
15 is only reachable by counting a table outside the census. In a commit whose stated thesis is
"ложная причина хуже отсутствующей", a wrong count in the corrected header is in scope.

## Finding — commit overclaims: "каждая запись теперь называет миграцию в поле since"
Measured: 18 `since:` fields, ALL inside `undeclaredTables`. `since` occurrences inside the
`undeclaredColumns` block: 0. So 134 of the 152 ledger items (34 table entries) have no provenance
field and no provenance check — only a prose assertion "колонки создают миграции репозитория
(проверено по всем 134 колонкам переписи KK5)". I verified that assertion is TRUE today (below),
but nothing keeps it true; it is exactly the rot `since` was added to prevent.

## Finding — the guard is wired to NOTHING; it cannot go red
- `rg 'missing-declarations' package.json` → zero references.
- `scripts/run-smoke-suite.mjs` selects work by enumerating package.json scripts prefixed `smoke:`.
  Both siblings ARE wired: `smoke:schema-ddl-coverage`, `smoke:schema-column-parity`. This one is not.
- The test is unwired too: root `test` = workspace tests only; nothing runs `scripts/*.test.mjs`
  (`scripts/census-hollow-query-modules.test.mjs` is unwired the same way — pre-existing pattern).
Tension worth deciding out loud rather than by omission: the guard exits 2 without a DB BY DESIGN,
so adding it to `smoke:all` reddens any DB-less runner. That is a real trade-off; silence is not a
resolution.

## What I independently REPRODUCED (author's claims that hold)
- `node scripts/smoke-schema-missing-declarations.mjs --json` → exit 0, failures 0,
  {tablesInDatabase:148, tablesDeclared:129, undeclaredTables:19, undeclaredColumns:134,
   ledgerTables:19, ledgerColumnTables:34, columnNamesTakenFromKey:0}
- My own direct DB count (read-only, URL never printed): public BASE TABLE = 148, VIEW = 0.
- 129 declared = 126 (schema.ts) + 2 (communicationsSchema.ts) + 1 (patientsSchema.ts) pgTable
  calls. No duplicate table name, no fourth file declaring pgTable anywhere in apps/api/src.
- None of the 19 ledger tables is declared as a pgTable anywhere in the repo — census not overstated.
- **since provenance: 18/18 match my own first-creator derivation**; `_dente_migrations` has NO repo
  DDL, confirming the single `permanent` exception. The pre-fix reason ("appeared outside the repo
  — push/manual SQL/dump") was genuinely FALSE. The correction is real.
- **column provenance: 134/134 have repo DDL** (my own parser over 826 statements from 103 .sql
  files; CREATE TABLE blocks + ALTER TABLE ADD COLUMN). My first three attempts reported 62/21/3
  missing — all three were MY tooling bugs (heredoc collapsing `\s`, and drizzle's inline
  `;--> statement-breakpoint`). Corrected run: 0 missing. The author's probe2 claim is right.
- `_dente_migrations` rows 103 = 103 migration .sql files.
- `node --test scripts/smoke-schema-missing-declarations.test.mjs` → 5/5 pass.
- Header claims about the neighbours verified VERBATIM: column-parity's header says the reverse
  direction "ошибкой не считается: это нормально"; ddl-coverage checks the opposite direction
  (declared but no DDL). Neither covers this class. The guard's reason for existing is true.

## VERDICT: NEEDS_REWORK
Not REVERT — no money comparison changed, no tolerance introduced, nothing non-money converted,
attribution clean, and the central factual correction is real and independently reproduced.
Rework because: (1) the test suite is byte-identical across this commit and therefore proves
nothing about it; (2) the new `since` check cannot detect the error class it is named for;
(3) the corrected header ships a wrong count (15 vs 14); (4) the message overclaims `since`
coverage that 134 of 152 ledger items do not have; (5) nothing in the repo runs the guard.
