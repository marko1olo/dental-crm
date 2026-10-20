## 2026-10-19T09:46:50Z
You are the Test Stand & Visual Proof Pipeline Explorer for Gate 1 (Upper First Molars: FDI 16 & 26). Subagents MUST read `C:\Clinic_MVP\dental-crm\.agents\teamwork\ORIGINAL_REQUEST.md` before starting work. Your mission is to explore and blueprint the integration of Gate 1 into the live CRM application contour in `apps/web/src/main.tsx` (`?stand=odontogram-gate1` or unified selector `?stand=odontogram&tooth=16`), along with the automated visual proof capture pipeline using Playwright. You do NOT write or modify code directly.

Investigate `apps/web/src/components/odontogram/gate0/Tooth46InspectionStand.tsx` and related stand components. Plan the architecture for `Tooth16InspectionStand.tsx` and a unified Gate 1 multi-tooth stand:
1) Zoom levels: 1x (standard view), 2x (macro inspection), and 4x (micro-structure inspection of fissures, Carabelli, and canal apices);
2) Theme switching: crisp Apple HIG Light mode and true OLED Dark mode (`var(--paper)`, `var(--ink)`, `var(--line)`);
3) Tooth selection: seamless switching between Tooth 16 (Upper Right) and Tooth 26 (Upper Left);
4) Presets & Layer controls: single-row horizontally scrolling pill bar (`flex md:flex-wrap overflow-x-auto`) for toggling Enamel, Roots, Trifurcation, Endo Canals (MB1, MB2, DB, Palatal), Pulp Chamber, Caries, Perio, Restoration, and Crown Materials (ZrO2, PFM, E-Max, Gold, Co-Cr, PMMA);
5) State toggles: Intact vs Defective restorations.

Study the mobile inspection requirements and lessons from Gate 0 Iteration 5:
1) Zero word truncation in Russian UI: replace long strings like «СОСТОЯНИЕ:» with compact «Пресет:», ensure no ellipsis cuts («Компл...»);
2) Touch target minimum $\ge 44\times 44\text{px}$ for all buttons and interactive controls;
3) Apex vertical clearance: the 3 roots of the maxillary molar must never be clipped by bottom controls. Ensure >150px vertical clearance between root apices and floating toolbars on mobile;
4) Zero horizontal viewport overflow: `overflow-x: clip; max-width: 100vw;`.

Examine `scripts/capture-odontogram-gate0-4state.mjs` and design `scripts/capture-odontogram-gate1-4state.mjs`:
1) Target views: Desktop Light (1440x900), Desktop Dark (1440x900), Mobile Light (390x844), Mobile Dark (390x844);
2) Macro shots: 4x zoom on occlusal surface (Cusp of Carabelli, crista obliqua), 4x zoom on trifurcation and 4 root canals (MB1, MB2, DB, Palatal);
3) Pathology shots: Caries, Pulpitis, Periapical lesion on palatal apex, Obturated canals with gutta-percha, Zirconia crown, Gold crown;
4) Anti-Blank Guard: verify that every captured screenshot is $\ge 20\text{KB}$ with non-trivial pixel variance;
5) Output destination: `docs/proofs/odontogram/gate1_tooth16_*.png` and `gate1_tooth26_*.png`.

Formulate a complete plan for all stand files and scripts complying strictly with Mandate 8b (all files <= 120 lines). Detail how `main.tsx` will route to Gate 1 without disturbing Gate 0. Write your comprehensive report to `C:\Clinic_MVP\dental-crm\.agents\teamwork\explorer_gate1_stand\handoff.md`. When finished, message the orchestrator with your summary.
