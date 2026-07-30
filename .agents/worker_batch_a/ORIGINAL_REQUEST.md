## 2026-07-27T03:50:19Z

<USER_REQUEST>
You are teamwork_preview_worker assigned to Milestone 2: Batch A UI/UX Overhaul (Shift, Schedule, Patients, Visit, Imaging) for DENTE Dental CRM.
Working directory: C:\Clinic_MVP\dental-crm\.agents\worker_batch_a

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A Forensic Auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

Clinic MVP Constitution & Governance Rules (`C:\Clinic_MVP\dental-crm\AGENTS.md`):
1. Direct file editing only — use tool file editing tools (`replace_file_content` / `write_to_file`). DO NOT use node -e / fs-scripts / regex replace on source files.
2. Commit EVERY modified file INDIVIDUALLY using terminal git commands: `git add <file>` then `git commit -m "feat(ui): overhaul <component>" <file>`. Never use `git add .` or commit multiple files together.
3. Start your handoff report with real `HEAD: <hash>` obtained from `git rev-parse HEAD`.
4. "compiles" != "works" — run `npm run typecheck` and document stdout log in report.

Task Instructions:
1. Read inventory findings at `C:\Clinic_MVP\dental-crm\.agents\explorer_m1_batch_a\handoff.md` and design tokens handoff at `C:\Clinic_MVP\dental-crm\.agents\worker_tokens\handoff.md`.
2. Refactor component and view files for Batch A (Shift, Schedule, Patients, Visit, Imaging):
   - Replace hardcoded inline styles (`style={{...}}`) with CSS variable utilities or clean modular CSS classes.
   - Replace hardcoded static hex/rgb color strings with dynamic CSS theme variables (`var(--glass-bg)`, `var(--glass-border)`, `var(--shadow-1)`, `var(--shadow-2)`, etc.) ensuring Light, Dark, and Night mode compatibility.
   - Add hover states, micro-interactions, and focus rings (`focus:ring-2 focus:ring-teal-600 focus:outline-none` or CSS focus rules) to interactive elements.
   - Bind ARIA attributes (`aria-label`, `role="tab"`, `role="gridcell"`, `aria-describedby`, input labels).
   - Use `<PatientAvatar />` for patient avatars and `<EmptyState />` for empty state fallbacks.
3. Verify zero compiler errors with `npm run typecheck`.
4. Commit each modified file individually per Clinic MVP Constitution.
5. Produce your handoff report in `C:\Clinic_MVP\dental-crm\.agents\worker_batch_a\handoff.md` with real `HEAD: <hash>`, modified files list with individual commit hashes, and typecheck stdout log.
6. Notify parent via send_message when complete.
</USER_REQUEST>
