# BRIEFING — 2026-10-20T06:35:00Z

## Mission
Eradicate all Potemkin villages, fake preview sandboxes, hardcoded mock data fallbacks, and orphaned stub components across DENTE Dental CRM, integrating all standalone features into the real production UI and PostgreSQL 18 backend (Requirements R1–R5), and remediate all audit integrity findings.

## 🔒 My Identity
- Archetype: teamwork_preview_orchestrator
- Roles: orchestrator, user_liaison, human_reporter, successor
- Working directory: C:\Clinic_MVP\dental-crm\.agents\teamwork\teamwork_preview_orchestrator_4
- Original parent: parent (Sentinel)
- Original parent conversation ID: 6f308e79-b04e-40a8-9e4e-ac9bf3e81663

## 🔒 My Workflow
- **Pattern**: Project Pattern (Orchestrator)
- **Scope document**: C:\Clinic_MVP\dental-crm\.agents\teamwork\teamwork_preview_orchestrator_4\PROJECT.md
1. **Decompose**: Decomposed R1-R5 into 5 milestones (M1: Sandboxes purge, M2: Seamless In-App Navigation, M3: Production Data Purity, M4: Real Backend Wiring & Uploads, M5: Real E2E Root Navigation Proofs).
2. **Dispatch & Execute**:
   - M1: PASSED (Worker M1, Reviewers M1_1/M1_2, Auditor M1 - CLEAN, committed `1f2382e6e`).
   - M3: Implementation complete by Worker M3 (`a26be4a9a`), Reviewers M3_1/M3_2 APPROVE, Auditor M3 running forensic verification.
   - M2: Worker M2 Gen 2 (`76c83436`) active, verifying clinical workspaces in apps/web.
   - M4 & Audit Remediation: Worker M4 (`d6bb3dc7`) active, implementing lab scan binary uploads, atomic ACID transactions, and strict typing.
3. **On failure**: Retry -> Replace -> Skip -> Redistribute -> Redesign -> Escalate.
4. **Succession**: At 16 spawns, write handoff.md, spawn successor.
- **Work items**:
  1. Survey & Feature Inventory (23 features) [COMPLETED]
  2. M1: Purge Fake Preview Sandboxes & main.tsx Branches [DONE - committed 1f2382e6e]
  3. M2: Seamless In-App Navigation & Clinical Workspaces [IN_PROGRESS]
  4. M3: Eradicate Production Hardcoded Fallbacks & Dummy Data [IN_AUDIT]
  5. M4: Real Backend Wiring for Uploads, Dead Actions & Audit Remediation [IN_PROGRESS]
  6. M5: Real E2E Root Navigation Proofs & Visual Audits [PLANNED]
- **Current phase**: 2 (Parallel Execution of M2, M3 Audit, and M4 Remediation)
- **Current focus**: Milestone 2 Verification, Milestone 3 Audit Verdict, Milestone 4 Backend Wiring

## 🔒 Key Constraints
- NEVER write, modify, or create source code files directly.
- NEVER run build/test commands yourself — require workers to do so.
- NEVER investigate or explore the problem at the code level — dispatch Explorers for technical investigation.
- Node heap limit: --max-old-space-size=2048. Concurrent heavy tsc -p forbidden to prevent OOM.
- Dirty worktree safety: never git reset --hard, stage atomically by file.
- Zero mockups or fake test strings. Real live PostgreSQL 18 backend.
- Mandates 8e & 8n: doctor autonomy, no disabled buttons, soft negative stock.
- Never reuse a subagent after it has delivered its handoff — always spawn fresh.
- Binary Veto on Forensic Audit: INTEGRITY VIOLATION fails unconditionally.

## Current Parent
- Conversation ID: 6f308e79-b04e-40a8-9e4e-ac9bf3e81663
- Updated: 2026-10-20T06:11:09Z

## Key Decisions Made
- Milestone 1 successfully passed all gates and was committed to git (`1f2382e6e`).
- Worker M3 completed Milestone 3 (50 tests pass, committed `a26be4a9a` & pushed).
- Reviewers M3_1 (`f41ee7f0`) and M3_2 (`8b60ee11`) both approved Milestone 3. Cleanly retired.
- Auditor M3 (`3e7701a6-800d-4590-b9c5-6430a44ecd03`) dispatched for forensic integrity audit.
- Worker M2 Gen 2 (`76c83436-9bda-470b-9763-1b2b82b08c3d`) nudged to run targeted tests and finalize handoff.
- Worker M4 (`d6bb3dc7-aba0-4e9b-844c-63f8f91057c9`) dispatched for Milestone 4 & Audit Remediation.

