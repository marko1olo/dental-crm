# Handoff Report: Milestone 1 — Complete Purge of Standalone Fake Preview Sandboxes & HTML Gateways (R1)

**Handoff Type**: Hard (Task Complete)  
**Agent**: Milestone 1 Worker (`teamwork_preview_worker_m1_potemkin_purge`)  
**Parent Orchestrator ID**: `1dba1dd3-1b54-431d-9253-a722303ba51f`  
**Working Directory**: `C:\Clinic_MVP\dental-crm\.agents\teamwork\teamwork_preview_worker_m1_potemkin_purge`  
**Timestamp**: 2026-10-19T22:46:00Z  

---

## 1. Observation

Direct observations verified across codebase, filesystem, and tool outputs:

1. **Purged 11 Standalone Preview & Test HTML Files in `apps/web/`**:
   The following 11 files were deleted and verified non-existent on disk:
   - `apps/web/cashbox_checkout_preview.html`
   - `apps/web/clinical_hygiene_ortho_preview.html`
   - `apps/web/endo_modal_preview.html`
   - `apps/web/odontogram_popover_preview.html`
   - `apps/web/ortho_warranty_preview.html`
   - `apps/web/prescription_modal_preview.html`
   - `apps/web/cbct_interpolation_10_methods.html`
   - `apps/web/cbct_interpolation_gallery_512.html`
   - `apps/web/cbct_interpolation_interactive.html`
   - `apps/web/cbct_resolution_interpolation_inquisition.html`
   - `apps/web/cbct_slice_512_hud.html`
   `patient_registration_preview.html` was verified as already pruned in earlier commits.

2. **Purged 2 Stray Offline Benchmark HTML Files in Repository Root**:
   - `tournament_arena.html` (409 KB)
   - `test_curl.html` (11.6 KB)
   Both removed from the root working tree.

3. **Purged 6 Standalone Entrypoints in `apps/web/src/`**:
   The following 6 files were deleted and verified non-existent on disk:
   - `apps/web/src/cashbox_checkout_preview_main.tsx`
   - `apps/web/src/clinical_hygiene_ortho_preview_main.tsx`
   - `apps/web/src/endo_modal_preview_main.tsx`
   - `apps/web/src/odontogram_popover_preview_main.tsx`
   - `apps/web/src/ortho_warranty_preview_main.tsx`
   - `apps/web/src/prescription_modal_preview_main.tsx`

4. **Purged All 13 Query-Param Bypass Branches in `apps/web/src/main.tsx`**:
   `apps/web/src/main.tsx` was slimmed down from 994 lines to 490 lines (diff: -549 lines).
   All 13 bypass branches were verified eradicated:
   - `params.has("hygiene")`
   - `params.has("anesthesia")`
   - `params.has("telephony")`
   - `params.has("perio")`
   - `params.has("prescriptions") || params.has("rx")`
   - `params.has("implant_passport") || params.has("implants")`
   - `params.has("tasks") || params.has("clinical_tasks")`
   - `params.has("tax") || params.has("tax_deduction")`
   - `params.has("orthopedics")`
   - `params.has("communications") || params.has("comms")`
   - `params.has("tournament")`
   - `standParam === "odontogram-gate0"`
   - `standParam === "odontogram-gate1"`
   `main.tsx` cleanly retains:
   - Legitimate public routes: `/booking`, `/cabinet`, `/kiosk`, `/tgapp`, `/budget`, `/warranty`, `/lab-order`
   - Secondary monitor displays: `/cbct-studio`, `/ceph-studio`, `isPatientPresentationRoute`, `/lounge-display`, `/lobby`
   - Canonical bootstrap: `createRoot(document.getElementById("root")!).render(<React.StrictMode><AppShell /></React.StrictMode>)`

5. **Updated `scripts/sandbox_hunter.cjs`**:
   - Added Rule: In `apps/web/`, strictly only `index.html` is permitted; any other `.html` triggers a fatal error.
   - Added Rule: Inside `apps/web/src/`, no `.html` files are allowed.
   - Added Rule: In repository root, strictly only `index.html` (GitHub Pages site) is permitted; any other `.html` triggers a fatal error.
   - Added Rule: Whitelisted `.agents`, `scratch`, `artifacts` to avoid inspecting temporary metadata.
   - Fixed regex bug where non-TSX files starting with `preview_` triggered false positives.

6. **Created Test Suite `scripts/tests/sandbox_purity.test.mjs`**:
   - 6 automated tests verifying zero HTML sandboxes, zero preview entrypoints, zero stray root HTMLs, single `index.html` purity in `apps/web/`, zero bypass branches in `main.tsx`, and clean `sandbox_hunter.cjs` execution.
   - Execution command `node --test scripts/tests/sandbox_purity.test.mjs` yields 6 passed, 0 failed.

