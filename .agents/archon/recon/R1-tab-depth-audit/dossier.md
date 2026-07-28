# R1 — TAB DEPTH AUDIT. Which of the 14 views are real and which are theatre.

Author: recon subagent R1 under [ARCHON]. READ-ONLY run. Appended live as findings were confirmed.

## 0. Instruments and their limits (read this before any number below)

- `node scripts/smoke-clinical-mutation-guard.mjs` **REFUSED TO RUN.** Exit 1, no JSON produced.
  Verbatim, from `.agents/archon/recon/R1-tab-depth-audit/gate.err.txt:5-12`:
  `СБОРКА УСТАРЕЛА ... Исходников новее своей сборки: 2` —
  `apps/api/src/server.ts` (src 2026-07-28T10:00:12Z vs build 08:05:02Z) and
  `apps/api/src/services/communications/dispatcher.ts`; plus
  `Компилируемых файлов без выхода сборки: 2` — `apps/api/src/routes/waitlistMatches.ts`,
  `apps/api/src/services/schedule/waitlistMatching.ts`.
  Thrown at `scripts/lib/api-route-census.mjs:228`. I cannot fix it: `npm run build -w @dental/api` is
  the lead's gate (§7a). **So the "436 route entries / 434 probed / 187 mutating" figures in my briefing
  could not be re-derived on this run.** Everything below uses the live dev server instead.
- Substitute instrument, and it is a *behavioural* one: the live API on `127.0.0.1:4100` distinguishes
  the two cases cleanly. A route that exists but is guarded answers **401**; a route that does not exist
  answers **404**. Proof of the discriminator:
  `curl -s -o /dev/null -w '%{http_code}' http://127.0.0.1:4100/api/dashboard` → `401`
  (body: `{"error":"AuthRequired","message":"Требуется авторизация рабочего кабинета клиники."}`),
  and `.../api/health` → `200`. So a `404` below is not "I lack credentials", it is "no such route".
- Git Bash mangles a leading `/` in an argument into a Windows path. Every `rg` pattern below is written
  without the leading slash for that reason. First attempt at the same searches returned zero hits and
  would have produced a false "no callers" claim.

---

## FINDING 1 — 25 API addresses the UI calls do not exist on the server. Verified by HTTP, not by grep.

**How verified.** Two independent passes that agree.

1. Source diff I built myself: 245 distinct `/api/...` paths referenced in `apps/web/src`
   (`.agents/archon/recon/R1-tab-depth-audit/web-api-paths.txt`) against 277 route path literals in
   `apps/api/src` (`api-route-literals.txt`), matched with path params normalised
   (`match-routes.mjs`). Command: `node .agents/archon/recon/R1-tab-depth-audit/match-routes.mjs`.
2. Live HTTP probe of every candidate. Output kept at
   `.agents/archon/recon/R1-tab-depth-audit/probe-404.txt`.

Verbatim probe output (all 404 = route absent; the 401 line is the control):

```
401  /api/dashboard                                   <- control, route exists
404  /api/settings/protocols
404  /api/settings/catalog
404  /api/settings/catalog-import
404  /api/clinic/workflows
404  /api/clinic/reporting-settings
404  /api/clinic/marketing-settings
404  /api/visits/quick
404  /api/billing/payouts
404  /api/ai/visit-flow
404  /api/ai/predict-no-show
404  /api/reporting/token/generate
404  /api/system/analyze-legacy-db
404  /api/system/ram-watchdogs
404  /api/egisz/send
404  /api/egisz/logs
404  /api/communications/inbox
404  /api/communications/patients/search
404  /api/crm/patient-duplicate-merge-queues
404  /api/crm/patient-communication-timelines
404  /api/crm/patient-archive-reasons-and-blacklists
404  /api/crm/bulk-image-operation-logs
404  /api/integrations/egisz-blank-permissions
404  /api/integrations/yandex-calendar-syncs
404  /api/marketing/family-recommendation-sources
404  /api/schedule/external-schedule-action-logs
404  /api/patients/x/reclamations
404  /api/patients/x/tickets
```

**This is already known to the repo and frozen as debt**, in
`apps/api/src/tests/webCallsExistingRoutes.test.ts:33-97` (`KNOWN_MISSING`). That file is honest about
the mechanism, and its own words are the sharpest statement of the §1 problem in this repo
(`webCallsExistingRoutes.test.ts:6-11`):

> «большинство вызывающих написаны как `response.ok ? response.json() : []` — отсутствующий маршрут
> молча превращается в пустой список, и на экране просто нет раздела. Пользователь не видит ошибки,
> он видит пустоту и делает вывод, что данных нет.»

**CORRECTION TO MY OWN FIRST DRAFT, kept deliberately.** My source diff also flagged
`/api/crm/bulk-image-operation-logs`, `/api/crm/patient-communication-timelines`,
`/api/crm/patient-archive-reasons-and-blacklists` and `/api/schedule/external-schedule-action-logs` as
still called from `apps/web/src`. **They are not.** Reading each call site showed prose inside JSX/block
comments describing the *removed* widget — `apps/web/src/PatientsView.tsx:683`,
`apps/web/src/ScheduleView.tsx:707`, `components/crm/PatientCommunicationTimelinesWidget.tsx:4`,
`components/crm/PatientArchiveReasonsAndBlacklistsWidget.tsx:4`. My line-level comment filter only
skipped lines *beginning* with `*`, `//` or `/*`, and these are continuation lines. **A grep hit inside a
comment is not a call site**; every entry in the table above was confirmed at its call site by reading it.

**What IS new (1):** 4 entries in `KNOWN_MISSING` are now stale — nothing calls them any more, so the
debt list overstates the debt. Verified with `rg` over `apps/web/src`, zero non-comment hits each:
`/api/communications/inbox`, `/api/communications/patients/search`,
`/api/schedule/external-schedule-action-logs`, `/api/crm/bulk-image-operation-logs`.
`apps/web/src/ScheduleView.tsx:722-723` even says its entry should go but was left because another author
owns that file. Low severity, but the debt ratchet is measuring the wrong number.

Note the near-miss: `/api/crm/patient-duplicate-merge-queues` **is NOT stale**, even though
`components/crm/PatientDuplicateMergeQueuesWidget.tsx:10` says that widget was migrated to the working
`/api/patients/:id/duplicates`. A *second, unrelated* caller survives — see FINDING 5.

**What IS new (2):** the `r.ok ? r.json() : []` anti-pattern the test file warns about in the abstract has
a concrete, live instance in the settings view. `apps/web/src/SettingsView.tsx:1287-1290`:

```js
fetch("/api/system/ram-watchdogs")
  .then((r) => (r.ok ? r.json() : [])).then((d) => setRamWatchdogs(Array.isArray(d) ? d : [])).catch(() => {});
fetch("/api/crm/patient-duplicate-merge-queues")
  .then((r) => (r.ok ? r.json() : [])).then((d) => setMergeQueues(Array.isArray(d) ? d : [])).catch(() => {});
```

Both addresses are 404 (probe above). Both failures become `[]`. `.catch(() => {})` swallows even a
network death. No error state exists for either; the panels render as honestly empty. This is the exact
mechanism named in `webCallsExistingRoutes.test.ts:6-11`, still present, in the view a solo dentist opens
to configure the product.

---

## FINDING 2 — Three of those 404s are on the PATIENT CARD, mounted, on every patient.

`apps/web/src/components/patients/PatientOverviewTab.tsx:145,153,157` mounts three widgets:

| widget | address it calls | live probe |
|---|---|---|
| `PatientNoShowRisk` | `POST /api/ai/predict-no-show` (`PatientNoShowRisk.tsx:44`) | 404 |
| `PatientReclamationsWidget` | `/api/patients/:id/reclamations` (`PatientReclamationsWidget.tsx:72`, DELETE at `:133`) | 404 |
| `PatientTaskTicketsWidget` | `/api/patients/:id/tickets` (`PatientTaskTicketsWidget.tsx:63`, `:124`) | 404 |