## Team Roster
| Agent | Type | Work Item | Status | Conv ID |
|-------|------|-----------|--------|---------|
| explorer_survey_1 | teamwork_preview_explorer | Survey R1: Sandbox HTMLs & Entrypoints | completed | 503561d3 |
| explorer_survey_2 | teamwork_preview_explorer | Survey R2 & R4: Orphaned Modules & Backend Routes | completed | 19705aa4 |
| explorer_survey_3 | teamwork_preview_explorer | Survey R3 & R5: Hardcoded Fallbacks & E2E Scripts | completed | f62dcf8b |
| worker_m1 | teamwork_preview_worker | M1: Purge Sandboxes & Clean main.tsx | completed | 1ebefed4 |
| reviewer_m1_1 | teamwork_preview_reviewer | Review M1 | completed | 681050e2 |
| reviewer_m1_2 | teamwork_preview_reviewer | Review M1 | completed | 7113079c |
| auditor_m1 | teamwork_preview_auditor | Forensic Integrity Audit M1 | completed | f3484383 |
| worker_m2_gen2 | teamwork_preview_worker | M2: In-App Navigation & Clinical Workspaces | running | 76c83436-9bda-470b-9763-1b2b82b08c3d |
| worker_m3 | teamwork_preview_worker | M3: Eradicate Dummy Data & Fallbacks | completed | 1ee4c646-c806-40ea-a808-367d0558926f |
| reviewer_m3_1 | teamwork_preview_reviewer | Review M3: Data Purity Audit | completed | f41ee7f0-a1e6-41eb-9f82-000137a38fc8 |
| reviewer_m3_2 | teamwork_preview_reviewer | Review M3: Data Purity Audit | completed | 8b60ee11-0a1d-45e2-a714-132369dd3fc5 |
| auditor_m3 | teamwork_preview_auditor | Forensic Integrity Audit M3 | running | 3e7701a6-800d-4590-b9c5-6430a44ecd03 |
| worker_m4_wiring | teamwork_preview_worker | M4: Real Backend Wiring & Audit Remediation | running | d6bb3dc7-aba0-4e9b-844c-63f8f91057c9 |

## Succession Status
- Succession required: no
- Spawn count: 14 / 16
- Pending subagents: 76c83436-9bda-470b-9763-1b2b82b08c3d, 3e7701a6-800d-4590-b9c5-6430a44ecd03, d6bb3dc7-aba0-4e9b-844c-63f8f91057c9
- Predecessor: none
- Successor: not yet spawned

## Active Timers
- Heartbeat cron: task-445 (*/10 * * * *)
- Safety timer: none (reactive wakeup active)
- On succession: kill all timers before spawning successor
- On context truncation: run manage_task(Action="list") — re-create if missing

## Artifact Index
- C:\Clinic_MVP\dental-crm\.agents\teamwork\ORIGINAL_REQUEST.md — User request record
- C:\Clinic_MVP\dental-crm\.agents\teamwork\teamwork_preview_orchestrator_4\BRIEFING.md — Persistent working memory
- C:\Clinic_MVP\dental-crm\.agents\teamwork\teamwork_preview_orchestrator_4\progress.md — Liveness & status tracking
- C:\Clinic_MVP\dental-crm\.agents\teamwork\teamwork_preview_orchestrator_4\PROJECT.md — Milestones & architecture
- C:\Clinic_MVP\dental-crm\.agents\teamwork\teamwork_preview_orchestrator_4\GATE_STATUS.md — Gate check records
- C:\Clinic_MVP\dental-crm\.agents\teamwork\teamwork_preview_worker_m3_data_purity\handoff.md — Worker M3 Handoff Report
- C:\Clinic_MVP\dental-crm\.agents\teamwork\teamwork_preview_reviewer_m3_1\handoff.md — Reviewer M3_1 Handoff Report
- C:\Clinic_MVP\dental-crm\.agents\teamwork\teamwork_preview_reviewer_m3_2\handoff.md — Reviewer M3_2 Handoff Report
