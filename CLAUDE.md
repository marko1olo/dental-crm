# CLAUDE.md — Clinic MVP / DENTE Dental CRM Authority Shim

## ⛔ CONSTITUTION & MANDATORY DOCUMENTATION READING ORDER

Before undertaking ANY coding, refactoring, or architectural task in the Dental CRM codebase (`C:\Clinic_MVP\dental-crm`), you MUST load and read the relevant documentation files.

---

## 📖 PROJECT DOCUMENTATION MAP & PATHS

### 1. System Codebase Documentation (`.agents/`)
- **[Documentation Index](file:///C:/Clinic_MVP/dental-crm/.agents/INDEX.md)** — Entry point to the workspace.
- **[.agents/AGENTS.md](file:///C:/Clinic_MVP/dental-crm/.agents/AGENTS.md)** — **The Constitution.** Numbered mandates: zero mocks, T.A.R.S. honesty, paranoia doctrine, reconnaissance arsenal, ast-grep read/write split, HEAD-hash reporting, git and compilation doctrine. This is the law.
- **[AGENTS.md](file:///C:/Clinic_MVP/dental-crm/AGENTS.md)** — Repo-root standard entry point (open AGENTS.md convention). Documentation index only; it delegates to `.agents/AGENTS.md` for law.
- **[System Architecture](file:///C:/Clinic_MVP/dental-crm/.agents/ARCHITECTURE.md)** — Monorepo layout (`apps/web`, `apps/api`, `packages/shared`).
- **[Database Registry](file:///C:/Clinic_MVP/dental-crm/.agents/DATABASE.md)** — Drizzle ORM PostgreSQL schema (`apps/api/src/db/schema.ts`).
- **[Telephony & Portal Details](file:///C:/Clinic_MVP/dental-crm/.agents/TELEPHONY_AND_PORTAL.md)** — UIS/Mango/Zadarma telephony webhooks & patient OTP portal.
- **[Commands & Tests](file:///C:/Clinic_MVP/dental-crm/.agents/COMMANDS_AND_TESTS.md)** — Compiler gates, `npm run typecheck`, E2E tests.
- **[UI Standards](file:///C:/Clinic_MVP/dental-crm/.agents/UI_STANDARDS.md)** — Tailwind/Vanilla CSS rules & `useAppLogic.tsx` constraints.
- **[Clinical Rules](file:///C:/Clinic_MVP/dental-crm/.agents/CLINICAL_RULES.md)** — EHR clinical rules engine.
- **[Billing & Finance](file:///C:/Clinic_MVP/dental-crm/.agents/BILLING_AND_FINANCE.md)** — Payments, 54-FZ KKM receipts, family wallets.
- **[Documents Lifecycle](file:///C:/Clinic_MVP/dental-crm/.agents/DOCUMENTS_LIFECYCLE.md)** — PDF rendering, NDFL certificates, EGISZ CDA export.
- **[Messengers](file:///C:/Clinic_MVP/dental-crm/.agents/MESSENGERS.md)** — WhatsApp WABA, Telegram Bot, VK API integrations.

### 2. Competitive Audit & Feature Parity Suite (`docs/competitive-audit/`)
- **[FEATURES_REGISTRY.md](file:///C:/Clinic_MVP/dental-crm/docs/competitive-audit/FEATURES_REGISTRY.md)** — Canonical 63-feature matrix (IDENT, DentalPRO, iStom).
- **[OUR_CRM_MAP.md](file:///C:/Clinic_MVP/dental-crm/docs/competitive-audit/OUR_CRM_MAP.md)** — Detailed capability map of our Dental CRM across all modules.
- **[BACKLOG.md](file:///C:/Clinic_MVP/dental-crm/docs/competitive-audit/BACKLOG.md)** — Implementation options, file paths, and architecture for `[НЕТ]` / `[ЧАСТИЧНО]` features.
- **[GAP_REPORT_2026-07-27.md](file:///C:/Clinic_MVP/dental-crm/docs/competitive-audit/GAP_REPORT_2026-07-27.md)** — Current gap report. Replaces the old `PROGRESS.md` audit cursor log, which no longer exists on disk.
- **[FEATURE_SPECS/](file:///C:/Clinic_MVP/dental-crm/docs/competitive-audit/FEATURE_SPECS)** — Detailed 13-field feature specification cards.

---

## 🚨 MANDATORY EXECUTION LAWS

Canonical source is `.agents/AGENTS.md`. This list and the one in `GEMINI.md` are the same five laws —
they had silently diverged (Claude was missing "read first", Gemini was missing "zero mocks"); merged
2026-07-27. Keep them identical or delete both and point at the constitution.

1. **Read First**: Read the target file in full before editing it. Appending a quick-fix patch to the bottom of a file you have not read is a critical compliance failure.
2. **Zero Mocks**: Everything must be fully typed and integrated with database client queries.
3. **Anti-Hardcode**: Use TypeScript interfaces, `.env` files, or configurations. No ports, endpoints, credentials, or magic strings in code.
4. **Targeted Git Adds**: Never run `git add .`. Only stage the exact files you edited — neighbouring agents work in this folder concurrently.
5. **UTF-8 Encoding**: Never use PowerShell here-strings or `node -e` to WRITE Russian text. `node -e` stays fine for read-only checks.

## Path-scoped rules

`.claude/rules/*.md` carry `paths:` frontmatter and load only when Claude opens a matching file. They are
routing pointers plus the few constraints that cause the most rework — never a second copy of the law.
`.agents/AGENTS.md` outranks them; a disagreement is a defect in the rule.

| Rule | Fires on |
|---|---|
| `dente-god-context.md` | `apps/web/src/useAppLogic.tsx` |
| `dente-database.md` | `apps/api/src/db/**`, `apps/api/drizzle/**`, `apps/api/src/scripts/**` |

Never add a rule file without `paths:` — it would load in every session.
