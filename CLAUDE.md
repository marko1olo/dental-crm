# CLAUDE.md — Clinic MVP / DENTE Dental CRM Authority Shim

## ⛔ CONSTITUTION & MANDATORY DOCUMENTATION READING ORDER

Before undertaking ANY coding, refactoring, or architectural task in the Dental CRM codebase (`C:\Clinic_MVP\dental-crm`), you MUST load and read the relevant documentation files.

> ⚠️ **SUPREME CONSTITUTION:** **[`C:\Clinic_MVP\dental-crm\.agents\THE_HAMMER_MASTER_PROMPT.md`](file:///C:/Clinic_MVP/dental-crm/.agents/THE_HAMMER_MASTER_PROMPT.md)** (and `MASTER_PROMPT.md`) — MUST be read from first to last symbol before undertaking any action!

---

## 📖 PROJECT DOCUMENTATION MAP & PATHS

### 1. System Codebase Documentation (`.agents/`)
- **[Documentation Index & Navigation Matrix](file:///C:/Clinic_MVP/dental-crm/.agents/INDEX.md)** — Entry point to the workspace and AI Agent Navigation Matrix.
- **[Supreme Law: THE HAMMER](file:///C:/Clinic_MVP/dental-crm/.agents/THE_HAMMER_MASTER_PROMPT.md)** — CTO Supremacy, zero mocks, presumption of defect, Apple/Mac HIG, Mandate 8e.
- **[.agents/AGENTS.md](file:///C:/Clinic_MVP/dental-crm/.agents/AGENTS.md)** — **The Constitution.** Numbered mandates: zero mocks, T.A.R.S. honesty, paranoia doctrine, reconnaissance arsenal, ast-grep read/write split, HEAD-hash reporting, git and compilation doctrine. This is the law.
- **[AGENTS.md (Root)](file:///C:/Clinic_MVP/dental-crm/AGENTS.md)** — Repo-root standard entry point (open AGENTS.md convention). Documentation index only; it delegates to `.agents/AGENTS.md` for law.
- **[System Architecture](file:///C:/Clinic_MVP/dental-crm/.agents/ARCHITECTURE.md)** — Monorepo layout (`apps/web`, `apps/api`, `packages/shared`, React 19).
- **[Database Registry](file:///C:/Clinic_MVP/dental-crm/.agents/DATABASE.md)** — Drizzle ORM PostgreSQL 18.4 schema (`.data/pg18`, port 5432).
- **[Database Setup & Recovery](file:///C:/Clinic_MVP/dental-crm/.agents/DATABASE_SETUP.md)** — Local PostgreSQL setup, `uuidv7()` polyfill, push procedures.
- **[Telephony & Portal Details](file:///C:/Clinic_MVP/dental-crm/.agents/TELEPHONY_AND_PORTAL.md)** — UIS/Mango/Zadarma telephony webhooks & patient OTP portal.
- **[Commands & Tests](file:///C:/Clinic_MVP/dental-crm/.agents/COMMANDS_AND_TESTS.md)** — Compiler gates, `npm run typecheck`, E2E tests.
- **[UI Standards](file:///C:/Clinic_MVP/dental-crm/.agents/UI_STANDARDS.md)** — Tailwind/Vanilla CSS rules & `useAppLogic.tsx` constraints.
- **[Clinical Rules](file:///C:/Clinic_MVP/dental-crm/.agents/CLINICAL_RULES.md)** — EHR clinical rules engine.
- **[Billing & Finance](file:///C:/Clinic_MVP/dental-crm/.agents/BILLING_AND_FINANCE.md)** — Payments, 54-FZ KKM receipts, family wallets.
- **[Documents Lifecycle](file:///C:/Clinic_MVP/dental-crm/.agents/DOCUMENTS_LIFECYCLE.md)** — PDF rendering, NDFL certificates, EGISZ CDA export.
- **[Messengers](file:///C:/Clinic_MVP/dental-crm/.agents/MESSENGERS.md)** — WhatsApp WABA, Telegram Bot, VK MAX integrations.
- **[Documentation Knowledge Hub](file:///C:/Clinic_MVP/dental-crm/docs/README.md)** — Central gateway to docs/ directory.

### 2. Competitive Audit & Feature Parity Suite (`docs/competitive-audit/`)
- **[FEATURES_REGISTRY.md](file:///C:/Clinic_MVP/dental-crm/docs/competitive-audit/FEATURES_REGISTRY.md)** — Canonical 63-feature matrix (IDENT, DentalPRO, iStom).
- **[OUR_CRM_MAP.md](file:///C:/Clinic_MVP/dental-crm/docs/competitive-audit/OUR_CRM_MAP.md)** — Detailed capability map of our Dental CRM across all modules.
- **[BACKLOG.md](file:///C:/Clinic_MVP/dental-crm/docs/competitive-audit/BACKLOG.md)** — Implementation options, file paths, and architecture for `[НЕТ]` / `[ЧАСТИЧНО]` features.
- **[GAP_REPORT_2026-07-27.md](file:///C:/Clinic_MVP/dental-crm/docs/competitive-audit/GAP_REPORT_2026-07-27.md)** — Current gap report.
- **[STOMX_REVERSE_ENGINEERING_BIBLE.md](file:///C:/Clinic_MVP/dental-crm/docs/competitive-audit/STOMX_REVERSE_ENGINEERING_BIBLE.md)** — Reverse-engineering bible for StomX.
- **[FEATURE_SPECS/](file:///C:/Clinic_MVP/dental-crm/docs/competitive-audit/FEATURE_SPECS)** — Detailed 13-field feature specification cards.

---

## 🚨 MANDATORY EXECUTION LAWS

Canonical source is `.agents/AGENTS.md` and `.agents/THE_HAMMER_MASTER_PROMPT.md`.

1. **Read First**: Read the target file in full before editing it. Appending a quick-fix patch to the bottom of a file you have not read is a critical compliance failure.
2. **Zero Mocks**: Everything must be fully typed and integrated with database client queries.
3. **Anti-Hardcode**: Use TypeScript interfaces, `.env` files, or configurations. No ports, endpoints, credentials, or magic strings in code.
4. **Targeted Git Adds**: Never run `git add .`. Only stage the exact files you edited — neighbouring agents work in this folder concurrently.
5. **UTF-8 Encoding**: Never use PowerShell here-strings or `node -e` to WRITE Russian text. `node -e` stays fine for read-only checks.
6. **No Obstacles to Doctors & Staff (Mandate 8e)**: The software serves the doctor, not vice versa. No disabled buttons without explanation, no draft bans, no 403 on blank contract print, 1-click physiological normals, free discounts up to 100% on warranty reworks, 54-FZ cash desk without physical person INN requirement, single-nurse carpule write-offs in 1 click.
7. **Burden of Proof & 7 Deadly Sins Checklist (Mandate 8d, Studio Clinical HIG)**: An approval `[ПРОВЕРЕНО: ЧИСТО]` is ONLY valid when the reviewer instrumentally disproves all 7 sins: (1) text truncation/overflow/undefined; (2) 1 toolbar row (32–36px); (3) <=2 primary buttons on entity cards; (4) WCAG AAA dark/light theme hygiene; (5) Mandate 8e doctor autonomy; (6) Anti-Matryoshka modal depth = 1; (7) zero emojis in official documents. Symmetric liability: sycophantic approval = disqualification; hallucinated defect from memory = disqualification.
8. **Ban on Hallucinating Defects From Memory (T.A.R.S. 100% Factual Honesty, Mandate 8f)**: Defects, bugs, and backlog tasks exist ONLY when proven by direct code inspection (`grep_search`/`view_file`), actual PNG screenshots (`view_file`), or compiler/test logs. Ban on dredging up phantom bugs from memory or vague impressions.
9. **Rule != Pending Task (Mandate 8g)**: Standards, master prompts, and mandates define quality criteria, NOT a pending task backlog! Never declare a feature missing without searching the live code first. If already implemented, do not touch working code.
10. **Continuous Dynamic Doc & Backlog Sync (Mandate 8h)**: The moment a feature is implemented or confirmed in code, immediately update `BACKLOG.md`, `FEATURES_REGISTRY.md`, and checklists to `[ЕСТЬ] / [ЗАКРЫТО]`. Never run agents in circles on already finished work.
11. **Specialized Outpatient Domain Boundary & Anti-Cargo-Cult (Mandate 8i)**: Private outpatient dental practice only (Form 043/u, 804n nomenclature, SanPiN, StAR). No inpatient hospitals, bed registries, or general medicine forms (Form 025/u). Every entity must serve the dentist at the dental chair or the reception desk.
12. **Anti-Refactoring Itch & Definition of Done Stop-Line (Mandate 8j)**: If code is stable, compiles cleanly, passes tests, and solves the task — NEVER refactor it for style or aesthetics. Once DoD is satisfied, STOP. Commit, report `HEAD: <hash>`, and await commands or proceed to the next isolated backlog item.
13. **CRM != Reality Simulator & Friction-Killer (Mandate 8k)**: Outpatient CRM reduces friction, not simulates physical reality. No manual 192 perio points, no carpule-by-carpule logging, 1-click standard normal protocols.
14. **Fresh Subagent Context & Anti-Zombie Doctrine (Mandate 8l)**: Do not reuse subagents after task completion. Spawn fresh subagents with clean context for new tasks.
15. **Mandatory Red Teaming (Mandate 8m)**: Independent adversarial critic inquisition on all front and back edits. Zero self-approval.
16. **Scale-Agnostic Adaptability & Zero Dead-Ends (Mandate 8n)**: From solo rental doctor (1 chair, no mandatory assistant, full 54-FZ cashier autonomy, 1-click package write-offs, no 403 on draft contracts) to enterprise network (DB branch isolation, RBAC, background CMO audit, MDLP/EGISZ). System never traps users in dead-ends.


## Path-scoped rules

`.claude/rules/*.md` carry `paths:` frontmatter and load only when Claude opens a matching file. They are
routing pointers plus the few constraints that cause the most rework — never a second copy of the law.
`.agents/AGENTS.md` outranks them; a disagreement is a defect in the rule.

| Rule | Fires on |
|---|---|
| `dente-god-context.md` | `apps/web/src/useAppLogic.tsx` |
| `dente-database.md` | `apps/api/src/db/**`, `apps/api/drizzle/**`, `apps/api/src/scripts/**` |

Never add a rule file without `paths:` — it would load in every session.
