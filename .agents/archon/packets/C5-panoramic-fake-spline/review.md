# ADVERSARIAL REVIEW — C5-panoramic-fake-spline

Reviewer: adversarial (did not write the code). Posture: disbelief.
Target commit: d9c90d6852a5c17e7ce8c8f7af300940787e8673 (docs-only, 5 packet files, +274)
Code commits: 3f773b3e0c66d4be7a93a691e54f051afe74036d, f11754ea4f6226e029a7f706eec8d3917126878c

**VERDICT: NEEDS_REWORK.** Every claimed proof reproduces exactly — this is the most honest
delivery packet I have audited on this repo. But the new code reintroduces the packet's own failure
class (a plausible image containing a section of nothing), and a throwing call two lines below the
edit means the panorama the lead is being asked to screenshot cannot render at all.

---

## PART 1 — PROOF AUDIT (every claimed command re-run)

| Claim | Result |
|---|---|
| `node --import tsx --test apps/web/src/tests/panoramicArch.test.ts` -> 29/5/29 pass | **REPRODUCES.** `tests 29 / suites 5 / pass 29 / fail 0 / duration_ms 197.1096`. All seven named cases present and passing verbatim. |
| `npm test -w @dental/web` -> 406/72/406 pass | **REPRODUCES.** `tests 406 / suites 72 / pass 406 / fail 0 / duration_ms 1183.4468`. |
| `npm run typecheck -w @dental/web` -> exit 0 | **REPRODUCES.** `EXIT=0`. |
| `cd apps/web && npx tsc -b --force --noEmit` -> exit 0 on forced rebuild | **REPRODUCES.** `EXIT=0`, output file 0 lines. Not a stale-cache green. |
| STATIC: `rg "100, y: 100\|200, y: 150\|300, y: 100" apps/web/src/` | **REPRODUCES BYTE-FOR-BYTE.** Only `PanoramicRendererWindow.tsx:162` (Rnd default window x/y) and `tests/panoramicArch.test.ts:19-21` (the negative assertion). |
| ENCODING: BOM false, 0 mojibake lines, cyrillic 560/1955/21/1215 | **REPRODUCES**, and I went further — I byte-audited the three **commit objects** too, not just the files. `COMMIT 3f773b3e0 mojibakeLines=0 cyrillic=1215`, `f11754ea4 cyrillic=716`, `d9c90d685 cyrillic=390`. No BOM, no U+FFFD anywhere. |
| GIT: only the claimed files, no foreign file staged | **REPRODUCES.** See Part 3. |
| "The tests caught a real defect in my own code" | **SUBSTANTIATED INDEPENDENTLY.** I extracted `panoramicArch.ts` at `3f773b3e0` into a scratch tree and ran the **HEAD** test file against it: `tests 29 / pass 25 / fail 4`, failing on `a trace with all points in one spot is refused, not unwrapped into a strip`, `a trace shorter than one output column is refused`, `reports the problem with the arch the dentist just traced`, and the label-coverage test. The self-caught defect was real; the fix is real. (My 25/4 differs from the builder's quoted 24/3 because I ran the FINAL test file against the OLD module, not the intermediate file they ran — different test set, same substance.) |

One inaccuracy in the delivered claim:

- **Bad path in a proof citation.** CLAIMED NOT PROVEN #3 cites
  `apps/web/node_modules/@cornerstonejs/core/dist/esm/types/IViewport.d.ts:41`.
  **`apps/web/node_modules/@cornerstonejs/` contains only `tools`.** `@cornerstonejs/core` is hoisted
  to the workspace root. The real path is
  `node_modules/@cornerstonejs/core/dist/esm/types/IViewport.d.ts`, where line 41 is indeed
  `viewPlaneNormal?: Point3;` inside `interface ViewReference`. Content and line number correct,
  path wrong. Every other citation checks out at the path given
  (`apps/web/node_modules/@cornerstonejs/tools/.../annotationState.d.ts:5` = `getAnnotations(...)`;
  `FrameOfReferenceSpecificAnnotationManager.js` really does
  `throw new Error('Element not enabled, ...')`).

## PART 2 — FALSIFIABLE HYPOTHESES

### H1 — Was the defect real before the commit? **CONFIRMED**

`git show 3f773b3e0^:...Cornerstone3DViewer.tsx`:
`232: setSplinePoints([{ x: 100, y: 100 }, { x: 200, y: 150 }, { x: 300, y: 100 }]);`
fed to `PanoramicRendererWindow` at `:416`, and `mprMath.ts:237 const width = splinePoints.length`.
The "3 columns wide" characterisation is verified from source, not asserted.

### H2 — Was the ROI actually available? **CONFIRMED — builder's situation call is right**

Verified in `node_modules`, not from the builder's summary:
- `SplineROITool.js:261 data.handles.points.push(worldPoint)` — control points are WORLD mm.
- `utilities/contours/updateContourPolyline.js:45-47` runs every polyline point through
  `canvasToWorld` before storing, and `ContourBaseTool.js:123` maps the stored polyline through
  `worldToCanvas` to draw it. The stored polyline is WORLD mm.
- Registered at `Cornerstone3DViewer.tsx:207-208`, exposed at `:421-426`.

### H3 — Is the fix reachable by a real user? **CONFIRMED to the button, BROKEN one line later**

Chain independently traced and it matches the builder's claim exactly:
`AppRouter.tsx:75 <ImagingView/>` (React.lazy, gated on `currentView === "imaging"`)
-> `ImagingView.tsx:507` / `:833 <DicomArchiveUploader onImagesLoaded={setLocalImageIds}/>`
-> `ImagingView.tsx:503-504` `localImageIds.length > 0` -> `<Cornerstone3DViewer imageIds={localImageIds}/>`
-> `Cornerstone3DViewer.tsx:471-477` «Развернуть» -> `handleGeneratePanorex`.
The second mount at `:509` is indeed inside `opacity-50 pointer-events-none`. Not dead code.

But see **F2** — the handler throws before it can produce a panorama.

### H4 — Hollow facade / magic constant / fabricated default? **DISPROVED for the new module**

`buildPanoramicArch` has no fallback curve, no `{success:true}`, no placeholder. The three named
constants (`DEFAULT_ARCH_SAMPLE_STEP_MM = 0.25`, `MAX_ARCH_SAMPLES = 4096`,
`AXIAL_NORMAL_MIN_ABS_Z = 0.9`) are rendering/validation parameters with stated derivations, not
clinical values standing in for unknowns. `refusePanorex` genuinely closes the window. No new
hardcoded port/UUID/endpoint.

### H5 — Second owner? **PARTIALLY — two mild instances, neither load-bearing**

1. `panoramicIssueLabels` is a second Russian-copy dictionary for the imaging lane next to the
   existing `apps/web/src/imagingUiLabels.ts`. The brief explicitly allowed "declare the i18n debt
   OR route through imagingUiLabels.ts", so this is a permitted branch — but handoff debt item #1
   justifies it with *«В imagingUiLabels.ts не полез: файл вне моего клейма»*, and the brief named
   that file as in-scope. Permitted outcome, wrong reason.
2. `sampleArchCurve` is a second spline sampler next to `mprMath.ts:79 interpolateSpline`, whose
   docstring says "Catmull-Rom spline" over a body that does plain linear subdivision. That existing
   function is a pre-existing lie **with zero callers**, so writing a real one elsewhere rather than
   touching dead out-of-scope code is defensible. Flagging so the lead knows a lying `interpolateSpline`
   is still sitting in `mprMath.ts` (and duplicated at `apps/web/src/utils/math/mprMath.ts:394`).

### H6 — `useAppLogic.tsx` return field deleted/renamed? **DISPROVED.** File not touched by any of the three commits.

### H7 — Listener/interval/subscription without teardown? **DISPROVED.** The diff adds no listener,
timer, subscription or worker. The one worker in the lane (`PanoramicRendererWindow.tsx:107-157`) is
pre-existing and already has `worker.terminate()` in cleanup. The series-change effect at
`Cornerstone3DViewer.tsx:95-101` now resets five pieces of panorama state on unmount/re-run —
strictly more teardown than before.

### H8 — Hardcoded hex / static px / undeclared Russian literal? **MOSTLY DISPROVED, one hit**

- No new hex. The banner is pure tokens.
- All new sizing is relative: `top-24`, `px-4 py-3`, `max-w-[min(92%,34rem)]`, `text-xs sm:text-sm`,
  `break-words hyphens-auto`.
- Tokens exist in all three themes — `dente-redesign.css:28-29` (`:root, [data-theme="light"]`),
  `:83-84` (`[data-theme="dark"]`), `:131-132` (`[data-theme="night"]`), `--line-strong` at
  `:22/:77/:125`.
- **I tried to kill this on the Tailwind-v4 ambiguity rule** (`text-[var(--x)]` normally needs a
  `color:` hint). **Attack failed.** The built CSS proves this repo's Tailwind resolves it to colour:
  `apps/web/dist/assets/index-DOMtKxLK.css` contains
  `.text-\[var\(--ink\)\]{color:var(--ink)}`, `.bg-\[var\(--paper\)\]{background-color:var(--paper)}`,
  `.border-\[var\(--line\)\]{border-color:var(--line)}`. The banner will paint.
- **Hit:** `Cornerstone3DViewer.tsx:386-389` — the success banner text
  `` `Панорама построена по обведённой дуге: точек ${...}, длина дуги ${...} мм.` `` is a raw Russian
  template literal inline in JSX. Every *refusal* string went into the dictionary; the one *success*
  string did not. That contradicts the builder's own stated policy in `panoramicArch.ts:127-128`
  ("keeping them in a dictionary here rather than inline in JSX") and UI_STANDARDS "Decouple Strings".

### H9 — Mojibake? **DISPROVED.** See Part 1. Files and commit objects both clean.

---

## PART 3 — GIT HYGIENE: CLEAN

```
3f773b3e0  apps/web/src/components/dicom/Cornerstone3DViewer.tsx
           apps/web/src/components/dicom/panoramicArch.ts
f11754ea4  apps/web/src/components/dicom/panoramicArch.ts
           apps/web/src/tests/panoramicArch.test.ts
d9c90d685  .agents/archon/packets/C5-panoramic-fake-spline/{commitmsg,commitmsg2,commitmsg3}.txt
           .agents/archon/packets/C5-panoramic-fake-spline/{handoff,state}.md
```

Exactly the claimed files. **No `apps/api/.data/*.json`, no `*.tsbuildinfo`, no `apps/api/dist/**`,
no `scratch/**`, no other author's work** — and the working tree is currently filthy with ~40
modified `apps/api/dist/*` and `.data/*.json` files from concurrent agents, so the shared-index
contamination that hit two earlier commits was actively available and was avoided here.
`commitmsg*.txt` in the packet folder is fleet convention (C1, C2, C4, C6, P2 all do it), not litter.

Conventional Commits with Russian subjects that name the defect, not the patch:
`fix(снимки): панорама строилась по трём вшитым точкам, а не по обведённой дуге`. Bodies explain
WHY. Compliant with §12.

---

## PART 4 — NEW DEFECTS FOUND

### F1 (HIGH) — the closed contour is declared and then ignored: the panorama grows a fake tail

`panoramicArch.ts:43-48` types `contour.closed?: boolean`. `rg -n "closed" panoramicArch.ts` returns
**only that declaration**. Nothing reads it.

Why that is not cosmetic:

1. **`SplineROITool` has no completion path that leaves the contour open.**
   `SplineROITool.js:245` `let closeContour = data.handles.points.length >= 2 && doubleClick;`
   `:255-259` clicking back on control point 0 also sets it
   `:264` `data.contour.closed = data.contour.closed || closeContour;`
   `:267-269` `if (data.contour.closed) { this._endCallback(evt); }`
   The only other exit is ESC/backspace -> `this.cancel(element)` (`:213`, `:550`), which discards the
   annotation. **A finished SplineROI is a closed SplineROI.**
2. **A closed spline emits one extra curve segment wrapping last->first.**
   `CubicSpline.js:40-41` `_getNumCurveSegments = closed ? controlPoints.length : controlPoints.length - 1`;
   `Spline.js:211-214 getPolylinePoints()` returns the polyline over all of them.
3. `buildPanoramicArch` (`panoramicArch.ts:384-387`) prefers that polyline whenever
   `polyline.length > controlPoints.length` — i.e. always, in practice — and
   `resamplePolylineByArcLength` walks it as an **open** polyline.

**Failure scenario.** Dentist traces the arch on AXIAL, double-clicks to finish (the only way to
finish), presses «Развернуть». The unwrap contains the real arch **plus a return sweep from the last
molar back to the first**, straight through the tongue and palate, appended seamlessly to the right
of the real panorama. On a ~130 mm arch with a ~55 mm end-to-end chord that is roughly 30% of the
output columns showing tissue that is not the dental arch. The banner's «длина дуги M мм» — the one
number offered as evidence the arch is real — is inflated by the same amount.

This is the packet's own failure class: a plausible image with a section of nothing in it.

**Aggravating:** the test fixture pins the case that never occurs in production.
`panoramicArch.test.ts:49` — `contour: { polyline: options.polyline, closed: false }`. The single
test that exercises the polyline path hardcodes `closed: false`. The builder typed the field, wrote
it into the fixture as `false`, and never handled or tested `true`.

Evidence class: static, from `apps/web/node_modules` sources quoted above — the same class the
builder used for `viewPlaneNormal` and correctly labelled NOT PROVEN there. They did not label this
one at all.

### F2 (HIGH) — `volume.voxelManager.getScalarData()` throws on every real CBCT volume; the `volume_not_ready` guard is unreachable

`Cornerstone3DViewer.tsx:294-296`:
```ts
const volume = cornerstone.cache.getVolume(volumeId);
const raw = volume?.voxelManager?.getScalarData();
if (!volume || !raw) { ... refusePanorex("volume_not_ready"); return; }
```
The `try/catch` at `:267-278` wraps only `getAnnotations`. Line 295 is outside it.

**Empirically reproduced** (read-only node probe against the installed cornerstone 5.1.3):
```
scalarData= undefined | _getScalarData= undefined
getScalarData() THREW: No scalar data available
```
Chain: `cornerstoneStreamingImageVolumeLoader.js:38` constructs `new StreamingImageVolume({...})`
with **no** `voxelManager`; `ImageVolume.js:39-45` therefore builds
`VoxelManager.createImageVolumeVoxelManager(...)`; that factory (`VoxelManager.js:505-600`) passes
neither `scalarData` nor `_getScalarData` into the constructor (`:189-190`); and
`VoxelManager.js:273-286 getScalarData()` throws `'No scalar data available'` when both are absent.
Nothing in the load path ever populates them — the only writer is `setScalarData()`, which no core
code path calls for an image-volume manager. Cornerstone's own
`StreamingImageVolume.js:14-16 getScalarData()` is the same legacy accessor and would throw too.

Consequences for this packet:
- The `!raw` half of the `volume_not_ready` guard is **dead code**; control never reaches it.
- The commit-message and handoff claim that the undecoded-volume / eternal-spinner case is now
  handled cannot be delivered: the handler throws first, uncaught, out of a React `onClick` (React
  18 does not route event-handler throws to an error boundary).
- The lead's own closing command — *«Развернуть» ... ждём панораму + «точек N, длина M мм»* — will
  not produce a panorama. It will produce a console error and no window. The lead needs to know this
  before spending a session on it.
- Ironic detail: the builder wrapped one throwing cornerstone call and shipped a proof note about it,
  while leaving a bigger unwrapped throw two lines below.

**This is pre-existing** — `3f773b3e0^` has the identical line — so it is not a regression, and it is
strictly speaking outside the claimed defect. But it is inside the claimed file, inside the function
the packet rewrote, and it falsifies a claim the packet makes. It also means the original fake-spline
panorama probably never rendered either; the dossier's "the output LOOKS like a panoramic view" was
an assumption, not an observation.

### F3 (LOW) — the success banner is a raw Russian literal in JSX

`Cornerstone3DViewer.tsx:386-389`. See H8. Refusal strings are in the dictionary; the success string
is not.

### F4 (LOW) — the "panorama built" banner survives closing the panorama

`Cornerstone3DViewer.tsx:502` `onClose={() => setShowPanorex(false)}` clears only `showPanorex`.
`archSummary` stays set, so the green «Панорама построена по обведённой дуге…» banner keeps asserting
a panorama exists after the user has closed it. Cosmetic, but it is a green assurance decoupled from
what is on screen — the exact pattern that has been fooling reviewers on this repo.

### F5 (LOW, UNPROVEN) — cornerstone may reverse the dentist's points; unwrap handedness is not owned

`SplineROITool.js:601-603` calls `updateContourPolyline(..., {targetWindingDirection: Clockwise},
viewport, {updateWindingDirection: data.contour.closed})`, and
`updateContourPolyline.js:26-43` will `polyline.reverse()` **and** `data.handles.points.reverse()`
to force clockwise winding on a closed contour. The unwrap is built in stored order, so whether the
patient's left or right lands on the left of the panorama is decided by cornerstone's winding
normalisation, not by the trace or by any code in this packet. On a dental panorama that is a
wrong-site class concern. Static reading only; not runtime-proven. Nothing in the packet mentions it.

### Not a defect, recorded so nobody re-litigates it

- Column density: ~130 mm arch / 0.25 mm = ~520 columns, height = depth/0.5 (~240 rows), worst case
  20 mm slab = 41 samples/pixel -> ~5 M trilinear interpolations in a worker. Fine.
- `MAX_ARCH_SAMPLES = 4096` only binds above a 1024 mm arch. Never reached clinically. Harmless.
- Horizontal pitch 0.25 mm vs vertical 0.5 mm makes the output anisotropic 2:1, but the canvas is
  `object-contain`-stretched into an 800x300 Rnd window anyway, so aspect was already meaningless.
  Pre-existing; the builder's debt item #5 already names the underlying coupling.

---

## PART 5 — WHAT I WOULD REQUIRE

1. Handle `data.contour.closed`. Either drop the wrap-around segment before resampling (find the
   closing run and cut it), or refuse `closed` polylines and fall back to Catmull-Rom over the
   control points — which is open by construction and already correct. Add a test with
   `closed: true` and a polyline that returns to the start; assert the reconstruction does not
   contain the return sweep and that `lengthMm` matches the open arch.
2. Move `getScalarData()` inside a `try/catch` (or switch to a per-slice read that works on
   cornerstone 5) and route the throw to `volume_not_ready`. Without this the packet's own closing
   command cannot pass, and the lead will burn a session discovering that.
3. Put the success banner string in the same dictionary as the refusal strings.
4. Clear `archSummary` in `onClose`.
5. Correct the `apps/web/node_modules/@cornerstonejs/core/...` citation to the workspace-root path.
6. State F1 and F5 as declared debt if they are not fixed in this packet. Both are unstated today.