Mount chain verified: `rg -n 'PatientNoShowRisk|PatientReclamationsWidget|PatientTaskTicketsWidget' apps/web/src/components/patients/PatientOverviewTab.tsx`
→ imports at 17-19, JSX at 145/153/157; and `PatientOverviewTab` is imported by `apps/web/src/PatientsView.tsx`.
These are on screen, not orphans.

**Server side is empty, verified two ways.**
`rg -l --fixed-strings 'predict-no-show' apps/api/src` returns **one file only**:
`apps/api/src/tests/webCallsExistingRoutes.test.ts`. Same single-file result for `visit-flow`,
`reclamations`, `catalog-import`, `ram-watchdogs`, `family-recommendation-sources`,
`egisz-blank-permissions`, `yandex-calendar-syncs`. **The only mention of these eight features anywhere
in the backend is the debt list that admits they are missing.**

**And the repo's own note about them is wrong.** `webCallsExistingRoutes.test.ts:93` claims the tables
exist and only the routes are missing. They do not exist:
- `rg -ni 'reclamation|patientTicket|patient_ticket' apps/api/src/db/*.ts packages/shared/src` -> zero hits.
- Live DB: `db-probe.mjs like '%reclam%'` -> `(no table matches %reclam%)`;
  `db-probe.mjs like '%ticket%'` -> `(no table matches %ticket%)`;
  `db-probe.mjs like '%no_show%'` -> `(no table matches %no_show%)`.
Three layers missing (route, table, schema declaration), not one. **Correction for the record.**

### The three differ sharply on the section-3 standard, and that is the useful part

- `PatientReclamationsWidget` **handles the failure correctly**: `resolvePanelPhase(...)` at `:78-82`,
  `actionFailureToast(...)` at `:108`. On a 404 the user is told, in Russian, "the server does not know
  this section, the clinic program is probably not fully updated, tell your administrator"
  (`apps/web/src/lib/panelStateText.ts:107-109`). Honest. Useless, but honest.
- `PatientNoShowRisk` **has no failure state at all.** `PatientNoShowRisk.tsx:54` is `if (res.ok) {...}`
  with no else; the catch at `:58-63` only calls `console.error`. So the 404 path renders the *idle*
  branch at `:171-185` — a promise line about predicting cancellation risk plus an **enabled** button.
  **The user can press that button forever, nothing happens, and no message is ever shown.** That is
  section 1's "imitation of work" in its purest form, on every patient card.
  Two further section-3 defects in the same file: `:90-94` render the levels with untranslated English
  in parentheses on a Russian screen, and `:19` is `useState<any>(null)`.

**Matters for a solo dentist: YES, high.** Complications and complaints is the one place a single-handed
dentist would record that a filling failed. It cannot be recorded at all. And the AI-risk card actively
teaches the user that this product's buttons do nothing.

---

## FINDING 3 — The live database has 146 tables. 122 are empty and 59 have no writer anywhere in the repo.

Measured on this run, not inherited.

- Row counts: `node .agents/archon/recon/R1-tab-depth-audit/db-probe.mjs all` (SELECT-only; the
  connection string is read from `.env` and never printed). Output:
  `TABLES IN public: 146` then `NON-EMPTY: 24   EMPTY: 122`.
  Full listing: `.agents/archon/recon/R1-tab-depth-audit/db-rowcounts.txt`.
  The 24 non-empty ones, largest first:
  `audit_events 965, migration_staging_records 480, tooth_state_history 99, _dente_migrations 96,
  appointments 27, tooth_states 25, patients 18, treatment_items 10, visits 10, payments 8, users 7,
  communication_outbox 6, generated_documents 4, migration_reconciliations 4, migration_runs 4,
  organizations 4, communication_templates 3, chairs 2, recent_patient_history 2, clinics 1,
  communication_campaigns 1, dicom_workbench_bundles 1, imaging_studies 1, imaging_viewer_sessions 1`.
- Writer census: `node .agents/archon/recon/R1-tab-depth-audit/writer-census.mjs`, searching
  `apps/api/src`, `apps/web/src`, `packages`, `scripts`, `drizzle`, `apps/api/migrations` — **1047 files**,
  i.e. not only `apps/api/src`, which was the blind spot named in my briefing. Output:
  `DECLARED TABLES: 126   FILES SCANNED: 1047`, `ZERO-WRITER TABLES: 59`,
  `of which DETECTOR MISSES (live rows > 0, so a writer must exist): 0`.

**The detector was wrong on its first run and the row counts caught it — record the trap.** My first pass
matched only `.insert(ident)` and scored `generated_documents` as zero-writer even though the live table
holds 4 rows. The real writer is `.insert(schema.generatedDocuments)` at
`apps/api/src/db/documentQuery.ts:135` — namespaced access. Same class of error as the
"45 hollow modules of 50" artefact. The rerun handles a `\w+.` prefix and cross-checks every zero-writer
verdict against live row counts; the cross-check now reports **0 misses**.

**13 tables are read by code and written by nothing** — panels that can never fill:
`custom_crm_task_types`, `patient_communication_timelines`, `dente_telegram_chat_links`,
`dente_telegram_link_codes`, `dente_telegram_outbox_delivery_receipts`, `dadata_geocoded_addresses`,
`egisz_multiple_diagnoses`, `landing_field_mappings`, `lost_patients_filters`, `patient_invoices`,
`rebooking_conversion_rules`, `single_session_enforcements`, `treatment_scenarios`.
Per-row evidence in `writer-census.txt` (columns: sql_name, ident, writers, readers, live_rows, decl,
first_writer, first_reader).

Also corrected: my briefing said `organizations = 2`. **It is 4** as of this run.

---

## FINDING 4 — The patient card's call-and-message feed will report "no calls" forever, while `communication_outbox` holds 6 rows.

`apps/web/src/components/crm/PatientCommunicationTimelinesWidget.tsx` is mounted at
`apps/web/src/PatientsView.tsx:679`. It calls `GET /api/patients/:id/communication-timelines`, which
**does exist** (`apps/api/src/routes/patients.ts:256`) and reads exactly one table, via
`apps/api/src/db/patientCommunicationTimelinesQuery.ts:35`.

That table is `patient_communication_timelines` (`apps/api/src/db/schema.ts:1980`). Census row, verbatim:

```
patient_communication_timelines	patientCommunicationTimelines	0	1	0	apps/api/src/db/schema.ts:1980	-	apps/api/src/db/patientCommunicationTimelinesQuery.ts:35
```

**0 writers, 1 reader, 0 live rows.** Meanwhile the messages the clinic actually sent live in
`communication_outbox`, which has **6 rows**. The widget is not merely empty — it is pointed at the wrong
table.

The cruel part: this widget is the **best-written panel I read on this run**. Four distinct states, all
Russian, and the error branch at `:131-136` even adds "this does not mean there was no contact with the
patient". And it is guaranteed to display its empty line at `:139` for the rest of the product's life.
A correct empty state over a table with no writer is still a lie: the user concludes there were no calls.

**Matters for a solo dentist: YES.** A one-chair dentist's entire CRM value is "did anyone call this
patient back". This panel answers that question wrongly and confidently.

Same shape, same view: `CustomCrmTaskTypesWidget` (`apps/web/src/PatientsView.tsx:686`) ->
`GET /api/crm/custom-crm-task-types` (`apps/api/src/routes/clinical.ts:382`) -> `custom_crm_task_types`,
**0 writers**. Both routes carry a `// COMPETITOR FEATURE #4` / `#47` comment — that marker is the
reliable fingerprint for this whole class, and it is a far better search key than `TODO`.

---

## FINDING 5 — Settings is the worst view in the product: 14 dead addresses, 6 of them whole tabs.

All 14 verified 404 (probe above) and verified absent from my 312-route table
(`route-table.txt`, built by `route-table.mjs` which handles generics and the four prefixed plugin
registrations from `apps/api/src/server.ts:455-458`).

