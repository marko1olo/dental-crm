# AA1-panel-contract-finish — ADVERSARIAL REVIEW

Reviewer: adversarial, did not write this code. Posture: disbelief.
Commit under attack: `dba665723784ad18ea55474309927eaf379c52c2`
Repo HEAD at review time: `eb9743c0a` (5 commits landed after AA1)

VERDICT: **NEEDS_REWORK** — documentation/evidence scoped only. The code is right; the
record is not. Nothing here is REVERT-grade.

---

## STEP 0 — DOES IT COMPILE (cheapest, most important)

`npm run typecheck -w @dental/web` at HEAD: TRUE_EXIT=1, **22 errors**.
- All 22 in `apps/web/src/components/schedule/scheduleDayGrouping.test.ts` (TS2532).
- **ZERO in any file AA1 touched.** Zero mentioning `panelStateText`, `PanelLoadFailure`,
  `notLoadedTitle`, `retryLabel`, `countLabel`.
- `git cat-file -e dba665723:.../scheduleDayGrouping.test.ts` -> **ABSENT**. That file did
  not exist in AA1's commit. The 22 are NOT AA1's.

The 11 dispatch-time errors that were AA1's assignment are gone. **`leadMustRun` #1 resolves
in AA1's favour.**

## STEP 0b — I ALSO CLOSED THE SECOND `leadMustRun` ITEM

`npm run test -w @dental/web` -> **TRUE_EXIT=0, tests 699 / pass 699 / fail 0.**
The builder listed this as unproven. It passes. Nothing in the suite regressed.

---

## PROOF AUDIT — every claimed command re-run, true exit captured (no pipe)

| Claim | My result | Verdict |
|---|---|---|
| `node --import tsx --test .../panelStateText.test.ts` 24/24 exit 0 | 24/24, fail 0, TRUE_EXIT=0 | CONFIRMED |
| full web suite (declared NOT proven) | 699/699, TRUE_EXIT=0 | CONFIRMED, better than claimed |
| `npm run typecheck -w @dental/web` (declared FORBIDDEN to builder) | 0 errors in AA1 files | CONFIRMED |
| `npm run smoke:web-text-encoding` exit 0, checkedFiles 421 | TRUE_EXIT=0, ok true, mojibakeHits 0, **checkedFiles 420** | CONFIRMED (count drift, see F7) |
| `git log -1 --stat` = 12 files, 482+/39- | exactly 12 files, 482 insertions, 39 deletions | CONFIRMED |
| contract closed: no `retryable` left | `git grep retryable HEAD` -> only 2 historical «БЫЛО» comments in apps/web; rest is `apps/api/src/speech/keyPool.ts` (unrelated `SpeechProviderRequestError`) + `.agents` docs | CONFIRMED |
| 10 production panels carry `notLoadedTitle` | 10 prod files + `panelStateText.ts` itself = 11 hits; WaitlistDrawer's 2nd hit is a **comment**, not a 2nd literal | CONFIRMED |
| ImagingView `countLabel` error does not exist | import at `ImagingView.tsx:101`, use at `:374`, export at `AppHelpers.tsx:2539`, all added by `e8f01692e`, which `git merge-base --is-ancestor` proves is an ANCESTOR of dba665723. ImagingView has no diff. | CONFIRMED — the brief ordered work that did not exist and the builder refused. Credit. |
| mojibake clean | 12/12 files valid UTF-8, no BOM, no U+FFFD, no mojibake (sanctioned round-trip). Subject renders correct Cyrillic. | CONFIRMED |
| FamilyWalletPanel rode into `db611bffb`, not AA1's commit | at `dba665723^` the file ALREADY had `notLoadedTitle` | CONFIRMED — honest disclosure |

## ATTACK 1 — WAS THE DEFECT REAL AT THE PARENT? (my own instrument)

I extracted `dba665723^:apps/web/src/lib/panelStateText.ts` and every parent subject literal
and **executed** the parent module. Not read — run.

**YES, REAL, and WORSE than the packet claims:**
- `WaitlistDrawer` -> «**Очередь ожидания не загружены**» — feminine singular noun with a
  plural predicate. Illiterate Russian, shipped.
- `FamilyWalletPanel` -> «**undefined не загружены: …**» — a literal JavaScript `undefined`
  on the dentist's screen. The panel had already been migrated to `notLoadedTitle` while the
  committed module still read `subject.title`. **Neither the lead's brief nor the packet found
  this.** It is the strongest justification for the fix and nobody claimed it.

Parent `retryable` was `true` on **every one of 601 failure statuses** — the "always true and
nobody read it" claim is CONFIRMED by execution, not assertion.

## ATTACK 2 — IS THE FIX REACHABLE, EVERY LINK?

