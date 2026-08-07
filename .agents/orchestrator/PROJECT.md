# Project: DENTE CRM Architectural & Functional Hardening

## Architecture
- **Frontend**: React 18, Vite, TypeScript monorepo package `@dental/web` (`apps/web/src`)
- **Backend**: Fastify API, TypeScript monorepo package `@dental/api` (`apps/api/src`)
- **Database**: Drizzle ORM over native PostgreSQL 18.4 (`127.0.0.1:5432`)
- **State Management**: Zustand stores + React Context / hooks
- **Toast Infra**: `showToast`, `actionFailureToast`

## Feature Inventory
| # | Feature | Description | Milestone | Source |
|---|---------|-------------|-----------|--------|
| 1 | Async Error Routing | Route silent catch blocks (500 sites) to user-facing toasts (`showToast`, `actionFailureToast`) | M1 | ORIGINAL_REQUEST.md §R1 |
| 2 | Double Submit & Race Condition Prevention | Implement `isSubmitting`/`isLoading` guards, `disabled={isSubmitting}`, `aria-busy={true}` (51 UI sites) | M2 | ORIGINAL_REQUEST.md §R2 |
| 3 | Linter & Compiler Enforcement | Biome linter compliance (`npx biome lint apps/web/src`) & 0 TS errors (`npm run typecheck`) | M3 | ORIGINAL_REQUEST.md §R3 |

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| 1 | M1: Async Error Swallows Remediation | Eradicate 500 silent async error swallows in `apps/web/src` | Survey | IN_PROGRESS |
| 2 | M2: Race Condition Hardening | Prevent double-submits & lock UI state on 51 form/button sites | M1 | PLANNED |
| 3 | M3: Code Base Cleanliness & Typecheck | 0 Biome linter errors, 0 TS compiler errors, circular dependency check | M2 | PLANNED |

## Interface Contracts
- **Toast Utility**: `showToast(text, type)` from `apps/web/src/components/GlobalToast.tsx` / `actionFailureToast(actionName, status)` from `apps/web/src/lib/panelStateText.ts`.
- **State Guard Contract**: `isSubmitting`/`isLoading` set synchronously before async operation yield, reset in `finally` block.
- **Button Props Contract**: `disabled={isSubmitting}` and `aria-busy={isSubmitting || isLoading}` on all mutating buttons/forms.

## Code Layout
- `apps/web/src/` — React frontend root
- `apps/web/src/components/` — UI components and views
- `apps/web/src/useAppLogic.tsx` — Main application logic context hook
- `apps/web/src/store/` — Zustand state stores
- `apps/api/src/` — Backend Fastify API
