# ADVERSARIAL REVIEW — S4-panoramic-claim — FINAL

Reviewer: adversarial (did not write the code). Posture: disbelief.
Specification: `.agents/archon/packets/R2-panoramic-rework/review.md`, read COMPLETE (PART 1 table, PART 5 F1-F5, PART 6 1-5).
Authority read complete: `.agents/AGENTS.md`, `.agents/INDEX.md`.
Not penalised: §11 `madge` (absent), biome (absent, would reformat the repo).

Packet commits (`git log --oneline -- .agents/archon/packets/S4-panoramic-claim apps/web/src/tests/panoramicArchVsCornerstone.test.ts`):
```
2e5516e3b  test(снимки): цена отказа от polyline измерялась по кривой, которой в продакшене не бывает
44bcd3327  test(снимки): доля обратного прохода считалась по одной кривой, а обход шёл по другой
ef5f57287  test(снимки): величина, доказывающая негодность открытой базы, в прогоне не печаталась
1155d9c7d  docs(снимки): в сдаче R2 стояло число, измеренное против кривой, которой не бывает
585ef4157  docs(снимки): сдача S4 ссылалась на HEAD, которым он уже не был
90576447b  docs(снимки): в поправках к R2 остались число тестов от прошлого прогона и округление
87bf14e98  docs(снимки): сдача S4 обещала «четыре хеша», а коммитов пакета стало шесть   <- named in my brief
```
Repo HEAD at review time is `c17243a47`, two commits past `87bf14e98`, both other packets (S5, S6).

**VERDICT: SOUND_WITH_NITS.** The central claim reproduces exactly. Every numbered item of the
specification is closed, honestly declared as debt, or explicitly out of scope with a closing command —
none is silently ignored. The nits below are real record inconsistencies of the packet's own disease
class; none of them touches a clinical number and none justifies another cycle on its own.

---

## PART 1 — PROOF AUDIT (every claimed command re-run, same command, true exit code)

