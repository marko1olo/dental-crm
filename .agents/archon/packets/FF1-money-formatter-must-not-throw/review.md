# FF1 money-formatter-must-not-throw — adversarial review

Commit under review: `185f181ac580317ef1aae580eb962a6cf4858bfa`
Repo HEAD at review time: `ebee6a7afe7489a54c3bcf8257ecce932dcb4b18` (4 commits later)

**Rebase check:** `git diff --stat 185f181ac HEAD -- apps/api/src/documents/guards.ts
apps/api/src/documents/moneyTextMustNotThrow.test.ts` returned EMPTY. Both target files are
byte-identical between the reviewed commit and HEAD, and `git status --porcelain` on them is clean.
So every grep I ran at HEAD is a valid measurement of the reviewed commit. Good — this is the one
thing that could have invalidated the whole review.

---

## Check 1 — Did it miss a site? (MY OWN grep, not the brief's numbers)

I did not take the claimed inventory on faith. I enumerated EVERY template-literal interpolation in
guards.ts (`\$\{[^}]*\}`), then cross-checked against every currency token (`руб\.|₽|коп\.`) and
every money-to-string primitive (`kopecksToNumericString|parseKopecks|formatKopecksRu|toFixed|
toLocaleString|sumKopecks`), plus the non-template paths (`String(|.join(|+ "|" +|concat(`).

Full interpolation census in guards.ts — 15 lines total:

| line | interpolates | money? | state |
|---|---|---|---|
| 199 | `documentLabel`, `disallowedKeys.join()` | no — label + key names | raw, correct |
| 424 | totalPaidRub, selectedTotalKopecks | YES | `moneyRubText` + `moneyKopecksText` |
| 445 | `unknownPayloadReceipts.join()` | no — fiscal receipt numbers | raw, correct |
| 451 | `missingPayloadReceipts.join()` | no — fiscal receipt numbers | raw, correct |
| 540 | payment.amountRub, alreadyRefundedRub | YES | 2x `moneyRubText` |
| 544 | payload/payment/alreadyRefunded/refundable | YES | 4x `moneyRubText` |
| 545 | payload.amountRub, payment.amountRub | YES | 2x `moneyRubText` |
| 744 | `index + 1`, expectedTotalRub, line.totalRub | line no. + 2 money | `index + 1` left RAW (correct), 2x `moneyRubText` |
| 758 | totalAmountRub, linesTotalRub | YES | 2x `moneyRubText` |
| 772 | payloadTotalRub, facts.plannedAmountRub | YES | 2x `moneyRubText` |
| 783 | payloadTotalRub, facts.paidAmountRub | YES | 2x `moneyRubText` |
| 841 | remainingAmountRub, expectedRemainingRub | YES | 2x `moneyRubText` |
| 850 | installmentsTotalKopecks, remainingAmountRub | YES | `moneyKopecksText` + `moneyRubText` |
| 881 | payload.totalByActRub, payload.paidRub | YES | 2x `moneyRubText` |

**My numbers: 11 money-in-text sites exist; 11 are converted; 0 remain raw.** Matches the claim.
`sitesMissed` is empty and that is my own derivation, not an echo.

Corroborating negatives, each from a grep I ran myself:
- `kopecksToNumericString` survives at ONLY lines 89 and 104 — i.e. inside the two new helpers —
  plus line 21 (import) and line 74 (a doc comment). No message builder calls it directly any more.
- `parseKopecks` survives at exactly 4 non-helper sites: 52, 421, 846, 879. All four are
  comparison/arithmetic, not text. That is the "4 already correct" bucket, and it is 4 by my count.
- `formatKopecksRu`, `toFixed`, `toLocaleString`: ZERO occurrences in guards.ts. So the «руб. ₽»
  double-currency failure mode the brief warned about cannot occur here — grep for
  `руб\..*₽|₽.*руб\.` returns nothing.
- No money reaches a string by concatenation or `String()`. The only `.join()` calls (199/445/451)
  join label strings and fiscal receipt numbers.
- No English string in any message builder (`return \`[A-Za-z ]{12,}` → no match).

## Check 3 — Did it convert something that is NOT money? NO.

The three traps in this file were all avoided:
- **line 744 `${index + 1}`** — a line NUMBER, sitting in the same template literal as two real money
  values that DID get converted. This is the single most likely place to over-convert, and it was
  left raw. Correct.
- **line 954** — `input.taxYear` / `application.requestedTaxYear`, i.e. YEARS. Untouched. Had these
  been run through `moneyRubText` a year would have printed as `2025.00`. Correct.
- **lines 445/451** — fiscal receipt NUMBERS (identifiers, not amounts). Untouched. Correct.

No count, index, year, or identifier was converted.

## Check 2 — Did it touch a money COMPARISON? NO. Mechanically proven.