| what the user clicks | file:line | address | consequence |
|---|---|---|---|
| tab «Протоколы» | `components/settings/SettingsProtocolsTab.tsx:68-69,100` | `/api/settings/protocols`, `/api/settings/protocols/:id` | create/edit/delete all fail |
| tab «Прайс» import | `components/settings/SettingsPricesTab.tsx:155` | `/api/settings/catalog-import` | price-list import silently does nothing |
| tab «Маркетинг» | `components/settings/SettingsMarketingTab.tsx:22` | `/api/clinic/marketing-settings` | tab cannot load or save |
| tab «Отчётность» | `components/settings/SettingsReportingTab.tsx:20,47` | `/api/reporting/token/generate`, `/api/clinic/reporting-settings` | token button dead, settings dead |
| tab «BPMN / процессы» | `components/settings/SettingsBpmnTab.tsx:34,56,78,98` | `/api/clinic/workflows` (+ `/:id`, `/:id/toggle`) | list, create, delete, toggle — 4 of 4 dead |
| widget ЕГИСЗ blanks | `components/integrations/EgiszBlankPermissionsWidget.tsx:18` | `/api/integrations/egisz-blank-permissions` | empty forever |
| widget Yandex calendar | `components/integrations/YandexCalendarSyncsWidget.tsx:17` | `/api/integrations/yandex-calendar-syncs` | empty forever |
| RAM watchdog list | `SettingsView.tsx:1287` | `/api/system/ram-watchdogs` | empty forever, no error |
| merge-queue list | `SettingsView.tsx:1289` | `/api/crm/patient-duplicate-merge-queues` | empty forever, no error |
| onboarding step 7 | `components/workspace/onboarding/steps/Step7Migration.tsx:36` | `/api/system/analyze-legacy-db` | "analyse my old database" in the setup wizard does nothing |

Note the table `clinic_workflows` **does exist** in the live DB (`db-probe.mjs like '%workflow%'` ->
`clinic_workflows`) — so BPMN has a table and a UI and no route between them. That is the shape of every
one of these: two of three layers built.

**Matters for a solo dentist: mixed, and the mix is the point.**
- «Протоколы» (treatment protocol templates) and price-list import: **YES, high.** A solo dentist's
  first hour with the product is importing their price list. `SettingsPricesTab.tsx:155` makes that
  button a no-op.
- Step 7 of onboarding: **YES, high.** It is in the setup wizard, i.e. the first five minutes.
- BPMN, ЕГИСЗ blanks, Yandex calendar, RAM watchdogs, merge queues: **no.** A single-handed dentist does
  not want a BPMN engine. These should be deleted, not built — §7 «cut the excess».

---

## FINDING 6 — `pages/FinancialDashboard.tsx` and `pages/DoctorPayoutDashboard.tsx` are orphans. Nothing imports them.

`rg -n 'FinancialDashboard|DoctorPayoutDashboard' apps/web --glob '!node_modules' --glob '!dist'` returns
**six lines, and every one of them is inside those two files or their own CSS import.** The only
consumer of `DoctorPayoutDashboard` is `FinancialDashboard.tsx:57`, and `FinancialDashboard` has no
consumer at all. Neither is reachable from `apps/web/src/App.tsx` (the finance branch at `App.tsx:4056`
renders `FinanceView`, not these).

So `/api/billing/payouts` — one of the 404s — is reached only from dead code
(`pages/DoctorPayoutDashboard.tsx:23`), and `pages/DoctorPayoutDashboard.tsx:25` contains
`throw new Error(\`HTTP ${res.status}\`)`, an English machine string that would reach a user if the file
were ever mounted.

**§5 anti-monolith explicitly bans this**: «components imported AND used, never orphaned files».
**Matters for a solo dentist: no** — a doctor payout dashboard is meaningless when the doctor is the
owner. Recommend deletion, not wiring.

---

## FINDING 7 — Two competing error-message systems. The old one leaks HTTP status codes; it has 104 call sites.

The clean one is `apps/web/src/lib/panelStateText.ts`, and its header says explicitly (`:99-101`) that
the string `сервер вернул код ${status}` was a leak and was removed.

**It was not removed. It lives in `apps/web/src/AppHelpers.tsx:4142`**, inside
`responseStatusFailureLabel()` (`:4132-4143`), as the final `else` branch:

```js
return `сервер вернул код ${response.status}`;
```

That function feeds `responseErrorMessage()` (`AppHelpers.tsx:4145`), which has **104 call sites across
7 files** (`rg -o --fixed-strings 'responseErrorMessage' apps/web/src --glob '!**/*.test.*' | wc -l`
-> 104). By comparison the clean module is used in 8 files. So the product has two parallel answers to
"what do we tell the user when the server refuses", roughly equally adopted, and the older one is worse
on §3 twice over: it can print a bare number, and even its good branches state a cause without an action
(«нужный маршрут не найден» vs the clean module's «программа клиники обновлена не полностью, сообщите
администратору»).

### Other confirmed §3 text leaks, each a real render path

| file:line | literal | why it fails §3 |
|---|---|---|
| `hooks/useOfflineQueue.ts:94` | «Ошибка синхронизации данных (код {status}). Изменения утеряны.» | prints the code; says data was lost and gives no next step |
| `components/VisitDiaryPhotoUpload.tsx:126` | `Ошибка загрузки: ${err.message}` | raw exception into a toast, **during a visit**; `err.message` from `fetch` is English («Failed to fetch») |
| `components/visit/CryptoProSigner.tsx:64` | `alert(\`Ошибка подписания: ${err.message}\`)` | native `alert()`, bypassing the product's toast system, carrying a raw exception |
| `components/imaging/VisiographAnalyzer.tsx:280` | «AI сервис недоступен (HTTP {status})» | prints HTTP and the code, plus the jargon "AI сервис" |
| `components/settings/MigrationWizard.tsx:447` | `<strong>{error.message}</strong>` | renders a raw exception message as the visible error |
| `App.tsx:4182` | `<h2>Executive BI Analytics</h2>` | English jargon; it is the **loading fallback** for the analytics tab, so it is the first thing the user sees there. The real view says «Аналитика клиники» (`pages/AnalyticsDashboardView.tsx:175`) |

**Matters for a solo dentist: YES for rows 2 and 3.** A photo of a tooth failing to upload mid-visit, and
a document-signing failure, are both moments where the user has no IT support and must be told what to
do. Both currently show an English browser exception.

---

## FINDING 8 — `clinicMode` exists, is well designed, and is honoured in exactly one of the four places that need it.

`apps/web/src/lib/clinicCapabilities.ts` is the best architecture in the codebase for §5: one table
`CAPABILITIES_BY_MODE` (`:107-112`), four modes, seven capabilities, and `solo_doctor` gets only
`["callList","messaging","managerReports"]` (`:79`). Its own comment states the design rule
(`:16-17`): «Занятость одного кресла — всегда одно и то же число, смотреть там нечего.»

`rg -n 'chairUtilisation' apps/web/src --glob '!**/*.test.*'` returns **4 hits, 3 of them inside
`clinicCapabilities.ts` itself.** The single consumer is
`components/reports/ManagerReportsPanel.tsx:167`.

Everywhere else chair load is shown to a solo dentist with no gate:

- `ShiftView.tsx:463-497` — the «Загрузка» card rendering `mostLoadedResource` with a percent meter.
  `rg -n 'clinicCapabilities|hasCapability' apps/web/src/ShiftView.tsx` -> **zero hits**; the file does
  not import the module at all. Worse, the *collapsed* header at `ShiftView.tsx:448-449` promises it
  before you expand: «Насколько режим клиники и **загрузка кресел** совпадают с планом на день.»
- `ScheduleView.tsx:359-364` — a KPI card literally titled «Самое занятое кресло», falling back to
  «кресла не загружены».
- `ScheduleView.tsx:521-531` — a chair filter chip per active chair. With one chair that is a filter
  with one option.
- `pages/AnalyticsDashboardView.tsx` — `rg -c 'hasCapability|clinicMode'` -> **0**, while its own `h2`
  tooltip at `:175` advertises «загрузка кресел».

And the module's own complaint about scattered mode checks is still true: `ScheduleView.tsx:238` and
`ScheduleView.tsx:507` compare `profile.mode === "solo_doctor"` directly instead of asking for a
capability, so there are now two sources of truth for modularity.

**Matters for a solo dentist: YES, directly.** This is the exact §5 requirement — «Small practices must
NOT see modules, columns and fields they do not need — through flags/presets/clinicMode». The flag
exists. Four of five call sites ignore it.

---

