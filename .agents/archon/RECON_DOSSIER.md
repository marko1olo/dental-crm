# RECON DOSSIER — DENTE / dental-crm

> ## ⛔ THE DATABASE SECTIONS OF THIS DOSSIER ARE STALE (banner added 2026-08-06)
>
> Compiled 2026-07-28; database numbers re-measured 2026-08-06. **Six statements below are now false.**
> They are left in place as a record of what was believed then — do NOT act on them. Corrected values:
>
> | This dossier says | Actual on 2026-08-06 |
> | :--- | :--- |
> | `drizzle.config.ts` declares `driver: "pglite"`, `url: "./dente-db"` (line ~40) | Config declares `dialect: "postgresql"`, reads `DATABASE_URL`, throws when it is blank |
> | `db:generate` writes snapshots for a database nobody uses (line ~41) | The config targets the real database now; still hand-write SQL, but for the journal reason, not this one |
> | `db/schema.ts` 2,505 lines, 122 `pgTable`, 44 `pgEnum` → 125 tables (lines ~131, ~196–197) | 3,158 lines, 126 `pgTable`, 46 `pgEnum` → **129 tables** declared; **148** tables live in `public` |
> | 90 `.sql`, `0000`–`0013` then `0061`–`0132`, duplicates `0119/0120/0124/0128` (lines ~198–199) | **130 `.sql`**, highest ordinal **`0160`**, **seven** duplicated ordinals: `0011`, `0012`, `0013`, `0119`, `0120`, `0124`, `0128` |
> | `meta/_journal.json` lists 28 tags matching **zero** `.sql` filenames (line ~200) | **34 entries, 17 matching a real file** (including `0157`–`0160`); 17 tags without a file; 113 files absent from it. A stale partial index, not a dead one — and the runner never reads it |
> | (not stated anywhere in this dossier) | `apps/api/dente-db` is a **PGlite corpse**, not a data directory — the live one is `.data/pg18`. RLS is deployed: 147 of 148 tables carry `FORCE` + a `tenant_isolation` policy |
>
> Authority for all of the above: `.agents/DATABASE.md`. Counts move daily under concurrent agents —
> re-measure with `fd`/`jq` before quoting any number from either document.

Compiled 2026-07-28 by the outgoing lead, from five parallel read-only census agents plus direct
verification. Everything here was read off disk or executed, not recalled. Line counts and hashes drift —
the tree is edited continuously. Re-check `git log` and `git status --porcelain` before acting on any of it.

**Purpose: so the next orchestrator does not re-derive any of this.** Facts below cost ~5 agent-hours.

---

## 0. SECURITY — HANDLE FIRST

`.git/config` remotes carry **live plaintext credentials**:
- `origin` → GitHub PAT embedded in the URL (`marko1olo` / `ghp_…`)
- `gitlab` → GitLab PAT embedded in the URL (`barsukdana` / `glpat-…`)

Any agent running `git remote -v`, or a verbose `git push`/`git fetch`, spills both into its transcript and
into any report file it writes. **Rotate both, move to a credential helper.** Until then: no agent may run
`git remote -v`, and no agent may paste git remote output into a report.

Also: `local-secrets/ai.env` holds live AI keys. A previous user instruction recorded in
`HANDOVER_AUDIT_2026-07-26.md` says do not raise rotation of those and do not flag them as a vulnerability.
Leave them alone; do not read, echo, or commit them.

---

## 1. STACK AND SHAPE

npm workspaces monorepo, `"type": "module"`, root `C:\Clinic_MVP\dental-crm`.

| Workspace | Stack | Size |
|---|---|---|
| `apps/api` (`@dental/api`) | Fastify + Drizzle + `pg` over native PostgreSQL 18 | 356 `.ts`, **120,819 lines** |
| `apps/web` (`@dental/web`) | React **19.2**, Vite 6, Tailwind **v4** (CSS-first), Zustand 5 | 417 files, **139,872 LOC** TS/TSX + **32,775 LOC** CSS |
| `packages/shared` (`@dental/shared`) | shared types/schemas | `src/index.ts` alone is 8,163 lines |

- **DB engine: native PostgreSQL 18 on `127.0.0.1:5432`.** `apps/api/src/db/client.ts` (44 lines) =
  `drizzle-orm/node-postgres` + `new pg.Pool({connectionString: requireDatabaseUrl()})`, throws if
  `DATABASE_URL` unset. **PGlite is not installed and appears in no `package.json`.**
- `apps/api/drizzle.config.ts` still declares `driver: "pglite"`, `url: "./dente-db"` — so
  `npm run db:generate` writes snapshots for a database nobody uses.
- `apps/api/dente-db/postmaster.pid` contains PID `-42` and datadir `/pglite/data` — **a PGlite sentinel
  artifact, not a Postgres pid file.** Three rule files cite it as "proof" the setup is native Postgres.
  The conclusion is right, the cited evidence is fake — a real `postgres.exe` is PID 18968 on 5432.
- `.tmp-api-dev.pid` = 57996 → dead process. Stale.

### Ports
| Service | Address | Notes |
|---|---|---|
| API (Fastify) | `127.0.0.1:4100` | `API_HOST`/`API_PORT`; health is **`/api/health`**, bare `/health` is 404 |
| Web (Vite) | `127.0.0.1:5173` | proxies `/api` → 4100, `ws: true` |
| Postgres | `127.0.0.1:5432` | PID 18968 + ~10 backends |

**All three were LISTENING and returning 200 at the time of this dossier.** Do not assume a quiet machine —
14 `node.exe` processes were live.

---