I did not eyeball this. I split the diff into removed (`^-`) and added (`^+`) lines and ran a
comparison/tolerance regex over each half: `===|!==|<=|>=|<|>|Equals|Math\.abs|Math\.round|epsilon|
tolerance|0\.01`.

- removed lines matching: **0**
- added lines matching: **0**
- **positive control** — same regex over the diff's CONTEXT (`^ `) lines: **18 matches**. The regex is
  live, so the two zeros are real measurements and not a silently-broken pattern.

Every comparison in the blast radius appears as an UNCHANGED context line, most of them sitting
directly above a rewritten message string:

```
 	return kopecks === parseKopecks(rub);                                    // line 52, moneyRubEquals
 	if (!moneyRubEquals(selectedTotalKopecks, payload.totalPaidRub)) {       // 421
 		if (refundableRub <= 0) {                                            // 539
 		if (payload.amountRub > refundableRub) {                             // 542
 			return alreadyRefundedRub > 0                                    // 543
 		if (Math.abs(line.totalRub - expectedTotalRub) > 0.01) {             // 743
 	const targetRub = Math.round(totalAmountRub * 100) / 100;                // 757
 	if (Math.abs(linesTotalRub - targetRub) > 0.01) {                        // 757
 		payloadTotalRub !== facts.plannedAmountRub                           // 771
 	if (facts.paidAmountRub > 0 && payloadTotalRub !== facts.paidAmountRub)  // 782
 	if (payload.remainingAmountRub !== expectedRemainingRub) {               // 840
 	if (!moneyRubEquals(installmentsTotalKopecks, payload.remainingAmountRub)) // 849
 		!moneyRubEquals(parseKopecks(payload.totalByActRub), payload.paidRub)  // 879
```

No epsilon introduced, no tolerance widened, no `0.01` added or removed, `moneyRubEquals` untouched.
The four `parseKopecks` sites that feed comparisons (52, 421, 846, 879) still call `parseKopecks`
NAKED — so corrupt money still throws on the comparison side, which is the required behavior. The
split is exactly right: **the arithmetic still throws, only the narration is made safe.**

`comparisonsTouched` = none. Not REVERT-grade.

## Check 4 — Would the test fail on revert? YES. Named assertion, and I measured the mechanism.

The test file `moneyTextMustNotThrow.test.ts` is NEW in this commit and tracked. It does not merely
unit-test the helper (which would be ceremony — a helper test passes whether or not the gate uses it).
It drives the real gate end-to-end.

**Assertion that breaks:** `moneyTextMustNotThrow.test.ts:125` — the `assert.doesNotThrow(...)`
wrapping `validateDocumentCreation(installmentInput(Number.POSITIVE_INFINITY), facts)` in test
«бесконечный остаток в графике рассрочки объясняется, а не роняет ворота».

Proof chain, with the empirical link measured by me rather than assumed:
1. The test at HEAD passes and asserts `decision.error` matches `/График рассрочки: остаток \?\.\?\?
   руб\./` — so control flow demonstrably REACHES guards.ts:841 for this input.
2. On revert, line 841 evaluates `kopecksToNumericString(parseKopecks(payload.remainingAmountRub))`
   with `remainingAmountRub === Infinity`. I ran that exact expression on that exact value:
   `REVERTED EXPR THROWS: Денежное значение не является числом: Infinity`
3. Therefore the reverted gate throws out of the message builder, `assert.doesNotThrow` at line 125
   fails, and lines 133/135/136 (`ok === false`, `statusCode === 409`, `?.??` text) are never reached.

Root cause independently confirmed at `packages/shared/src/utils/money.ts:57-59` — `parseKopecks`
throws on any non-finite number — and `:69-71` for non-money strings. The premise is real, not
narrative.

Two further things make the test non-ceremonial:
- Line 30-36 is a **control measurement** that pins the OLD behavior (`assert.throws` on
  `kopecksToNumericString(parseKopecks(NaN))` with the exact message). The test carries its own
  revert proof.
- Line 140-148 pins the exact WORKING string
  («остаток 900.50 руб. не совпадает с суммой минус предоплатой 1000.00 руб.») so the fix cannot
  quietly degrade a message that was already correct. Line 69-70 pins that the legitimate
  `null`/`undefined` → `0.00` path is NOT swallowed into `?.??`, which is the distinction the stub
  design rests on.

## Check 5 — Attribution: CLEAN

```
$ git log -1 --format=%(trailers) 185f181ac580317ef1aae580eb962a6cf4858bfa
(empty output)
```
- body grep for `co-authored-by|anthropic|claude|generated with` (case-insensitive): **no match**
- author: `marko1olo <marko1olo@users.noreply.github.com>`

## Sweeps

