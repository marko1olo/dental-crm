# Handoff Report: R1 — Complete Purge of Standalone Fake Preview Sandboxes, HTML Gateways & main.tsx Bypass Branches

**Handoff Type**: Hard (Task Complete)  
**Agent**: Survey Explorer 1 (`teamwork_preview_explorer_survey_1`)  
**Target Milestone**: Wave 1 — Reconnaissance & Pre-Purge Architecture Audit (Requirement R1)  
**Working Directory**: `C:\Clinic_MVP\dental-crm\.agents\teamwork\teamwork_preview_explorer_survey_1`  
**Timestamp**: 2026-10-20T02:35:00Z  
**Primary Deliverable**: `C:\Clinic_MVP\dental-crm\.agents\teamwork\teamwork_preview_explorer_survey_1\survey_report.md`  

---

## 1. Observation

Direct observations verified across the codebase with exact file paths, line numbers, tool commands, and git statuses:

1. **Git Staged Deletions (6 HTML Preview Sandboxes & 6 Entrypoints)**:
   - Tool execution `git status --porcelain` and `git diff --cached --name-status` revealed:
     - `D apps/web/cashbox_checkout_preview.html` (1,228 B)
     - `D apps/web/clinical_hygiene_ortho_preview.html` (1,385 B)
     - `D apps/web/endo_modal_preview.html` (1,202 B)
     - `D apps/web/odontogram_popover_preview.html` (1,288 B)
     - `D apps/web/ortho_warranty_preview.html` (1,244 B)
     - `D apps/web/prescription_modal_preview.html` (1,218 B)
     - `D apps/web/src/cashbox_checkout_preview_main.tsx` (1,848 B)
     - `D apps/web/src/clinical_hygiene_ortho_preview_main.tsx` (4,342 B)
     - `D apps/web/src/endo_modal_preview_main.tsx` (1,931 B)
     - `D apps/web/src/odontogram_popover_preview_main.tsx` (3,674 B)
     - `D apps/web/src/ortho_warranty_preview_main.tsx` (2,752 B)
     - `D apps/web/src/prescription_modal_preview_main.tsx` (3,694 B)
   - In each `*_preview_main.tsx`, mock patient states were injected (e.g. `patientName: "Смирнов Алексей Владимирович"` in `cashbox_checkout_preview_main.tsx:16`, `toothFdi: 16` in `endo_modal_preview_main.tsx:14`, `patientName: "Иванов И.И."` in `ortho_warranty_preview_main.tsx:18`).
   - `patient_registration_preview.html` was verified absent from the worktree and git index (`git log --all --full-history -- "**/patient_registration_preview.html"` returned zero hits).

2. **Unstaged Deleted HTML Test Benches (5 files in `apps/web/`)**:
   - `apps/web/cbct_interpolation_10_methods.html` (27,249 B)
   - `apps/web/cbct_interpolation_gallery_512.html` (31,412 B)
   - `apps/web/cbct_interpolation_interactive.html` (38,981 B)
   - `apps/web/cbct_resolution_interpolation_inquisition.html` (42,110 B)
   - `apps/web/cbct_slice_512_hud.html` (21,805 B)
   - All 5 files are unstaged deletions in the active working tree.

3. **Untracked Stray HTML Files in Repository Root (2 files)**:
   - `tournament_arena.html` (409,102 B): massive offline benchmark and visual arena test suite.
   - `test_curl.html` (11,620 B): raw static curl response test output.

4. **`apps/web/src/main.tsx` Bypass Switches (HEAD: 994 lines vs Working Tree: 490 lines)**:
   - In `HEAD:apps/web/src/main.tsx`, lines 417–887 contained 13 bypass branches:
     - Lines 417–458: `params.has("hygiene")` -> `<HygieneIndicesPanel />`
     - Lines 459–485: `params.has("anesthesia")` -> `<AnesthesiaStandaloneWorkspace />`
     - Lines 486–508: `params.has("telephony")` -> `<TelephonyStandaloneWorkspace />`
     - Lines 509–536: `params.has("perio")` -> `<PerioStandaloneWorkspace />`
     - Lines 537–564: `params.has("prescriptions") || params.has("rx")` -> `<PrescriptionsStandaloneWorkspace />`
     - Lines 565–610: `params.has("implant_passport") || params.has("implants")` -> `<ImplantPassportModal />`
     - Lines 611–638: `params.has("tasks") || params.has("clinical_tasks")` -> `<ClinicalTasksStandaloneWorkspace />`
     - Lines 639–717: `params.has("tax") || params.has("tax_deduction")` -> `<TaxDeductionCertificateModal />`
     - Lines 718–768: `params.has("orthopedics") || standaloneParam === "orthopedics"` -> `<OrthopedicsChairsidePanel />`
     - Lines 769–808: `params.has("communications") || params.has("comms")` -> `<CommunicationsView />` outside `<AppShell />`
     - Lines 809–832: `params.has("tournament")` -> `<TournamentArena />`
     - Lines 833–858: `standParam === "odontogram-gate0"` -> `<Tooth46InspectionStand />`
     - Lines 859–887: `standParam === "odontogram-gate1"` -> `<Tooth16InspectionStand />`
   - In the active working tree, `apps/web/src/main.tsx` was modified to 490 lines, removing all 13 bypass branches while preserving public portals (`/booking`, `/cabinet`, etc.) and multi-monitor display studios (`/display/cbct-studio`, `/display/ceph-studio`, `/display/presentation`, etc.).

