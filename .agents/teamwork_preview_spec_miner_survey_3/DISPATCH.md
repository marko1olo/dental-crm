# DISPATCH — Spec Miner 3 (Biome Linter & TypeScript Code Health)

## 2026-08-09T11:58:00Z

## Mission
Survey Biome configuration, TypeScript typecheck status, and dead code / legacy duplicate patterns across the codebase.

## Scope & Instructions
1. Read `C:\Clinic_MVP\dental-crm\.agents\ORIGINAL_REQUEST.md`.
2. Inspect `biome.json` at root and in subfolders. Identify why `.postgres` and other build/data directories were scanned and caused false linter errors.
3. Check current TypeScript compilation state (`npm run typecheck -w @dental/web` or root typecheck) and Biome check state (`npx @biomejs/biome check`).
4. Perform AST and static code searches (`ast-grep`, `ripgrep`) to identify dead code, unused exports, legacy duplicate modules, and circular dependencies.
5. Save your specification mining report to `C:\Clinic_MVP\dental-crm\.agents\teamwork_preview_spec_miner_survey_3\handoff.md`.
