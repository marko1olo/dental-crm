# Project: DENTE Dental CRM UI/UX Premium Overhaul

## Architecture
- **Frontend**: React monorepo client (`apps/web` / `packages/ui`) styled with CSS modules / variables / theme tokens (Light, Dark, Night).
- **Design Tokens**: Glassmorphism (`backdrop-filter: blur(...)`, glass cards), soft elevation shadows (`var(--shadow-1)`, `var(--shadow-2)`), micro-interactions (hover, active transitions), smooth focus rings, patient silhouette avatars, crisp badges, empty state components.
- **Visual Testing Matrix**: `dente-redesign-shots.mjs` script generating 4-state matrix (Desktop Light, Desktop Dark, Mobile Light, Mobile Dark).

## Code Layout
- `apps/web/src/` — React views and pages (Shift, Schedule, Patients, Imaging, Visit, Documents, Finance, Analytics, Communications, Settings, Marketing).
- `packages/ui/` — Shared UI components, theme variables, glassmorphism utilities, badge components, avatar silhouette components, empty state primitives.

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| 1 | Reconnaissance & CSS Design System Tokens | Audit inline styles via `ast-grep`/`rg`/`fd`; set up glassmorphism, shadows, focus rings, avatars, badges, empty states in CSS/theme tokens | None | DONE |
| 2 | View Batch A Overhaul | Elevate Shift, Schedule, Patients, Visit, Imaging views to premium standards | M1 | IN_PROGRESS |
| 3 | View Batch B Overhaul | Elevate Documents, Finance, Analytics, Communications, Settings, Marketing views to premium standards | M1 | DONE |
| 4 | Visual Matrix Proof & Quality Gate | Run 4-state screenshot script `dente-redesign-shots.mjs`, audit 4 states, verify `npm run typecheck`, commit files individually per Clinic MVP Constitution | M2, M3 | PLANNED |

## Interface Contracts
- All theme tokens MUST be accessed via CSS variables (`var(--shadow-1)`, `var(--shadow-2)`, `var(--bg-glass)`, `var(--border-glass)`, etc.).
- Multi-theme compatibility: Light, Dark, Night modes must render correctly without hardcoded static color leaks.
- Every modified file must be committed individually with clear commit messages.
