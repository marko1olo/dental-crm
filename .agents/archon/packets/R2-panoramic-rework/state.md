# R2-panoramic-rework — state

STATUS: DONE
Started: 2026-07-28
HEAD at claim time: d9c90d6852a5c17e7ce8c8f7af300940787e8673 (moved to 6d97e0e7d before my first commit)
git status --porcelain -- apps/web/src/components/dicom/ apps/web/src/tests/panoramicArch.test.ts => EMPTY. No collision.

## Packet
Rework of C5-panoramic-fake-spline. Specification = .agents/archon/packets/C5-panoramic-fake-spline/review.md
Claim: panoramic geometry module + Cornerstone3DViewer.tsx touched by C5 + its node:test.
Compile gate: npm run typecheck -w @dental/web

## Required items (verdicts; full detail in handoff.md)
- F1 HIGH closed contour ignored -> CLOSED
- F2 HIGH getScalarData() throws -> CLOSED
- F3 LOW raw Russian literal in JSX -> CLOSED
- F4 LOW banner survives onClose -> CLOSED
- F5 LOW unowned handedness -> CLOSED (determinism), display side NOT VERIFIED
- Citation apps/web/node_modules/@cornerstonejs/core/... -> CORRECTED (reviewer right)
- H5.1 "imagingUiLabels outside my claim" wrong reason -> corrected in handoff, debt restated

## Commits
- b4292f74d956e902a7d3802c6b4fc941817ef6d3 — fix (panoramicArch.ts, Cornerstone3DViewer.tsx) +285 -12
- 511403807cc2d4bf46eea165173e617ae549a061 — tests (tests/panoramicArch.test.ts) +513 -3
- packet docs committed separately (state.md, commitmsg*.txt, handoff.md)

## Timeline
- STARTED — packet dir + state.md written before reading anything.
- AUTHORITY READ — .agents/AGENTS.md, .agents/INDEX.md, .agents/UI_STANDARDS.md,
  C5 review.md + handoff.md + state.md, all read in full.
- DEFECT CONFIRMED (all reviewer findings reproduce):
  * F1: `rg -n "closed" apps/web/src/components/dicom/panoramicArch.ts` -> only line 46 (the type
    declaration). Nothing read it. SplineROITool.js:264 stores `data.contour.closed`, :767 sets
    `spline.closed = !!data.contour.closed`, :599-603 stores the FULL `spline.getPolylinePoints()`.
  * F2: VoxelManager.js:273-286 `getScalarData()` throws `'No scalar data available'` when neither
    `scalarData` nor `_getScalarData` is set; `createImageVolumeVoxelManager` (VoxelManager.js:505-597)
    sets neither (only `_getScalarDataLength` at :636). cornerstone core = 5.1.3.
    A WORKING path exists: `voxelManager.getCompleteScalarDataArray()` (VoxelManager.js:643-669,
    typed optional at VoxelManager.d.ts:21) reads per-slice through the image cache.
  * F3/F4: Cornerstone3DViewer.tsx:386-389 raw literal; :502 onClose left archSummary set.
  * F5: updateContourPolyline.js reverses BOTH polyline and handles for closed contours
    (SplineROITool.js:603 `updateWindingDirection: data.contour.closed`).
  * Citation: `ls apps/web/node_modules/@cornerstonejs/` -> `tools` only; core is at workspace-root
    `node_modules/@cornerstonejs/core`, where IViewport.d.ts:41 is `viewPlaneNormal?: Point3;` inside
    `interface ViewReference` (:33). Reviewer right on both counts.
- Column order = image column order: mprMath.ts:237 `width = splinePoints.length`,
  :267-268 `pixels[rowOffset + x] = ... splinePoints[x]` -> curve[0] is the LEFTMOST column.
- EDIT WRITTEN — panoramicArch.ts (closed handling, polylineReturnsToStart,
  orientArchPatientRightFirst, panoramicReadyLabel, readVolumeScalarData) +
  Cornerstone3DViewer.tsx (voxel read via readVolumeScalarData, ready label from the dictionary,
  archSummary cleared in onClose).
- GATE PASSED — `npm run typecheck -w @dental/web` EXIT=0; `npx tsc -b --force --noEmit` in apps/web
  EXIT=0 (forced full rebuild, so the green is not an incremental cache).
