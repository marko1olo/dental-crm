# CLAUDE.md — Clinic MVP / DENTE Dental CRM Authority Shim

## ⛔ CONSTITUTION & MANDATORY DOCUMENTATION READING ORDER

Before undertaking ANY coding, refactoring, or architectural task in the Dental CRM codebase (`C:\Clinic_MVP\dental-crm`), you MUST load and read the relevant documentation files.

---

## 📖 PROJECT DOCUMENTATION MAP & PATHS

### 1. System Codebase Documentation (`.agents/`)
- **[Documentation Index](file:///C:/Clinic_MVP/dental-crm/.agents/INDEX.md)** — Entry point to the workspace.
- **[AGENTS.md](file:///C:/Clinic_MVP/dental-crm/AGENTS.md)** — Core Constitution (8 rules, HEAD hash reporting, zero-mock policy).
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
- **[PROGRESS.md](file:///C:/Clinic_MVP/dental-crm/docs/competitive-audit/PROGRESS.md)** — Audit cursor log (100% complete).
- **[FEATURE_SPECS/](file:///C:/Clinic_MVP/dental-crm/docs/competitive-audit/FEATURE_SPECS)** — Detailed 13-field feature specification cards.

---

## 🚨 MANDATORY EXECUTION LAWS
1. **Zero Mocks**: Everything must be fully typed and integrated with database client queries.
2. **Anti-Hardcode**: Use TypeScript interfaces, `.env` files, or configurations.
3. **Targeted Git Adds**: Never run `git add .`. Only stage exact edited files.
4. **UTF-8 Encoding**: Never use PowerShell here-strings or `node -e` for Russian text.