## 2. COMMANDS THAT ARE REAL

```
npm run dev            # concurrently: api tsx watch + web vite. THE way to start.
npm run typecheck      # THE compile gate: shared → api → web. Also aliased as `npm run lint`.
npm run build          # shared → api → web
npm test               # node:test across shared(6) + api(95) + web(34) test files
node scripts/check-encoding.mjs      # UTF-8 / mojibake guard. Currently RED (see §6).
npm run smoke:all                    # runs 124 of 127 smokes, sequential
node scripts/run-smoke-suite.mjs --only=<regex>   # targeted subset; SMOKE_ONLY=<regex> also works
npm run smoke:<name>                 # 127 keys, all 127 resolve to real files
npm run db:migrate / db:migrate:check / db:migrate:baseline
```

- **Test runner is Node's built-in `node:test` via `tsx`.** `node --import tsx --test "src/**/*.test.ts"`.
  **Vitest is NOT installed** (`apps/web/src/types/modules.d.ts:1` declares a fake `module "vitest"` shim to
  keep `tsc` quiet). **Playwright has NO config and ZERO `.spec` files** — it and puppeteer are used as
  libraries driven by hand-written CDP scripts.
- **There is no CI. No `.github/`, no `.gitlab-ci.yml`.** Nothing runs automatically anywhere.
- **There are no git hooks.** `.git/hooks/` is samples only, no `.husky`, no `lint-staged`. Nothing is
  enforced at commit time — the discipline is entirely on the agents.
- **There is no biome config and `@biomejs` is not installed**, despite three authority docs ordering
  `npx @biomejs/biome check --write .`. Running it downloads biome and reformats the entire repo root with
  default settings — 208 loose scripts, all `.agents/*.md`, everything. **Never order this.**
- `.agents/COMMANDS_AND_TESTS.md:44` orders `npm run smoke:documents-lifecycle` — **that key does not
  exist**. The real key is `smoke:document-lifecycle`, singular.
- `smoke:all` filters on `command.startsWith("node ")`, so it silently skips `smoke:schedule-configuration`
  and `smoke:wave16`. 124 of 127.

---

## 3. FRONTEND FACTS

### Routing — no router library
`appStore.currentView` (zustand) driven by a hash listener. Three files:
1. `apps/web/src/workspaceShell.tsx:25` — `appViews` = the 11 legal routes: `shift, schedule, patients,
   imaging, visit, documents, finance, analytics, communications, settings, marketing`. Plus `viewLabels`,
   `viewHints`, `getFilteredAppViews(role)`.
2. `apps/web/src/AppHelpers.tsx:6033` — `viewFromHash()`: `hash.split("/")[0]`, validated against
   `appViews`, falls back to `"shift"`. `settingsTabFromHash()` at `:6042` reads segment 2.
   **URLs have no leading slash: `#schedule`, `#settings/prices`.**
3. `apps/web/src/useAppLogic.tsx:4280-4291` — the only `hashchange` listener; `:4293` role-guards and
   force-redirects to `shift`.

Rendering is a flat `{currentView === "x" ? <X/> : null}` chain in `App.tsx`, all 11 lazy, each wrapped in
`WorkspaceRouteErrorBoundary` + `Suspense`.

**`apps/web/src/AppRouter.tsx` (359 lines) is DEAD CODE and says so in its own header.** It contains 5
views `App.tsx` never renders and `appViews` does not list, so these are **unreachable**:
`InventoryView` (1366), `PayrollView` (867), `LeadsKanbanView` (996), `OmnichannelInboxView` (1306),
`ScannerView` (154). A guard test `tests/panelsAreMounted.test.ts` exists precisely because panels were
added to the dead file and silently never rendered.

Also route-less, imported by nothing: `pages/PublicBookingWidget.tsx` (477),
`pages/DoctorPayoutDashboard.tsx`, `pages/FinancialDashboard.tsx`, `GuestLabPortal.tsx` (245).
`components/PatientPortal.tsx` (520) is imported **only** by `SettingsTelegramTab.tsx` as a preview widget.

**Broken link, live:** `components/schedule/LabOrdersPanel.tsx:188` hands technicians
`${origin}/#/portal/lab-order/${token}`. `viewFromHash()` rejects `portal`, falls back to `shift` → the lab
tech lands on the staff auth gate. The backend route (`/api/portal/lab-order/:token`) is real and works.

### The monoliths — targeted regions only, never read whole
| Lines | File |
|---|---|
| **16,895** | `apps/web/src/styles/main.css` |
| **14,425** | `apps/web/src/useAppLogic.tsx` |
| **6,066** | `apps/web/src/AppHelpers.tsx` |
| **5,053** | `apps/web/src/DocumentsView.tsx` |
| **4,774** | `apps/web/src/App.tsx` (was 4,758 mid-scan — it moves) |
| 4,244 / 4,145 / 2,623 | `components/settings/SmartImportStudio.tsx` / `SettingsImportsTab.tsx` / `LegacyMigrationStudio.tsx` |
| 2,624 | `store/documentStore.ts` |
| 2,389 / 2,165 | `useSettingsDerivations.tsx` / `components/settings/SettingsAuditTab.tsx` |
| backend | `routes/imaging.ts` 6,740 · `routes/smartImports.ts` 5,943 · `routes/telegram.ts` 2,666 · `db/schema.ts` 2,505 · `sampleData.ts` **443 KB** |

