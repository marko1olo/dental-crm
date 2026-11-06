# 💻 CLI Commands & Smoke Tests

> ⚠️ **ВЫСШАЯ КОНСТИТУЦИЯ (THE SUPREME LAW):** [`.agents/THE_HAMMER_MASTER_PROMPT.md`](file:///C:/Clinic_MVP/dental-crm/.agents/THE_HAMMER_MASTER_PROMPT.md) и [`.agents/AGENTS.md`](file:///C:/Clinic_MVP/dental-crm/.agents/AGENTS.md).
>
> 🎯 **СТРАТЕГИЧЕСКИЙ ПРИОРИТЕТ №1 И ГЛАВНЫЙ АКЦЕНТ СИСТЕМЫ:**
> **Соло-врач (1–2 кресла, субаренда, ИП/самозанятый) и небольшая клиника (1–3 кресла)**.
> До сетевых холдингов нам ещё расти и расти! Все команды сборки, линтеры и смоук-тесты проверяют стабильность монолита и отсутствие трения.
>
> 🛑 **СТОП-ЛИНИЯ DEFINITION OF DONE (МАНДАТ 8j) & ZERO DEAD-ENDS (МАНДАТ 8n):**
> Код завершен только при: Exit 0 компиляторов, 0 ошибок кодировки (`check:encoding`), 0 нетипизированных моков, пофайловый `git add <file>`.

> 🧭 **Навигация:** [🗺️ Главный Индекс (.agents/INDEX.md)](file:///C:/Clinic_MVP/dental-crm/.agents/INDEX.md) | [📚 Портал Документации (docs/README.md)](file:///C:/Clinic_MVP/dental-crm/docs/README.md) | **[Системный Закон (AGENTS.md)](file:///C:/Clinic_MVP/dental-crm/.agents/AGENTS.md)**

This document catalogs commands for building, database management, lints, formatting, and the complete smoke testing suite.

---

## 🛠️ Package Manager Commands

The project uses `npm` workspaces. Run these commands from the root directory:

*   `npm run dev` — Starts both Fastify API and Vite Web servers concurrently.
*   `npm run build` — Compiles workspaces in sequence: `shared` ➔ `api` ➔ `web`.
*   `npm run typecheck` — Runs TypeScript compiler checks on all packages and apps.

    > **⚠️ Read this before you report a typecheck result (added 2026-08-06).** `typecheck` is **five
    > stages chained with `&&`**, not one command:
    > `shared` ➔ `shared:tests` ➔ `api` ➔ `api:tests` ➔ `web`.
    > Because they are chained, **the first failing stage aborts the rest**, and a log that ends in
    > errors may have run only one of the five. `EXIT=0` is necessary but not sufficient evidence — a
    > truncated or misread log can look clean.
    > **Always confirm the stage count**, e.g. `rg -c '^> @dental' <logfile>`, and report the number of
    > stages alongside the exit code. "Typecheck passes" without a stage count is not a verified claim.

*   `npx @biomejs/biome check --write .` — Lints, formats, and checks codebase styles globally.
*   `npm run lint` — `check:encoding` ➔ `check:dynamic-imports` ➔ `typecheck`, also `&&`-chained.
*   `npm run check:encoding` — `scripts/check-encoding.mjs`. Catches invalid UTF-8, a UTF-8 BOM, UTF-16,
    `U+FFFD`, and cp1252 mojibake. `.md` files are in scope, so documentation edits must pass it too.
*   `npm run check:guarded-headers` — `scripts/check-guarded-route-headers.mjs`.

---

## 🗄️ Database Commands

*   `npm run db:generate` — Generates SQL migration scripts based on Drizzle schema. **Hand-write
    migration SQL instead**; see `.agents/DATABASE.md` for why the drizzle journal does not describe this
    repo's migration set.
*   `npm run db:migrate` — Applies pending migrations to **native PostgreSQL 18 over TCP at
    `127.0.0.1:5432`**, via the custom runner `apps/api/src/scripts/migrate.ts`. *(Corrected 2026-08-06:
    this line used to read "to the PGlite database file". There is no PGlite database and no file-based
    engine — `@electric-sql/pglite` is not installed anywhere in the monorepo.)*
*   `npm run db:migrate:check` — Dry run. Shows what WOULD be applied and changes nothing. Run it before
    `db:migrate` and quote both.
*   `npm run db:reset-seed` — Destructively deletes ONE tenant's rows across 22 tables and re-seeds them
    from the JSON state file. Requires `DATABASE_URL`; there is no fallback connection string.

    > **🚨 The safety gate is real code as of 2026-08-06** — this supersedes the "NO safety gate"
    > correction written earlier the same day, which was accurate when written. What now guards it:
    > the seed runs in one transaction under `app.current_tenant`, so the clear cannot reach other
    > clinics; affected row counts are printed before anything is deleted; an **empty** tenant needs no
    > flag at all (a first deployment on a clean machine just works); a **non-empty** tenant requires
    > `DENTAL_ALLOW_DESTRUCTIVE_DB_RESET="YES"` or the script exits 1 and rolls back; and
    > `NODE_ENV=production` refuses unconditionally, with or without the flag. It is still destructive
    > by design — do not aim it at a database you care about. Details in `.agents/DATABASE.md`.

---

## 🧪 Testing Suites & Registries (SSOT)

> 🔬 **КАНОНИЧЕСКАЯ АРХИТЕКТУРА ТЕСТИРОВАНИЯ:** [`docs/testing/MASTER_TESTING_ARCHITECTURE.md`](file:///C:/Clinic_MVP/dental-crm/docs/testing/MASTER_TESTING_ARCHITECTURE.md).  
> Все тесты монорепозитория разбиты на 6 эшелонов и зафиксированы в доменных реестрах `docs/testing/`.

### 🧭 Доменные реестры тестирования:
- **Мастер-Архитектура (SSOT)**: [`docs/testing/MASTER_TESTING_ARCHITECTURE.md`](file:///C:/Clinic_MVP/dental-crm/docs/testing/MASTER_TESTING_ARCHITECTURE.md)
- **Сквозной E2E Master Lifecycle**: [`docs/testing/E2E_CLINICAL_TESTING_STANDARD.md`](file:///C:/Clinic_MVP/dental-crm/docs/testing/E2E_CLINICAL_TESTING_STANDARD.md)
- **Сетевой хаос и идемпотентность (UUIDv7)**: [`docs/testing/CHAOS_AND_IDEMPOTENCY_TEST_REGISTRY.md`](file:///C:/Clinic_MVP/dental-crm/docs/testing/CHAOS_AND_IDEMPOTENCY_TEST_REGISTRY.md)
- **Контракты роутов Fastify & CWE-209**: [`docs/testing/API_ROUTES_INQUISITION_REGISTRY.md`](file:///C:/Clinic_MVP/dental-crm/docs/testing/API_ROUTES_INQUISITION_REGISTRY.md)
- **ACID-транзакции и дедлоки Postgres 18**: [`docs/testing/ACID_CONCURRENCY_TEST_REGISTRY.md`](file:///C:/Clinic_MVP/dental-crm/docs/testing/ACID_CONCURRENCY_TEST_REGISTRY.md)
- **Фаззинг формулы FDI и копеек**: [`docs/testing/CLINICAL_MATH_FUZZING_REGISTRY.md`](file:///C:/Clinic_MVP/dental-crm/docs/testing/CLINICAL_MATH_FUZZING_REGISTRY.md)
- **Жизненный цикл ЭМК, дневников и ПЭП**: [`docs/testing/CLINICAL_EMR_TEST_REGISTRY.md`](file:///C:/Clinic_MVP/dental-crm/docs/testing/CLINICAL_EMR_TEST_REGISTRY.md)
- **React 19 & Zustand сторы**: [`docs/testing/WEB_COMPONENTS_TEST_REGISTRY.md`](file:///C:/Clinic_MVP/dental-crm/docs/testing/WEB_COMPONENTS_TEST_REGISTRY.md)
- **Касса 54-ФЗ, сплит и Soft Negative Stock**: [`docs/testing/CASHBOX_AND_WAREHOUSE_TEST_REGISTRY.md`](file:///C:/Clinic_MVP/dental-crm/docs/testing/CASHBOX_AND_WAREHOUSE_TEST_REGISTRY.md)
- **Радиология, DICOM и ЗТЛ наряды**: [`docs/testing/RADIOLOGY_LAB_ORDERS_TEST_REGISTRY.md`](file:///C:/Clinic_MVP/dental-crm/docs/testing/RADIOLOGY_LAB_ORDERS_TEST_REGISTRY.md)
- **Омниканальная телефония, мессенджеры и Outbox**: [`docs/testing/OMNICHANNEL_AND_TELEPHONY_TEST_REGISTRY.md`](file:///C:/Clinic_MVP/dental-crm/docs/testing/OMNICHANNEL_AND_TELEPHONY_TEST_REGISTRY.md)
- **ИИ-Копайлот и Workstation-Харнесс**: [`docs/testing/AI_COPILOT_TEST_REGISTRY.md`](file:///C:/Clinic_MVP/dental-crm/docs/testing/AI_COPILOT_TEST_REGISTRY.md)
- **Реестр очищения тестов**: [`docs/testing/TEST_SUITES_INQUISITION_REGISTRY.md`](file:///C:/Clinic_MVP/dental-crm/docs/testing/TEST_SUITES_INQUISITION_REGISTRY.md)

### 🎯 Быстрые тестовые команды (время прогона $\le 5$ с):
- `npx tsx --test apps/api/src/tests/routes/radiologyAndLabOrdersLifecycle.test.ts` — 17 тестов радиологии (DICOM/RVG), денситометрии HU (шкала Миша D1..D5) и нарядов ЗТЛ VITA
- `npx tsx --test apps/api/src/ai/__tests__/copilotAutonomousHarness.test.ts` — 17 тестов ИИ-ассистента и харнесса (ротация ключей, 3 уровня доверия, FDI, откат)
- `npx playwright test apps/web/tests/e2e/master-clinical-lifecycle.spec.ts` — E2E мастер-цикл приёма
- `npx tsx --test packages/shared/src/__tests__/fuzzingToothAndBillingMath.test.ts` — 10k фаззинг формулы FDI
- `npx tsx --test apps/api/src/tests/chaos/idempotencyAndOfflineStorm.test.ts` — шторм идемпотентности
- `npx tsx --test apps/api/src/tests/routes/apiContractsAndErrorHardening.test.ts` — контракты Fastify
- `node --import tsx --import ./src/tests/support/poolTeardown.ts --test apps/api/src/tests/concurrency/acidTransactionStress.test.ts` — ACID стресс
- `npx tsx --test apps/api/src/tests/clinical/clinicalEmrLifecycle.test.ts` — ЭМК и ПЭП
- `npx tsx --test apps/web/src/store/__tests__/appStoreBehavioral.test.ts` — сторы и гидратация
- `npx tsx --test apps/api/src/tests/routes/cashboxFiscalAndWarehouseDeduction.test.ts` — касса 54-ФЗ без ИНН физлиц, сплит-чекаут (карта+нал+семейный баланс) без float-дрифта, Soft Negative Stock склада
- `npx tsx --test apps/api/src/tests/routes/omnichannelTelephonyAndOutbox.test.ts` — 20 тестов омниканальной телефонии, транзакционного Outbox, тихого режима врача (Мандат 8v) и вебхуков мессенджеров (3.8 с)
- `npm run test:infra` — проверка базовой тестовой инфраструктуры

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

*(Verified 2026-08-06: every script above except one resolves to an existing file under `scripts/`.
**`npm run smoke:documents-lifecycle` does not exist** — it is declared in no `package.json` and no
matching file exists under `scripts/`. It was listed here as covering "Patient clinical documents, acts,
contracts generation, and signing"; that coverage is a documentation artifact, not a test. Do not report
it as run. `npm run smoke:all` resolves to `scripts/run-smoke-suite.mjs`.)*

---

## 🚨 Execution Rules for Agents

1.  **Strict Lint Verification:** Before submitting your code, run `npx @biomejs/biome check --write .` to format files. Unformatted code violates the codebase standards.
2.  **Strict Compilation Gate:** You must run `npm run typecheck` after any TypeScript modifications. If it outputs errors, the task is incomplete. **Report the exit code AND the number of stages that actually ran** — see the warning under `npm run typecheck` above; five `&&`-chained stages mean a failure at stage 1 leaves four unrun.
3.  **No Blind Tests:** Never run tests while the local server is down. The test runner will timeout. Keep the dev server running or wait for port response before initiating tests.
4.  **One writer per gate.** `typecheck`, `build`, migrations, seeds and Playwright runs all touch shared state — `dist/`, `.tsbuildinfo`, generated `packages/shared/dist/` and the single live PostgreSQL instance on `127.0.0.1:5432`. There is no per-agent database. Do not start one of these while another agent is mid-run (`.agents/AGENTS.md` §7a).
