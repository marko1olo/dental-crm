# Project: DENTE Dental CRM — 2.5D Odontogram & Gate 0 First Article Inspection

## Architecture
- **Monolithic 2.5D Vector Anatomy Model**:
  - Frontal-Occlusal perspective projection with 17.5° tilt ($\cos 17.5^\circ \approx 0.954$, $\sin 17.5^\circ \approx 0.301$), providing simultaneous full-length root visibility and occlusal cusp relief.
  - Wheeler's Dental Anatomy Chapter 12 coordinates: continuous biological crown and root outlines.
  - Zero patchwork stained-glass tiles: non-destructive translucent clinical overlays over monolithic anatomy.
- **Cupertino Clinical Vector Shaders**:
  - Apple HIG porcelain-enamel multi-stop gradient (`#ffffff` -> `#f8fafc` -> `#f1f5f9` -> `#e2e8f0` -> `#cbd5e1`/`#ded5c4`).
  - Hairline 0.8px with `vector-effect="non-scaling-stroke"`.
  - Coaxial radiant endodontic gutta-percha (`#f43f5e` sheath + `#ffffff` 0.8px core).
- **Mandate 8b Modular Decomposition**:
  - All components and code files strictly $\le 120$ lines.
- **Live In-App Visual Test Stand**:
  - Mounted directly in `apps/web/src/main.tsx` via `?stand=odontogram-gate0`. Zero fake `*_preview.html` sandboxes.

## Feature Inventory
| # | Feature | Description | Milestone | Source |
|---|---------|-------------|-----------|--------|
| 1 | Tooth 46 Monolithic Crown Geometry | Unified 5-cusp outline (MB, DB, D, ML, DL) following Wheeler's Chapter 12 | M0 (Gate 0) | Spec Miner |
| 2 | Tooth 46 Fissure System | Surgical hairline developmental grooves (central, MB, DB, lingual, buccal pit) | M0 (Gate 0) | Spec Miner |
| 3 | Tooth 46 Monolithic Root Geometry | Divergent mesial root with sulcus longitudinalis + distal root with bifurcation at (50, 96) | M0 (Gate 0) | Spec Miner |
| 4 | Tooth 46 Endodontic System | 3 internal root canals (MB, ML, Distal) with coaxial radiant coral gutta-percha | M0 (Gate 0) | Spec Miner |
| 5 | Cupertino Clinical Shaders | SVG porcelain-enamel, root dentin, and gutta-percha shader definitions | M0 (Gate 0) | Rendering Explorer |
| 6 | Gate 0 Modular Components (<=120 lines) | `Tooth46Container`, `Tooth46OcclusalCusps`, `Tooth46Roots`, `Tooth46EndoCanals`, `Tooth46ShaderDefs` | M0 (Gate 0) | Worker |
| 7 | Live CRM Test Stand Integration | Mount in-app standalone inspection stand in `apps/web/src/main.tsx` via `?stand=odontogram-gate0` | M0 (Gate 0) | Worker |
| 8 | Automated Playwright Visual Proof | High-resolution screenshot capture in Light & Dark themes with WCAG 2.1 contrast verification | M0 (Gate 0) | Reviewer / Auditor |
| 9 | Dentition Expansion (Remaining 31 Teeth) | Expansion to full adult (11–48) and pediatric (51–85) dentition after Gate 0 approval | M1–M4 | Deferred |

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| M0 | Gate 0: First Article Inspection (Tooth 46) | `apps/web/src/components/odontogram/gate0/`, `apps/web/src/main.tsx`, `scripts/capture-odontogram-gate0-4state.mjs` | none | **APPROVED** (Gate 0 Masterpiece Passed All Gates) |
| M1 | Maxillary Dentition (Q1 & Q2: 11–28) | 16 adult upper teeth with 3-root molars & trifurcation | M0 | PLANNED |
| M2 | Mandibular Dentition (Q3 & Q4: 31–48) | 15 remaining adult lower teeth with 5-cusp molars | M0 | PLANNED |
| M3 | Deciduous Dentition (51–85) | 20 primary teeth with thin enamel & divergent roots | M0 | PLANNED |
| M4 | Clinical Layers & Deep CRM Integration | Full pathology state machine, visit diary, treatment plan links | M1, M2, M3 | PLANNED |

## Code Layout
- `apps/web/src/components/odontogram/gate0/`:
  - `tooth46GeometryConstants.ts` (Wheeler coordinates & dimensions)
  - `Tooth46ShaderDefs.tsx` (Apple HIG porcelain & gutta-percha gradients)
  - `Tooth46Roots.tsx` (Monolithic 2 divergent roots + CEJ)
  - `Tooth46OcclusalCusps.tsx` (5 cusps + surgical fissures)
  - `Tooth46EndoCanals.tsx` (3 canals MB, ML, D with luminous core)
  - `Tooth46Container.tsx` (Master composite 2.5D tooth component)
  - `Tooth46InspectionStand.tsx` (In-app interactive inspection stand)
- `apps/web/src/main.tsx`: Entry point wiring for `?stand=odontogram-gate0`.
- `scripts/capture-odontogram-gate0-4state.mjs`: Automated Playwright capture script.
- `docs/proofs/odontogram/`: Captured visual evidence PNGs.