Traced to a routed, mounted view. Not a dead file.
- `App.tsx:392` `lazy(() => import("./ScheduleView"))` -> ScheduleView -> `WaitlistDrawer.tsx:449`
  `<PanelLoadFailure subject={WAITLIST_SUBJECT}>` -> `PanelLoadFailure.tsx` -> `panelStateText`.
- `App.tsx:393` `lazy(() => import("./PatientsView"))` -> `PatientOverviewTab` ->
  `PatientArchiveAndBlacklistWidget.tsx:201` `<PanelLoadFailure … onRetry={reload} />`.
- PatientsView also mounts VisiographAnalyzer. 8 JSX call sites at HEAD, all typecheck-clean
  with `onRetry` now required — the compiler is the instrument, and it is green.

## ATTACK 3 — §3 NO-DEAD-END, EXHAUSTIVELY (not 15 hand-picked statuses)

Swept **null + 0..599 = 601 statuses**:
- `retryLabel === null` for exactly **4**: 400, 404, 413, 422. Matches the claim.
- **Dead ends (no button AND no next step in the text): 0.**
- Labels: `Повторить` (default/null/0/5xx/429), `Я вошёл — прочитать снова` (401/403),
  `Обновить` (409), no button (400/404/413/422).
- Digit or Latin leak into user-facing cause text: **0 of 601**.

Stronger than the builder proved. Invariant holds universally.

Two of my own suspicions I tested and **REJECTED** — recording them so nobody re-raises them:
- 400/422 «повторение не поможет, сообщите администратору» with no button is *coherent*; my
  first regex flagged it only because it matched the substring «повтор». Not a finding.
- 409's button «Обновить» beside «обновите страницу» — that string is pre-existing and
  unchanged by this commit, and is *more* coherent now than the old «Повторить». Not a finding.

## ATTACK 4 — DO THE TESTS ACTUALLY ASSERT? WOULD THEY FAIL IF REVERTED?

**Yes, live, not ceremony.**
- The parent module exports no `panelRetryLabel` at all -> the test file's import fails ->
  every test fails at load. Reversion is not survivable.
- `panelStateText не дописывает к названию НИ ОДНОГО своего слова` asserts exact equality with
  `` `${subject.notLoadedTitle}: ${requestFailureCause(status)}.` ``; the parent built
  `` `${subject.title} не загружены: …` ``. Cannot both hold.
- `панель с названием в единственном числе не получает «не загружены»` fires on the parent.
- The source scan carries a real anti-vacuity floor: `assert.ok(literals.length >= 9, …)`, so a
  broken scanner fails loudly instead of passing silently. That is better engineering than most
  of this campaign's charge sheet.
- Fixtures exist at HEAD; `SINGULAR_SUBJECT` is copied from a live panel.

## ATTACK 5 — §10 SHARED CONTRACT SYNCHRONY, and NO INVENTED VALUES

- No consumer anywhere still assumes the old shape (verified with `git grep` on the HEAD **ref**,
  a different instrument than the builder's working-tree `rg`).
- Return shape: HEAD `phase, title, hint, retryLabel`; parent `phase, title, hint, retryable`.
- No new money helper, no second reachability checker, no fabricated 0, no tenant UUID, no
  hardcoded hex/px, no invented default. The 8 hardcoded prices at
  `TreatmentEstimator.tsx:314-383` are **pre-existing** (AA1's diff on that file is 6 lines,
  contract-only) and correctly deferred to AA4.
- No `dist`, no `tsconfig.tsbuildinfo`, no `.data` in the commit. The 12 files are all
  panel-contract files; the foreign staged files were NOT committed — the pathspec held.

---

## FINDINGS AGAINST

### F1 — MEDIUM. The quoted defect does not reproduce at its own parent.
`apps/web/src/lib/panelStateText.test.ts:35` (and commit subject, commit body, packet REACHABILITY)

Four artefacts assert the dentist saw «**Статус блокировки записи не загружены**» from
`PatientArchiveAndBlacklistWidget`. Executed at the parent, that panel produced
«**Блокировка записи и черный список не загружены**» — a coordinated noun pair, where plural
agreement is legitimate Russian. The parent literal was
`title: "Блокировка записи и черный список"`. The string «Статус блокировки записи» is that
panel's `accusative` field, which feeds the *loading* title and never the failure title.

The defect class is real — I proved it in two other panels, one of them worse. This is
**mislabeled evidence, not a fabricated defect**. But it sits inside the packet's REACHABILITY
section, whose own words are "every link verified by reading the file", and it is the exact
charge-sheet pattern "a commit message describing a defect that does not reproduce at its own
parent". Origin is the LEAD's brief («Any singular name — «Статус» — produced «Статус не
загружены»»); the builder adopted it as verified instead of checking it, and baked it into a
test comment where it will outlive the packet.

