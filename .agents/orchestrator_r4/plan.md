# Plan — Resurrected Session R4: DENTE CRM 4-State Visual Scrutiny & Remediation

## Objectives
1. **R1. 4-State E2E Screenshot Generation & Audit**:
   - Verify/execute `e2e_4state_audit.cjs` generating 68 fresh screenshots across 17 views/dialogs in 4 states (Mobile Light, Mobile Dark, PC Light, PC Dark).
   - Dispatch Visual Auditor subagents (using vision capabilities) to inspect all 68 screenshots for layout, contrast, z-index, text overlap, padding/margin, and hover defects.
2. **R2. UI/UX Remediation**:
   - Dispatch Worker subagents to fix all visual defects adhering to FSD, SOLID, and Tailwind tokens.
3. **R3. Code Health & Linter Baseline**:
   - Ensure `npm run typecheck` passes with 0 errors and Biome linter runs cleanly with zero errors/warnings on active codebase.
4. **Victory Gate**:
   - Run Forensic Auditor to confirm integrity and code quality before handing off to Sentinel.

## Execution Strategy & Steps

### Step 1: E2E 4-State Screenshot Audit Setup & Verification
- Dispatch `r4_explorer_1` (or worker) to verify `e2e_4state_audit.cjs`, execute screenshot generation script, and index all generated screenshot paths in `.agents/orchestrator_r4/screenshot_index.md`.

### Step 2: Visual Audit Scrutiny (Parallel Explorer/Auditor Subagents)
- Partition the 68 screenshots into logical domain batches (e.g. Schedule/Calendar, Patients/Medical Cards, Finance/Analytics, Settings/Communications).
- Dispatch `teamwork_preview_explorer` / visual auditor subagents armed with screenshot paths to perform vision inspection and document defects in `visual_audit_findings.md`.

### Step 3: UI/UX Defect Remediation
- Dispatch Worker subagents (`r4_worker_1_gen2`, `r4_worker_2_gen2`, `r4_worker_3_gen2`) to immediately fix 3 high-priority defects:
  1. `Mobile_Dark_panel_settings.png`: Fix overlapping tabs "НАСТРОЙКИ Настройки клиники" vs "МОЙ АККАУНТ Мой профиль" in `SettingsView.tsx` / CSS.
  2. `PC_Light_panel_communications.png`: Fix vertically squashed inputs & label overlaps under "ПОСТАВИТЬ В ОЧЕРЕДЬ" in `SettingsCommunicationsTab` / `MessageDeliveryConsole` / CSS.
  3. `PC_Dark_panel_schedule.png`: Fix vertical misalignment of `Все записи` button relative to date picker in Schedule toolbar.
- Workers run typecheck (`npm run typecheck -w @dental/web`) and Biome linter after edits to ensure zero regressions.

### Step 4: Code Health & Linter Verification
- Dispatch `teamwork_preview_reviewer` and `teamwork_preview_challenger` to verify full compilation (`npm run typecheck -w @dental/web`) and zero Biome linter errors.

### Step 5: Final Forensic Audit Gate
- Dispatch `teamwork_preview_auditor` for integrity verification.
- Upon passing, report completion to Sentinel.
