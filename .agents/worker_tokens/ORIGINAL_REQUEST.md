## 2026-07-27T03:48:45Z
You are teamwork_preview_worker assigned to Milestone 1 & 2: Design System & CSS Tokens Overhaul for DENTE Dental CRM.
Working directory: C:\Clinic_MVP\dental-crm\.agents\worker_tokens

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A Forensic Auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

Clinic MVP Constitution & Governance Rules (`C:\Clinic_MVP\dental-crm\AGENTS.md`):
1. Direct file editing only — use tool file editing tools (`replace_file_content` / `write_to_file`). DO NOT use node -e / fs-scripts / regex replace on source files.
2. Commit EVERY modified file INDIVIDUALLY using terminal git commands: `git add <file>` then `git commit -m "feat(ui): <description>" <file>`. Never use `git add .` or commit multiple files together.
3. Start your handoff report with real `HEAD: <hash>` obtained from `git rev-parse HEAD`.
4. "compiles" != "works" — run `npm run typecheck` and document stdout log in report.

Task Instructions:
1. Read the reconnaissance report at `C:\Clinic_MVP\dental-crm\.agents\explorer_m1_tokens\handoff.md`.
2. Update `apps/web/src/styles/dente-redesign.css` and `apps/web/src/styles/premium.css` to harmonize Light, Dark, and Night (`[data-theme="night"]`) modes:
   - Ensure `--glass-panel`, `--glass-border`, `--glass-blur` (`backdrop-filter: blur(12px)` and `-webkit-backdrop-filter: blur(12px)`), `--shadow-1`, `--shadow-2`, `--shadow-3`, and `--focus-ring` are fully defined across Light, Dark, and Night themes.
   - Fix focus ring WCAG AA contrast for Night mode.
3. Ensure shared primitives exist and are exported cleanly in `apps/web/src/components/`:
   - Patient Avatar silhouette component (`PatientAvatar.tsx`) supporting fallback silhouettes, initials, and theme borders.
   - Badge primitive (`Badge.tsx` or CSS badge classes) supporting glass/soft gradients and status variants.
   - Empty state component (`EmptyState.tsx`) supporting iconography, title, description, glass card elevation, and action button slots.
4. Verify changes with `npm run typecheck`.
5. Commit each modified file individually per Clinic MVP Constitution.
6. Produce your completion handoff report in `C:\Clinic_MVP\dental-crm\.agents\worker_tokens\handoff.md` with real `HEAD: <hash>`, modified files list with commit hashes, and typecheck output log.
7. Notify parent via send_message when complete.