### The God Context — `useAppLogic.tsx`
- Return statement at line **13472**, closing at 14425 → a **953-line object literal**.
- **949 explicit fields + 2 spreads ≈ 1,014 effective fields.**
- 70 `useEffect`, 57 `useMemo`, 9 `useRef`, 3 `useState`, **0 `useCallback`** — every returned function
  identity is fresh every render, and the whole tree re-renders on every keystroke.
- Context type is `ReturnType<typeof useAppLogic>`; `useAppLogicContext()` **returns `{} as T` when the
  provider is missing** instead of throwing — silent-undefined footgun.
- Duplicate legacy `src/logic/AppLogicContext.tsx` coexists with `src/contexts/AppLogicContext.tsx`.
- `.claude/rules/dente-god-context.md` fires on this file: additive changes only, changing the return
  block breaks 50+ files' typecheck.

### Design system — there isn't one
- **No `tailwind.config.*` anywhere.** Tailwind v4 CSS-first via `@tailwindcss/vite` +
  `src/styles/tailwind.css` (55 lines), which deliberately imports only `theme.css` + `utilities.css` and
  **excludes preflight** because 351 KB of handwritten CSS assumes browser defaults.
- **No `components/ui/` folder, no shadcn, no component library at all.** No radix, no headlessui, no MUI,
  no `clsx`, no `cva`, no `tailwind-merge`. The entire UI vocabulary is **lucide-react icons + handwritten
  CSS + Tailwind utilities**. Closest to primitives: loose `Badge.tsx` (46 lines), `EmptyState.tsx`,
  `PatientAvatar.tsx` — all created by the previous fleet.
- **15 CSS files in `src/styles/`, 21,947 lines**, imported by `main.tsx:8-27` in a load-order-sensitive
  sequence: `tailwind → main(16895) → shadow-analyst → patients-redesign → premium → dente-redesign(1275)
  → token-aliases → touch-targets → overflow-fixes → contrast-fixes → dente-operations → onboarding-wizard`.
  Four of those names (`token-aliases`, `overflow-fixes`, `contrast-fixes`, `touch-targets`) are **repair
  layers patching the layers above them.**
- **Tokens: 122 unique CSS custom properties.** Canonical palette at `styles/dente-redesign.css:11-161` in
  three blocks — `:root,[data-theme="light"]` (11-65), `[data-theme="dark"]` (67-113),
  `[data-theme="night"]` (115-161), ~50 tokens each. **`main.css` has its own competing 41-var `:root`.**
- `styles/token-aliases.css` (97 lines) is a documented repair layer: it records **19 undefined `var()`
  names used 56 times** and **347 hardcoded hex backgrounds in `main.css`**.
- Theme chain: `store/themeStore.ts` (`light|dark|night|auto`, localStorage `dente_theme_mode`) →
  `lib/themeClasses.ts` `resolveTheme`/`applyThemeToRoot` → sets `root.dataset.theme` →
  `tailwind.css:55` `@custom-variant dark (&:where([data-theme="dark"],[data-theme="night"],.dark,…))` so
  Tailwind's `dark:` reads `data-theme` and night inherits dark variants. **708 `dark:` utilities across
  74 files.** Switch lives in `workspaceShell.tsx:165-199`: «День» / «Ночь» / «Тепло».

### i18n — zero, and the constitution mandates it
- **No i18n library of any kind.** No i18next/react-intl/lingui/formatjs. No `*i18n*`/`*locale*` file.
  Zero `useTranslation`.
- **Russian is hardcoded in JSX/TS literals: 314 files, ~14,814 Cyrillic-bearing lines.**
  211 of 223 `.tsx` (10,677 lines) and 103 of 143 `.ts` (4,137 lines).
- Worst: `DocumentsView.tsx` 829 · `SettingsImportsTab.tsx` 744 · `useAppLogic.tsx` 695 ·
  `SmartImportStudio.tsx` 633 · `AppHelpers.tsx` 514 · `LegacyMigrationStudio.tsx` 423.
- **There is a fake language selector**: `appStore.uiLanguage`, rendered as a `<select>` at
  `App.tsx:2556`, fed by `AppHelpers.tsx:2860-2872` where `uiLanguageOptions = [defaultUiLanguageOption]`
  and `uiLanguageLabels = { ru: "Русский" }`. **One option. It changes nothing.**
- Only label-dictionary-shaped artifacts (single-language `Record<Enum,string>`, not a translation layer):
  `workspaceUiLabels.ts` (411), `imagingUiLabels.ts`, `pricelistUiMeta.ts`, `workspaceStaticOptions.ts`.
  **These are the natural seam for a real i18n route.**

### State
13 zustand stores, 5,051 LOC. `store/appStore.ts` declares **440 members, overwhelmingly typed `any`**
(`currentView: any`, `setCurrentView: (val:any)=>void`). Structural smell: `store/` (12 files) and
`stores/` (1 file) coexist; `src/tests/` and `src/__tests__/` coexist with the same test file in both.

### Dependency hazards
`playwright` and `vite` are in `apps/web` **prod** dependencies. `recharts@^3.10.1` is declared only in the
**root** package.json yet imported by `pages/AnalyticsDashboardView.tsx` — undeclared-dependency hazard.

---

## 4. BACKEND FACTS

- **53 route files, 31,880 lines, 313 HTTP handlers** in `apps/api/src/routes` (+10 in `routes/documents/`).
- **`db/schema.ts` 2,505 lines, 122 `pgTable`, 44 `pgEnum`**; +2 in `communicationsSchema.ts`, +1 in
  `patientsSchema.ts` → **125 tables**.