| Claim | Result |
|---|---|
| `node --import tsx --test apps/web/src/tests/panoramicArchVsCornerstone.test.ts` -> `tests 16 / suites 5 / pass 16 / fail 0`, TRUE_EXIT=0 | **REPRODUCES.** `tests 16 / suites 5 / pass 16 / fail 0 / duration_ms 3609.5533`, TRUE_EXIT=0 captured before the pipe. |
| The 30-odd printed figures of CLAIMED PROVEN #2 | **REPRODUCE TO THE LAST DECIMAL.** archHandles(7): `closed pts=148 split=126`, `closed FULL 154.2189`, `SEEN arch 97.9939`, `wrap 21 pts / 56.2250 mm = 36.5 %`, `open 90.8752`, `mixed 41.1 %`, `reconstruction 90.8755 cols=361`, `shortfall 7.26 %`, `col->SEEN 4.0081`, `col->OPEN 0.0138`, `col->OPEN VERTEX 0.3731`, `half-spacing 0.3606`, `closed-vs-open 4.5634`. TRACED_ARCH: `156.5652 / 99.1526 / 57.4126 = 36.7 % / 91.6719 / 41.4 % / 91.6748 cols=365 / 7.54 % / 4.0460 / 0.0172 / 0.3776 / 0.3638 / 4.6369`. Analytic: `91.1333 / 3.6448 / 0.5802`. Not one digit differs. |
| `npm test -w @dental/web` -> `tests 454 / suites 82 / pass 454 / fail 0`, EXIT=0 | **REPRODUCES.** `tests 454 / suites 82 / pass 454 / fail 0 / duration_ms 4089.6795`, SUITE_EXIT=0. |
| `npm run typecheck -w @dental/web` -> EXIT=1 with **exactly six** `DocumentsView.tsx … TS2304 Cannot find name 'AnamnesisField'`, zero on the builder's files | **REPRODUCES.** `TYPECHECK_EXIT=1`, the six errors at `2178,2185,2193,2224,2232,3082` and nothing else. Plain `npx tsc -p tsconfig.json --noEmit` gives the identical six (so it is not a `tsc -b` early-bail hiding others). |
| The red gate is another agent's in-flight edit, not the builder's | **CONFIRMED.** `git status --short` -> ` M apps/web/src/DocumentsView.tsx`; `git grep -c AnamnesisField HEAD -- apps/web/src/DocumentsView.tsx` -> **not found in HEAD**; the worktree copy has 6 occurrences. Uncommitted foreign work. |
| The new file is really in the checked program | **CONFIRMED.** `npx tsc -p tsconfig.json --noEmit --listFilesOnly` lists `apps/web/src/tests/panoramicArchVsCornerstone.test.ts`. |
| Library citations (CLAIMED PROVEN #6) | **ALL EXACT.** `apps/web/node_modules/@cornerstonejs/` -> `tools` only. Root `core/dist/esm/types/IViewport.d.ts:33` = `export interface ViewReference {`, `:41` = `    viewPlaneNormal?: Point3;`. `cache/cache.js:214` = `this.getImage = (imageId, minQuality = ImageQualityStatus.FAR_REPLICATE) => {` with a bare `return;` on cache miss. `enums/ImageQualityStatus.js:3-7` = `1 / 3 / 6 / 7 / 8`. `apps/web/src/mprMath.ts:65-74` = `new Float32Array(src.length)`. |
| Fixture identity (CLAIMED PROVEN #7) | **EXACT.** `panoramicArch.test.ts:90-97` is `archHandles(count)` with `t = (i/(count-1))*PI`, `[-28*cos t, 30*sin t + 11, -42.5]`. `:32-40` `TRACED_ARCH` matches `TRACED_HANDLES` value for value with Z dropped. |
| ENCODING (CLAIMED PROVEN #8) | **REPRODUCES.** First three bytes of every file the packet wrote are not `EF BB BF`. `rg '[\x{0420}\x{0421}][\x{0080}-\x{00FF}]|\x{FFFD}'` over both packet dirs and the test: zero hits. All twelve commit subjects in the range clean; scope codepoints `U+0441 U+043D U+0438 U+043C U+043A U+0438` = «снимки». |
| GIT HYGIENE (CLAIMED PROVEN #9) | **REPRODUCES for the observable half.** Per-commit file lists are exactly the claimed 12 touches, one author, no churn. "Index was empty before each of the seven commits" is not retrospectively verifiable; the index is empty now and no commit contains foreign work, which is the checkable consequence. |
| `apps/web/package.json:10` glob claim | **EXACT.** `"test": "node --import tsx --test \"src/**/*.test.ts\" \"src/**/*.test.tsx\""`. |

### Proof the builder did NOT claim, which I ran anyway

**The new test file discriminates.** The builder claimed nothing about discrimination; a test-only
packet lives or dies on it. I extracted `b4292f74d^:apps/web/src/components/dicom/panoramicArch.ts`
(the pre-fix module, its only import is a type, so it runs standalone) and drove both modules with the
identical closed cornerstone polyline:

```
HEAD   status ready lengthMm  90.8755 cols 361
PREFIX status ready lengthMm 154.2037 cols 618
SEEN arch len 97.9939
HEAD   shortfall   7.26%  assert(0.06<sf<0.09)=> PASS | maxdev  4.0081  assert(3.5<d<4.5)=> PASS
PREFIX shortfall -57.36%  assert(0.06<sf<0.09)=> FAIL | maxdev 27.9562  assert(3.5<d<4.5)=> FAIL
```
Both load-bearing assertions fail against the pre-fix module. The withdrawn-figure guard
(`deviationMm > 1`) also fails there. Real discrimination, and the deviation metric I used is my own
implementation, not the file's helpers.

**The 36.5 % column share, verified by counting columns instead of arc length.** The builder derived it
from arc length. I projected each of the pre-fix module's actual 618 output columns onto the closed
polyline and counted those past the split: **225 / 618 = 36.4 %** (arc-length share 36.5 %). The claim
holds by a second, independent method, and R2's withdrawn 40.8 % is confirmed as the mixed baseline —
`(closed − OPEN)/closed = 41.1 %` on the repo's fixture.

**The analytic ground truth is a ground truth.** Semi-ellipse a=28 b=30 by Simpson with 2,000,000
intervals = `91.133272`; Ramanujan/2 = `91.133272`. The test's `91.1333` is correct to four decimals,
and the fixture handles all sit on that curve (`< 1e-6 mm`).

---

## PART 2 — HYPOTHESES ACTUALLY TESTED

**H1 — was the defect real before the packet? CONFIRMED.** The withdrawn sentence is at
`1155d9c7d^:R2/handoff.md:68-70` verbatim («Цена отказа от polyline измерена и мала: 91.9670 мм против
91.9684 мм …0.3879 мм — меньше двух вокселей КЛКТ») and at `1155d9c7d^:R2/state.md:70-71`. The false
JSX sentence is at `1155d9c7d^:R2/handoff.md:94`. The unreproducible probe digits are at
`1155d9c7d^:R2/handoff.md:30-31` and `:121-122`. Every historical line number the packet cites is
exact — I checked all five.

**H2 — reachable, or dead code sold as a fix? CONFIRMED LIVE, traced myself at HEAD.**
`AppRouter.tsx:36-37 React.lazy(() => import("./ImagingView"))` -> `:75 <ImagingView />` ->
`ImagingView.tsx:833 <DicomArchiveUploader onImagesLoaded={setLocalImageIds} />` ->
`:503-504 localImageIds.length > 0 ? <Cornerstone3DViewer imageIds={localImageIds} />` (the second mount
at `:509` is inside `opacity-50 pointer-events-none` at `:508`, dead) ->
`Cornerstone3DViewer.tsx:492 onClick={handleGeneratePanorex}` under the «Развернуть» literal at `:495`
-> `:282 buildPanoramicArch(annotations)` -> `panoramicArch.ts:491-495` closed-contour branch, and
`:305-321 readVolumeScalarData`. Banner consumer `:407 panoramicReadyLabel`. All eight line citations
land on exactly what is claimed. The deliverable itself is a record correction plus a test — not
user-facing — and the packet says so rather than dressing it up.

**H3 — holds on real data, or fixture-only? HONESTLY BOUNDED.** The baselines are built by the
installed `splines.CatmullRomSpline` from `@cornerstonejs/tools` 5.1.3, not a reimplementation — that is
as close to real as anything without a CBCT archive. No real-series claim is made; НЕ ПРОВЕРЕНО #1
states exactly what is unknown (uneven molar point spacing) with a DevTools closing command that names
the two annotation fields to capture. No cycle-2 shape: the annotation the test feeds
(`metadata.viewPlaneNormal`, `data.handles.points` as world triples, `data.contour.polyline` + `closed`)
is the same structural shape `DrawnArchAnnotation` (`panoramicArch.ts:32-59`) declares and the live call
site passes.

**H4 — hollow facade / magic constant / fabricated default? DISPROVED for substance, one tautology.**
No `{success:true}`, no placeholder, no hardcoded port/UUID/hex/px. `ANALYTIC_SEGMENTS = 20_000` is
justified against Ramanujan and I confirmed convergence. The one hollow assertion is
`assert.ok(digest.length > 0)` in the digest test — see nit N5.

**H5 — second owner? DISPROVED.** No production code changed. `panoramicArch.test.ts` does not import
cornerstone; the new file is the only test in the suite that does, so the two files measure different
things rather than duplicating one. `polylineLengthMm` was already exported and used in production.

**H6 — `useAppLogic.tsx` return field deleted/renamed? DISPROVED.** Not touched by any of the seven commits.

**H7 — listener / interval / handle without teardown? DISPROVED.** Test-only file, no timers, no subscriptions.

**H8 — deleted or renamed file still referenced? NOT APPLICABLE.**
`git log --diff-filter=DR --name-status 2e5516e3b^..87bf14e98` is empty.

**H9 — undeclared Russian literal / hardcoded hex / static px? DISPROVED.** The only Cyrillic the new
file contains is inside comments quoting the withdrawn record. No user-facing string added.

**H10 — mojibake? DISPROVED.** Files, packet dirs and all twelve commit subjects clean.
(Caveat for the next reviewer: Cyrillic patterns passed to `rg` through Git Bash on this box are
unreliable — one of my greps silently returned zero on a phrase that is present. Use a Latin anchor
or a pattern file.)

---

## PART 3 — GIT HYGIENE: CLEAN

```
2e5516e3b  apps/web/src/tests/panoramicArchVsCornerstone.test.ts
44bcd3327  apps/web/src/tests/panoramicArchVsCornerstone.test.ts
ef5f57287  apps/web/src/tests/panoramicArchVsCornerstone.test.ts
1155d9c7d  R2/handoff.md  R2/state.md  S4/{commitmsg,commitmsg2,commitmsg3,commitmsg4}.txt  S4/handoff.md  S4/state.md
585ef4157  S4/commitmsg5.txt  S4/handoff.md
90576447b  R2/handoff.md  S4/commitmsg6.txt
87bf14e98  S4/commitmsg7.txt  S4/handoff.md
```
Exactly the claimed 12 touches, one author (`marko1olo`), nothing else.
`git log --name-only 2e5516e3b^..87bf14e98 | rg 'apps/api/dist|\.data/|tsbuildinfo|scratch/'` -> nothing.
`git diff --cached --name-only` -> empty.

Trap checked and cleared: `git diff --stat 2e5516e3b^ 87bf14e98` shows `apps/web/src/AppHelpers.tsx | 21 +-`,
which looks like swept-in foreign work. It is not — it belongs to the interleaved telegram commit
`3c5189471`, and appears in none of the seven S4 commits.

Conventional Commits, Russian subjects that name the DEFECT and not the patch (three `test(снимки)`,
four `docs(снимки)`). Bodies explain WHY, including why the geometry was deliberately left alone. §12
compliant. Seven commits for one packet is more than ideal, but four of them are the builder catching
their own record drift, which is the behaviour this campaign wants.

---

## PART 4 — SPECIFICATION ITEM BY ITEM

### R2 review PART 6 (the required rework)

| Item | Builder | My verdict |
|---|---|---|
| **1.** Re-measure against the CLOSED rendering; replace `0.002 % / 0.3879 mm / "under two voxels"` in `handoff.md`, `state.md` and the packet record; record the control points | CLOSED | **CLOSED, VERIFIED.** `R2/handoff.md:74-85` and `R2/state.md:77-89` carry the withdrawal and the real figures. `rg` over the whole tree: `0.3879`, `91.9670`, `91.9684` survive nowhere except the new test's own explanatory comments, where they are labelled withdrawn. Control points are a generator formula plus a verbatim copy — I re-derived every digit from them. The third place (CLAIMED PROVEN #6) genuinely is a message to the lead with no disk representation; the builder says that rather than claiming three edits. **One stale number left inside the replaced state.md block — nit N1.** |
| **2.** Add the missing argument and measurement (reconstruction is closer to the true arch; the panorama is deliberately not sampled on the on-screen curve; the banner sits ~7 % below) | CLOSED | **CLOSED, VERIFIED.** `R2/handoff.md:87-93` «Почему геометрию всё равно не надо менять»: 0.5802 mm vs 3.6448 mm, closed rendering overshoots 7.5 %. I reproduced all three numbers and cross-checked the ground truth two independent ways. No code changed, as ordered. |
| **3.** Retract «в JSX русских литералов не осталось»; list the survivors as debt next to #7; state that the commit body cannot be rewritten | CLOSED | **CLOSED, VERIFIED.** Retraction at `R2/handoff.md:116-119` and ПОПРАВКИ item 2 (`:274-283`); debt #10 (`:366-373`) lists `:427, :444, :463, :495, :558` as JSX text nodes plus `:236, :387` via state plus `:233` in `console.error`; I printed all eight lines at HEAD and every one is as described. `:281-283` states plainly that the false sentence survives forever in `b4292f74d` because history on a pushed branch is not rewritten. Line-citation drift — nit N3; novelty overclaim on `:233` — nit N4. |
| **4.** Declare the full-volume double copy as debt, with the arithmetic | CLOSED as debt #8 | **CLOSED, VERIFIED.** `R2/handoff.md:344-353`. Arithmetic checks: 512·512·400 = 104,857,600; Int16 = 209,715,200 B ≈ 210 MB; Float32 = 419,430,400 B ≈ 420 MB; ~630 MB per click. `mprMath.ts:71` really is `new Float32Array(src.length)`. Closing command is a real DevTools measurement. |
| **5.** Note that `isSliceDecoded` accepts any `ImageQualityStatus` incl. `FAR_REPLICATE` and does not check `image.voxelManager` | CLOSED as debt #9 | **CLOSED, VERIFIED.** `R2/handoff.md:354-365`. Both halves stated. `Cornerstone3DViewer.tsx:313` is the predicate; `cache.js:214` is the defaulted signature; the enum values are 1/3/6/7/8; `rg "imageRetrieve|IMAGE_RETRIEVE|ProgressiveRetrieve" apps/web/src/` -> zero, so "not live today" is verified rather than assumed. |

### R2 review PART 5 (new findings)

| Finding | Builder | My verdict |
|---|---|---|
| F1 MEDIUM — cost measured against an impossible curve | CLOSED | **CLOSED.** Withdrawn in full, not softened; re-derived against two existing baselines; pinned by 16 executed tests that fail against the pre-fix module. |
| F2 MEDIUM — «литералов не осталось» is false and is in a commit body | CLOSED in the record, not in code, deliberately | **ACCEPTED.** Refusing to move production literals inside a "fix the record" packet is the correct call; the review itself forbade churn here. Declared as debt #10 with a longer list than the review's. |
| F3 LOW — the two runtime probes are not reproducible as quoted | CLOSED | **CLOSED, AND EXCEEDED.** Digits withdrawn, substance kept, replaced with asserted fixture values. Beyond the review: the builder found 40.8 % was itself mixed-baseline and corrected it to 36.5 % / 36.7 %. I verified that correction by counting output columns, not just arc length. |
| F4 LOW — half-decoded guard accepts a replicated frame | DECLARED DEBT #9 | **ACCEPTED.** |
| F5 LOW — newly reachable full-volume double copy undeclared | DECLARED DEBT #8 | **ACCEPTED.** |
| PART 5 "not a defect, recorded so nobody re-litigates it" | not disputed | **ACCEPTED.** |

### Carried C5 items (re-verified by me at HEAD, not read off the handoff)

| Item | My verdict |
|---|---|
| 1. closed contour / wrap-around | **CLOSED.** `panoramicArch.ts:491-493` reads `data.contour.closed === true`, `:223-236 polylineReturnsToStart` is the geometric barrier. The new test drives the closed path end to end. |
| 2. `getScalarData()` throw -> `volume_not_ready` | **CLOSED.** `panoramicArch.ts:583-599 readWithoutThrowing`, `:619-656 readVolumeScalarData`, call site `Cornerstone3DViewer.tsx:305-321`. |
| 3. success banner in the refusal dictionary | **CLOSED.** `panoramicArch.ts:176-181`, consumed at `Cornerstone3DViewer.tsx:407`. |
| 4. `archSummary` cleared in `onClose` | **CLOSED.** `Cornerstone3DViewer.tsx:521-527`, `setArchSummary(null)` at `:526`. |
| 5. `@cornerstonejs/core` citation path | **CLOSED.** Verified at both paths myself. |
| 6. cornerstone handedness | **OWNED IN CODE** by `orientArchPatientRightFirst` (`panoramicArch.ts:257-267`, smallest world X first, Y tie-break); the on-screen patient side stays НЕ ПРОВЕРЕНО with a closing command. Not silently claimed. |
| H5.1 second dictionary | **ACCEPTED**, not re-litigated. |
| H5.2 `interpolateSpline` lying docstring, 0 callers | **STILL DEBT, and still true.** `mprMath.ts:76-78` promises Catmull-Rom, `:79` starts a linear-subdivision body; `rg interpolateSpline` finds only the two definitions (`mprMath.ts:79`, `utils/math/mprMath.ts:394`) and no caller. |

**Nothing silently ignored. Nothing disputed without evidence. Every previously-false statement I could
locate on disk is corrected at the line where it lived.**

---

## PART 5 — NITS (no functional defect found; these are record-accuracy items)

### N1 (LOW-MEDIUM) — the packet's own stale test count survives in the file PART 6 named

`.agents/archon/packets/R2-panoramic-rework/state.md:84`:
> `pinned by \`apps/web/src/tests/panoramicArchVsCornerstone.test.ts\`, **15 tests**, EXIT=0:`

The file has 16 tests and every run — the builder's and mine — prints `tests 16`. Commit `90576447b`
exists for exactly this defect: it fixed «15 тестов» -> 16 in `R2/handoff.md:151` and `:251`, and left
the second copy in `R2/state.md:84`, inside the very block PART 6 item 1 ordered rewritten.
`S4/handoff.md:242` describes that commit as «"15 тестов" -> 16» without noting a survivor, and
`S4/handoff.md:193` claims «заменено в обоих файлах». The figures were; this count was not. One line.

### N2 (LOW) — the corrected 36.5 % never reached the production comment

`apps/web/src/components/dicom/panoramicArch.ts:486-488` still tells the next engineer the return sweep
was «~30% of the output columns». The packet's own measurement is 36.5 %, my column count is 36.4 %,
and `R2/handoff.md:36` explicitly calls the ~30 % estimate optimistic. The corrected number is in the
handoff and in a test, and absent from the one place a maintainer reads first. Editing a comment is not
churning geometry, so the review's ban does not cover this; it is simply undeclared.

### N3 (LOW) — pre-edit line numbers cited as if current

`S4/handoff.md:195` says the retraction is «в `R2/handoff.md:94`». At HEAD `:94` is the
`polylineReturnsToStart` bullet; the retraction is at `:116-119`. Same in CLAIMED PROVEN #5
(«handoff.md:94»). Only `S4/handoff.md:44` carries the «(до правки)» qualifier that makes the number
meaningful. This is the class the builder self-corrected twice (HEAD drift in `585ef4157`, count drift
in `90576447b`); it survives here.

### N4 (LOW) — novelty overclaim on `:233`

`S4/handoff.md:195` and CLAIMED PROVEN #5 present `Cornerstone3DViewer.tsx:233` as a literal «которого в
списке ревью не было» / "which the review's own list omitted". The R2 review listed `233:
console.error(…)` in its F2 evidence block (`review.md:265`); it was omitted only from the PART 6 item-3
remediation list (`review.md:351-352`). Half true as written.

### N5 (LOW) — "pinned" is stronger than what the file enforces

The digest test is named "digest of every figure this file asserts" and ends in
`assert.ok(digest.length > 0)` — a tautology. Several digest figures are printed and asserted nowhere as
values: `closed FULL 154.2189`, `SEEN 97.9939`, `open 90.8752`, `reconstruction 90.8755`, `cols=361`.
What is asserted is ranges (`0.06 < shortfall < 0.09`, `3.5 < dev < 4.5`, `> 4`, `< 0.7`, `> 3`,
`ratio > 5`, `|analytic − 91.1333| < 5e-4`). So a future geometry change that stayed inside those ranges
would silently invalidate the exact digits now quoted in the R2 record while the suite stayed green.
The handoff on disk is careful about this («печатает сам тест»); the SUMMARY to the lead says "pinned by
a 517-line node:test", which overstates it. The review only required re-derivability by one command, and
that is genuinely satisfied.

### N6 (nit) — a rounded number one line under its own exact form

`R2/handoff.md:34`: «(у `TRACED_ARCH`: 154 → 156.5652 / …)». `154` is a rounded `154.2189` printed
exactly two lines above — the same rounding class `90576447b` was created to remove. Readable, but
inconsistent with the standard the same paragraph now enforces.

### N7 (nit) — mixed denominators in the reachability sentence

The REACHABILITY CLAIM says the banner «now under-reports the on-screen arch by ~7 % instead of
over-reporting it by ~36 %». The two figures use different denominators: 7.26 % is relative to the
on-screen arch (97.9939 -> 90.8755), whereas 36.5 % is the bogus *share of the pre-fix reported value*.
Relative to the on-screen arch the pre-fix over-report was **+57.4 %** (I measured pre-fix
`lengthMm = 154.2037` against `SEEN = 97.9939`). The on-disk handoff avoids the trap; the structured
claim to the lead does not.

### Observation, not a finding

The new file adds ~2.5 s to the web suite because it imports `@cornerstonejs/tools`
(`import ms = 2469` measured on its own), which is why `npm test -w @dental/web` went from 1.23 s to
4.09 s. That is the price the review explicitly asked for — real library instead of a reimplementation —
and 4 s is still cheap. Worth knowing before anyone blames a future slowdown on their own file.

---

## PART 6 — WHAT WOULD CLOSE THE NITS

1. `R2/state.md:84`: `15 tests` -> `16 tests`.
2. `panoramicArch.ts:486-488`: `~30%` -> `36.5 %` (measured), or declare the stale comment as debt.
3. `S4/handoff.md:195` and any future restatement: qualify `R2/handoff.md:94` as «до правки», or point
   at `:116-119` where the retraction now lives.
4. Drop the "which the review's own list omitted" clause about `:233`, or narrow it to "omitted from
   PART 6 item 3's list".
5. If the exact digits in the R2 record are meant to be protected, assert them (e.g. `154.2189 ± 5e-4`)
   instead of only bracketing them; otherwise stop calling them "pinned".
