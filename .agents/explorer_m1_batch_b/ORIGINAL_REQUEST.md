## 2026-07-27T03:47:25Z
<USER_REQUEST>
You are teamwork_preview_explorer assigned to Milestone 1: Batch B View Reconnaissance for DENTE Dental CRM.
Working directory: C:\Clinic_MVP\dental-crm\.agents\explorer_m1_batch_b

Objective:
Perform structural reconnaissance of Batch B views (Documents, Finance, Analytics, Communications, Settings, Marketing) in `apps/web/src/`.

Instructions:
1. Use `rg`, `fd`, and `sg` (ast-grep) to inspect all component files for Documents, Finance, Analytics, Communications, Settings, Marketing views.
2. Find hardcoded inline styles (`style={{...}}`), static hex/rgb color strings, inconsistent margins/paddings, missing hover/focus rings, missing aria/accessibility attributes, unstyled empty states, and avatar usages.
3. Check `C:\Clinic_MVP\dental-crm\AGENTS.md` for Clinic MVP rules.
4. Produce a detailed inventory report in `C:\Clinic_MVP\dental-crm\.agents\explorer_m1_batch_b\handoff.md` listing exact file paths, line numbers, hardcoded style anti-patterns found, and recommended CSS token replacements.
5. Notify parent via send_message when complete.
</USER_REQUEST>