- **Migrations are a mess**: 90 `.sql` in `apps/api/drizzle/`, numbered `0000`–`0013` then jumping to
  `0061`–`0132`, with duplicate ordinals (two each of `0119`, `0120`, `0124`, `0128`).
  `drizzle/meta/_journal.json` lists 28 tags that **match zero `.sql` filenames**. drizzle-kit's journal is
  dead. The real runner is custom: `src/scripts/migrate.ts` (222 lines) — reads `drizzle/*.sql` sorted
  numerically, one transaction each, records name+sha256 in `_dente_migrations`. Flags `--dry-run`,
  `--baseline`, `--strict`.
- **Auth is NOT JWT.** `utils/cryptoHelper.ts` — `signToken` produces `base64url(payload).base64url(HMAC-
  SHA256)`, two segments, no header. `hashCredential` = PBKDF2-SHA512, 100k iterations. Secret from
  `security/authSecret.ts` (`AUTH_TOKEN_SECRET` ≥32 chars required in production, dev self-generates into
  `.data/dev-auth-secret`). Three header planes: `x-dente-clinic-token`, `x-dente-staff-token`,
  `x-organization-id` (the last honored only when `NODE_ENV!=="production" && DENTE_DEV_ALLOW_HEADER_ORG==="1"`).
  Guards in `accessGuard.ts` (196 lines).
- **How a test authenticates** — two routes, both proven in existing tests:
  1. `import { TOKEN_SECRET } from "../routes/auth.js"` then
     `signToken({organizationId}, TOKEN_SECRET())` → send as `x-dente-clinic-token`.
  2. `process.env.DENTE_DEV_ALLOW_HEADER_ORG = "1"` + header `x-organization-id`. Used by all 7 DB-backed
     `tests/routes/*`.
- **`server.ts` (557 lines)** registers ~65 route modules. Production boot **throws** if any of
  `DENTE_CLINICAL_ALLOW_UNGUARDED_READS/MUTATIONS`, `DENTE_SETTINGS_ALLOW_UNGUARDED_MUTATIONS`,
  `DENTE_DEV_ALLOW_HEADER_ORG`, `DENTE_ALLOW_DEMO_LOGIN`, `DENTE_ALLOW_DEMO_FIXTURES` is `"1"`.
  `WEB_ORIGIN` required in production.
- **95 api test files**, scattered across 17 directories, not centralized. **`documents.test.ts` exists
  5×**, `clinicalQuery.test.ts` 3×. The `src/**/*.test.ts` glob runs all copies.
  16 files use `app.inject()`; **21 import `db/client.js` and hit real Postgres**, guarding with a regex on
  connection errors rather than skipping.

### Integration surfaces — real vs stub
| Surface | Verdict | Evidence |
|---|---|---|
| Telegram | **REAL** | `telegramTransport.ts` 3× `fetch` to `api.telegram.org` |
| WhatsApp | **REAL** | `whatsappTransport.ts` → `graph.facebook.com/.../messages`, HMAC-verified webhook |
| SMS | **REAL** (new, 07-27 17:09) | `smsTransport.ts` — SMS.RU + SMSC.RU, incl. `insufficient_funds` classification |
| Email | **REAL** (new, 07-27 17:07) | `emailTransport.ts` — hand-written SMTP over `node:net`/`node:tls`, no nodemailer |
| Speech/STT | **REAL, 5 providers** | Deepgram, Groq, OpenAI, AssemblyAI, Gemini; SSH SOCKS5 tunnel on :1080 |
| AI | **REAL** | 13 files, provider-switched base URLs (openai / groq / gemini-openai-compat) |
| Telephony | **INBOUND ONLY** | `routes/telephony.ts` 189 lines, 0 `fetch`. No click-to-call, no PBX client |
| EGISZ / РЭМД | **STUB** | `routes/egisz.ts` 0 `fetch`; valid CDA R2 XML generated, never transmitted; UKEP absent |
| VK | **STUB** | `routes/vk.ts` 111 lines, 0 `fetch`, inbound only |
| MAX | **STUB, honest** | `routes/max.ts:371` returns 501 `MaxSendNotImplemented` |

`services/communications/channelRouter.ts:213` is the truth: `MACHINE_DELIVERABLE_CHANNELS =
["sms","email","whatsapp","telegram"]`; vk/max return an explicit not-configured result.

### Background workers
**Wired:** telegram outbox due-worker; communication dispatch worker (**off by default** —
`DENTE_COMMUNICATION_WORKER_ENABLED`); migration worker; backup daemon (only in `startDenteApiServer()`,
so not in `createDenteApiApp()` tests).
**Defined but never called from anything but their own tests:** `startBiAnalyticsWorker`,
`startNotificationWorker`, `RecallScheduler`, `startSyncDaemon`. `src/watchdog.ts` is **7 lines and does
nothing**. `scripts/cronAnalyticsWorker.ts` has no scheduler attached.

---

## 5. PROVEN BROKEN — DO NOT RE-FIND

Everything here was verified in code at the cited line, not read off a doc.

