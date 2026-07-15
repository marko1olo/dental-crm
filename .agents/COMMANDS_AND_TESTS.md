# 💻 CLI Commands & Smoke Tests

This document catalogs commands for building, database management, lints, formatting, and the complete smoke testing suite.

---

## 🛠️ Package Manager Commands

The project uses `npm` workspaces. Run these commands from the root directory:

*   `npm run dev` — Starts both Fastify API and Vite Web servers concurrently.
*   `npm run build` — Compiles workspaces in sequence: `shared` ➔ `api` ➔ `web`.
*   `npm run typecheck` — Runs TypeScript compiler checks (`tsc --noEmit`) on all packages and apps.
*   `npx @biomejs/biome check --write .` — Lints, formats, and checks codebase styles globally.

---

## 🗄️ Database Commands

*   `npm run db:generate` — Generates SQL migration scripts based on Drizzle schema.
*   `npm run db:migrate` — Applies generated migrations to the PGlite database file.
*   `npm run db:reset-seed` — Destructively truncates the local database and seeds it from the JSON state file. Requires `$env:DENTAL_ALLOW_DESTRUCTIVE_DB_RESET="YES"` in Windows shell environment.

---

## 🧪 Smoke Testing Suite (`scripts/`)

DENTE has a comprehensive end-to-end smoke testing system built with Playwright and Puppeteer. These tests check UI rendering, API integrations, and database state invariants.

*   `npm run smoke:all` — Runs all smoke test scripts sequentially.

### 🎯 Specific Integration Tests

If you modify a specific module, you MUST run its corresponding smoke test:

| Test Script Command | Focus Area |
| :--- | :--- |
| `npm run smoke:telegram-bot` | Telegram webhook routing, command processing, and auth linking. |
| `npm run smoke:telegram-outbox-persistence` | Outbox message queueing and delivery receipts. |
| `npm run smoke:settings-admin-guard` | Role-based gate rules on the clinic settings pages. |
| `npm run smoke:billing-document-link` | Invoice generation, payments tracking, and document links. |
| `npm run smoke:speech-groq-chunk-floor` | Speech transcription, Groq AI key rotation, and backup. |
| `npm run smoke:browser-file-input-dicom` | Local directory scanning for DICOM files. |
| `npm run smoke:documents-lifecycle` | Patient clinical documents, acts, contracts generation, and signing. |

---

## 🚨 Execution Rules for Agents

1.  **Strict Lint Verification:** Before submitting your code, run `npx @biomejs/biome check --write .` to format files. Unformatted code violates the codebase standards.
2.  **Strict Compilation Gate:** You must run `npm run typecheck` after any TypeScript modifications. If it outputs errors, the task is incomplete.
3.  **No Blind Tests:** Never run tests while the local server is down. The test runner will timeout. Keep the dev server running or wait for port response before initiating tests.
