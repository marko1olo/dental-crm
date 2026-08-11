# Clinic MVP (DENTE) - Project Architecture Index

Welcome to the autonomous documentation for the DENTE Clinical CRM project. 

The system is a monolithic full-stack application built using **React 19**, **Zustand**, and **TailwindCSS** on the frontend (`@dental/web`), powered by a **Fastify** and **PostgreSQL** (Drizzle ORM) backend (`@dental/api`). A shared package (`@dental/shared`) enforces strict domain logic across the stack.

## Architecture Documents
To navigate the codebase, please review the specific domain documents below:

### 1. [Backend & API Architecture](.agents/docs/API_ARCHITECTURE.md)
Contains the database schema (ERD), REST endpoints, EGISZ state integrations, background cron workers, and Telegram bot webhook flows.

### 2. [Web Components & Views](.agents/docs/WEB_COMPONENTS.md)
Details the hash-based custom router, view components (`ScheduleView`, `VisitView`, etc.), error boundaries, and massive inline form configurations (e.g. `DocumentsInlineForms.tsx`). 

### 3. [Web State & Hooks](.agents/docs/WEB_STATE_AND_HOOKS.md)
Explains the transition from Context to **Zustand** stores (`appStore`, `documentStore`, `imagingStore`), the decomposition of `AppHelpers.tsx`, and an analysis of the God Hook `useDocumentWorkflowModule.ts`.

### 4. [Shared Contracts & Schemas](.agents/docs/SHARED_CONTRACTS.md)
Outlines the single source of truth for validation (Zod schemas), strict financial rules (Kopecks math engine), clinical schemas (FDI tooth definitions), and the Legacy Migration tool mappings.

---

## Deep Dive Architecture Studies (Phase 2)

For in-depth analysis of specific CRM engines, consult the following deep dives:

1. [Clinical Rules & EGISZ Engine](.agents/docs/deep_dives/CLINICAL_AND_EGISZ_ENGINE.md)
   - CDA R2 generation, phase handoffs, and EGISZ integration requirements.
2. [Financial & Billing Engine](.agents/docs/deep_dives/FINANCIAL_ENGINE.md)
   - Realities of `numeric(12,2)` vs integers, idempotency constraints, and cash shift vulnerabilities.
3. [Communications & Bots](.agents/docs/deep_dives/COMMUNICATIONS_AND_BOTS.md)
   - Telegram, WhatsApp, and MAX webhooks, chat linking, and the `communication_tasks` queue.
4. [Patient Cockpit & CRM UI](.agents/docs/deep_dives/PATIENT_COCKPIT_AND_CRM.md)
   - Frontend `PatientOverviewTab` structure, DICOM integrations, and Waitlist drag-and-drop logic.

---

*This documentation was autonomously generated and compiled by Antigravity Agents.*