### 5.1 The FEATURES_REGISTRY is fabricated — the most dangerous file in the repo for planning
`docs/competitive-audit/FEATURES_REGISTRY.md`: 63 rows — 49 `[ДА]`, 11 `[ЧАСТИЧНО]`, 3 `[НЕТ]`.
Every `[ДА]` row cites `apps/api/src/db/<name>Query.ts` **and `proof_<name>.png`**.
`find . -name "proof_*.png"` → **0 files. All 49 cited screenshots do not exist.**
The 49 cited query modules are one-function SELECTs against tables with **zero writers**. Spot-checked 12
tables for `db.insert(` across all of `apps/api/src`: `uisSmsChatQuotas`, `messageTemplateCatalogs`,
`ndflTaxCalculators`, `egiszBlankPermissions`, `patientDuplicateMergeQueues`, `scheduleTimeReservations`,
`treatmentPlanLockTokens`, `kkmItemQuantityUnits`, `diagnocatAiFindings`, `uisCallSpeechTranscripts` and 2
more → **all zero inserts.** Read-only tables nothing writes to = permanently empty.
Example: `db/uisSmsChatQuotasQuery.ts` is **10 lines total** and is the entire "two-way SMS via UIS with a
300/day cap" feature, scored 4/5 `[ДА]`.
Example widget: `components/documents/NdflTaxCalculatorsWidget.tsx` — "Авто-Калькулятор Справки НДФЛ с
Блокировкой при Аномалиях" — contains **zero arithmetic**; it fetches and renders `item.totalEligibleRub`
and `item.hasAnomalyWarning` verbatim. **42 such widget files exist. `db/*Query.ts` = 65 modules; a guard
test says 50 carried the pattern.**
`GAP_REPORT_2026-07-27.md:8-10` itself rejects FEATURES_REGISTRY, OUR_CRM_MAP, BACKLOG, PROGRESS and
HANDOVER_AUDIT as sources "because they describe a layer that turned out to be non-functional."

### 5.2 Analytics renders `+null ₽` and `null%` — live, and typecheck cannot see it
The API was made honest; the UI was not updated.
- `apps/api/src/routes/analytics.ts:127-132` — `margin: null as number|null`, `completionRate: null as number|null`
  (the old hardcoded 35% margin and 85 completion were removed).
- `apps/web/src/pages/AnalyticsDashboardView.tsx:42-47` still declares `margin: number; completionRate: number`.
- `:438` `+{formatRub(doc.margin)}` inside `className="margin-positive"`; `:50-54` `formatRub` returns
  `` `${n} ₽` `` → **the string `"null ₽"` in green**.
- `:450` `{doc.completionRate}%` → **`null%`**, and `null>=80` / `null>=60` are both false → colored red.
- `:88-90` `const json = await res.json(); setData(json.data)` is `any`, so **TS never checks the contract**.
This is the canonical example of why "0 typecheck errors" is not proof.

### 5.3 Patient portal OTP is `"0000"` in the config on this disk
`apps/api/src/routes/portal.ts:51-62`:
```ts
if (process.env.NODE_ENV !== "production") return code || "0000";
```
`POST /auth/send-otp` (`:66-78`) returns `{success:true, message:"OTP sent"}` and **sends nothing** — the
comment at `:74-75` says so. `verify-otp` compares against that one global static value, then issues a
portal session for whichever patient matches the last 10 phone digits.
**`.env:5` and `.env.local:1` both set `NODE_ENV=development`.** So right now: phone number + `0000` reads
any patient's visits, treatment plans, invoices and issued documents. In production the code must be 6+
chars but is still **one shared secret for all patients forever, with no delivery channel** — while
`smsTransport.ts` now exists and works.

### 5.4 `syncDaemon` marks medical records backed-up after uploading nothing
`apps/api/src/services/syncDaemon.ts:185-227`. With mock exchange disabled, `response` is a **hardcoded
literal** `{success:true, cloudChanges:{…all empty…}}`. The `if (response.success)` branch then runs **five
`db.update(...).set({isSynced:true})`** against `patients`, `visitDiaries`, `toothStates`,
`treatmentPlans`, `patientInvoices`. **There are zero network calls in the file.**
Worse: `mockCloudVaultExchange()` (`:51-99`) selects a **real unpaid invoice** and injects
`status:"paid", version+1` as a "cloud change" which the merge path writes back. Gated on
`NODE_ENV!=="production" && DENTE_SYNC_MOCK_CLOUD_ENABLED==="1"`.
Mitigated only by `startSyncDaemon` (`:27`) having **zero call sites**.

### 5.5 `scripts/cronAnalyticsWorker.ts` — invented profit, armed by one import
`:115-120` — `margin: Number(row.revenue) * 0.4, // Simplified margin heuristic` and
`completionRate: 85`. It writes into `biAnalyticsSnapshots`, the same table/shape the UI consumes.
Harmless only because nothing imports the file.

### 5.6 Other confirmed hits
| file:line | defect |
|---|---|
| `apps/api/src/db/documentQuery.ts:190` | `issuedByUserId: "doctor"` — **legally issued documents attributed to a literal string**, no real signer |
| `apps/api/src/services/clinical/ClinicalRouter.ts:3,43` | `// Mocking db imports…` — clinical phase-handoff tasks are returned to the caller and **never persisted** |
| `apps/api/src/routes/dicomweb.ts:7` | WADO mock — **every DICOM instance UID serves the same `.data/dicom/test.dcm`** |
| `apps/web/src/components/dicom/Cornerstone3DViewer.tsx:230-232` | panoramic reconstruction uses a **fixed fake spline** `[{100,100},{200,150},{300,100}]`, not the drawn ROI |
| `apps/web/src/MarketingView.tsx:113-114` | `setTimeout(…,600)` then `"--- ДЕМО-РЕЖИМ (LLM не подключена) ---"` — fake latency simulating an LLM |
| `apps/web/src/workspaceRouteErrorBoundary.tsx:22,62` | renders `error.stack` **unconditionally, in production too** — raw JS stack traces with bundle paths shown to clinic staff. `AppShell`'s boundary sanitizes; this one leaks |
| `db/pricelistQuery.ts:15`, `billingQuery.ts:14`, `imagingQuery.ts:148`, `documentQuery.ts:80` | four copies of `getDefaultOrganizationId()` returning a hardcoded UUID. **Dead — zero live call sites — but re-armable by one call** |
| `apps/api/src/routes/settings.ts:203` | returns hardcoded org UUID when persistence is off |