### F2 — MEDIUM. An undisclosed user-facing button rode into this commit.
`apps/web/src/components/patients/PatientReclamationsWidget.tsx:225-250, :327-340`

AA1's commit carries another author's finished behavioural change: a new «+ Фиксировать» button
in the failure branch (so a failed READ no longer blocks WRITE), a second `<PanelLoadFailure>`
above the open form, and a flex layout change. The work is complete and compiles — this is not
half-finished code. The builder declared the sweep in its packet.

But the commit body's «ЧЕГО ЗДЕСЬ НЕТ» says «Формулировки не переписаны — переписано только
согласование», which is **false for this file**. The commit message is the artefact that
survives; git history will attribute an undisclosed new control to a text-agreement migration.
Per-file `git add` (§7a) genuinely could not split the hunk, so the choice was sweep-or-leave-
HEAD-red — but then the message had to say so.

### F3 — LOW, accurately pre-declared. 413 says «повторите» with no button to repeat with.
`apps/web/src/lib/panelStateText.ts:131`

Confirmed by my sweep. The builder's analysis is correct: `requestFailureCause` is shared with
`actionFailureToast`, where the wording is right; 413 on a panel GET is practically unreachable.
The one place the new one-decision rule and the text disagree. Not rework.

### F4 — LOW. ~115 lines of dead code added to a shared module.
`apps/web/src/lib/panelStateText.ts:216-329`

`SERVER_PARSED_DICTATION_CONTEXTS`, `serverParsesDictation`, `resolveDictationPhase`,
`isDictationResultEmpty`, `dictationEmptyHint`, `dictationComplexHint`,
`DICTATION_PARSING_TITLE`, `dictationFailureText` — **zero committed consumers**, verified by
`git grep` on the HEAD ref returning empty. §2 disallows this. Declared honestly by the builder.

For the lead: the consumer exists only as an **uncommitted** 47-insertion edit to
`apps/web/src/SmartParsePreview.tsx` (another agent, in flight). It goes live the moment that
agent commits — so this resolves itself or must be reverted as a pair, not in isolation.

### F5 — LOW. False supporting citation inside a code comment.
`apps/web/src/lib/panelStateText.ts` (dictation block doc comment)

The comment asserts of `apps/api/src/ai/localDictationParser.ts`: «слова «цена» и «прайс» в нём
не встречаются ни разу». **False** — «цена» appears at `localDictationParser.ts:156` and `:164`,
inside the payment-amount regexes.

The conclusion it supports IS true and I verified it independently:
`apps/api/src/routes/ai.ts:194` `z.enum(["schedule", "patient", "visit"])` and
`apps/api/src/ai/dictationParser.ts:3` `ParserContext = "schedule" | "patient" | "visit"`.
So a false detail decorates a sound conclusion. AA1 inherited the text but vouched for it
("mirrors a real server contract") — vouching is adopting.

### F6 — NIT. "All seven call sites" is right at the parent, wrong at HEAD.
7 JSX sites at `dba665723^`; AA1's own commit created an **8th**
(`PatientReclamationsWidget.tsx:336`, part of the F2 sweep). The packet's own inventory lists
eight positions while calling them seven. No behavioural consequence — the compiler proves all
8 pass `onRetry`.

### F7 — NIT. A measurement that no longer reproduces.
Smoke reports `checkedFiles` **420** today vs **421** claimed. Explained by intervening staged
deletions in the working tree (`FinancialDashboard.tsx` et al.), not fabrication. Flagged only
because the packet presents 421 as a measurement.

### F8 — NIT, currently vacuous. The new guard's coverage rests on a convention it does not enforce.
`apps/web/src/lib/panelStateText.test.ts:357`

The scanner keys on the literal marker `"PanelSubject = {"`. A subject declared WITHOUT the type
annotation — precisely what `WaitlistDrawer` deliberately did before this commit — is invisible
to it, and the `>= 9` floor would not notice an 11th unannotated panel. **Zero instances today**
(10/10 panels annotated, verified independently). A hardening note, not a defect.

---

## WHY NOT REVERT, WHY NOT SOUND

Not REVERT: no schema mass-conversion, no count field opened to fractions, no money field left
integer, no fabricated price, no deleted guard replaced by nothing, no tolerance hiding a
one-kopeck mismatch. The change strictly improves what reaches the screen, and I proved the
parent shipped a literal `undefined`.

Not SOUND: F1 is the campaign's named disease, present in four artefacts including the section
the packet labels "every link verified by reading the file". F2 leaves an undisclosed
user-facing control in git history under a body that explicitly denies changing anything but
agreement. Both are evidence defects in a cycle whose entire premise is that evidence defects
are the disease. The required rework is documentation only — **no source change is needed.**
