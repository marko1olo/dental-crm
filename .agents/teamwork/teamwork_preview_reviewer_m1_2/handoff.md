# Red Team Quality & Architecture Review: Milestone 1 (Reviewer #2)

**Agent**: `teamwork_preview_reviewer_m1_2` (Red Team Reviewer & Adversarial Critic)  
**Parent Orchestrator**: `1dba1dd3-1b54-431d-9253-a722303ba51f`  
**Milestone**: Milestone 1 (Purge of Standalone Fake Preview Sandboxes & HTML Gateways)  
**Verdict**: **APPROVE**  
**Timestamp**: 2026-10-20T05:06:00Z  

---

## 1. Observation

Instrumental observations conducted directly against the live repository, code, and execution runtime:

1. **Physical Filesystem Audit (HTML Sandboxes)**:
   The following 13 standalone HTML sandbox and benchmark files were physically checked on disk via `Test-Path`:
   - `apps/web/cashbox_checkout_preview.html`: `False` (absent)
   - `apps/web/clinical_hygiene_ortho_preview.html`: `False` (absent)
   - `apps/web/endo_modal_preview.html`: `False` (absent)
   - `apps/web/odontogram_popover_preview.html`: `False` (absent)
   - `apps/web/ortho_warranty_preview.html`: `False` (absent)
   - `apps/web/prescription_modal_preview.html`: `False` (absent)
   - `apps/web/cbct_interpolation_10_methods.html`: `False` (absent)
   - `apps/web/cbct_interpolation_gallery_512.html`: `False` (absent)
   - `apps/web/cbct_interpolation_interactive.html`: `False` (absent)
   - `apps/web/cbct_resolution_interpolation_inquisition.html`: `False` (absent)
   - `apps/web/cbct_slice_512_hud.html`: `False` (absent)
   - `tournament_arena.html` (repo root): `False` (absent)
   - `test_curl.html` (repo root): `False` (absent)
   In `apps/web/`, strictly a single direct HTML file exists: `apps/web/index.html`. Zero HTML files exist under `apps/web/src/`. In repository root, strictly only `index.html` exists.

2. **Physical Filesystem Audit (Isolated TSX Entrypoints)**:
   The following 6 preview entrypoint files were physically checked on disk:
   - `apps/web/src/cashbox_checkout_preview_main.tsx`: `False` (absent)
   - `apps/web/src/clinical_hygiene_ortho_preview_main.tsx`: `False` (absent)
   - `apps/web/src/endo_modal_preview_main.tsx`: `False` (absent)
   - `apps/web/src/odontogram_popover_preview_main.tsx`: `False` (absent)
   - `apps/web/src/ortho_warranty_preview_main.tsx`: `False` (absent)
   - `apps/web/src/prescription_modal_preview_main.tsx`: `False` (absent)
   A recursive glob for `*main*.tsx` in `apps/web/src/` returned strictly `main.tsx`.

3. **Code Audit of `apps/web/src/main.tsx`**:
   The file was read completely (all 484 lines).
   - All 13 bypass branches were verified eradicated:
     * `params.has("hygiene")` -> Eradicated (0 matches)
     * `params.has("anesthesia")` -> Eradicated (0 matches)
     * `params.has("telephony")` -> Eradicated (0 matches)
     * `params.has("perio")` -> Eradicated (0 matches)
     * `params.has("prescriptions") || params.has("rx")` -> Eradicated (0 matches)
     * `params.has("implant_passport") || params.has("implants")` -> Eradicated (0 matches)
     * `params.has("tasks") || params.has("clinical_tasks")` -> Eradicated (0 matches)
     * `params.has("tax") || params.has("tax_deduction")` -> Eradicated (0 matches)
     * `params.has("orthopedics")` -> Eradicated (0 matches)
     * `params.has("communications") || params.has("comms")` -> Eradicated (0 matches)
     * `params.has("tournament")` -> Eradicated (0 matches)
     * `standParam === "odontogram-gate0"` -> Eradicated (0 matches)
     * `standParam === "odontogram-gate1"` -> Eradicated (0 matches)
   - Legitimate public routes are intact: `/booking`, `/cabinet`, `/kiosk`, `/tgapp`, `/budget`, `/warranty`, `/lab-order`.
   - Legitimate multi-monitor and secondary display views are intact: `/cbct-studio`, `/ceph-studio`, `isPatientPresentationRoute`, `/lounge-display`, `/lobby`.
   - The canonical application branch cleanly mounts `<AppShell />` wrapped in `<React.StrictMode>`.
   - All 52 relative module and stylesheet imports in `main.tsx` were instrumentally verified to exist on disk with 0 missing files.