**Marker counts are useless here.** `TODO`: 54 raw / **0 real** (all `.shift-todo` CSS classes).
`FIXME`: 0. `заглушка`: 0 in code. This codebase does not mark its stubs — its ~65 verified defects were
found by behavior, never by comment. **Do not use marker greps as a health metric.**

### 5.7 Open from `HANDOVER_AUDIT_2026-07-26.md` (which admits it never ran anything)
Read its §0 and §6 before trusting any of it: `npm install`, `build`, `typecheck`, tests **never run once**;
the browser never opened; SQL never executed; git parsed by hand out of `.git/objects`; `apps/web` never
fully transferred into its sandbox; its "verification" was diffing homemade-compiler diagnostics with all
deps declared `any`.

Still open per that document:
- **Kopecks unrepresentable.** `amountRub` is an **integer** in `payments`, `treatment_items`,
  `generated_documents`. Every kopeck amount is rounded. Wrong for 54-ФЗ and for FNS certificates. Needs a
  coordinated DB + API + UI migration. (Commit `c28c9c532` "касса научилась принимать копейки" touched the
  cashbox only.)
- **Dictation transcripts live only in a module-level array**, evicted after 80 records, **lost on process
  restart**. A doctor dictates a visit; after a restart there is no text.
- **`mutableStateSnapshot()` writes DB rows into `.data/dental-crm-state.json`** from **32
  `persistMutableState()` call sites**, including Telegram code issuance → a multi-megabyte write per
  Telegram action on a 10k-patient clinic.
- **Telegram**: daily-digest dedup keyed on **UTC date** (Samara is UTC+4, so a 02:00-local digest counts
  as the previous day); unparseable `scheduledAt` **treated as due** → fails open, sends immediately;
  partial "photo + text" delivery marked wholly failed → patient gets the photo, then gets it again.
- **`diary.ts` POST signing path skips the ceremony `/lock` performs** — consumables not deducted from
  inventory, no audit-log entry. Two paths, divergent results. Diary edits do not save `revisionReason` or
  the previous tooth number.
- **AssemblyAI polling capped at 15 s** — long recordings always lose their result, silently.
  **Provider-side audio deletion is not performed although `system.ts:409` states it is** (medical data).
- `apps/api/src/db/migrations/add_tooth_state_history.sql` — **still needs applying** per HANDOVER §5 step
  4. Until then tooth-state history keeps collapsing DELETE+INSERT into one row authored "System".
- **Repo garbage still on disk:** `sampleData_opt.ts` (429,160 bytes, **0 importers**); ~30 one-shot
  rewrite scripts in the repo root (`fix.py`, `fix2.py`, `fix_*.cjs` ×9, `patch*.mjs`, `move_*.cjs`,
  `gen_*.cjs`, `measure*`, `test_*`) — **one of these destroyed 10,554 Cyrillic characters in
  `routes/telegram.ts`**; `package-lock.json.rej`; `apps/api/NUL` (94 bytes, created by redirecting to
  `NUL` from bash instead of `/dev/null`).

### 5.8 Fixed on 2026-07-27, per GAP_REPORT §4 — plausible, never runtime-verified
`197795cc1` — **seven route modules were never registered with the server** (inventory, portal,
publicBooking, telephony, diary, egisz, templates); all 404'd while the frontend called `/api/inventory`
from 25 places. Analytics dashboard always empty because a guard's `Promise<boolean>` was assigned to
`orgId`. EGISZ `"CONNECTED"` literal → honest `NOT_CONFIGURED`. Guard test
`routeRegistrationCoverage.test.ts` confirmed present.
`c2d0910e9` — tenant isolation across billing/smartImports/ai/pricelist; smart-import commit **failed every
time there was anything to import** (`async` without `await`).
`2aefdff99` — 50 data-access modules stop inventing patients. Guard test
`tests/noFabricatedDataFallback.test.ts` confirmed present; its header documents the
`CREATE TABLE IF NOT EXISTS`-inside-handler race that made 17 tables diverge from `schema.ts` so the SELECT
failed *always* and fabrication was the only output.
`7eb73c9d9` — 56 widgets stop using a hardcoded org id.
`aaf8b89ac` — WhatsApp real, MAX honest 501, migration 0120 added `max` to the channel enum (**MAX messages
had been recorded as Telegram**).
`53906ddfb` — roles/permissions: read and write had been guarded by the same secret.
**Permissions matrix is on money routes in SOFT mode only.** Mandatory staff login + `requirePermission`
on all mutating routes is listed as remaining.

### 5.9 Baseline RED right now — not your fleet's fault, do not let it be blamed on them
1. `node scripts/smoke-workspace-shell-source.mjs` → **exit 1**: "Sidebar view hints must collapse on mobile
   to protect bottom navigation" + "ScheduleView must not force smooth programmatic scrolling".
2. `node scripts/check-encoding.mjs` → **exit 1**: U+FFFD + cp1252 mojibake (`Ñ‚Ð¼ÐµÑ‚ÐºÐ°`, line 531) in
   `scripts/smoke-visit-workflow-forms-lifecycle.mjs`.