- COMMITTED b4292f74d956e902a7d3802c6b4fc941817ef6d3, 2 files, +285 -12, Russian subject intact.
- Tests written; 54/54 pass on the file, 436/436 on `npm test -w @dental/web`, typecheck EXIT=0.
- COMMITTED 511403807cc2d4bf46eea165173e617ae549a061 (tests only).
- PROVEN:
  * DISCRIMINATION: the HEAD test file run against the PRE-FIX module extracted to
    C:/Users/Admin/AppData/Local/Temp/r2-panoramic-proof -> tests 54 / pass 31 / fail 23, including
    `the return sweep survived at {"x":25.88,"y":11.0}` and
    `reported arch length 147.0583190833509 mm is not the open arch 91.13262102074131 mm`.
  * RUNTIME probe against installed cornerstone 5.1.3 CatmullRomSpline: open polyline 127 points,
    the same control points with `closed = true` -> 148 points ending back at (-28, 11), closing gap
    exactly 0. F1 is runtime-proven, not just static.
    MM DIGITS WITHDRAWN BY S4 (`91.968 / 155.288`, `+40.8%`): this probe's control points were never
    recorded, so none of them is re-derivable from the repository. On the repo's own fixtures, now
    pinned by `apps/web/src/tests/panoramicArchVsCornerstone.test.ts`: open 90.8752 mm, closed
    154.2189 mm, wrap-around run 21 vertices / 56.2250 mm = 36.5% of the polyline the pre-fix code
    actually walked (TRACED_ARCH: 91.6719 / 156.5652 / 57.4126 mm = 36.7%). The withdrawn `40.8%` was
    (closed - OPEN)/closed, a mixed baseline. Substance unchanged and still worse than the C5
    review's ~30% estimate.
  * RUNTIME probe against installed cornerstone 5.1.3 VoxelManager: `createImageVolumeVoxelManager`
    -> `getScalarData() THREW: No scalar data available` even with all slices decoded and cached;
    `getCompleteScalarDataArray()` -> Int16Array length 48 = 4*4*3 with the right per-slice values.
    `readVolumeScalarData` against that real manager: all decoded -> ready len=48; one slice missing
    -> volume_not_ready; legacy-only accessor -> volume_not_ready and no throw escapes.
  * Fallback cost: WITHDRAWN IN FULL BY PACKET S4. The claim was "HEAD reconstruction 91.9670 mm vs
    cornerstone's own open polyline 91.9684 mm (0.002%); max distance from any output column to the
    drawn curve 0.3879 mm". Wrong on both halves: the OPEN polyline is a baseline this same packet
    proves can never reach `buildPanoramicArch` (a finished SplineROI is always closed,
    `SplineROITool.js:245-269`), and `0.3879 mm` is a column->nearest-VERTEX metric whose floor is
    half the baseline's own vertex spacing (0.3606 mm), so it could not have reported less.
    Re-derived against the curve the dentist actually sees (the arch portion of the CLOSED polyline),
    pinned by `apps/web/src/tests/panoramicArchVsCornerstone.test.ts`, 15 tests, EXIT=0:
    reconstruction is 7.26% shorter (97.9939 -> 90.8755 mm, archHandles(7)) and 7.54% shorter
    (99.1526 -> 91.6748 mm, TRACED_ARCH); max column deviation 4.0081 mm and 4.0460 mm, i.e. ~16 CBCT
    voxels, not "under two". Against the analytic semi-ellipse the fixture models (91.1333 mm) the
    reconstruction is 0.5802 mm off and cornerstone's closed rendering 3.6448 mm off, so the geometry
    was left alone deliberately: it is the most accurate of the three candidate curves.
- DONE — handoff.md written.
- CORRECTED 2026-07-28 by packet S4 (`.agents/archon/packets/S4-panoramic-claim`) after review
  `.agents/archon/packets/R2-panoramic-rework/review.md` returned NEEDS_REWORK on two false statements
  this packet added to the record. No panorama code was changed; the review required the geometry to be
  left alone. See "ПОПРАВКИ ПАКЕТА S4" in handoff.md for all five corrections, and debts 8-10 there
  for the three items PART 6 required to be declared.

## Files
- EDIT apps/web/src/components/dicom/panoramicArch.ts
- EDIT apps/web/src/components/dicom/Cornerstone3DViewer.tsx
- EDIT apps/web/src/tests/panoramicArch.test.ts

## Commands that produced the proofs
- npm run typecheck -w @dental/web                                          -> EXIT 0
- (cd apps/web && npx tsc -b --force --noEmit)                               -> EXIT 0
- node --import tsx --test apps/web/src/tests/panoramicArch.test.ts          -> 54/54, EXIT 0
- npm test -w @dental/web                                                    -> 436/436, EXIT 0
- node --import tsx --test <pre-fix tree>/src/tests/panoramicArch.test.ts    -> 31 pass / 23 fail
- node --import tsx -e "<read-only cornerstone probes>"                      -> quoted above

## Found, NOT fixed (out of claim, unchanged from C5)
- Cornerstone3DViewer.tsx `simulateImplantPlacement` still fabricates bone density
  (`classification = "D2"`, `avgHu = 650`) and prints it as a clinical "AI Auto-Protocol".
  `calculateImplantBoneDensity` is imported and never called. Needs its own packet.
- mprMath.ts `interpolateSpline` still claims Catmull-Rom over a linear-subdivision body
  (duplicated at apps/web/src/utils/math/mprMath.ts). Zero callers.
