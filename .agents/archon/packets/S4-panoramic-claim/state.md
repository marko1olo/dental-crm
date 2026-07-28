# S4-panoramic-claim — state

STATUS: DONE (see the RESUMED section at the bottom — incarnation #2 finished the packet)
Time: 2026-07-28 (session start)
HEAD at claim time: c78243b54303fa036cdd1fba1ebf909fad06ef29
git status --porcelain -- apps/web/src/components/dicom/ apps/web/src/tests/panoramicArch.test.ts
  -> only `?? .agents/archon/packets/R2-panoramic-rework/review.md` (reviewer's untracked file)
     and `?? .agents/archon/packets/S4-panoramic-claim/` (mine). NO COLLISION.

## AUTHORITY READ
- .agents/AGENTS.md, .agents/INDEX.md — complete.
- .agents/archon/packets/R2-panoramic-rework/review.md — complete (PART 1..PART 6).
- .agents/archon/packets/R2-panoramic-rework/handoff.md + state.md — complete.
- .agents/archon/packets/C5-panoramic-fake-spline/review.md — complete (lineage).
- Targets read IN FULL: apps/web/src/components/dicom/panoramicArch.ts (657),
  apps/web/src/components/dicom/Cornerstone3DViewer.tsx (568),
  apps/web/src/tests/panoramicArch.test.ts (962).

## DEFECT CONFIRMED at real lines
1. F1 (proof honesty). The number «91.9670 мм против 91.9684 мм ... 0.3879 мм» appears at:
   - R2 handoff.md:68-70 («Что изменено»)
   - R2 state.md:70-71 (PROVEN bullet)
   Baseline = the OPEN cornerstone polyline. The same packet (R2 handoff.md:18-20, quoting
   SplineROITool.js:245-269) proves a finished SplineROI is always CLOSED. So the baseline
   does not occur in production. CONFIRMED: measurement against a non-existent baseline.
2. F2 (false claim). R2 handoff.md:94 «русских литералов в JSX этого компонента не осталось».
   Verified FALSE at HEAD by reading Cornerstone3DViewer.tsx in full: Russian text nodes /
   state strings at :233, :236, :387, :427, :444, :463, :495, :558. Reviewer's line list
   reproduces exactly (they omitted :233, which is a console.error, also Russian).
3. Carried C5 items — verified present in code at HEAD (see handoff.md for each file:line).

## Packet
Rework of R2-panoramic-rework. Specification = .agents/archon/packets/R2-panoramic-rework/review.md
Claim: panoramic geometry module + Cornerstone3DViewer.tsx + their handoff/state docs.
Gate: npm run typecheck -w @dental/web

## Plan (order of operations)
1. state.md STARTED  <- done
2. Read .agents/AGENTS.md, .agents/INDEX.md, imaging domain doc. -> AUTHORITY READ
2b. Read R2 review.md COMPLETE + R2 handoff.md + state.md + C5 review.
3. git rev-parse HEAD; git status --porcelain on claimed files.
4. Read target files IN FULL, confirm defects at real lines. -> DEFECT CONFIRMED/ABSENT
5. Fix. -> EDIT WRITTEN
6. npm run typecheck -w @dental/web -> GATE PASSED
7. COMMIT (pathspec + retry loop) -> COMMITTED <hash>
8. Proofs (node:test) -> PROVEN
9. handoff.md -> DONE

## Log
- STARTED: packet dir created, state.md written before any reads.
- AUTHORITY READ (see above).
- DEFECT CONFIRMED (see above).
- EDIT WRITTEN: NEW apps/web/src/tests/panoramicArchVsCornerstone.test.ts — the measurement R2
  never took, re-derived against baselines that exist, with the control points recorded IN the
  file so every digit is re-derivable by one command.
  RUN: node --import tsx --test apps/web/src/tests/panoramicArchVsCornerstone.test.ts
  -> tests 14 / suites 5 / pass 14 / fail 0 / duration_ms 3188.713, TRUE_EXIT=0.
  Digest printed by the test (my own run, not the reviewer's):
    archHandles(7): closed pts=148 split=126; SEEN arch (closed portion) 97.9939 mm;
      open spline 90.8752 mm; reconstruction 90.8755 mm cols=361; shortfall vs SEEN 7.26 %;
      max col->SEEN segment dev 4.0081 mm; max col->OPEN segment dev 0.0138 mm;
      max col->OPEN VERTEX dev 0.3731 mm (the withdrawn metric); half the OPEN spline's own
      vertex spacing 0.3606 mm.
    TRACED_ARCH: SEEN 99.1526 mm; open 91.6719 mm; reconstruction 91.6748 mm cols=365;
      shortfall 7.54 %; col->SEEN 4.0460 mm; col->OPEN 0.0172 mm; col->OPEN VERTEX 0.3776 mm;
      half-spacing 0.3638 mm.
    analytic semi-ellipse a=28 b=30 (archHandles ONLY): 91.1333 mm;
      closed portion dev from analytic 3.6448 mm; reconstruction dev from analytic 0.5802 mm.
  Every one of these reproduces the reviewer's F1 figures to 4 decimals on an independent run.
- NEXT: typecheck gate, then commit the test, then correct the three wrong statements in the
  R2 docs, then commit those.

## RESUMED (second incarnation — first one died before the gate)
- Resume time: 2026-07-28, later session. The previous incarnation of this packet died between
  "EDIT WRITTEN" and the compile gate. Nothing was committed by it.
- HEAD moved: c78243b54 (prior claim time) -> 723e09fa3 at resume. Re-derived, not remembered.
- On disk, untracked, from incarnation #1: apps/web/src/tests/panoramicArchVsCornerstone.test.ts
- git status on claimed paths at resume: only that one untracked test + untracked packet dirs
  (other packets' review.md files, not mine). NO COLLISION on apps/web/src/components/dicom/**.
- Plan for this incarnation: re-read the spec COMPLETE, re-verify every claim of incarnation #1
  myself (its notes are NOT evidence), re-run the test, gate, commit, then fix the docs.

### Re-verified by incarnation #2 (my own reads, at HEAD 723e09fa3)
- Spec read COMPLETE: R2 review.md (360 lines, PART 1..PART 6). R2 handoff.md (243), R2 state.md (93),
  C5 review.md (273). .agents/AGENTS.md (163), .agents/INDEX.md (29).
- panoramicArch.ts (657) and Cornerstone3DViewer.tsx (568) read IN FULL by me.
- F1 baseline defect CONFIRMED in the record: R2 handoff.md:68-70 and R2 state.md:70-71 both carry
  «91.9670 мм против 91.9684 мм ... 0.3879 мм»; handoff.md:17-33 is the same packet's proof that a
  finished SplineROI is always closed. Measurement against a baseline the packet proves impossible.
- F2 CONFIRMED FALSE at handoff.md:94 («русских литералов в JSX этого компонента не осталось»).
  My own read of Cornerstone3DViewer.tsx finds Russian JSX text nodes at :427, :444, :463, :495, :558
  and Russian strings routed through state at :236 and :387, plus console.error at :233.
- Fixture identity CONFIRMED: panoramicArch.test.ts:90-97 archHandles = -28*cos(t), 30*sin(t)+11 over
  t = i/(count-1)*PI, which is exactly ellipsePoint() in the new test; :32-40 TRACED_ARCH matches
  TRACED_HANDLES verbatim with Z dropped.

### GATE + PROOFS (incarnation #2, my own runs)
- node --import tsx --test apps/web/src/tests/panoramicArchVsCornerstone.test.ts
  -> tests 14 / suites 5 / pass 14 / fail 0 / duration_ms 3402.1261, TRUE_EXIT=0 (before extension)
  -> tests 15 / suites 5 / pass 15 / fail 0 / duration_ms 3467.4728, TRUE_EXIT=0 (after extension)
- npm test -w @dental/web -> tests 452 / suites 82 / pass 452 / fail 0 / duration_ms 4044.3458,
  SUITE_TRUE_EXIT=0. My file is in the suite glob ("src/**/*.test.ts").
- npm run typecheck -w @dental/web -> TYPECHECK_EXIT=1. NOT GREEN, and NOT MINE: all six errors are
  `src/DocumentsView.tsx(2178|2185|2193|2224|2232|3082): error TS2304: Cannot find name
  'AnamnesisField'`. That file is ` M` in the tree and `git grep -c AnamnesisField HEAD --
  apps/web/src/DocumentsView.tsx` finds NOTHING in HEAD => another agent's in-flight edit.
  Zero diagnostics on any file of mine. My file IS in the program:
  `npx tsc -p tsconfig.json --noEmit --listFilesOnly | grep panoramicArch` lists
  panoramicArchVsCornerstone.test.ts. Honest label: TYPECHECK VERIFIED for my files only.
- Removed a dead `projectToAxialPlane` import that incarnation #1 left in the new test.

### Digest of my own run (all reviewer F1 figures reproduce to 4 decimals)
  archHandles(7): closed pts=148 split=126; closed FULL 154.2189 mm; SEEN arch 97.9939 mm;
    wrap-around 21 pts / 56.2250 mm = 36.5 % of the closed polyline; open 90.8752 mm;
    R2's mixed-baseline share 41.1 %; reconstruction 90.8755 mm cols=361; shortfall vs SEEN 7.26 %;
    col->SEEN 4.0081 mm; col->OPEN 0.0138 mm; col->OPEN VERTEX 0.3731 mm (withdrawn metric);
    half the OPEN spline's own vertex spacing 0.3606 mm.
  TRACED_ARCH: closed FULL 156.5652 mm; SEEN 99.1526 mm; wrap-around 21 pts / 57.4126 mm = 36.7 %;
    open 91.6719 mm; mixed 41.4 %; reconstruction 91.6748 mm cols=365; shortfall 7.54 %;
    col->SEEN 4.0460 mm; col->OPEN 0.0172 mm; col->OPEN VERTEX 0.3776 mm; half-spacing 0.3638 mm.
  analytic semi-ellipse a=28 b=30: 91.1333 mm; closed portion dev 3.6448 mm;
    reconstruction dev 0.5802 mm.

### COMMITTED
- 2e5516e3b543d539578edcead7c72e47498479c4 — test(снимки): цена отказа от polyline измерялась по
  кривой, которой в продакшене не бывает (1 file, +457)
- 44bcd3327de3dbbbf4783f19b2b71aeffa83f95e — test(снимки): доля обратного прохода считалась по одной
  кривой, а обход шёл по другой (1 file, +43)
- Index was EMPTY before each commit (`git diff --cached --name-only`), pathspec form + retry loop
  used both times, `git log -1 --stat` verified: only my file, Russian subject intact
  (U+0441 U+043D U+0438 U+043C U+043A U+0438).

### THIRD COMMIT + FINAL PROOFS
- ef5f57287c94754581c044190fc1370061083e26 — test(снимки): величина, доказывающая негодность открытой
  базы, в прогоне не печаталась (1 file, +35 −18). Reason: my correction of the R2 record quoted
  4.56/4.64 mm, which came from the REVIEWER's run, not mine. Now the metric is a helper, runs on BOTH
  fixtures and is printed: 4.5634 mm / 4.6369 mm on my own run.
- node --import tsx --test apps/web/src/tests/panoramicArchVsCornerstone.test.ts
  -> tests 16 / suites 5 / pass 16 / fail 0 / duration_ms 3301.3327, TRUE_EXIT=0
- npm test -w @dental/web -> tests 454 / suites 82 / pass 454 / fail 0 / duration_ms 4123.9867, EXIT=0
- npm run typecheck -w @dental/web -> EXIT 1, same six foreign DocumentsView.tsx TS2304 errors, zero
  on my files. `npx tsc -p tsconfig.json --noEmit --listFilesOnly | grep panoramicArch` proves my file
  is in the program.
- Library citations re-verified BY ME, not taken from the review:
  `ls apps/web/node_modules/@cornerstonejs/` -> only `tools`;
  root `node_modules/@cornerstonejs/core/dist/esm/types/IViewport.d.ts` :33 `export interface
  ViewReference {`, :41 `    viewPlaneNormal?: Point3;`;
  `cache/cache.js:214 this.getImage = (imageId, minQuality = ImageQualityStatus.FAR_REPLICATE) =>`,
  bare `return;` when absent; `enums/ImageQualityStatus.js:3-7` FAR_REPLICATE 1 / ADJACENT_REPLICATE 3
  / SUBRESOLUTION 6 / LOSSY 7 / FULL_RESOLUTION 8;
  `apps/web/src/mprMath.ts:65-74` allocates `new Float32Array(src.length)` (debt #8 arithmetic).
- ENCODING: no BOM on any edited file (first three bytes never EF BB BF); ripgrep
  `[\x{0420}\x{0421}][\x{0080}-\x{00FF}]|\x{FFFD}` over .agents/archon/packets returns zero hits in
  R2-panoramic-rework and S4-panoramic-claim.

### RECORD CORRECTED (the actual deliverable)
- .agents/archon/packets/R2-panoramic-rework/handoff.md — F1 number withdrawn in «Что изменено»;
  the missing "why the geometry is right" argument added; the JSX-literals claim retracted at :94;
  the unreproducible runtime digits in ПРОВЕРЕНО withdrawn and replaced; debts 8, 9, 10 added; new
  section «ПОПРАВКИ ПАКЕТА S4» with all five corrections including the fact that the false sentence
  survives forever in the immutable body of commit b4292f74d; S4 commits listed.
- .agents/archon/packets/R2-panoramic-rework/state.md — the two PROVEN bullets (:63-64 and :70-71)
  withdrawn and re-derived; a CORRECTED line added at the end of the timeline.
- Third place (CLAIMED PROVEN #6) was R2's structured output to the lead: not on disk, cannot be
  edited. The withdrawal is recorded in both files above and in my handoff instead.

STATUS: DONE