3. **Three `smoke:workspace-live-*` scripts have a real path bug.**
   `scripts/smoke-workspace-live-routes.mjs:36` resolves `apps/web/node_modules/vite/bin/vite.js`, but npm
   workspaces **hoisted vite to the root**. Dies with the misleading "Vite binary is missing. Run dependency
   install before this smoke test." Same bug in `smoke-workspace-live-core-actions.mjs` and
   `smoke-workspace-live-settings-actions.mjs`. **This is a free, well-scoped first fix.**

---

## 6. THE PROOF PIPELINE — one is trustworthy, two are lies

| Script | live server | asserts 200 | logs in | real routes | output |
|---|---|---|---|---|---|
| **`scripts/ops-panels-shots.mjs`** | required | **yes, hard fail** | yes, seeded tokens | yes | `.dente-ops-shots/` |
| `scripts/dente-redesign-shots.mjs` | required | **yes, hard fail** | yes, `/api/auth/login` | yes, 11 views | `.dente-redesign-shots/` |
| `scripts/screenshot-all-views.mjs` | assumed | **no check at all** | **no** | hash-nav only | a hardcoded foreign `.gemini` dir |
| `scripts/capture-honest-screenshot.cjs` | assumed | logs, never branches | **no** | single page | a hardcoded foreign `.gemini` dir |

**`ops-panels-shots.mjs` is the good one and it was built with anti-fabrication discipline.** It
`fetch`es the web base and `throw`s if `!res.ok` (`:27-30`); requires `.ops-shot-tokens.json` or throws
with the exact seed command; injects clinic+staff tokens; dismisses the onboarding wizard;
`waitForWorkspace()` **rejects login and wizard screens for 45 s rather than shooting them**; captures
per-panel by `data-testid` with a clip box; and **on a miss writes `<name>_ПУСТО.png` of what was actually
on screen plus the last 3 page errors** — it subscribes to `Runtime.exceptionThrown` and `consoleAPICalled`
throughout. Port 9341.

```
npm run dev                                                                     # must be up
cd apps/api && npx tsx src/scripts/seedOpsScreenshotDemo.ts > ../../.ops-shot-tokens.json
node scripts/ops-panels-shots.mjs        # → .dente-ops-shots
node scripts/dente-redesign-shots.mjs    # → .dente-redesign-shots (11 views × desktop/mobile × light/dark)
```

`dente-redesign-shots.mjs` weakness: `waitForViewReady` only `console.warn`s on timeout and proceeds
(`:140`), so a slow view gets captured un-rendered. **That is exactly how the fabrication in §7 happened.**

**Never order** `screenshot-all-views.mjs` or `capture-honest-screenshot.cjs`. The second one's name is a
lie: it prints `HTTP Response Status` and never branches on it.

---

## 7. THE VISUAL VERDICT — read directly, by the lead, with its own eyes

See `VISUAL_VERDICT.md` in this folder. Headline: **the shipped shot set is partly fabricated (44 unique
md5 across 56 files; six desktop "themed" screenshots are one byte-identical Vite CSS error overlay), the
manager-reports screen is genuinely excellent, and the design gap is composition and hierarchy, not
palette.**

---

## 8. WHO ELSE WORKS HERE

- **Authors all-time:** `marko1olo` 770, `google-labs-jules[bot]` 440, `Петушков А.` 277,
  `Antigravity AI` 175, `facebook338435-create` 10. The bot and Antigravity are dormant — the **last 100
  commits are 99× `marko1olo`**. Everything now flows through one identity.
- **Cadence:** 2026-07-25 → 45 commits, 07-26 → 29, 07-27 → **177**. Peak was 46 commits in the 03:00 hour
  — one every 78 seconds — during the previous fleet's burst.
- **No automated committing job.** No hooks, no `.husky`, no scheduled task, no `git commit` in `scripts/`.
  The three `auto: save local changes` commits are historical (07-09/10), not active. **Unlike HECTON-8,
  nothing will steal your authorship.** But a human/agent at one commit per 78 seconds still moves HEAD.
- **Commit style: Conventional Commits with RUSSIAN scopes and subjects**, stating the defect, not the
  activity. Real examples from HEAD:
  - `fix(настройки): раздел не открывался вообще — вкладке «Клиника» не передали 37 значений`
  - `fix(связь): тупик «настройте окружение сервера», форма без объекта, четыре нуля`
  - `fix(записи): «выберите кресло» в клинике, где кресел нет вовсе`
  - `feat(patients): поиск и слияние дублей — раньше этого не было нигде`
  - `refactor(web): убраны 14 виджетов, показывавших «данные отсутствуют»`
  **Match this voice.**
- **Dirty tracked files (mid-edit by someone — DO NOT TOUCH):** the Manager Reports feature —
  `apps/api/src/routes/reports.ts`, `apps/api/src/services/reports/managerReports.ts`,
  `apps/api/src/tests/routes/managerReports.test.ts`,
  `apps/web/src/components/reports/ManagerReportsPanel.tsx`.
- **Never stage these three — they churn from the running dev server:**
  `apps/api/.data/dental-crm-state.json`, `apps/api/.data/speech-key-health.json`,
  `apps/web/tsconfig.tsbuildinfo`.
- **215 untracked entries**, including `scratch/` with 272 files and a partially-tracked
  `.dente-redesign-shots/`. `git add .` here would be a catastrophe. **10 stashes exist**, 6 identical
  `WIP on (no branch)` — leftover garbage, do not touch.

### The previous fleet — reuse its protocol, avoid its mistakes
13 untracked `.agents/<role>/` dirs from two generations on 2026-07-27 (02:22–02:42 and 03:47–03:56).
**Uniform 4-file schema:** `BRIEFING.md` (working memory) + `ORIGINAL_REQUEST.md` (verbatim task) +
`handoff.md` (final report) + `progress.md` (checkbox heartbeat).

