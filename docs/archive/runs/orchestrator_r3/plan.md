# Scope: Resurrected Session R3 — E2E Visual Audit & Code Health

## Architecture
- React / Vite / TypeScript Frontend (`apps/web`)
- Fastify / Drizzle ORM Node Backend (`apps/api`)
- Theme system: `themeStore.ts`, `themeClasses.ts`, `dente-redesign.css`
- E2E Audit harness: `e2e_4state_audit.cjs` (Playwright)

## Feature Inventory
| # | Feature | Description | Milestone | Source |
|---|---------|-------------|-----------|--------|
| 1 | Biome noise exclusion | Exclude `.postgres`, build output, node_modules from `biome.json` | M1 | Request R3 |
| 2 | Typecheck baseline | Run `npm run typecheck` and identify baseline status | M1 | Request R3 |
| 3 | 4-State E2E Visual Audit | Execute `e2e_4state_audit.cjs` across 14 panels + 15 modals in 4 states | M2 | Request R1 |
| 4 | UI/UX Defect Remediation | Fix layout, contrast, padding, z-index, hover states across panels/modals | M3 | Request R2 |
| 5 | Clean Architecture & FSD | Ensure SOLID & FSD compliance in UI changes | M3 | Request R2 |
| 6 | Zero Linter/Typecheck Errors | Fix all real warnings/errors in source code | M4 | Request R3 |
| 7 | Dead Code Elimination | Perform AST/static search to purge unused code & legacy duplicates | M4 | Request R3 |
| 8 | Victory Audit Gate | Forensic integrity verification & final gate pass | M4 | System Gate |

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| 1 | M1: Biome Noise Fix & Baseline | Update `biome.json` to ignore `.postgres` & noise; verify typecheck baseline | None | IN_PROGRESS |
| 2 | M2: E2E 4-State Visual Audit | Run Playwright audit, capture screenshots across 14 panels & 15 modals | M1 | IN_PROGRESS |
| 3 | M3: UI/UX Defect Remediation | Fix visual bugs based on screenshots, polish layouts, hover states, dark/light contrast | M2 | PLANNED |
| 4 | M4: Code Health & Victory Gate | Eliminate 100% typecheck/linter errors, purge dead code, pass Forensic Audit | M3 | PLANNED |

## Code Layout
- Frontend: `apps/web/src/`
- Store: `apps/web/src/store/themeStore.ts`
- CSS: `apps/web/src/styles/dente-redesign.css`, `tailwind.css`
- Shell: `apps/web/src/AppShell.tsx`, `workspaceShell.tsx`
- Biome Config: `biome.json`
- Audit Script: `e2e_4state_audit.cjs`
