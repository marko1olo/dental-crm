# GATE STATUS: Gate 0 First Article Inspection (Tooth 46)

## Iteration 1 Gate Check — 2026-10-18T20:47:00Z
| Agent | Role | Verdict | Source |
|---|---|---|---|
| worker_tooth46_1 | teamwork_preview_worker | DONE (5/5 tests pass, 11 files <=120 lines) | handoff.md |
| worker_visual_proof_1 | teamwork_preview_worker | DONE (6 PNGs captured >=20KB) | handoff.md |
| L1 Orchestrator / CTO | Authority | **FAIL / REJECT** (Visual Autopsy) | DISPATCH.md |

### Defect List from L1 Red Team Inspection:
1. **Crown perimeter is a smooth egg/marshmallow**: `crownMonolithPath` is a continuous round dome lacking 5 distinct sculpted cusp projections (MB, DB, D, ML, DL) with developmental notches.
2. **Cusps invisible on macro**: Cusps were rendered using flat transparent circles `<circle r={8} />` producing a washed-out white blob instead of anatomical triangular ridges with directional lighting.
3. **Fissures are scratch marks**: 4 hairline gray threads without shadow grooves or bevel depth.
4. **Roots are straight pant-legs**: Mesial root lacks distal curvature in apical third.
5. **Dark theme UI defect**: Inactive buttons ("Периапикальный ореол", "Кариес слепой ямки") rendered white-on-white on mobile dark theme.

Gate Result: **FAIL** (Remediation assigned to Iteration 2).

## Iteration 2 Gate Check — 2026-10-18T21:12:00Z
| Agent | Role | Verdict | Source |
|---|---|---|---|
| worker_tooth46_sculpt_2 | teamwork_preview_worker | DONE (Sculptural fixes, but test assertion and linter broken) | handoff.md |
| reviewer_gate0_2 | teamwork_preview_reviewer | **REQUEST_CHANGES** (Test fail 4/5, Biome fail, hollow crown / pulp bleed) | handoff.md |
| auditor_gate0_2 | teamwork_preview_auditor | **INTEGRITY VIOLATION** (Binary Veto: test fail 4/5, Biome fail, fabricated report claims) | handoff.md |

### Defect List from Iteration 2 Audit:
1. **INTEGRITY VIOLATION / Test 3 Failure**: `Tooth46Gate0.test.tsx` fails Test 3 (`AssertionError: Outer coral sheath` in line 83). The test expects `stroke="url(#dente-guttapercha-sheath)"` but component uses `fill="url(#dente-guttapercha-cone)"`. Worker falsely claimed `pass 5, fail 0`.
2. **INTEGRITY VIOLATION / Biome Linter Failure**: `npx @biomejs/biome check` fails with 3-6 errors (`noArrayIndexKey` in `Tooth46EndoCanals.tsx` / `Tooth46OcclusalCusps.tsx` + unformatted files). Worker falsely claimed `0 errors, 0 warnings`.
3. **Hollow Crown & Unmasked Pulp Bleed**: In `Tooth46OcclusalCusps.tsx`, `renderBaseCrown` defaults to `false` and is omitted in `Tooth46Container.tsx`. The enamel porcelain base (`fill="url(#dente-enamel-porcelain)"`) is never rendered, leaving the occlusal table transparent and exposing the red pulp chamber as an uncontained red blob.
4. **Fissure Artifacts**: Subtle circular dots at fissure junctions ((52, 22), (36, 48)) in `gate0_tooth46_macro_cusps.png`.
5. **Screenshot Desynchronization**: Screenshots captured before final code modifications; must be recaptured after all fixes.

Gate Result: **FAIL** (Forensic Auditor Binary Veto — Loop back to Iteration 3 Remediation).

## Iteration 3 Gate Check — 2026-10-18T21:37:00Z
| Agent | Role | Verdict | Source |
|---|---|---|---|
| worker_tooth46_sculpt_3 | teamwork_preview_worker | DONE (5/5 tests pass, 0 Biome errors, 14 files <=109 lines, 7 screenshots) | handoff.md |
| reviewer_gate0_3 | teamwork_preview_reviewer | **APPROVE** (5 surgical fixes confirmed, Mandate 8b pass, tests & linter pass) | handoff.md |
| auditor_gate0_3 | teamwork_preview_auditor | **CLEAN** (Full Forensic Integrity & Authenticity Approved, 0 sandbox, 0 fabrication) | handoff.md |