Worth stealing:
- `orchestrator/` — dispatch pattern **Explorer → Worker → Reviewer → Challenger**, failure ladder
  **Retry → Replace → Skip → Redistribute → Redesign**, a **Team Roster** table (agent | type | work item |
  status) and a **Succession Status** counter. Hard rule it set for itself: *"NEVER write, modify, or create
  source code files directly as orchestrator."*
- `reviewer_m4/` — **the best artifact.** Review rubric (typecheck 0 across 3 workspaces; N/N unique MD5;
  every PNG ≥40 KB; 0 blank/500; 4-state coverage) plus an **Attack Surface** section listing 5 falsifiable
  hypotheses, each marked DISPROVED.
- `worker_m2/progress.md` — an item → commit-hash ledger.
- The `ПРОВЕРЕНО` / `НЕ ПРОВЕРЕНО` split in every handoff.

Its actual failures, do not repeat:
- **Generation 2 did not read generation 1's handoffs and re-refactored the same 11 views.** Duplicate work.
- `worker_batch_b`'s Change Tracker said "None yet" while `progress.md` said all done — briefing/progress
  desync.
- **The fleet died mid-flight**: M2 and M4 left unchecked, the mandatory "Victory Audit" gate never fired.
- `reviewer_m4` certified the UI milestone as APPROVE with "typecheck 0 errors, 56 unique MD5, 0 blank
  pages" — **that certification is real and completely orthogonal to the `+null ₽` defect on the very
  Analytics screen it screenshotted**, and the 56-unique-MD5 claim does not hold for the folder's current
  contents. A green rubric proved nothing about the product.

### `.agents/skills/` — 7 vendored claudekit design skills
`banner-design`, `brand`, `design`, `design-system`, `slides`, `ui-styling`, `ui-ux-pro-max` (67 styles,
161 palettes, 57 font pairings, 99 UX guidelines). 145 files. **None are project-specific** and every
worker briefing recorded `Loaded Skills: None` — this tree was never used. It is real design reference
material sitting unused on disk.

### `.claude/` is nearly empty
Only `rules/`. **No `settings.json`, no hooks, no permission allowlist, no commands, no agents.** A new
fleet will hit permission prompts constantly — write `.claude/settings.json` first.
Two path-scoped rules exist and are correct: `dente-god-context.md` (fires on `useAppLogic.tsx`) and
`dente-database.md` (fires on `apps/api/src/db/**`, `drizzle/**`, `src/scripts/**`).

---

## 9. AUTHORITY CONTRADICTIONS — known, unresolved, fix the rule not the code

1. **`.agents/AGENTS.md:7` still says "PGlite local database engine."** Every other file (root
   `AGENTS.md:9`, `.cursorrules:30`, `.clauderules` item 3, `.claude/rules/dente-database.md`) says native
   PostgreSQL 18 and "NOT PGlite — that package is not installed." **The constitution carries the stale
   claim it is supposed to outrank.** The rules files are right.
2. **`GEMINI.md:13` points at repo-root `AGENTS.md` and calls it "Главная конституция (8 базовых правил)".**
   Root `AGENTS.md:3` says the opposite — "THE CONSTITUTION IS `.agents/AGENTS.md`… It is NOT the law" —
   and `.agents/AGENTS.md` has **12** mandates, not 8. Gemini-hosted agents are pointed at the wrong file.
3. **`.agents/AGENTS.md` §11 says "You are equipped with `madge`. Run `madge --circular .`"** while root
   `AGENTS.md:23` says madge is NOT on PATH and needs `npx`. A worker following §11 literally gets a
   missing-binary error. Same for `sg`, `biome`, `repomix`.
4. **`.agents/AGENTS.md` §5: "DO NOT SAVE TOKENS! WRITE AS MUCH AS POSSIBLE"** vs `.agents/INDEX.md:3`:
   docs are "optimized for minimal token footprint."
5. **Cross-vendor tool names are baked into law.** `.agents/AGENTS.md` (Russian §2) and `.cursorrules:25`
   mandate the `write_to_file` tool **by name**; worker briefings mandate `replace_file_content`. Those are
   Gemini/Antigravity tool names. **Claude Code has no such tools**, so the UTF-8 rule as written is
   literally unfollowable here — the intent (never write Russian text through a shell here-string or
   `node -e`; use the editor's own file-write tool) is what binds.
6. **Stale line counts in law.** `.agents/AGENTS.md:132` calls `App.tsx` a "~2400 строк" monolith (it is
   4,774) and never mentions `useAppLogic.tsx`, the actual 14,425-line God Context.
7. `.agents/AGENTS.md` §9 bans scratch files in the project tree. `scratch/` has 272 entries and
   `apps/api/NUL` exists. **The hygiene rule is already unenforced.**

---

## 10. WHAT THE USER ORIGINALLY ASKED FOR

Both `ORIGINAL_REQUEST.md` files contain **only UI/UX work** — glassmorphism, gradients, shadow tokens,
micro-interactions, hover/focus states, empty states, badges, Light/Dark/Night parity, 14px card radii,
`Golos Text`, button variants, `status-pill`, no horizontal scroll or clipping at 390px and 1440px.
Acceptance: `npm run typecheck` 0 errors, per-file commits, 4-state screenshots self-audited.

**The user never asked for a data-integrity, security, money, EGISZ or telephony audit.** Everything in §5
was found incidentally. That is context for prioritization, not a reason to ignore §5 — a `+null ₽` on the
Analytics screen is a UI defect by any definition.