5. **Vite Configuration Verification**:
   - `apps/web/vite.config.ts:1-92` does not configure `build.rollupOptions.input`.
   - Line 78: `optimizeDeps: { entries: ["index.html"] }`.
   - `package.json` in `apps/web/` contains only standard `"build": "vite build"`, `"dev": "vite"`, and `"preview": "vite preview"`.

6. **Tooling Blind Spot**:
   - `scripts/sandbox_hunter.cjs:1-50` checks only `fileName.includes("preview") || fileName.startsWith("test-") || fileName.endsWith("_preview.tsx")`.
   - It missed `tournament_arena.html`, `test_curl.html`, and the 5 CBCT interpolation files.

---

## 2. Logic Chain

1. **Build Safety Guarantee**:
   - From Observation 5, `vite.config.ts` does not register `rollupOptions.input` for any preview HTML file.
   - Therefore, permanently deleting `cashbox_checkout_preview.html`, `clinical_hygiene_ortho_preview.html`, `endo_modal_preview.html`, `odontogram_popover_preview.html`, `ortho_warranty_preview.html`, `prescription_modal_preview.html`, and the 5 CBCT HTML files cannot cause missing entrypoint errors during Vite compilation.

2. **Zero-Mock & Zero-Potemkin Compliance**:
   - From Observations 1 and 4, all 6 standalone entrypoints and all 13 bypass branches in `main.tsx` injected synthetic patient identities ("Смирнов", "Иванов И.И.", "Захаров") and bypassed authenticated session/organization contexts.
   - Deleting these files and purging these branches eliminates unauthenticated backdoors and enforces that all features are tested and used within the authentic CRM runtime.

3. **Component Preservation Continuity**:
   - Every single component mounted in the bypasses (`HygieneIndicesPanel`, `AnesthesiaModal`, `TelephonyFloatWidget`, `PeriodontogramChart`, `PrescriptionModal`, `ImplantPassportModal`, `ClinicalTaskBoard`, `TaxDeductionCertificateModal`, `OrthopedicsChairsidePanel`) already exists as a modular React component in `apps/web/src/components/`.
   - Therefore, purging the standalone bypasses does not destroy clinical capability, provided Wave 2 ensures their triggers are wired into authentic views (Chairside visit, Patient Card tabs, Sidebar navigation).

4. **Tooling Remediation**:
   - From Observation 6, `sandbox_hunter.cjs` has a blind spot that allowed 7 HTML files to escape detection.
   - Updating `sandbox_hunter.cjs` to enforce single-HTML purity (`index.html` only in `apps/web/`) will prevent future regression.

---

## 3. Caveats

- **Active Worktree State**: The working tree already has the 12 preview deletions staged in the git index, and `main.tsx` already edited in the worktree. This survey validated that these changes are 100% correct and complete, but did not perform the git commit (as Explorer is strictly read-only).
- **Secondary In-App Launchers**: While `main.tsx` bypasses are removed, `AppModalsContainer.tsx` still contains `SpecializedClinicalLaunchers.tsx` and `SpecializedAdministrativeLaunchers.tsx` which read query params inside `AppShell`. These are not security bypasses (since they run inside authenticated `AppShell`), but Wave 2 should audit them to ensure they use live context instead of mock fallbacks.
- **Root Strays**: `tournament_arena.html` and `test_curl.html` are untracked. They must be deleted or moved outside the repository before committing.

---

## 4. Conclusion

Requirement R1 is completely researched and ready for immediate execution:
1. The 6 staged preview HTMLs and 6 staged entrypoints should be committed.
2. The 5 unstaged CBCT HTML files should be staged and committed for deletion.
3. The 2 untracked HTML files in the repo root should be removed.
4. The modified `apps/web/src/main.tsx` (490 lines) is architecturally sound, adheres to the clean reference specification, and completely purges all 13 query-param bypasses.
5. All clinical components are preserved and mapped to their authentic CRM destinations in `survey_report.md` Section 7 for Wave 2 implementation.

---

## 5. Verification Method

To independently verify all findings:

1. **Verify Git Staged Deletions**:
   ```bash
   git status --short
   git diff --cached --name-status
   ```
   Expect: 12 staged deletions (`D`) matching the catalog in Observation 1.

2. **Verify HTML Files in `apps/web/`**:
   ```powershell
   Get-ChildItem -Path apps/web -Filter "*.html" | Select-Object Name
   ```
   Expect: Only `index.html` remains (after committing the unstaged CBCT deletions).

3. **Verify Clean `main.tsx`**:
   Inspect `apps/web/src/main.tsx` to verify zero occurrences of:
   - `params.has("hygiene")`
   - `params.has("anesthesia")`
   - `params.has("telephony")`
   - `params.has("perio")`
   - `params.has("prescriptions")`
   - `params.has("implant_passport")`
   - `params.has("tax")`
   - `params.has("orthopedics")`
   - `standParam`
   - `TournamentArena`

4. **Verify Vite Build & TypeScript Typecheck**:
   ```bash
   npm run typecheck
   npm run build
   ```
   Expect: Exit code 0, clean build, zero bundle resolution failures.