## FINDING 9 — The patients view puts two near-identical search boxes side by side, and one is not a search box.

Visual proof: `.dente-ops-shots/patients_light_full.png` (opened and read on this run; 34 PNGs, 34
distinct MD5s — `md5sum .dente-ops-shots/*.png | awk '{print $1}' | sort -u | wc -l` -> 34).

Code: `apps/web/src/PatientsView.tsx:163` placeholder «Поиск пациента: ФИО или телефон» (a real search,
filters the list) and `PatientsView.tsx:192` placeholder «ФИО, телефон, дата рождения (Enter)» (creates
a **new patient** on Enter). They sit in the same `patients-header` and render adjacent, confirmed in the
capture. The only cue that the right-hand one creates rather than finds is the «Создать» button further
right, and on a narrow window that button wraps away.

A user typing a patient's name into the right-hand box and pressing Enter opens a create-patient preview
for a patient who already exists. That is how duplicate patient records get made — and this product has
a whole duplicate-merge subsystem (`apps/api/src/routes/patientDuplicates.ts`) to clean up after it.

Two smaller defects in the same region, same file:
- The capture shows the magnifier icon overlapping the placeholder text: it renders as «🔍иск пациента»,
  i.e. the first two characters of «Поиск» are covered.
- `PatientsView.tsx:211` and `:220` are `<input>` elements with `style={{ display: "none" }}` carrying
  placeholders «Телефон пациента» and «Дата рождения». Permanently invisible controls.

**Matters for a solo dentist: YES.** They are their own receptionist; nobody catches the duplicate.

---

## FINDING 10 — `pages/AnalyticsDashboardView.tsx` hardcodes 17 colours, several of them dark-theme values used in all three themes.

`rg -o '#[0-9a-fA-F]{3,6}\b' apps/web/src/pages/AnalyticsDashboardView.tsx | wc -l` -> **17**;
11 of them are direct `stroke=`/`fill=`/`color=` attributes. The most-used are `#a1a1aa` (5x, axis
stroke) and `#27272a` (3x, grid stroke) — a light grey and a near-black, chosen for a dark background.
Sample: `AnalyticsDashboardView.tsx:330` `stroke="#27272a"`, `:334` `stroke="#a1a1aa"`.
In the light theme the grid lines are near-black on white and the axis labels are pale grey on white.

Repo-wide ranking of the same anti-pattern
(`rg -c -o '(stroke|fill|color|background)="#[0-9a-fA-F]{3,6}"' apps/web/src`):
`components/Odontogram.tsx` **18**, `VisitView.tsx` **15**, `pages/AnalyticsDashboardView.tsx` **11**,
`components/odontogram/OdontogramModule.tsx` **5**, then onboarding steps.

`.agents/AGENTS.md:209` bans this in terms: «Utilize Tailwind semantic coloring ... never hardcode
specific colors.» The odontogram is the single most-looked-at surface in the product.
I did **not** verify this visually — there is no analytics or odontogram capture in `.dente-ops-shots/`,
so this is a static finding awaiting a light-theme screenshot.

---

## FINDING 11 — CORRECTION AGAINST MYSELF: DocumentsView is not the overload I expected.

`rg -c '<input' apps/web/src/DocumentsView.tsx` -> **217**, and `<select>` -> 21, in 4187 lines, across
22 named document forms (`<h3>` list from `:1107` «Договор платных медицинских услуг» to `:3467`
«Возврат или коррекция»). A raw control count would call this the worst §4 violation in the product.

**It is not, and I am recording the correction rather than the headline.** Every form is gated by
`selectedDocumentKind === "<kind>"` (`DocumentsView.tsx:1104` and the 21 siblings) — exactly one renders
at a time. And each one puts its rarely-used fields behind a real disclosure: there are **22 `<details>`
elements** (`rg -c '<details'` -> 22), each summarised «✏️ Ручная корректировка полей (развернуть)»
(`:1100-1102`). That is §4 done properly: depth behind «показать больше», only what is needed on the
surface.

**Method lesson worth keeping:** a control count per file is not a surface-weight measurement in this
codebase, because this codebase gates aggressively. The per-view counts I took
(`VisitView 55 buttons`, `ImagingView 37`, `MarketingView 14 buttons + 8 inputs`) are upper bounds only
and I am not reporting any of them as an overload finding without a capture.

---

## FINDING 12 — The marketing view stores the clinic's marketing numbers in `localStorage`, and 4 of its 5 widgets are dead.

`apps/web/src/MarketingView.tsx:72-79` seeds `stats` from `localStorage.getItem("dental_crm_mkt_stats")`
and `:95` writes it back with `localStorage.setItem`. Same for the clinic phone (`:68-70`, `:88`) and the
SEO keyword list (`:62`). There is no server call for any of it — the view's whole "reputation
dashboard" is numbers the user types into their own browser. Clearing site data erases them; a second
device never sees them.

The five widgets at `MarketingView.tsx:399-412`:

| widget | source | status |
|---|---|---|
| `RecallListPanel` (`:399`) | `/api/patients/recall-candidates` (`apps/api/src/routes/patientRecall.ts:44`) | **REAL** |
| `FamilyRecommendationSourcesWidget` (`:403`) | `/api/marketing/family-recommendation-sources` | **404** |
| `RebookingConversionRulesWidget` (`:410`) | `/api/hr/rebooking-conversion-rules` (`routes/clinical.ts:240`) -> `rebooking_conversion_rules`, **0 writers** | dead |
| `LandingFieldMappingsWidget` (`:411`) | `/api/integrations/landing-field-mappings` (`routes/clinical.ts:371`) -> `landing_field_mappings`, **0 writers** | dead |
| `CustomCrmTaskTypesWidget` (`:412`) | `/api/crm/custom-crm-task-types` (`routes/clinical.ts:382`) -> `custom_crm_task_types`, **0 writers** | dead |

**Matters for a solo dentist: NO, and the product already knows it.**
`workspaceShell.tsx:207-221` removes both «Маркетинг/SEO» and «Обращения» from the rail unless the mode
has `marketingSection`, and `solo_doctor` and… (checking `clinicCapabilities.ts:79`) `solo_doctor` does
not have it. This is the correct §5 call, made correctly, and it is why this finding is LOW despite the
view being 80% theatre. Do not spend a packet building it. **Recommend deleting the three dead widgets**
the way `LostPatientsFiltersWidget` was already deleted from this exact grid (`MarketingView.tsx:404-408`
documents that removal and its reason).

---

## FINDING 13 — What is genuinely REAL, measured the same way, because a report that only lists rot is also a lie.

Every core clinical/financial table has real writers and, where the demo has been used, real rows.
From `writer-census.txt` (columns: writers / readers / live rows):

```
patients                15 / 60 / 18    apps/api/src/db/patientsQuery.ts:112
appointments             9 / 27 / 27    apps/api/src/db/appointmentsQuery.ts:155
visits                   7 / 11 / 10    apps/api/src/routes/workspaceProfile.ts:339
payments                 6 / 18 /  8    apps/api/src/db/billingQuery.ts:78
audit_events            14 /  1 / 965   apps/api/src/audit.ts:21
tooth_states             2 /  3 / 25    apps/api/src/routes/odontogram.ts:332
treatment_items          2 /  5 / 10    apps/api/src/scripts/seedOpsScreenshotDemo.ts:372
generated_documents      2 / 10 /  4    apps/api/src/db/documentQuery.ts:135
communication_outbox     2 / 13 /  6    apps/api/src/services/communications/dispatcher.ts:317
communication_campaigns  2 /  7 /  1    apps/api/src/services/communications/campaigns.ts:118
imaging_studies          2 /  4 /  1    apps/api/src/db/imagingQuery.ts:122
inventory_items          2 /  6 /  0    apps/api/src/routes/inventory.ts:131
crm_leads                3 /  3 /  0    apps/api/src/routes/leads.ts:60
sterilization_logs       1 /  2 /  0    apps/api/src/routes/sterilization.ts:57
appointment_waitlists    1 /  2 /  0    apps/api/src/routes/waitlist.ts:132
```

The four zero-row ones there are zero because nobody has used the demo, not because a writer is missing —
that distinction is the whole point of the census.

