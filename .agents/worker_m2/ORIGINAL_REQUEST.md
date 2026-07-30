# Original Request for Worker M2

## 2026-07-27T02:36:08Z

You are Worker M2 (UI Alignment & Responsive Refactoring Specialist) for DENTE Dental CRM redesign project.

Your Working Directory for metadata: C:\Clinic_MVP\dental-crm\.agents\worker_m2

Read authority docs first:
- C:\Clinic_MVP\dental-crm\AGENTS.md
- C:\Clinic_MVP\dental-crm\.agents\ORIGINAL_REQUEST.md
- C:\Clinic_MVP\dental-crm\.agents\orchestrator\plan.md
- C:\Clinic_MVP\dental-crm\.agents\explorer_m2\handoff.md

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A Forensic Auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

Objectives for Milestones 2 & 3 Implementation:
Perform direct, non-superficial visual refactoring across all 11 application module views and shared components based on the recommendations in `explorer_m2/handoff.md`:

1. PatientAvatar (`apps/web/src/components/PatientAvatar.tsx`)
2. ShiftView (`apps/web/src/ShiftView.tsx`)
3. ScheduleView (`apps/web/src/ScheduleView.tsx`)
4. PatientsView (`apps/web/src/PatientsView.tsx`)
5. ImagingView (`apps/web/src/ImagingView.tsx`)
6. VisitView (`apps/web/src/VisitView.tsx`)
7. DocumentsView (`apps/web/src/DocumentsView.tsx`)
8. FinanceView (`apps/web/src/FinanceView.tsx`)
9. AnalyticsDashboardView (`apps/web/src/pages/AnalyticsDashboardView.tsx`)
10. CommunicationsView (`apps/web/src/CommunicationsView.tsx`)
11. SettingsView (`apps/web/src/SettingsView.tsx`)
12. MarketingView (`apps/web/src/MarketingView.tsx`)

Execution Rules:
1. Edit files directly (using replace_file_content / multi_replace_file_content or write_to_file tool in your subagent session). Do NOT use script search-and-replace tools.
2. Run `npm run typecheck` to verify 0 errors across all packages.
3. Run `node scripts/dente-redesign-shots.mjs` with dev server running (`npm run dev` or existing background process) to re-generate all 56 screenshots across Desktop Light, Desktop Dark, Mobile Light, Mobile Dark.
4. Audit generated screenshots: verify 100% unique MD5 hashes, all sizes >= 40KB, 0 blank or 500 pages.
5. Commit changes per-file using `git add <file>` and `git commit` per Clinic MVP Constitution.
6. Write complete report to `C:\Clinic_MVP\dental-crm\.agents\worker_m2\handoff.md` including real git HEAD hash.
7. Send a message to orchestrator (ID: ee206e75-90c5-4b32-a864-fce96e1e95ec).