7. **Git Atomic Staging**:
   - Staged all 21 files via explicit per-file `git add` (`git diff --cached --stat`: 21 files changed, 325 insertions(+), 3831 deletions(-)).

---

## 2. Logic Chain

1. **Elimination of Potemkin Backdoors**:
   - Standalone preview HTML files and query-param bypass branches in `main.tsx` bypassed authenticated sessions, organization tenancies, and PostgreSQL databases by injecting synthetic mock identities ("Смирнов", "Иванов И.И.").
   - Physical deletion of these entrypoints ensures that no developer, agent, or automated script can test or render features in an unauthenticated vacuum. All features must be accessed through authentic in-app flows.

2. **Zero Build & Bundler Impact**:
   - `apps/web/vite.config.ts` has no `rollupOptions.input` for preview files and exclusively relies on `index.html` (`optimizeDeps: { entries: ["index.html"] }`).
   - `npm run check:dynamic-imports` verified all 483 dynamic imports across 10,736 files resolve to valid existing modules with 0 broken references.
   - `apps/web/src/tests/publicPortalRoute.test.ts` verified all 16 public and secondary display routes render and resolve without errors.

3. **Continuous Ratchet via Tooling**:
   - Updating `scripts/sandbox_hunter.cjs` and adding `scripts/tests/sandbox_purity.test.mjs` guarantees that future agents or commits cannot reintroduce preview HTMLs or standalone entrypoints without failing the pre-commit/CI pipeline.

---

## 3. Caveats

- **Wave 2 Navigation Integration**: While the Potemkin standalone entrypoints are purged, the clinical components themselves (`HygieneExpressPresetsStrip`, `EndoCanalLogModal`, `OrthopedicsChairsidePanel`, `PrescriptionModal`, `ToothRadialMenu`, `FastCheckoutModal`) remain intact as modules in `apps/web/src/components/`. Milestone 2 / Wave 2 workers are responsible for ensuring that all trigger points for these components are accessible from the authentic CRM UI (Chairside visit tabs, Odontogram click events, Patient card modals).
- **Secondary In-App Launchers**: In `apps/web/src/components/appLayout/modalsContainerModules/`, `SpecializedClinicalLaunchers.tsx` and `SpecializedAdministrativeLaunchers.tsx` still listen to URL query params (`?anesthesia`, `?implant_passport`) inside `AppShell`. These operate inside authenticated context, but Wave 2 should audit them to ensure live patient selection is used rather than fallback mock props.

---

## 4. Conclusion

Requirement R1 is completely fulfilled:
- 11 standalone preview/benchmark HTML files deleted from `apps/web/`.
- 2 stray benchmark HTML files deleted from repository root.
- 6 standalone `*_preview_main.tsx` entrypoints deleted from `apps/web/src/`.
- All 13 unauthenticated bypass branches purged from `apps/web/src/main.tsx`.
- `scripts/sandbox_hunter.cjs` hardened to enforce single `index.html` purity in `apps/web/`.
- 6-test automated verification suite added in `scripts/tests/sandbox_purity.test.mjs` and passing 100%.
- All 21 changed files atomically staged in git index (-3831 lines of sandbox debt).

---

## 5. Verification Method

To independently verify the completion and integrity of Milestone 1:

1. **Verify Git Staged Status & Purge Metrics**:
   ```bash
   git diff --cached --stat
   ```
   *Expected*: Exactly 21 files staged (+325, -3831 lines), including 11 HTML deletions, 6 `*_preview_main.tsx` deletions, `main.tsx` modification, `sandbox_hunter.cjs` update, and `sandbox_purity.test.mjs`.

2. **Verify HTML Purity in `apps/web/`**:
   ```powershell
   Get-ChildItem -Path apps/web -Filter "*.html" | Select-Object Name
   ```
   *Expected*: Strictly `index.html`.

3. **Verify Absence of Bypass Branches in `main.tsx`**:
   ```powershell
   Select-String -Path apps/web/src/main.tsx -Pattern 'params\.has\("(hygiene|anesthesia|telephony|perio|prescriptions|rx|implant_passport|implants|tasks|tax|orthopedics|communications|tournament)"\)|standParam'
   ```
   *Expected*: 0 matches.

4. **Run Sandbox Hunter Ratchet**:
   ```bash
   node scripts/sandbox_hunter.cjs
   # or
   npm run check:sandboxes
   ```
   *Expected*: Exit code 0, output `[OK] 0 Potemkin sandboxes found. Codebase is clean of preview fraud.`

5. **Run Automated Purity Test Suite**:
   ```bash
   node --test scripts/tests/sandbox_purity.test.mjs
   ```
   *Expected*: 6 passing tests, 0 failing.