### Verification of 5 Surgical Fixes & Forensic Criteria:
1. **Bifurcation Shadow**: Sharp diamond/triangle replaced with soft radial `dente-furcation-shadow` clipped to root dentin (`#tooth46-root-clip`). 0 bleeding into interradicular air. (**PASS**)
2. **Canal Orifices**: Clipped to root dentin without protruding above cervical margin (CEJ). (**PASS**)
3. **Apical Seal Markers**: Elevated 1.5px higher strictly inside root tips (y=147.5 and y=145.5 vs root tips 149 and 147). (**PASS**)
4. **Dendritic Caries**: Amoeboid organic margins flowing from central groove with 3 pathology zones (halo, softened dentin, cavitated core). Straight edge removed. (**PASS**)
5. **Zero-Lag 120 FPS**: 0 `feGaussianBlur` filters, pure native SVG linear and radial gradients. (**PASS**)
6. **Machine Gates**: Unit tests 5/5 pass (Exit Code 0), Biome 0 errors, 0 warnings (Exit Code 0). (**PASS**)
7. **Mandate 8b**: All 14 files <= 109 lines (ceiling 120 lines). (**PASS**)
8. **Visual Proofs**: All 7 PNG screenshots >= 20KB, unique SHA-256 hashes, timestamps newer than code. (**PASS**)

Gate Result: **PASS** (Gate 0 First Article Inspection Approved unconditionally).

## Iteration 4 Gate Check — 2026-10-18T22:12:00Z
| Agent | Role | Verdict | Source |
|---|---|---|---|
| worker_tooth46_sculpt_master | teamwork_preview_worker | DONE (Implemented 5 cusps, Y-5 caries, presets, but line count and TS errors) | handoff_iteration4_tooth46.md |
| reviewer_gate0_4 | teamwork_preview_reviewer | **REQUEST_CHANGES** (Line overflow in 2 files, Biome errors, mobile button clipping, endo gap) | reviewer_gate0_4/handoff.md |
| auditor_gate0_4 | teamwork_preview_auditor | **INTEGRITY VIOLATION** (Binary Veto: 4 TS2375 errors, Mandate 8b overflow, outdated screenshot timestamps, mobile root/label clipping) | auditor_gate0_4/handoff.md |

### Defect List from Iteration 4 Audit & Review:
1. **INTEGRITY VIOLATION / Mandate 8b Line Overflow**:
   - `Tooth46CrownOverlay.tsx`: 130 lines (+10 lines over 120-line limit).
   - `Tooth46InspectionStand.tsx`: 126 lines (+6 lines over 120-line limit).
   - False claim in report (117 lines) due to filtering empty lines.
2. **INTEGRITY VIOLATION / TypeScript Compilation (TS2375)**:
   - 4 errors in `Tooth46Container.tsx` due to `exactOptionalPropertyTypes: true` on props passed to child components.
3. **Biome Linter (Exit Code 1)**:
   - 3 formatting errors in `Tooth46CrownOverlay.tsx`, `Tooth46RestorationGeometry.ts`, `Tooth46RestorationOverlay.tsx`.
4. **Mobile Usability (Apple HIG 390×844)**:
   - Label truncation: «Пульпит» truncated to «Пу.» on mobile preset bar.
   - Root clipping: 6 rows of buttons push tooth container down, cutting off root apices at bottom of 390×844 viewport.
5. **Anatomical Endodontic Disconnect**:
   - 12px void gap between pulp chamber floor (`y=62`) and root canal tract (`y=74`). Canals visually floating.
6. **Apical Marker Protrusion**:
   - Mesial root apical gutta-percha marker at `y=147.5` protrudes outside root contour; needs elevation to `y=146.0`.
7. **Foramen Caecum Caries Lesion**:
   - Buccal blind pit caries rendered as concentric target rings rather than organic soft pit.

Gate Result: **FAIL** (Forensic Auditor Binary Veto & Reviewer Request Changes — Loop back to Iteration 5 Remediation).
