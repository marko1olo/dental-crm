# C5-panoramic-fake-spline — state

STATUS: DONE
Time: 2026-07-28
Agent: implementer under [ARCHON]

## Timeline
- STARTED — packet dir created before reading anything.
- AUTHORITY READ — .agents/AGENTS.md, .agents/INDEX.md, .agents/UI_STANDARDS.md read in full.
- HEAD at plan time 26f1f3c59; moved to 1c9a05bb, then a8531562d during the packet (parallel authors).
- git status --porcelain -- apps/web/src/components/dicom/ => EMPTY at claim time. No collision.
- DEFECT CONFIRMED — Cornerstone3DViewer.tsx:228-232, fake spline literal on :232.
- EDIT WRITTEN — panoramicArch.ts (new) + Cornerstone3DViewer.tsx.
- GATE PASSED — `npm run typecheck -w @dental/web` exit 0; `npx tsc -b --force --noEmit` exit 0 (15.2s
  full rebuild, so the green is not a stale incremental cache).
- COMMITTED 3f773b3e0c66d4be7a93a691e54f051afe74036d (fix, before proofs).
- Wrote apps/web/src/tests/panoramicArch.test.ts. First run: 24 pass / 3 fail.
  Two failures were bad assertions of mine. ONE WAS A REAL DEFECT IN MY CODE: three coincident
  traced points returned status "ready" and produced a strip of one repeated ray. Fixed with a
  length-based guard and a dedicated `degenerate_arch` reason.
- PROVEN — 29/29 pass on the new file; 406/406 on `npm test -w @dental/web`; typecheck exit 0.
- COMMITTED f11754ea4f6226e029a7f706eec8d3917126878c (degenerate-arch fix + tests).
- Encoding audit on my files: no BOM, 0 mojibake lines, Cyrillic intact.
- DONE — handoff.md written.

## Files
- NEW  apps/web/src/components/dicom/panoramicArch.ts
- EDIT apps/web/src/components/dicom/Cornerstone3DViewer.tsx
- NEW  apps/web/src/tests/panoramicArch.test.ts

## Commands that produced the proofs
- node --import tsx --test apps/web/src/tests/panoramicArch.test.ts   -> 29/29, exit 0
- npm test -w @dental/web                                             -> 406/406, exit 0
- npm run typecheck -w @dental/web                                    -> exit 0
- (cd apps/web && npx tsc -b --force --noEmit)                        -> exit 0, 15.2s

## Situation 2 verdict (was the ROI available?)
YES. Captured all along by SplineROITool and readable through
`cornerstoneTools.annotation.state.getAnnotations`. The code threw it away. Evidence with file:line
is in handoff.md.

## Reachability verdict
LIVE. AppRouter.tsx:75 -> ImagingView.tsx:504 -> Cornerstone3DViewer.tsx:473 «Развернуть».

## Found, NOT fixed (out of claim)
- Cornerstone3DViewer.tsx:336-378 `simulateImplantPlacement` fabricates bone density
  (`classification = "D2"`, `avgHu = 650`) and renders it as a clinical "AI Auto-Protocol" with a
  nerve-proximity warning. `calculateImplantBoneDensity` is imported (line 9) and never called.
  Same class of defect as C5, higher clinical risk. Needs its own packet.
- Dossier §5.6 line 318 cites `:230-232`; the literal is on 232, the block is 229-232.