And the finance view is the best-built screen in the product. Visual proof:
`.dente-ops-shots/finance_full.png`, opened on this run. What it shows:
- four honest KPI tiles, each with its own denominator («0 открытых позиций», «1 платеж по текущему
  пациенту», «0 документов без оплаты»);
- an empty state that names the next action, not just the absence: «Вариантов плана пока нет. Добавьте
  услуги в план лечения, чтобы пациенту было проще выбрать бюджетный, стандартный или клинический
  сценарий.» plus a button «Открыть прием»;
- three collapsed sections — фискальный чек, плательщик для вычета, рассрочка — i.e. §4 depth behind
  disclosure;
- and a blocking checklist in human words that names the actual risk:
  «Сейчас выбран пациент Орлова Марина Петровна, но открытый приём идёт у другого пациента.
  Переключите приём, иначе оплата уйдёт не тому.»

That last string is the standard §3 asks for, and it already exists in this repo. Every packet below
should be measured against it.

---

## FINDING 14 — THE SINGLE WORST THING I FOUND: a solo dentist cannot add, edit, delete or import one price.

`apps/web/src/components/settings/SettingsPricesTab.tsx` is the price-list («Прайс») tab. Its three write
paths are `:185` `createServiceCatalogItem(...)`, `:187` `updateServiceCatalogItem(...)`, `:204`
`deleteServiceCatalogItem(...)`, plus `:155` an import. Those resolve to:

| action | fetch | file:line | live probe |
|---|---|---|---|
| create service | `POST /api/settings/catalog` | `useAppLogic.tsx:7362` | **404** |
| edit service | `PUT /api/settings/catalog/:id` | `useAppLogic.tsx:7383` | **404** |
| delete service | `DELETE /api/settings/catalog/:id` | `useAppLogic.tsx:7404` | **404** |
| import price list | `POST /api/settings/catalog-import` | `SettingsPricesTab.tsx:155` | **404** |

**There is no alternative route.** The whole `pricelist` router declares exactly one endpoint:
`POST /api/pricelist/analyze` (`apps/api/src/routes/pricelist.ts:26`) — an AI analyser, not CRUD.
Live probes: `/api/pricelist` -> 404, `/api/pricelist/items` -> 404, `/api/settings/prices` -> 404.
`rg 'pricelist|price' route-table.txt` returns that one line and nothing else out of 312 routes.

So the service catalogue is arriving read-only inside the `/api/dashboard` payload
(`dashboard.serviceCatalog`, read at `useAppLogic.tsx:13550-13552`) and cannot be edited from the
product at all. Every downstream number — treatment plan totals, the payment screen, the tax deduction
certificate — is computed from a catalogue the clinic cannot own.

**Matters for a solo dentist: this is the highest-severity finding in the audit.** A dentist evaluating
this product does exactly one thing first: puts their own prices in. Right now the "Save" button reports
«Не удалось создать услугу: нужный маршрут не найден» (`responseErrorMessage` 404 branch,
`AppHelpers.tsx:4137`) and the import button reports nothing at all.

---

## FINDING 15 — A latent §3 landmine: the only `response.text()` -> user-error path would print a raw English JSON blob. It is currently unreachable.

`useAppLogic.tsx:13566-13567`, inside `handleQuickConsult`:

```js
const msg = await response.text().catch(() => "Ошибка");
setError(`Быстрый приём: ${msg}`);
```

`POST /api/visits/quick` is 404, and I captured the actual body the server returns:

```
$ curl -s -X POST http://127.0.0.1:4100/api/visits/quick
{"message":"Route POST:/api/visits/quick not found","error":"Not Found","statusCode":404}
```

So the string that would reach the user is, literally:
`Быстрый приём: {"message":"Route POST:/api/visits/quick not found","error":"Not Found","statusCode":404}`

**Honest downgrade, and I am stating it rather than banking the drama: no user can trigger this today.**
`handleQuickConsult` is defined at `useAppLogic.tsx:13555` and exported in the context object at `:13838`,
and `rg -n 'handleQuickConsult' apps/web/src --glob '!**/*.test.*'` returns **only those three lines in
that one file**. Nothing consumes it. It is a dead field in the ~1,014-field return object — a §5 orphan,
and a §3 defect waiting for whoever wires the button.

`rg -n 'await (response|res)\.text\(\)' apps/web/src` with 2 lines of context confirms this is the
**only** `response.text()`-into-user-error path in the whole web app. Everything else goes through one of
the two message systems in FINDING 7. That is genuinely good news and worth recording as such.

---

# THE 14-VIEW TABLE

Columns are the five questions from the packet. "Own API paths" counts distinct `/api/...` literals
reachable through **eager** (non-`lazy`) imports from the view root — method in
`.agents/archon/recon/R1-tab-depth-audit/view-api-graph-eager.mjs`, output
`view-api-graph-eager.json`, per-view route-existence check in `match-final.txt`. Views marked DEEP got a
full read of the view file plus every flagged call site; views marked SHORT got the route/table/state
check only.

