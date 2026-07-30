# ADVERSARIAL REVIEW — R2-panoramic-rework — FINAL

Reviewer: adversarial (did not write the code). Posture: disbelief.
Specification: `.agents/archon/packets/C5-panoramic-fake-spline/review.md`, read complete (PART 4 + PART 5).
Commits attacked: `b4292f74d` (fix, 2 files), `511403807` (tests, 1 file), `0e42238d4` (packet docs, 5 files, = HEAD).
Authority read complete: `.agents/AGENTS.md`, `.agents/INDEX.md`, `.agents/UI_STANDARDS.md`.
Not penalised: §11 `madge` (absent), biome (absent, would reformat the repo).

**VERDICT: NEEDS_REWORK.** All six PART 5 items are genuinely closed and I verified each one
independently. Both HIGH findings are closed with code plus executed proof, and the F2 probe
reproduces byte-for-byte on my own run. Nothing was silently ignored, nothing was disputed, and the
false statements C5 left in the record ARE corrected.

The rework is for two wrong statements this packet *added* to the record, one of which is a clinical
geometry number understated by an order of magnitude:

1. The headline cost of the chosen fallback — «0.002 %, максимальное отклонение 0.3879 мм, меньше
   двух вокселей КЛКТ» — is measured against the **OPEN** cornerstone polyline, i.e. against a curve
   this very packet proves cannot occur in production. Measured against the curve the dentist
   actually sees (the **CLOSED** spline's arch portion) the reconstruction is **7.3 % shorter** and
   deviates by up to **4.01 mm**, not 0.3879 mm. The geometry itself is fine — better than fine, it
   is the most accurate of the three candidate curves (0.58 mm from the analytic arch against
   3.64 mm for what cornerstone actually draws). The code is right and the number in the record is
   wrong, which on this repo is the thing that has to be stopped.
2. «в JSX русских литералов не осталось» — in the commit message of `b4292f74d`, in `handoff.md` and
   in the rework disposition — is **false**. Five raw Russian literals are still JSX text nodes in
   `Cornerstone3DViewer.tsx` at HEAD, including «Развернуть», the button the packet's own closing
   command presses.

No code change is required. Do not churn the geometry — it is correct and, in my judgement, more
anatomically defensible than what cornerstone renders. The record has to be corrected and one
missing measurement has to be taken.

---

## PART 1 — PROOF AUDIT (every claimed command re-run, same command, true exit code)

| Claim | Result |
|---|---|
| `node --import tsx --test apps/web/src/tests/panoramicArch.test.ts` -> `tests 54 / suites 9 / pass 54 / fail 0`, EXIT=0 | **REPRODUCES.** `tests 54 / suites 9 / pass 54 / fail 0 / duration_ms 193.5951`, EXIT=0. Both reviewer-specified names present and passing: `closed: true — the reconstruction contains no return sweep`, `closed: true — lengthMm matches the open arch, not the loop`, plus `the throwing cornerstone accessor becomes a refusal, not a dead click`. |
| The tests DISCRIMINATE: HEAD test file vs the pre-fix module -> `tests 54 / pass 31 / fail 23` with two verbatim assertions | **REPRODUCES EXACTLY.** I extracted `b4292f74d^:panoramicArch.ts` and `b4292f74d^:Cornerstone3DViewer.tsx` into my own tree with the HEAD test file: `tests 54 / suites 9 / pass 31 / fail 23`, EXIT=1, containing verbatim `AssertionError: the return sweep survived at {"x":25.882621020741382,"y":11.000000000000004}` and `AssertionError: reported arch length 147.0583190833509 mm is not the open arch 91.13262102074131 mm`. Note 11 of the 23 failures are `X is not a function` (the pre-fix module simply lacks the new exports) — weaker discrimination — but the two quoted ones are genuine behavioural failures, plus `an unflagged loop was unwrapped with its tail (147.058… mm)`, `reported arch length 141.058… mm still carries the sweep` and `column 0 moved when the trace direction changed`. Five real behavioural discriminators. |
| F2 premise+fix on the installed cornerstone 5.1.3: `getScalarData() THREW: No scalar data available`, `getCompleteScalarDataArray() -> Int16Array length 48 expected 48`, `slice values: -1000 -999 -998`, and through `readVolumeScalarData`: `ready len=48 voxelCount=48 ctor=Int16Array` / `unavailable volume_not_ready` / `unavailable volume_not_ready` | **REPRODUCES BYTE-FOR-BYTE.** My own probe built three real `VoxelManager.createImageVoxelManager` slices, `cache.putImageSync`-ed them into the real image cache, and drove `createImageVolumeVoxelManager({dimensions:[4,4,3], imageIds})`. Every printed value matches the claim character for character. The throw happens **with all three slices decoded and cached** — the panorama never rendered before C5 either, exactly as the builder says. |
| `npm test -w @dental/web` -> `tests 436 / suites 77 / pass 436 / fail 0` | **REPRODUCES.** `tests 436 / suites 77 / pass 436 / fail 0 / duration_ms 1230.5279`, EXIT=0. |
| `npm run typecheck -w @dental/web` -> EXIT 0 | **REPRODUCES.** `TYPECHECK_EXIT=0`. |
| `cd apps/web && npx tsc -b --force --noEmit` -> EXIT 0 on a forced full rebuild | **REPRODUCES.** `FORCE_EXIT=0`, output file 0 lines. Not a stale-cache green. |
| Citation correction: `apps/web/node_modules/@cornerstonejs/` holds only `tools`; root `node_modules/@cornerstonejs/core/dist/esm/types/IViewport.d.ts:41` = `viewPlaneNormal?: Point3;` inside `interface ViewReference` (:33) | **REPRODUCES.** `ls apps/web/node_modules/@cornerstonejs/` -> `tools`. `ls apps/web/node_modules/@cornerstonejs/core` -> `No such file or directory`. Root path line 33 is `export interface ViewReference {`, line 41 is `    viewPlaneNormal?: Point3;`. PART 5 #5 closed. |
| ENCODING: `BOM=false mojibakeLines=0 U+FFFD=0`, cyrillic `panoramicArch.ts=613 / Cornerstone3DViewer.tsx=2332 / panoramicArch.test.ts=91 / handoff.md=7923`, commits `2698 / 1269 / 12510` | **REPRODUCES.** File counts match exactly. The three commit figures did not match my first metric (raw commit object: 1946 / 1199 / 721) — they reproduce exactly under `git show <commit>` including the diff: **2698 / 1269 / 12510**. Metric-definition difference, not an error. Subject codepoints are genuine Cyrillic (`U+0441 U+043D U+0438 U+043C U+043A U+0438` = «снимки»), not the `U+0420/U+0421 + Latin-1` mojibake signature. |
| GIT HYGIENE: exactly 8 files, no churn | **REPRODUCES.** See PART 3. |
| Fallback cost: `HEAD reconstruction 91.9670 mm vs cornerstone's own open polyline 91.9684 mm (0.002 %); max distance from any output column to the drawn curve 0.3879 mm` | **DOES NOT REPRODUCE AS STATED — see F1 below.** The exact digits are not reproducible from anything in the repo (the probe's control points were never recorded), and the baseline is the wrong curve. |
| Spline probe: `open points 127 length 91.968 last 28,11` / `closed points 148 length 155.288 last -28,11` / `EXTRA: 21 points, 63.319 mm = 40.8 %` | **SUBSTANCE REPRODUCES, DIGITS DO NOT.** With the repo's own `archHandles(7)`: `open points 127 length 90.875 last 28.00,11.00` / `closed points 148 length 154.219 last -28.00,11.00` / `EXTRA: 21 points, 63.344 mm = 41.1 %`, closing gap exactly `0.000000`. With `TRACED_ARCH`: `127 / 91.6719` and `148 / 156.5652`. Point counts, endpoints, extra-point count and the ~41 % ratio all reproduce; the mm digits land 1.2 % away from the claim because the probe's inputs were not recorded. |

## PART 2 — FALSIFIABLE HYPOTHESES

### H1 — Was the defect real before `b4292f74d`? **CONFIRMED, all four**

`git show b4292f74d^:` on the two files:
- F1: `grep -n closed panoramicArch.ts` -> **one line only**, `46: closed?: boolean | undefined;`. Declared, never read.
- F2: `295: const raw = volume?.voxelManager?.getScalarData();` — outside the `try/catch` that ends at :278.
- F3: `388: text: \`Панорама построена по обведённой дуге: точек ${…}, длина дуги ${…} мм.\`` — raw literal in JSX.
- F4: `502: onClose={() => setShowPanorex(false)}` — `archSummary` never cleared.
- Aggravating factor confirmed: `test file :49 ? { contour: { polyline: options.polyline, closed: false } }`.

### H2 — Reachable by a real user, or dead code sold as a fix? **CONFIRMED LIVE, traced myself**

`AppRouter.tsx:36 React.lazy(ImagingView)` -> `:75 <ImagingView />` inside the imaging-route
`Suspense`/error boundary -> `ImagingView.tsx:833 <DicomArchiveUploader onImagesLoaded={setLocalImageIds} />`
-> `ImagingView.tsx:503-504 localImageIds.length > 0 ? <Cornerstone3DViewer imageIds={localImageIds} />`
-> `Cornerstone3DViewer.tsx:492 onClick={handleGeneratePanorex}` on the «Развернуть» button (`:495`)
-> `buildPanoramicArch` (closed branch) and `readVolumeScalarData` (voxel branch), both at :286-320.
The second mount at `ImagingView.tsx:507-511` sits inside `opacity-50 pointer-events-none` (`:508`)
and is not the live one. The chain terminates on a single real click. **Not dead code.** Builder's
claim holds.

### H3 — Does it hold on REAL data, or is it a fixture-only fix? **HOLDS, verified against the library**

This is where cycle 2 died, so I went to `node_modules` rather than the handoff:
- `core/dist/esm/utilities/VoxelManager.js:513-540 resolveSliceVoxelManager` reads
  `cache.getImage(imageId)` and requires `image?.voxelManager`; `:643-669 getCompleteScalarDataArray`
  is built entirely on that resolver. So the builder's readiness predicate interrogates **exactly the
  cache the accessor reads**. That is coherence, not a guess.
- `core/dist/esm/cache/cache.js:214-227 getImage` returns a bare `return;` (undefined) for a missing
  image, so `!== undefined` is the correct test — it cannot be defeated by a `null` return.
- `cache/classes/BaseStreamingImageVolume.js:13, :267 loadAndCacheImage(imageId, …)` ->
  `loaders/imageLoader.js:84 cache.putImageLoadObject(imageId, …)`: decoded slices really do land in
  the image cache under the volume's own imageIds.
- `mprMath.ts:65-74 toTransferableScalarData` takes `ArrayLike<number>` and converts anything that is
  not a `Uint16Array` element-by-element into `Float32Array`, so the `Int16Array` of signed HU that
  `getCompleteScalarDataArray()` returns survives with its negatives intact. **Attempted attack
  failed** — I expected an Int16->Uint16 wrap turning −1000 HU into 64536.
- `mprMath.ts:281 offset = -halfThickness + s * stepSizeNormal` — the thick slab is SYMMETRIC about
  the curve and MIP/average are order-invariant, so `orientArchPatientRightFirst` reversing the curve
  cannot flip the focal trough onto the lingual side. **Attempted attack failed.**

Remaining real-data gap is the one the builder declared: a real CBCT series through the browser DICOM
decoder. Honestly stated with a closing command.

### H4 — Hollow facade / magic constant / fabricated default? **DISPROVED**

`CLOSED_CONTOUR_GAP_FRACTION = 0.01` is not a magic number: I checked its two docstring claims
against the library and **both are true**. `tools/dist/esm/utilities/contours/updateContourPolyline.js:18-25`
does apply a geometric closed test when the flag is absent (`if (polyline.length > 3) { …
isEqual(0, lastToFirstDist) }`), and its `> 3` threshold is exactly the `points.length < 4` guard in
`polylineReturnsToStart`. The builder's other cornerstone citations also check out at the line given:
`SplineROITool.js:81 type: SplineTypesEnum.CatmullRom`, `:599-603 closed: data.contour.closed` +
`{updateWindingDirection: data.contour.closed}`, `:767 spline.closed = !!data.contour.closed`. No
`{success:true}`, no placeholder, no hardcoded port/UUID/endpoint. `readVolumeScalarData` refuses in
seven distinct ways and each refusal is unit-covered.

### H5 — Second owner? **DISPROVED for the new code**

`rg "getScalarData|getCompleteScalarDataArray|voxelManager" apps/web/src/` returns only
`panoramicArch.ts`, its test, and the single call site in `Cornerstone3DViewer.tsx`.
`readVolumeScalarData` is the sole owner of volume voxel reading in the web app. H5.1 from C5 (the
second Russian dictionary) is a permitted branch and the wrong justification is corrected in the
handoff; H5.2 (`interpolateSpline`'s lying docstring, zero callers) is declared as debt #2 — and I
confirmed the lie is still there at `mprMath.ts:79-104` ("Catmull-Rom" over a plain linear
subdivision body) with no callers. Correctly left alone.

### H6 — `useAppLogic.tsx` return field deleted/renamed? **DISPROVED.** Not touched by any of the three commits.

### H7 — Listener/interval/subscription/handle without teardown? **DISPROVED.** The diff adds no
listener, timer, subscription or worker. `onClose` now clears strictly more state than before.

### H8 — Deleted/renamed file still referenced? **NOT APPLICABLE.**
`git log --diff-filter=DR --name-status b4292f74d^..0e42238d4` is empty.

### H9 — Hardcoded hex / static px / undeclared Russian literal? **PARTIALLY DISPROVED — see F2**
No new hex, no new absolute px; the banner is `var(--…)` tokens plus `max-w-[min(92%,34rem)]`,
`text-xs sm:text-sm`, `break-words hyphens-auto`. The new Russian string `panoramicReadyLabel` lives
in a dictionary and its i18n debt is declared as debt #1. But the *claim* about the component's JSX
is false — F2 below.

### H10 — Mojibake? **DISPROVED.** Files and all three commit objects: `BOM=false mojibakeLines=0 U+FFFD=0`.
Subjects decode to real Cyrillic codepoints.

---

## PART 3 — GIT HYGIENE: CLEAN

```
b4292f74d  apps/web/src/components/dicom/Cornerstone3DViewer.tsx
           apps/web/src/components/dicom/panoramicArch.ts
511403807  apps/web/src/tests/panoramicArch.test.ts
0e42238d4  .agents/archon/packets/R2-panoramic-rework/{commitmsg,commitmsg2,commitmsg3}.txt
           .agents/archon/packets/R2-panoramic-rework/{handoff,state}.md
```

Exactly the 8 claimed files, nothing else. The working tree is filthy — 298 entries, including ~40
modified `apps/api/dist/*`, `apps/api/.data/*.json`, `apps/web/tsconfig.tsbuildinfo`,
`apps/web/src/MarketingView.tsx`, `apps/web/src/pages/AnalyticsDashboardView.tsx`,
`apps/web/src/tests/panelsAreMounted.test.ts`, `scratch/**` — so shared-index contamination was
actively available and was avoided. The builder's observation that `panelsAreMounted.test.ts` is
another agent's in-flight edit is accurate: it is ` M` in the tree and in none of the three commits.
`git diff --cached --name-only` is empty now.

Conventional Commits, Russian subjects that name the DEFECT rather than the patch:
`fix(снимки): панорама не строилась ни разу, а замкнутая дуга давала лишний проход`,
`test(снимки): замкнутая дуга и бросок cornerstone не были покрыты ни одним тестом`,
`docs(снимки): сдача R2 — все пункты ревью C5 с вердиктом и с исправленными цитатами`.
Bodies explain WHY. §12 compliant.

---

## PART 4 — SPECIFICATION ITEM BY ITEM (C5 review PART 5)

| Item | Builder | My verdict |
|---|---|---|
| **1.** Handle `data.contour.closed`; add a `closed: true` test with a polyline returning to start, assert no return sweep and an open-arch `lengthMm` | CLOSED | **CLOSED, VERIFIED.** `panoramicArch.ts:491-498` reads the flag; the review's option (b) — Catmull-Rom over the control points — was explicitly permitted. Both required tests exist by name, both fail against the pre-fix module with the quoted assertions. `polylineReturnsToStart` is a second, geometric barrier the review did not ask for. |
| **2.** `getScalarData()` into try/catch (or a per-slice read) routed to `volume_not_ready` | CLOSED, went further | **CLOSED, VERIFIED.** The builder is right that a bare try/catch would have satisfied the letter and left every click refusing: I reproduced the throw with all slices decoded. `readVolumeScalarData` prefers `getCompleteScalarDataArray()`, catches every throw, rejects short buffers and rejects a half-decoded series. The extra half-decoded guard is the builder's own initiative and is the correct call. |
| **3.** Success banner string into the same dictionary as the refusals | CLOSED | **CLOSED** for the item itself (`panoramicReadyLabel` in `panoramicArch.ts:176-181`, consumed at `Cornerstone3DViewer.tsx:407`). The *accompanying claim* about the component's JSX is false — F2. |
| **4.** Clear `archSummary` in `onClose` | CLOSED | **CLOSED, VERIFIED** at `Cornerstone3DViewer.tsx:521-527` (`setShowPanorex(false)` + `setArchSummary(null)` at `:526`), and unit-asserted by reading the `.tsx`. |
| **5.** Correct the `apps/web/node_modules/@cornerstonejs/core/…` citation | CLOSED | **CLOSED, VERIFIED** independently at both paths. |
| **6.** State F1 and F5 as declared debt if not fixed | N/A, both fixed | **ACCEPTED.** F1 fixed. F5's determinism half is fixed and reversal-invariance is unit-verified column by column; the anatomical-side half is in НЕ ПРОВЕРЕНО with an exact closing command and named as wrong-site class. Stated, not silent. |
| C5 PART 1 inaccuracy (bad citation path) | CLOSED | **CLOSED.** |
| C5 H5.1 (`panoramicIssueLabels` second dictionary, wrong reason) | ACCEPTED, reason corrected | **ACCEPTED.** New reason is sound: item #3 requires the success string next to the refusals, i.e. in `panoramicArch.ts`. i18n restated as debt #1. |
| C5 H5.2 (`interpolateSpline` lying docstring, 0 callers) | DECLARED DEBT | **ACCEPTED.** Verified still lying, still zero callers. Touching it would be unproven churn on a clinical commit. |
| C5 PART 4 "not a defect" | not disputed | **ACCEPTED.** |

**Nothing silently ignored. Nothing disputed. All four false statements C5 left in the record are
corrected in `handoff.md` §"Неверные утверждения в сдаче C5", and I spot-checked each against the C5
handoff — they are real corrections, not rewording.**

---

## PART 5 — NEW DEFECTS FOUND

### F1 (MEDIUM) — the fallback's cost is measured against a curve the packet itself proves impossible

Claim, in three places (`handoff.md` «Что изменено», `state.md:70-71`, CLAIMED PROVEN #6):

> «Цена отказа от polyline измерена и мала: 91.9670 мм против 91.9684 мм у кривой, **которую
> нарисовал cornerstone** (0.002 %), максимальное отклонение любого столбца от неё 0.3879 мм —
> меньше двух вокселей КЛКТ.»

`91.9684` is the **OPEN** polyline. The packet's own F1 argument is that a finished SplineROI is
always **CLOSED** (`SplineROITool.js:245-269`, quoted by the builder and verified by me). So the
curve cornerstone actually draws, and the dentist actually sees, is the closed spline — whose arch
portion is *not* the open spline, because a closed Catmull-Rom uses wrap-around tangents at the first
and last control points.

Measured, same control points, `CatmullRomSpline` from the installed 5.1.3, both fixtures in the
repo's own test file:

```
archHandles(7)
  arch portion of the CLOSED polyline (what the dentist saw): len 97.9939 pts 127
  HEAD reconstruction:                                        len 90.8755 cols 361
  max deviation of reconstruction from the SEEN arch portion:  4.0081 mm
  max deviation of reconstruction from the OPEN spline:        0.0138 mm
  closed-vs-open rendering of the same arch, worst vertex:     4.5634 mm
TRACED_ARCH
  arch portion of the CLOSED polyline (what the dentist saw): len 99.1526 pts 127
  HEAD reconstruction:                                        len 91.6748 cols 365
  max deviation of reconstruction from the SEEN arch portion:  4.0460 mm
  max deviation of reconstruction from the OPEN spline:        0.0172 mm
  closed-vs-open rendering of the same arch, worst vertex:     4.6369 mm
```

(deviation = distance from each output column to the nearest **segment** of the reference polyline,
not to the nearest vertex.)

So against the production baseline the fallback is **7.3 % short in reported arch length** and up to
**4.0 mm off the curve on screen**, worst at the molars — about **ten** CBCT voxels, not "under two".
The `0.3879 mm` figure is itself explained by a coarse metric: half the open polyline's own vertex
spacing is `90.88/126/2 = 0.36 mm`, so the builder measured column->nearest-**vertex**. Against the
open polyline the true column->curve deviation is `0.0138–0.0172 mm`, i.e. their own number is
conservative by 20x in one direction while the baseline is wrong by 300x in the other.

Two consequences the lead must be told:
- The panorama is **not** sampled along the curve the dentist saw. It is sampled along an open
  Catmull-Rom through the same control points. Both pass through every placed point; they differ
  between the two outermost pairs of points.
- The banner's «длина дуги M мм» now reads ~7 % **below** the curve on screen. F1's original
  complaint was that this number was inflated by the return sweep; it is now deflated by the closed
  spline's end bulge. Smaller, opposite sign, still a mismatch between the one number offered as
  evidence and what is drawn.

**I am not asking for the geometry to be changed — I measured which curve is actually right.** Against
the analytic semi-ellipse the fixture models (a = 28, b = 30, densely sampled, 20 000 segments):

```
analytic semi-ellipse arc length            = 91.1333 mm
cornerstone OPEN rendering                  = 90.8752 mm   max deviation from truth = 0.5865 mm
cornerstone CLOSED rendering, arch portion  = 97.9939 mm   max deviation from truth = 3.6448 mm
HEAD reconstruction                         = 90.8755 mm   max deviation from truth = 0.5802 mm
```

The reconstruction is the **most accurate of the three** — 6x closer to the true arch than the curve
cornerstone renders for a closed contour, whose wrap-around tangents overshoot the real arch by 7.5 %.
The builder's choice of option (b) is not merely defensible, it is the best available. But none of
that reasoning or measurement exists anywhere in the packet, and the number that does exist is
benchmarked against a curve the packet itself proves unreachable, with a metric that inflates it 20x.
On this repo, a plausible number measured against the wrong baseline is the defect — that is the
entire reason this packet exists.

### F2 (MEDIUM) — «в JSX русских литералов не осталось» is false, and it is in a commit message

`b4292f74d` commit body: *«текст успешной плашки уехал в словарь рядом с текстами отказов, **в JSX
русских литералов не осталось**»*. Repeated in `handoff.md` §"Что изменено" and in the rework
disposition for PART 5 #3 (*"no Russian literal left in this component's JSX"*).

Non-comment Cyrillic lines in `Cornerstone3DViewer.tsx` at HEAD (block and line comments excluded):

```
233: console.error("[Cornerstone3DViewer] Не удалось построить реконструкцию:", error);
236: "Не удалось построить реконструкцию. Возможно, серия неполная или формат не поддерживается…"
387: const logStr = `В область зуба ${…} запланирована установка имплантата … Дистанция до нижнечелюстного канала ${…} мм.`;
427: {loadError ?? 'Строим объёмную реконструкцию — это может занять до минуты...'}
444: Дуга (Spline)
463: <span style={{ color: '#a3a3a3' }}>Толщина (ОПТГ):</span>
495: Развернуть
558: ⚠️ КРИТИЧЕСКАЯ БЛИЗОСТЬ К НЕРВУ!
```

`:427`, `:444`, `:463`, `:495`, `:558` are literal JSX text; `:236` and `:387` are Russian strings set
into state and rendered. `:495` is «Развернуть» — the button the packet's own closing command
presses. The unit test that is cited as backing the claim only asserts
`!viewer.includes("Панорама построена по обведённой дуге")`, which is a much narrower fact.

The reviewer item itself is closed — the success string really did move to the dictionary. This is an
overclaim, not undone work. But it is the exact statement a future agent will trust to conclude this
component's i18n is finished, it is baked into an immutable commit message, and it sits in the same
handoff that dedicates a section to correcting C5's false statements. Debt #7 declares the component's
inline styles and static hex; it says nothing about its Russian literals.

### F3 (LOW) — the two runtime probes are not reproducible as quoted

`91.968 / 155.288 / 63.319 mm / 40.8 %` and `91.9670 / 91.9684 / 0.3879` do not reproduce from
anything in the repository, because the probe's control points were never recorded. The repo's own
two arch fixtures give `90.875 / 154.219 / 63.344 / 41.1 %` and `91.672 / 156.565`. Point counts
(127, 148, +21), endpoints (`28.00,11.00` / `-28.00,11.00`), the exact zero closing gap and the ~41 %
ratio all reproduce, so the substance stands and this is not fabrication — but "RUNTIME VERIFIED"
with digits nobody can re-derive is one notch short of the standard this repo needs. Record the
inputs next time.

### F4 (LOW) — the half-decoded guard accepts a replicated stand-in frame

`Cornerstone3DViewer.tsx:313` passes `(imageId) => cornerstone.cache.getImage(imageId) !== undefined`.
`cache.js:214` signature is `getImage(imageId, minQuality = ImageQualityStatus.FAR_REPLICATE)` and
`enums/ImageQualityStatus.js` puts `FAR_REPLICATE = 1` at the **bottom** of the scale
(`ADJACENT_REPLICATE 3`, `SUBRESOLUTION 6`, `LOSSY 7`, `FULL_RESOLUTION 8`). So a slice whose pixels
were replicated from a distant neighbour, or a subresolution/lossy stand-in, satisfies "decoded" and
the panorama would be built from duplicated anatomy instead of refusing — the same defect class the
guard exists for. **Not live today:** `rg "imageRetrieve|IMAGE_RETRIEVE|ProgressiveRetrieve" apps/web/src/`
returns nothing, and `BaseStreamingImageVolume.js:169-173` only switches to `ProgressiveRetrieveImages`
when an `IMAGE_RETRIEVE_CONFIGURATION` provider is registered, so this app takes the non-progressive
path. Minor second hole: the predicate checks `image !== undefined` while
`resolveSliceVoxelManager` additionally requires `image.voxelManager`, so an image cached without a
voxel manager would pass the guard and contribute a zero-filled slice.

### F5 (LOW) — the F2 fix makes a full-volume double copy newly reachable, and that is undeclared

`getCompleteScalarDataArray()` allocates `dx*dy*dz` Int16, then `toTransferableScalarData` allocates
`dx*dy*dz` Float32 and the result is transferred to the worker. For a 512x512x400 CBCT that is
210 MB + 420 MB transient on one click, on top of the per-slice image cache the accessor is reading
from. Before this commit line 295 threw before allocating anything, so this path had never executed.
None of the seven declared debts and no НЕ ПРОВЕРЕНО item mentions it. It belongs next to the
existing "real CBCT series" debt, since the lead is about to press that button on a real archive.

### Not a defect, recorded so nobody re-litigates it

- Reversing the curve cannot flip the focal trough: the slab is symmetric (`mprMath.ts:281`) and
  MIP/average are order-invariant.
- `Int16Array` of signed HU survives `toTransferableScalarData` as `Float32Array`; no unsigned wrap.
- Reversal-invariance is exact on the closed/handle path (unit-verified <1e-9 per column) and only
  approximate on the open-polyline path, because resampling starts from whichever end comes first —
  a sub-column (<0.25 mm) shift, and cornerstone does not reverse open contours anyway
  (`SplineROITool.js:603` passes `updateWindingDirection: data.contour.closed`).
- `polylineReturnsToStart` misfiring on a genuinely open trace is harmless: the only consequence is
  using the control-point interpolation instead of the polyline.
- A double-click finish pushes one extra control point at the double-click position
  (`SplineROITool.js:260-263`); coincident points are handled by the knot-collapse branch in
  `catmullRomSegment:303`.

---

## PART 6 — REQUIRED REWORK (documentation and measurement; do NOT churn the geometry)

1. Re-measure the fallback's cost against the **closed** rendering — the only one that occurs — and
   replace the `0.002 % / 0.3879 mm / "under two CBCT voxels"` figures in `handoff.md`, `state.md`
   and the packet record with the real numbers (order 4 mm max deviation, ~7 % shorter reported arch
   length). Record the exact control points used so the next reviewer can re-derive them: none of the
   quoted digits are reproducible from anything in the repo today.
2. Add the missing argument and the missing measurement, once, in the handoff: that the reconstruction
   is *closer* to the true arch than the curve cornerstone renders (0.58 mm vs 3.64 mm max deviation
   from the analytic arch; the closed rendering overshoots by 7.5 %), and therefore that the panorama
   is deliberately NOT sampled along the on-screen curve and the banner length sits ~7 % below it.
   Stated that way it is a strength; stated as `0.002 %` against the open polyline it is a wrong
   number. Do not change code for this.
3. Retract «в JSX русских литералов не осталось». The truthful scope is "the panorama banner's copy
   is in the dictionary". List the surviving literals (`Cornerstone3DViewer.tsx:236, 387, 427, 444,
   463, 495, 558`) as debt next to debt #7. The commit message cannot be rewritten — say so in the
   handoff rather than leaving it standing.
4. Declare the newly reachable full-volume double copy (Int16 + Float32, ~630 MB on a 512x512x400
   series) as debt, with the arithmetic.
5. Note in the handoff that `isSliceDecoded` accepts any `ImageQualityStatus` including
   `FAR_REPLICATE`, and that it does not check `image.voxelManager` the way
   `resolveSliceVoxelManager` does. One sentence each; no code change needed while this app registers
   no progressive-retrieve configuration.