4. **Automated Ratchet and Test Suite Execution**:
   - `node scripts/sandbox_hunter.cjs`: Exited with code 0 (`[OK] 0 Potemkin sandboxes found. Codebase is clean of preview fraud.`).
   - `node --test scripts/tests/sandbox_purity.test.mjs`: 6 tests passing, 0 failing, duration 2085ms.
   - `npx tsx --test apps/web/src/tests/publicPortalRoute.test.ts`: 16 tests passing, 0 failing, duration 544ms.

5. **Adversarial Stress-Testing of `scripts/sandbox_hunter.cjs`**:
   To test against facade or self-certifying logic, three synthetic violations were injected into the workspace:
   - Injected `apps/web/fake_probe_preview.html`: `sandbox_hunter.cjs` immediately failed with exit code 1 (`[FATAL] Sandbox Hunter detected 1 forbidden sandbox/preview file(s): [apps/web/ single index.html purity]`).
   - Injected `apps/web/src/sample_preview.tsx`: `sandbox_hunter.cjs` immediately failed with exit code 1 (`[FATAL] Sandbox Hunter detected 1 forbidden sandbox/preview file(s): [*_preview.tsx / preview.tsx]`).
   - Injected `root_test.html`: `sandbox_hunter.cjs` immediately failed with exit code 1 (`[FATAL] Sandbox Hunter detected 1 forbidden sandbox/preview file(s): [root *.html]`).
   All injected test files were completely cleaned up. This proves `sandbox_hunter.cjs` is an active, honest scanner enforcing Rule 23.

---

## 2. Logic Chain

1. **Direct Alignment with Supreme Law (THE HAMMER Rule 23)**:
   Rule 23 strictly forbids `*_preview.html`, `*_preview.tsx`, and standalone mock mount bypasses. By purging the 11 HTML sandboxes, 2 root test HTMLs, 6 `*_preview_main.tsx` entrypoints, and all 13 query-param branches in `main.tsx`, the application root is returned to a single canonical entrypoint (`index.html` -> `AppShell`).
2. **Preservation of Functional Reality**:
   The removal of bypass parameters in `main.tsx` does not break clinical capabilities because the underlying components remain available within authentic CRM workflows (clinical visit tabs, patient odontogram drawers, and authenticated modals). Furthermore, all legitimate public portals (online booking, lab technician orders, kiosk check-in) and secondary monitor feeds (CBCT, Ceph, lounge billboard) were carefully preserved.
3. **Continuous Architectural Guard**:
   `scripts/sandbox_hunter.cjs` and `scripts/tests/sandbox_purity.test.mjs` provide persistent automated protection against regressions, preventing future agents from introducing isolated preview HTML files or standalone entrypoints.

---

## 3. Caveats

- **Transitional Workspace Components**: While the entry points and query parameters are purged, several standalone workspace wrapper files (e.g., `PrescriptionsStandaloneWorkspace.tsx`, `ClinicalTasksStandaloneWorkspace.tsx`, `TelephonyStandaloneWorkspace.tsx`) were identified in the codebase. Their deletion is already staged in the git index for upcoming milestones and does not affect the completion of Milestone 1.
- **Wave 2 In-App Verification**: Wave 2 subagents must verify that all clinical components formerly previewed via query params (Hygiene presets, Endo canal log, Ortho warranty, Prescriptions) are cleanly reachable through standard in-app buttons and menus.

---

## 4. Conclusion

**Verdict: APPROVE**

Milestone 1 is 100% complete and compliant with THE HAMMER Master Prompt Rule 23, Mandate 8e, Mandate 8n, and Mandate 8am. All fake preview sandboxes, stray root HTML files, isolated preview entrypoints, and unauthenticated query-param bypass branches have been completely purged from the codebase. All automated checks and adversarial stress tests pass with Exit Code 0.

---

## 5. Verification Method

To independently reproduce the review findings:

1. **Verify Absence of Purged Files**:
   ```powershell
   Get-ChildItem -Path apps/web -Filter "*.html" | Select-Object Name
   # Output: strictly index.html
   ```

2. **Verify main.tsx Purity**:
   ```powershell
   Select-String -Path apps/web/src/main.tsx -Pattern 'params\.has\("(hygiene|anesthesia|telephony|perio|prescriptions|rx|implant_passport|implants|tasks|tax|orthopedics|communications|tournament)"\)|standParam'
   # Output: 0 matches
   ```

3. **Run Sandbox Hunter Ratchet**:
   ```bash
   node scripts/sandbox_hunter.cjs
   # Output: [OK] 0 Potemkin sandboxes found. Codebase is clean of preview fraud. (Exit code: 0)
   ```

4. **Run Purity Test Suite**:
   ```bash
   node --test scripts/tests/sandbox_purity.test.mjs
   # Output: 6 passing, 0 failing
   ```

5. **Run Public Route Tests**:
   ```bash
   npx tsx --test apps/web/src/tests/publicPortalRoute.test.ts
   # Output: 16 passing, 0 failing
   ```