| # | view (label) | depth | 1. data path | 2. can the data exist | 3. empty / loading / error | 4. solo-dentist surface | 5. verdict + strongest evidence |
|---|---|---|---|---|---|---|---|
| 1 | `shift` «Смена» | **DEEP** | almost none of its own: 3 paths (`/api/hr/recent-patients`, `/api/settings/clinic/profile`, `/api/settings/preferences`), **all exist**. Everything on screen arrives as the `dashboard` prop from `App.tsx:3503`, i.e. the single `/api/dashboard` payload (401-guarded, exists) | YES. `appointments` 9 writers / 27 live rows, `visits` 7 / 10, `patients` 15 / 18 | **best in class.** 3 `EmptyState` mounts (`ShiftView.tsx:270,357,419`); `:272` «Сейчас никого нет в кресле»; `:266` «Приём ещё не открыт. Нажмите «Начать прием», когда пациент сядет в кресло.»; `:210` «В карточке пациента нет телефона. Добавьте номер в разделе «Пациенты», чтобы позвонить.» Not one status code, not one English string | good: role queues auto-hide at ≤2 roles (`:149-157`), doctor surname hidden with 1 doctor (`:123-129`), analytics behind «Показать аналитику» (`:459`). **BAD:** chair load ungated (`:448-449` header text + `:463-497` meter) | **REAL.** The `rolesWorthShowing`/`manyDoctors` gates are real §5 modularity that nobody had to be told to add |
| 2 | `schedule` «Записи» | **DEEP** | `dashboard` prop + `/api/ws/schedule` (real, `apps/api/src/routes/websocket.ts:96` — my extractor first missed it because it is declared on `wsApp.get`, corrected) + `/api/ai/parse-dictation` + `/api/speech/transcribe-chunk`. **All exist** | YES, same tables as shift | good. `ScheduleView.tsx:707-724` documents a whole widget deleted *because* its data could never exist — the right instinct, recorded in place | **worst §5 offender.** `:359-364` KPI card «Самое занятое кресло» / «кресла не загружены»; `:521-531` a chair filter chip per chair (one option when you have one chair); `:238` and `:507` compare `profile.mode === "solo_doctor"` by hand instead of using `hasCapability` | **REAL with §5 leaks.** No valid desktop capture exists for this view — visual verdict outstanding |
| 3 | `patients` «Пациенты» | **DEEP** | 34 own paths; 26 exist. **3 live 404s on mounted widgets** (FINDING 2) and **2 mounted widgets over 0-writer tables** (FINDING 4) | core YES (`patients` 15 writers). Widgets NO: no `reclamations`/`tickets` table exists at all; `patient_communication_timelines` and `custom_crm_task_types` have 0 writers | mixed. `PatientReclamationsWidget` and `PatientCommunicationTimelinesWidget` are exemplary (4 states each, honest failure text). `PatientNoShowRisk.tsx:54` has **no failure branch at all** | **`PatientsView.tsx:163` vs `:192`: two adjacent boxes, one searches, one creates a patient** (FINDING 9, capture proof). Plus 2 permanently `display:none` inputs at `:211`, `:220` | **PARTIAL.** Search / card / profile / duplicate-merge are real; 5 of the panels bolted onto them are dead |
| 4 | `imaging` «Снимки» | SHORT | 5 paths, **all exist** (`/api/dicomweb` is a prefix concat, real at `routes/dicomweb.ts:286`; `/api/imaging/studies/:id/analyze` real) | YES. `imaging_studies` 2 writers / 1 live row; `dicom_workbench_bundles` 1 row; `imaging_viewer_sessions` 1 row | present and Russian, e.g. `ImagingView.tsx:810` «Повторная отправка просмотра станет доступна после подключения к сети.» | 37 buttons in the file (upper bound; viewer tools). Nothing clinic-size-specific | **REAL** (shallow: I did not upload a DICOM). One §3 leak: `components/imaging/VisiographAnalyzer.tsx:280` «AI сервис недоступен (HTTP {status})» |
| 5 | `visit` «Прием» | **DEEP** | 115 own paths — the richest view. **Confirmed dead:** `/api/ai/visit-flow` (`hooks/domains/useVisitLogic.ts:1059`), `/api/egisz/logs/:id` and `/api/egisz/send` (`components/EgiszMonitor.tsx:37,73`, mounted via `components/visit/VisitOdontogramTab.tsx`), `/api/settings/catalog*`. Everything else real, incl. `/api/visits/:id/draft/autosave` (`routes/visits.ts:96`) | YES for the clinical core: `tooth_states` 2 writers / 25 rows, `tooth_state_history` 99 rows, `visits` 7 / 10, `treatment_items` 2 / 10 | good in the diary, **bad in two failure paths**: `components/VisitDiaryPhotoUpload.tsx:126` `Ошибка загрузки: ${err.message}` (raw English exception, mid-visit) and `components/visit/CryptoProSigner.tsx:64` `alert(\`Ошибка подписания: ${err.message}\`)` (native alert + raw exception) | 55 buttons in the file (upper bound). `VisitView.tsx:1476-1481` honestly labels Diagnocat integration as DEBT rather than faking it — exactly §10 | **REAL with dead subsystems.** ЕГИСЗ monitor is mounted on the odontogram tab and both its addresses are 404. 15 hardcoded hex colours in this file |
| 6 | `documents` «Документы» | **DEEP** | 4 own paths; the real work goes through `useAppLogic`'s `/api/documents/*` family — **9 routes, all exist** (`routes/documents/create.ts:60`, `issue.ts:55`, `sign.ts:8`, `signUkep.ts:8`, `void.ts:59`, `pdf.ts:63`, `html.ts:60`, `taxXml.ts:33`, `auditFacts.ts:59`) | YES. `generated_documents` 2 writers / 4 live rows, writer at `db/documentQuery.ts:135` | good; no raw exception or status code found in 4187 lines (`rg` for `{error.message}`, `HTTP ${`, `код ${` -> zero hits in this file) | **the §4 exemplar, and I was wrong first.** 217 inputs / 21 selects look catastrophic until you see that all 22 forms are gated by `selectedDocumentKind === ...` (`:1104` + 21 siblings) and each hides its rare fields behind one of **22 `<details>`** «Ручная корректировка полей (развернуть)» | **REAL.** See FINDING 11 for the correction |
| 7 | `finance` «Оплаты» | **DEEP** | 9 own paths, **all exist**: `/api/finance/family` + `/patient/:id` + `/pay` + `/topup` (`routes/finance_family.ts:119,191,394,526`), plus dashboard payload | YES. `payments` 6 writers / 8 live rows (`db/billingQuery.ts:78`) | **the standard the rest should be measured against.** Capture `.dente-ops-shots/finance_full.png`: empty state «Вариантов плана пока нет. Добавьте услуги в план лечения…» + a button; blocking checklist «Сейчас выбран пациент …, но открытый приём идёт у другого пациента. Переключите приём, иначе оплата уйдёт не тому.» | clean: 4 KPI tiles, one smart input, 3 collapsed sections (фискальный чек, плательщик для вычета, рассрочка). §4 satisfied by construction | **REAL — best screen in the product.** Only 273 lines because it is genuinely decomposed |
| 8 | `analytics` «Аналитика» | SHORT | `/api/analytics/dashboard` real (`routes/analytics.ts:24`); `/api/patients/recall-candidates` real (`routes/patientRecall.ts:44`); **`/api/hr/rebooking-conversion-rules` real route over a 0-writer table**; same for `/api/analytics/lost-patients-filters` | PARTLY. The dashboard aggregates real tables; two of its side panels read `rebooking_conversion_rules` and `lost_patients_filters`, both **0 writers** | `:205` «Аналитика не построена», `:535` «пока нет» — present. **But the loading fallback is English: `App.tsx:4182` `<h2>Executive BI Analytics</h2>`**, while the view itself says «Аналитика клиники» (`:175`) | `rg -c 'hasCapability|clinicMode'` -> **0**, yet the `h2` tooltip at `:175` advertises «загрузка кресел» to a one-chair practice | **PARTIAL.** 17 hardcoded hex colours (`#27272a` grid, `#a1a1aa` axes — dark-theme values used in light theme too) |
| 9 | `communications` «Связь» | SHORT | 18 own paths. All 3 my matcher flagged are extractor artefacts — `/api/communications/campaigns/:id/:action` and `/api/communications/outbox/:id/:action` and `outbox?query` all exist (`routes/communicationsOutbox.ts:519-847`, 22 handlers) | YES. `communication_outbox` 2 writers / **6 live rows** (`services/communications/dispatcher.ts:317`), `communication_campaigns` 2 / 1, `communication_templates` 3 rows | `:43` «Нет ответа», `:239` «не загружен,» — present. 7 panels have verified light/dark/night/narrow captures in `.dente-ops-shots/` | **uses `hasCapability`** — one of only 4 files that do. `massCampaigns` is correctly withheld from `solo_doctor` | **REAL.** The only feature area with genuine multi-theme visual proof |
| 10 | `inventory` «Склад» | SHORT | 8 paths, all exist under the `/api/inventory` prefix registered at `apps/api/src/server.ts:455` (`routes/inventory.ts:48,74,152,234,330,362,419,510`) | YES. `inventory_items` 2 writers (`routes/inventory.ts:131`) / 0 live rows — unused, not hollow | `:785` «…не загружен: клиника не определена. Обновите страницу или войдите в кабинет заново» — cause + action | 14 buttons / 10 inputs. `App.tsx:4808` passes the org id from the clinic profile and refuses to invent a UUID | **REAL, unexercised.** This is one of the three sections cycle 7 rescued from being unreachable |
| 11 | `scanner` «Стерилизация» | SHORT | 2 paths, both exist (`routes/sterilization.ts:17,33`) | YES. `sterilization_logs` 1 writer (`routes/sterilization.ts:57`) / 0 live rows | **`ScannerView.tsx:338` «…пока нет записей. Отсканируйте первый лоток — запись…»**; `:203` «Нет связи с сервером: запись в журнал не создана»; `:114` «…не загружен: нет связи с сервером. Список ниже неполный.» Three distinct states, each naming the consequence | **cleanest module in the app: 4 transitive files, 604 LOC** (`view-api-graph-eager.json`). 2 buttons | **REAL, unexercised.** Model to copy for decomposition |
| 12 | `leads` «Обращения» | SHORT | `/api/leads` + `/:id/status` + `/:id` + `/:id/convert` all exist (`routes/leads.ts:35,50,70,106,132,156`) | YES. `crm_leads` 3 writers (`routes/leads.ts:60`, `routes/telephony.ts:75`) / 0 live rows | `:938` «Нет активного врача — записать некому», `:940` «Нет кресла — записывать некуда», `:291` «Нет связи с сервером: запись не создана». Human, and each says what is missing | 5 files / 1464 LOC. Correctly **hidden from `solo_doctor`** by `workspaceShell.tsx:221` with an on-screen explanation of why | **REAL, unexercised** |
| 13 | `settings` «Настройки» | **DEEP** | 60 own paths, **14 with no route** (FINDING 5). Includes the entire price-list CRUD (FINDING 14) | mixed. `clinic_workflows` table exists with no route; `custom_crm_task_types` route exists with no writer; price catalogue has neither | **worst in class.** `SettingsView.tsx:1287-1290` uses `r.ok ? r.json() : []` with `.catch(() => {})` twice, so two 404s render as clean empty panels | 6 whole tabs are non-functional. For a solo dentist the two that matter — Прайс and Протоколы — are among them | **PARTIAL, worst view in the product.** 1653 lines in the shell alone |
| 14 | `marketing` «Маркетинг/SEO» | SHORT | 9 paths. `RecallListPanel` real; the reputation numbers are **`localStorage`**, not the server (`MarketingView.tsx:72-79,95`); 3 widgets over 0-writer tables; 1 widget on a 404 | mostly NO (FINDING 12) | present but irrelevant when the source is `localStorage` | **correctly hidden from `solo_doctor` and `one_chair`** by `workspaceShell.tsx:209-221`, with an on-rail explanation of what was hidden and how to get it back | **THEATRE — and correctly quarantined.** Do not build it; delete the 3 dead widgets as `LostPatientsFiltersWidget` was already deleted from the same grid (`MarketingView.tsx:404-408`) |

