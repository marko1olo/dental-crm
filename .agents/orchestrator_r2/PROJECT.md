# Project: DENTE CRM — Ruthless E2E Visual Audit & Code Health Orchestration

## Architecture
- Frontend Client: `apps/web` (React 19, Vite 6, Tailwind CSS v4, hash-based routing).
- Monorepo Packages: `@dental/web` (SPA client), `@dental/api` (Fastify server, PostgreSQL 18, Drizzle ORM), `@dental/shared` (Zod schemas, types).
- E2E Verification & Visual Proof: Playwright E2E script (`e2e_4state_audit.cjs` or equivalent in `apps/web/tests/e2e`), capturing 4 distinct rendering states: Mobile Light, Mobile Dark, PC Light, PC Dark. Screenshots stored in artifact directory.
- Code Health & Quality Gates: Biome linter (`biome.json`), TypeScript compiler (`npm run typecheck -w @dental/web`), AST searches (`ast-grep`, `ripgrep`).

## Feature Inventory
| # | Feature | Description | Milestone | Source |
|---|---------|-------------|-----------|--------|
| 1 | Playwright E2E 4-State Rendering Script | Script to launch browser, login/seed tokens, navigate all panels/dialogs in 4 states (Mobile/PC x Light/Dark) | M1 | R1 |
| 2 | Screenshot Matrix Generation & Artifact Saving | Save clean 4-state screenshots for all screens to session artifact directory | M1 | R1 |
| 3 | Biome Config Fix (`biome.json`) | Exclude build/data noise like `.postgres` (which caused 81k false linter errors) from Biome analysis | M2 | R3 |
| 4 | Zero TypeScript & Linter Error Eradication | Fix all `tsc` type errors (`npm run typecheck`) and Biome linter errors/warnings | M2 | R3 |
| 5 | AST Dead Code & Legacy Duplicate Cleanup | Perform structural searches to eliminate dead code, unused exports, and duplicate logic | M2 | R3 |
| 6 | UI/UX Visual Defect Cataloging | Analyze 4-state screenshots for broken layouts, margins, overlapping text, contrast, missing hover states, z-index | M3 | R2 |
| 7 | Mobile & Dark Theme CSS/Tailwind Polish | Fix all visual bugs across light/dark themes and mobile/desktop viewports according to SOLID & FSD standards | M3 | R2 |
| 8 | Post-Fix 4-State Verification Matrix | Re-run Playwright 4-state audit to generate final, defect-free 4-state screenshot proof | M3 | R1 & R2 |

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| M0 | Survey & Codebase Reconnaissance | Map E2E scripts, Biome config, TS errors, and visual structure | None | IN_PROGRESS |
| M1 | 4-State Visual Rendering & E2E Audit Setup | Run Playwright 4-state audit across all pages/dialogs, capture initial screenshot matrix | M0 | PLANNED |
| M2 | Linter & Error Eradication | Fix `biome.json`, achieve 0 TS errors, 0 Biome warnings/errors, remove dead code | M0 | PLANNED |
| M3 | UI/UX Polishing & Visual Bug Fixes | Fix visual defects identified from screenshots, verify 4-state proof | M1, M2 | PLANNED |

## Interface Contracts
- **Playwright Test Runner**: Invoked via node/npx, outputs PNG screenshots to artifact directory.
- **Biome Linter**: Invoked via `npx @biomejs/biome check --write .`, governed by `biome.json`.
- **TypeScript Check**: `npm run typecheck -w @dental/web`.

## Code Layout
```
apps/web/
├── src/
│   ├── main.tsx
│   ├── components/
│   ├── utils/
│   └── styles/
├── tests/e2e/
└── biome.json (root or package)
```
