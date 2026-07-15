# DENTE Dental CRM — Agent Documentation Index

Welcome, Agent. This is the central directory of project documentation, optimized for machine parsing, minimal token footprint, and absolute clarity. 

Before starting any task, read these documents to understand the architecture, database schema, and active integrations. **Do not guess or assume.**

## 🗺️ Documentation Map

1. **[AGENTS.md](file:///C:/Clinic_MVP/dental-crm/.agents/AGENTS.md)** — Core Identity, Standards, Mojibake Prevention Rules, and General Constraints.
2. **[ARCHITECTURE.md](file:///C:/Clinic_MVP/dental-crm/.agents/ARCHITECTURE.md)** — Monorepo layout, Fastify API structure, Vite Frontend, and Real-time WebSocket architecture.
3. **[DATABASE.md](file:///C:/Clinic_MVP/dental-crm/.agents/DATABASE.md)** — Drizzle ORM PostgreSQL schema registry, table lists, and database seed/migration procedures.
4. **[TELEPHONY_AND_PORTAL.md](file:///C:/Clinic_MVP/dental-crm/.agents/TELEPHONY_AND_PORTAL.md)** — Mango/Zadarma Telephony webhooks, WebSocket broadcasts, Patient Portal OTP auth, and PWA setup.
5. **[COMMANDS_AND_TESTS.md](file:///C:/Clinic_MVP/dental-crm/.agents/COMMANDS_AND_TESTS.md)** — CLI commands for building, typechecking, lints, and the full Playwright/Puppeteer smoke testing suite.
6. **[UI_STANDARDS.md](file:///C:/Clinic_MVP/dental-crm/.agents/UI_STANDARDS.md)** — UI design policies, state management rules, and crucial constraints concerning the `useAppLogic` God Context.
7. **[CLINICAL_RULES.md](file:///C:/Clinic_MVP/dental-crm/.agents/CLINICAL_RULES.md)** — Clinical rules engine, triggers matching, prerequisite checks, and warning/blocking actions.
8. **[BILLING_AND_FINANCE.md](file:///C:/Clinic_MVP/dental-crm/.agents/BILLING_AND_FINANCE.md)** — Payment double-posting idempotency layer and shared family wallets balance mechanics.
9. **[DOCUMENTS_LIFECYCLE.md](file:///C:/Clinic_MVP/dental-crm/.agents/DOCUMENTS_LIFECYCLE.md)** — HTML-to-PDF rendering, Edge/Chrome headless spawning, and SHA-256 integrity document signing.

---

## 🚨 Critical Architecture Rules

*   **Zero-Mocks Policy:** Never write mock API responses or UI placeholders. Everything must be fully typed and integrated with database client queries.
*   **The God-Context Constraint:** `useAppLogic.tsx` (~13,000 lines) is a centralized state manager exposing a massive context object. **Do not modify its return block or delete variables without updating all dependent UI files**, as it will immediately break the typecheck of 50+ files.
*   **UTF-8 Encoding (Mojibake Prevention):** All Russian text in code/JSON must be written strictly using UTF-8. Never use PowerShell here-strings or `node -e` in CLI for Russian strings.
*   **Local Swarm Rules:** Neighboring agents work concurrently in this same folder. Use specific git adds (`git add apps/web/src/...`) instead of global `git add .` to avoid committing dirty unsaved work from neighboring sessions.