**Score: 8 REAL, 4 REAL-but-unexercised or REAL-with-leaks counted inside those 8, 3 PARTIAL
(`patients`, `analytics`, `settings`), 1 THEATRE (`marketing`).** The clinical spine of this product —
schedule, visit, documents, finance — is real. The rot is concentrated in bolt-on "competitive parity"
widgets and in the settings view.

---

# TEN BUILD PACKETS, RANKED

Ranked by what a solo dentist loses today, not by size.

1. **Make the price list editable.** `apps/web/src/components/settings/SettingsPricesTab.tsx:155,185,187,204`
   → `apps/web/src/useAppLogic.tsx:7362,7383,7404`. Needs `POST/PUT/DELETE /api/settings/catalog[/:id]`
   and `POST /api/settings/catalog-import`; the only existing pricelist route is
   `apps/api/src/routes/pricelist.ts:26`. **Why:** the first thing any dentist does is enter their own
   prices, and today the Save button says «нужный маршрут не найден». Everything money-shaped downstream
   is computed from a catalogue the clinic cannot own. Highest severity in this audit.

2. **Delete the three dead widgets on the patient card, or give them a writer.**
   `apps/web/src/components/patients/PatientOverviewTab.tsx:145,153,157`. `PatientNoShowRisk` should go
   (no route, no table, no model — and §10 forbids inventing the contract). `PatientReclamationsWidget`
   and `PatientTaskTicketsWidget` are the ones worth **building**: a solo dentist needs somewhere to
   record "this filling failed" and "call this patient back". That needs a table, a route and a writer —
   all three, since none exists. **Why:** three permanently broken panels on the screen the user opens
   most often, one of which has no error state at all.

3. **Point the call-and-message feed at the table that has data.**
   `apps/api/src/db/patientCommunicationTimelinesQuery.ts:35` reads `patient_communication_timelines`
   (**0 writers**); the sent messages are in `communication_outbox` (**2 writers, 6 live rows**,
   `apps/api/src/services/communications/dispatcher.ts:317`). The widget
   (`apps/web/src/components/crm/PatientCommunicationTimelinesWidget.tsx`) is already well built — this is
   a query change, not a UI change. **Why:** cheapest high-value fix in the audit. A confidently wrong
   "no contact with this patient" is worse than an error.

4. **Finish the `clinicMode` job: gate chair load in the four places that ignore it.**
   `apps/web/src/ShiftView.tsx:448-449` and `:463-497`; `apps/web/src/ScheduleView.tsx:359-364` and
   `:521-531`; `apps/web/src/pages/AnalyticsDashboardView.tsx:175`. Replace the hand-rolled
   `profile.mode === "solo_doctor"` at `ScheduleView.tsx:238,507` with `hasCapability`.
   The capability already exists (`apps/web/src/lib/clinicCapabilities.ts:54,104`) and has exactly one
   consumer (`apps/web/src/components/reports/ManagerReportsPanel.tsx:167`). **Why:** §5 is the
   Director's current focus, the mechanism is already built and correct, and four screens bypass it.

5. **Split the two boxes in the patients header.** `apps/web/src/PatientsView.tsx:163` (search) and
   `:192` (create-on-Enter). Give the create path a visible label or move it behind the «Создать» button;
   fix the magnifier icon overlapping the placeholder (visible in
   `.dente-ops-shots/patients_light_full.png`); delete the two `display:none` inputs at `:211,:220`.
   **Why:** this is how duplicate patient records are created, and the solo dentist is their own
   receptionist with nobody to catch it.

6. **Retire the second error-message system.** Fold
   `apps/web/src/AppHelpers.tsx:4132-4143` (`responseStatusFailureLabel`, whose `else` branch prints
   «сервер вернул код {status}») into `apps/web/src/lib/panelStateText.ts:102`
   (`requestFailureCause`), then migrate the **104 call sites** of `responseErrorMessage`
   (`AppHelpers.tsx:4145`). Fix the five leak sites in FINDING 7 in the same packet, starting with
   `apps/web/src/components/VisitDiaryPhotoUpload.tsx:126` and
   `apps/web/src/components/visit/CryptoProSigner.tsx:64` — both fire mid-visit and both print an English
   exception. **Why:** §3 is a product rule, and the correct implementation already exists and is tested
   by `node:test`; this is consolidation, not design.

7. **Delete the six non-functional settings tabs and their 14 dead addresses**, rather than building
   them. `SettingsBpmnTab.tsx:34,56,78,98`, `SettingsMarketingTab.tsx:22`,
   `SettingsReportingTab.tsx:20,47`, `EgiszBlankPermissionsWidget.tsx:18`,
   `YandexCalendarSyncsWidget.tsx:17`, `SettingsView.tsx:1287,1289`. Keep and build only
   `SettingsProtocolsTab.tsx:68,69,100` (treatment protocols — a solo dentist wants templates) and
   `Step7Migration.tsx:36` (`/api/system/analyze-legacy-db`, in the onboarding wizard, so it is in the
   first five minutes). **Why:** §7 says take the best and cut the excess. A BPMN engine and a Yandex
   calendar sync are excess for a one-chair practice; six broken tabs teach the user the product is
   broken.

8. **Fix the ЕГИСЗ monitor on the visit screen, or remove it.**
   `apps/web/src/components/EgiszMonitor.tsx:37,73` (`/api/egisz/logs/:id`, `/api/egisz/send`) — both 404,
   and the component is mounted from `apps/web/src/components/visit/VisitOdontogramTab.tsx`. Note
   `apps/api/src/routes/egisz.ts` **does** exist with 4 handlers including
   `GET /api/egisz/visits/:visitId/cda` — so this is a route-name mismatch, not an absent subsystem, and
   is probably a small packet. **Why:** ЕГИСЗ reporting is a legal obligation in Russia; a panel that
   silently fails to send is a compliance risk, not a cosmetic one.

9. **Replace hardcoded colours in the two most-looked-at surfaces.**
   `apps/web/src/components/Odontogram.tsx` (**18** hardcoded `stroke`/`fill`/`color` attributes),
   `apps/web/src/VisitView.tsx` (**15**), `apps/web/src/pages/AnalyticsDashboardView.tsx` (**11**, incl.
   `stroke="#27272a"` at `:330` and `stroke="#a1a1aa"` at `:334`, both dark-theme values). Banned by
   `.agents/AGENTS.md:209`. **Why:** the odontogram is the single surface a dentist stares at all day, and
   in light theme these values are wrong by construction. **Note this is a static finding** — there is no
   light-theme capture of either surface, so the packet must ship one.

10. **Delete the orphans and the dead context fields.** `apps/web/src/pages/FinancialDashboard.tsx` and
    `apps/web/src/pages/DoctorPayoutDashboard.tsx` — zero importers, verified
    (FINDING 6); `handleQuickConsult` at `apps/web/src/useAppLogic.tsx:13555` with its export at `:13838`
    and zero consumers (FINDING 15); the three dead marketing widgets at
    `apps/web/src/MarketingView.tsx:403,410,411`; and the 4 stale `KNOWN_MISSING` entries in
    `apps/api/src/tests/webCallsExistingRoutes.test.ts`. **Why:** §5 bans orphaned files explicitly, and
    every one of these is a landmine for the next agent who "fixes" a 404 that no user can reach. Lowest
    risk packet on the list and it shrinks the god-context return object.