- **«руб. ₽» double currency:** none. `formatKopecksRu` has ZERO occurrences in guards.ts, so the
  decimal-string-vs-formatted-currency mixup cannot arise. `грep 'руб\..*₽|₽.*руб\.'` → nothing.
  (The `₽` at lines 463/464/532 are prose in existing comments, not message output.)
- **Second money helper:** none. `kopecksToNumericString` survives only at 89 and 104; both new
  helpers are pure `try/catch` wrappers around `@dental/shared`. `moneyKopecksText` correctly does NOT
  re-`parseKopecks` its input, and `kopecksToNumericString` still calls `assertWholeKopecks` first
  (money.ts:93), so non-integer kopecks yield `?.??` rather than a silently wrong number — pinned at
  test line 95.
- **No division introduced** into the money path (the JSDoc's stated reason for two entry points
  instead of one flag argument). Confirmed: no `/ 100` added.
- **Mojibake:** none. Diff grep for `Ð|Â|РІ|â€|Ñ` → no match; subject round-trips as valid UTF-8.
- **English reaching a user:** none. `return \`[A-Za-z ]{12,}` → no match in guards.ts.
- **"500 without text" premise:** verified, not taken on trust. `apps/api/src/routes/documents/
  create.ts` has NO try/catch around the validation call (or around the selection-error helpers
  evaluated as its arguments at lines 90-91), so the throw escapes to `app.setErrorHandler`
  (server.ts:325). `publicApiErrorMessage` (server.ts:226-233) suppresses any message matching
  `apiTechnicalErrorPattern`, and that pattern includes `\bNaN\b` (server.ts:201) — so
  «Денежное значение не является числом: NaN» is replaced by the generic 500 fallback. The commit's
  «превращался в 500 без текста» is *literally accurate* for the NaN case it quoted.

## Independent reproduction of all four claimed runs

| file | result | tracked in git? |
|---|---|---|
| moneyTextMustNotThrow.test.ts | tests 10 / pass 10 / fail 0, EXIT=0 | yes, new in this commit |
| moneyTextKopecks.test.ts | tests 4 / pass 4 / fail 0, EXIT=0 | **NO — untracked** |
| guards.test.ts | tests 22 / pass 22 / fail 0, EXIT=0 | yes |
| moneyExactKopecks.test.ts | tests 11 / pass 11 / fail 0, EXIT=0 | yes |

Every claimed number reproduced exactly. Nothing in the PROVEN list was unreproducible.

---

## Nits (none block; none are correctness defects)

**N1 — one cited proof file is not in git.** The PROVEN list calls `moneyTextKopecks.test.ts` "the
pre-existing tests". `git ls-files --error-unmatch` fails on it and `git log --oneline --all --` on
that path is EMPTY: it has never been committed to any branch. The 4/4 run is real (I reproduced it),
but it is disk state, not repo state, and will not survive a clean checkout. It is not this commit's
doing — mtime `2026-07-28 23:23:15` predates the commit by ~1h and it is the prior kopecks-in-text
cycle's orphan — but this commit cited it as durable evidence, which overstates the guard. Concretely
at risk: that file holds the ONLY assertions on the refund-path strings this commit rewrote
(«уже возвращено 900.13 руб.», «доступно 99.87 руб.», the `e-13` and `900.1299999999999` negative
checks at lines 98-103/119-121). Lead may want it adopted in a follow-up.

**N2 — end-to-end coverage is concentrated on one of the eleven sites.** Only line 841 gets gate-level
assertions (both the `?.??` path and the exact working string). Sites 424/540/544/545/744/758/772/
783/850/881 are covered only transitively via the two shared helpers. Because all eleven route
through the same two helpers the marginal value of ten more gate tests is low, so this is a nit — but
combined with N1 the refund path currently has no committed end-to-end guard at all.

**N3 — export surface is a mild footgun.** `moneyRubText`/`moneyKopecksText` are `export`ed, yet I
verified via repo-wide grep that the ONLY importer is the new test file — no production caller outside
guards.ts. Exporting a throw-SWALLOWING formatter from the same module that owns the money GATES
invites a future agent to reach for `moneyRubText` inside a comparison, where `?.??` collapsing to a
non-numeric string would mask corrupt money instead of halting on it. The JSDoc does warn
(«Сравнения этим не затронуты»), which mitigates it. Module-private helpers plus a test-only export
surface would close it entirely.

---

## VERDICT: SOUND_WITH_NITS

All five checks pass on my own measurements: no site missed (11/11 by my grep), no comparison or
tolerance touched (0 changed lines with operators, against an 18-match positive control), nothing
non-money converted (`index + 1`, `taxYear`, receipt numbers all correctly left raw), the test fails
on revert at a named assertion whose mechanism I measured, and attribution is clean. Every claimed
run reproduced. The nits are evidence-durability (N1/N2) and export hygiene (N3), not correctness.
Not REVERT: no comparison changed and no tolerance introduced.
