# 🗄️ DENTE Dental CRM — Database Engine & Schema

This document details the database architecture, seeding mechanism, and table directory.

---

## ⚙️ Core Engine: PGlite

Unlike standard web applications, DENTE uses **PGlite** (`@electric-sql/pglite`) instead of a separate network-connected PostgreSQL process.
*   **Database Path:** `apps/api/dente-db/` (resolved dynamically via `node:path`).
*   **Local Process:** The database engine runs directly within the Fastify Node process. There are no network ports (e.g. `5432`) to connect to via external CLI clients.
*   **Client Setup (`apps/api/src/db/client.ts`):**
    ```typescript
    import { PGlite } from "@electric-sql/pglite";
    import { drizzle } from "drizzle-orm/pglite";
    const client = new PGlite(dbPath);
    export const db = drizzle(client, { schema });
    ```
*   **CRITICAL CONSTRAINT:** Do not try to add pool settings (`pg-pool`) or setup server-level connection strings (`postgres://...`). All DB access is file-system based.

---

## 🚀 Migrations & Seeding

*   **Schema Generation:** To generate new SQL migrations from Drizzle schema definitions:
    ```bash
    npm run db:generate
    ```
*   **Applying Migrations:** To push the schema migrations to the local database file:
    ```bash
    npm run db:migrate
    ```
*   **Destructive Reset & Seed:** To reset the database from a persistent JSON state backup:
    ```bash
    # Enforce reset check in env:
    $env:DENTAL_ALLOW_DESTRUCTIVE_DB_RESET="YES"
    npm run db:reset-seed
    ```

---

## 📋 Core Table Registry (`apps/api/src/db/schema.ts`)

| Table Name | Description | Key Fields / Relations |
| :--- | :--- | :--- |
| `organizations` | Tenant organizations (clinics group) | `id`, `name`, `loginId`, `passwordHash` |
| `clinics` | Individual physical clinic addresses | `id`, `organizationId` (ref `organizations`) |
| `users` | Staff members (doctors, admins, owners) | `id`, `role`, `pinCodeHash` (auth by pin code) |
| `patients` | Patient directory | `id`, `phone`, `firstName`, `lastName`, `status` |
| `appointments` | Scheduled patient visits on chairs | `id`, `patientId`, `clinicId`, `status` |
| `visit_diaries` | Medical diaries written by doctors | `id`, `patientId`, `visitStatus` (`draft` \| `signed`) |
| `payments` | Financial transactions recorded | `id`, `patientId`, `amount`, `paymentMethod` |
| `patient_invoices` | Patient bills generated for services | `id`, `patientId`, `totalAmount`, `status` |
| `treatment_plans` | Global dental treatment plans | `id`, `patientId`, `title` |
| `denteTelegramBotConfigs` | Chatbot credentials for organizations | `id`, `botToken`, `botUsername`, `status` |
| `denteTelegramLinkCodes` | Active codes for linking Telegram accounts | `code`, `patientId`, `status` |
| `imaging_studies` | DICOM/imaging metadata linked to patients | `id`, `patientId`, `studyInstanceUid` |
| `crm_leads` | Marketing / incoming request funnel leads | `id`, `phone`, `status`, `organizationId` |

---

## 🚨 Database Rules for Agents

1.  **Drizzle Types:** When writing queries, always leverage `eq`, `and`, `or`, `ilike` from `drizzle-orm` instead of writing raw SQL strings where possible.
2.  **Explicit Organization Gating:** Every database query MUST explicitly filter by `organizationId` (except for global tenant authentication tasks) to prevent data leakage between different organizations.
3.  **Dumb-Reset Safety:** Never run `db:reset-seed` in a production environment. It will wipe `apps/api/dente-db` and replace it with seed defaults.