---

## FINDING 16 — 20 tables exist in the live PostgreSQL with no Drizzle declaration anywhere. They are the missing half of the missing features.

`node .agents/archon/recon/R1-tab-depth-audit/orphan-tables.mjs` (set difference between the 146 live
tables and the 126 `pgTable` declarations). Output:

```
LIVE TABLES: 146   DRIZZLE-DECLARED: 126
IN DATABASE BUT NO DRIZZLE DECLARATION (20):
_dente_migrations, analytics_snapshots, cash_shifts, clinic_workflows, clinical_tasks,
dental_lab_orders, doctor_assistants, doctor_payrolls, document_templates, drill_protocols,
egisz_logs, ingested_patients_mapping, ingestion_sources, migration_templates, patient_anamnesis,
payment_installments, scheduler_reservations, signed_outpatient_cards,
treatment_plan_stages_auto_archive, ztl_lab_orders

DECLARED IN CODE BUT NOT IN THE DATABASE (0):
```

The second number being zero is genuinely good news: there is **no schema drift in the dangerous
direction**, no declared table missing its migration.

The first list explains several of the 404s. Cross-checked with
`rg -c --fixed-strings '<table>' apps/api/src scripts packages`:

| table | files mentioning it | meaning |
|---|---|---|
| `clinic_workflows` | **0** | the BPMN tab (`SettingsBpmnTab.tsx:34`) has a table and a UI and **nothing in between** |
| `egisz_logs` | **0** | `EgiszMonitor.tsx:37` reads `/api/egisz/logs/:id`; table exists, no model, no route |
| `document_templates` | **0** | `apps/api/src/routes/templates.ts` has 5 handlers but does not touch this table |
| `cash_shifts`, `payment_installments`, `patient_anamnesis`, `drill_protocols`, `signed_outpatient_cards` | **0** | five more features that exist only as a table |
| `clinical_tasks` | 5 | **counter-example, and it is the honest kind**: reached by *raw SQL* — `INSERT INTO clinical_tasks` at `apps/api/src/db/clinicalTasksQuery.ts:177`, with the file header explaining that the table pre-existed the Drizzle schema |

That last row is why I am declaring a method limit rather than a finding: a table with no `pgTable`
declaration is invisible to my writer census's denominator, so **the census cannot rule out raw-SQL
writers for undeclared tables.** For the 13 zero-writer tables I *did* report I closed that gap with a
second, independent instrument — `rg -ci "insert into <table>"` across `apps/api/src`, `apps/web/src`,
`packages`, `scripts` returned **0 files for all 13**. Two methods, same answer.

### Correction to packet 8 below, made after checking

I first wrote that the ЕГИСЗ monitor was "probably a route-name mismatch, a small packet". Checking
`apps/api/src/routes/egisz.ts` shows 4 handlers —
`GET /api/clinical/egisz/integration-status:79`, `POST /api/clinical/egisz/validate-doctor-snils:123`,
`GET /api/egisz/multiple-diagnoses:163`, `GET /api/egisz/visits/:visitId/cda:192` — and **none of them
sends anything anywhere**. `egisz_multiple_diagnoses` has 0 writers; `egisz_blank_permissions` has 0
writers and 0 readers; `egisz_logs` has no model at all. There is a CDA document *generator* and no
transport. So packet 8 is **not** small: it needs a submission transport, a log model and a route.
Rank it where it is for the compliance reason, but size it honestly.

---

# WHAT MY METHOD COULD STILL BE MISSING

Stated plainly, because a recon that claims completeness is lying.

1. **The behavioural route gate never ran.** `scripts/smoke-clinical-mutation-guard.mjs` aborted on stale
   build (`gate.err.txt:5-12`). I therefore have **no** re-derived figure for total route entries,
   probed routes, mutating routes, `payloadBeforeAuthorisation`, `warnings` or `buildFreshness`. My
   312-route table is built from source text, not from the app's own routing table, so a route registered
   through an idiom my regex does not match is invisible to it — **and one already was**:
   `/api/ws/schedule` is declared on `wsApp.get` (`apps/api/src/routes/websocket.ts:96`) and my first
   table missed it, which nearly became a false 404 finding. Assume there are others. The lead should
   build the API and re-run the gate before acting on the route table.
2. **My 404 verdicts are GET probes.** A POST-only route answers 404 to a GET in Fastify, so a naive
   probe over-reports. I corrected for this by requiring *both* a 404 **and** absence from the 312-route
   table before calling an address missing — but the reverse error is still possible: a route present in
   source and registered under a prefix I failed to resolve would be scored missing. I resolved the four
   prefixes declared at `apps/api/src/server.ts:455-458`; a prefix built at runtime would defeat me.
3. **I never authenticated.** Every live request returned 401 or 404. I have **not** seen a single view
   render with real data in a browser on this run. All §3/§4 verdicts about what is on screen rest on
   reading JSX plus three PNG captures (`patients_light_full`, `finance_full`, and the communications
   set). For `schedule`, `shift` and `visit` there is **no valid desktop capture at all**, so my verdicts
   on those three are code-reading only.
4. **"Surface weight" is not measured.** I counted `<button>`/`<input>`/`<select>` per file, then proved
   with `DocumentsView.tsx` that the count is meaningless here because the codebase gates aggressively
   (FINDING 11). Nothing in this dossier reports an above-the-fold control count, and nothing should be
   read as one. That question needs screenshots at a fixed viewport, which needs a logged-in session.
5. **The writer census only sees three idioms**: `.insert(x)`, `.insert(ns.x)`, and `INSERT INTO x`. It
   would miss `db.execute(sql\`...\`)` with an interpolated table name, a `COPY`, a trigger, a
   `CREATE TABLE AS`, or a writer living outside the six directories I scanned. I cross-checked every
   zero-writer verdict against live row counts (0 contradictions) and every reported zero-writer table
   against a raw-SQL grep (0 contradictions), but neither check can find a writer that has never run.
6. **Empty tables prove nothing and I have tried not to lean on them.** 122 of 146 tables are empty
   because this is a near-virgin database, and I have marked `inventory_items`, `crm_leads`,
   `sterilization_logs` and `appointment_waitlists` as REAL-but-unexercised precisely on that basis.
   The converse risk remains: a writer that exists but is unreachable from the UI would still score as
   "real" in my census. I only checked reachability by hand for the views I marked DEEP.
7. **`useAppLogic.tsx` was read by region, not whole.** 14,570 lines (`wc -l`, this run). I read roughly
   lines 3900, 7350-7410, 12220-12450, 13130-13300, 13550-13660 — the fetch call sites my extractor
   flagged. A dead field, a swallowed error or a 404 caller elsewhere in that file would not be in this
   dossier. Same for `AppHelpers.tsx` (6158 lines): I read the error-message region around `:4120-4150`
   and the `lazy` block at `:371` only.
8. **Seven views got a SHORT pass** — `imaging`, `analytics`, `communications`, `inventory`, `scanner`,
   `leads`, `marketing`. For those I verified route existence, table writers, and sampled empty/error
   strings; I did **not** read the view file end to end, and I did not trace their prop-drilled data.
   A dead panel inside one of them, of the kind I found on the patient card, would be missed.
9. **I did not test any mutation.** Every probe was a GET (plus one POST to a known-404 address, which
   mutates nothing). So "the writer exists in code" is a static claim throughout; I never proved a row
   gets written. The lead should treat every "REAL" verdict as `ПРОВЕРЕНО статически, НЕ ПРОВЕРЕНО
   поведенчески`.
10. **The theme/colour finding is static.** `.dente-ops-shots/` has no analytics or odontogram capture, so
    the hardcoded-hex claim in packet 9 is a code fact and a *prediction* about light theme, not an
    observation.
11. **I did not read `docs/competitive-audit/` as evidence** — per my briefing it is a record of claims,
    not of facts. But that means I also did not check whether any of the 63 features it lists is quietly
    real. If the lead wants that crossed off, it is a separate packet.
