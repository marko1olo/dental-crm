# CRITIQUE OF R1 — TAB DEPTH AUDIT

Completeness critic under [ARCHON]. READ-ONLY. Every number below was re-derived on this run with a
command; nothing is taken from the dossier or from any campaign document.

**VERDICT: USABLE_WITH_GAPS.** This is the most honest recon artefact in the campaign so far — it
fabricates nothing, its captures are real, and its self-corrections are the right ones. But it missed
one seam that invalidates two of its fourteen verdicts and redirects one of its ten packets, it missed
the actual data path of the thing it named its own #1 finding, and it quietly delivered 14 views x 4
questions where 5 were ordered.

---

## 1. WHAT I RE-DERIVED — AND WHAT SURVIVED

### 1.1 The database numbers: CONFIRMED, by a different instrument

I did not reuse `db-probe.mjs`. I wrote `critic-db-recheck.mjs`, which enumerates tables from
`pg_class`/`pg_namespace` (`relkind='r'`) instead of `information_schema.tables`. Output:

```
SERVER: PostgreSQL 18.4 on x86_64-windows | db=dental_crm | port=5432
BASE TABLES IN public (pg_class relkind='r'): 146
NON-EMPTY: 24   EMPTY: 122
organizations 4    clinics 1    communication_outbox 6    generated_documents 4
patients 18   appointments 27   visits 10   payments 8   tooth_states 25
patient_communication_timelines 0   custom_crm_task_types 0   clinic_workflows 0
```

146 / 24 / 122 **CONFIRMED**. `organizations = 4` **CONFIRMED** — its correction against its own
briefing (which said 2) is right, and it is the right instinct. `clinics = 1` **CONFIRMED**.
All ten zero-writer tables I spot-checked are genuinely 0 rows. Engine is native PostgreSQL 18.4 on
5432, consistent with the standing note.

### 1.2 `126 pgTable declarations` and therefore `20 orphan tables`: CONFIRMED after I was wrong first

My first pass got **123**, not 126, and I nearly filed the dossier's arithmetic as broken. The three
missing ones are multi-line declarations where the table name is on the following line:

```
apps/api/src/db/communicationsSchema.ts:36   export const communicationCampaigns = pgTable(
apps/api/src/db/communicationsSchema.ts:89   export const appointmentActionCodes = pgTable(
apps/api/src/db/patientsSchema.ts:21         export const patientDuplicateDecisions = pgTable(
```

123 single-line + 3 multi-line = **126 distinct tables, no duplicates** (`uniq -d` empty). So
146 − 126 = 20 orphans is arithmetically sound and `DECLARED BUT NOT IN DATABASE (0)` is consistent.
**The dossier's census is correct and mine was the naive one.** Recording this because it is the same
trap that produced «45 hollow modules of 50».

### 1.3 `312 routes` and «the only pricelist route»: CONFIRMED

`wc -l route-table.txt` -> 312, agreeing with `route-table.count.txt`. Independent grep
`rg -n '"/api/settings/catalog|/api/pricelist' apps/api/src` returns only `routes/pricelist.ts:27`
and a string constant in `ingestion/documentExtractor.ts:789`. **There is genuinely no catalog CRUD
route.**

### 1.4 The live 404s: CONFIRMED by my own probes

```
200  /api/health              401  /api/dashboard           401  /api/workspace/profile
404  /api/settings/catalog    404  /api/settings/catalog-import
404  /api/ai/predict-no-show  404  /api/patients/x/reclamations   404  /api/patients/x/tickets
404  /api/clinic/workflows    404  /api/system/ram-watchdogs      404  /api/settings/protocols
404  /api/billing/payouts     404  /api/pricelist                 404  /api/pricelist/analyze
404  /api/workspace/onboarding/complete
```

Note the last two lines: `/api/pricelist/analyze` and `/api/workspace/onboarding/complete` both
answer 404 to a GET and **both exist** (POST-only). That is live proof of the dossier's own
methodLimit #2, and it is the correct discipline that it required both a 404 *and* absence from the
route table before calling an address missing.

### 1.5 The captures: NOT FABRICATED. I opened both.

`ls .dente-ops-shots/*.png | wc -l` -> 34; `md5sum | sort -u | wc -l` -> **34**. No clones.

I opened `patients_light_full.png` and `finance_full.png` myself and checked the specific claims:

- Patients: two adjacent boxes, left «...иск пациента: ФИО или телефон» with **the magnifier glyph
  genuinely covering the first characters of «Поиск»**, right «ФИО, телефон, дата рождения (Enter)»,
  «Создать» further right. **Exactly as described.**
- Finance: four KPI tiles each with its own denominator («0 открытых позиций», «1 платеж по текущему
  пациенту», «0 документов без оплаты»); the empty state «Вариантов плана пока нет. Добавьте услуги в
  план лечения…» with an «Открыть прием» button; three collapsed sections «Фискальный чек и кассир»,
  «Плательщик для налогового вычета», «Рассрочка от клиники, без банка»; and verbatim
  «Сейчас выбран пациент Орлова Марина Петровна, но открытый приём идёт у другого пациента.
  Переключите приём, иначе оплата уйдёт не тому.» **Every quoted string is on the pixel.**

This recon did not invent proof. Say so plainly, because the campaign's baseline is 49 screenshots
that do not exist.

### 1.6 The file:line claims I opened: 7 of 9 exact

| claim | verdict |
|---|---|
| `useAppLogic.tsx:7362` POST `/api/settings/catalog`, `:7383` PUT, `:7404` DELETE | **EXACT** |
| `AppHelpers.tsx:4142` `` return `сервер вернул код ${response.status}` `` | **EXACT** |
| `panelStateText.ts:99-101` claims that leak was removed | **EXACT** — line 100 says it verbatim, contradiction is real |
| `PatientNoShowRisk.tsx:54` `if (res.ok) {` with no `else` | **EXACT**, and `finally` re-enables the button, so «Рассчитать AI-риск» is pressable forever with no message |
| `PatientsView.tsx:163` search / `:192` create-on-Enter | **EXACT** |
| `ScheduleView.tsx:359-364` «Самое занятое кресло» / «кресла не загружены» | **EXACT** |
| `ManagerReportsPanel.tsx:167` sole `chairUtilisation` consumer | **EXACT** |
| `AppHelpers.tsx:4137` for the 404 branch | **WRONG** — «нужный маршрут не найден» is at **:4136** |
| `.agents/AGENTS.md:209` bans hardcoded colours | **WRONG** — :209 is `- Auth: JWT + staff PIN`. The ban is at **`.agents/AGENTS.md:231`** |

Also `clinicCapabilities.ts:79` is cited for the `solo_doctor` capability list; :79 is a comment line,
the constant `SOLO_DOCTOR` is at **:81**.

---

## 2. THE NUMBER THAT IS WRONG

**`104 call sites of responseErrorMessage` is a string-occurrence count sold as a semantic count.**

```
rg -o --fixed-strings 'responseErrorMessage' apps/web/src --glob '!**/*.test.*' | wc -l  -> 104
```

Of those 104: **1 is the definition** (`AppHelpers.tsx:4145`) and **6 are import specifiers** —
`App.tsx:813`, `useAppLogic.tsx:593`, `hooks/domains/usePatientLogic.ts:20`,
`hooks/domains/useScheduleLogic.ts:17`, `hooks/domains/useVisitLogic.ts:39`,
`hooks/useTelegramSettings.ts:19`. **Actual call sites = 97.** «7 files» is right.

Small in magnitude, exactly the campaign's disease in kind: a `wc -l` reported as a fact about the
program. It is repeated three times in the deliverable (finding, measurement, packet 6).

---

## 3. THE MISS THAT MATTERS MOST — `clinicMode` CANNOT HOLD A HIDING VALUE

The dossier calls `clinicCapabilities.ts` «the best architecture in the codebase for §5», says it is
«honoured in exactly one of the five places that need it», builds packet #4 on it, and uses
«correctly hidden from `solo_doctor`» as the reassurance that closes **two** of its fourteen view
verdicts (marketing = THEATRE-but-quarantined at LOW; leads = REAL-and-correctly-hidden).

**It never checked what value the column can actually contain.** Four commands:

```
packages/shared/src/index.ts:797   z.enum(["solo_doctor","one_chair","small_clinic","network_clinic"])
apps/api/src/db/schema.ts:228      clinicMode: text("clinic_mode").notNull().default("demo")  // demo, single, network
apps/api/src/routes/workspaceProfile.ts:580,651
                                   clinicMode: (payload.chairs || 1) === 1 ? "single" : "network"
apps/api/src/db/domainStateHydration.ts:350
                                   clinicProfile.mode = clinicModeSchema.catch("one_chair").parse(organization.clinicMode)
```

The writer vocabulary is `demo | single | network`. The reader vocabulary is
`solo_doctor | one_chair | small_clinic | network_clinic`. **The two sets are disjoint.** Every
organization in the live database therefore falls through `.catch("one_chair")`.

`ONE_CHAIR` (`clinicCapabilities.ts:88-95`) = `callList, messaging, massCampaigns, managerReports,
doctorBreakdown, marketingSection`. Consequences:

1. **`solo_doctor` is unreachable in production.** No onboarding path writes it; the column default
   is not it. Every «correctly hidden from `solo_doctor`» statement in the dossier is inert.
2. **`marketingSection` is granted to every real clinic.** `workspaceShell.tsx:209` returns the full
   rail when `hasCapability(mode,"marketingSection")`, so «Маркетинг/SEO» and «Обращения» are shown
   to everybody. **The dossier's own capture proves it:** `patients_light_full.png` shows both
   «Обращения» and «Маркетинг/SEO» in the left rail. It read that capture and drew the opposite
   conclusion.
3. Its marketing severity of **LOW is therefore wrong**. «80 percent theatre, already quarantined»
   becomes «80 percent theatre, on the rail of every install». That is at least MEDIUM.
4. Packet #4's *mechanism* survives and is worth more than it thought — `one_chair` does lack
   `chairUtilisation`, so gating chair load with `hasCapability` genuinely would hide it. But the
   packet's stated rationale («small practices must not see…», keyed to `solo_doctor`) is the wrong
   reason, and the packet as written does not fix the seam that makes every *other* §5 rule dead.

This is one grep away from anything the dossier already had open, and it is the single most valuable
thing nobody in this area has looked at.

---

## 4. THE SECOND MISS — ITS OWN #1 FINDING HAS THE WRONG DATA PATH

FINDING 14 / packet #1 states: «the service catalogue is arriving read-only inside the
`/api/dashboard` payload and cannot be edited from the product at all». Three things are wrong.

**(a) The table is never named.** `rg -c 'service_catalog_items|serviceCatalogItems' dossier.md` ->
**zero mentions.** Its own artefact has the row:

```
writer-census.txt:120
service_catalog_items  serviceCatalogItems  3  4  0  apps/api/src/db/schema.ts:368
  apps/api/src/routes/workspaceProfile.ts:663 | apps/api/src/routes/workspaceProfile.ts:824
  apps/api/src/db/pricelistQuery.ts:23 | apps/api/src/routes/inventory.ts:381
```

**Three writers.** Both production ones sit inside `POST /api/workspace/onboarding/complete`
(`workspaceProfile.ts:547`) — a route that is **in its own `route-table.txt`**. So «cannot be edited
from the product at all» is false as stated: the onboarding wizard writes the catalogue. The true
claim is narrower — a dentist cannot author, edit, delete or import *their own* prices; they can only
accept a hardcoded starter set keyed to selected specialties.

**(b) What the UI actually shows is compiled into the server.** The dashboard's `serviceCatalog` is a
module-level TypeScript array at `apps/api/src/sampleData.ts:583`, emitted at `sampleData.ts:10385`.
`domainStateHydration.ts:775-782` overwrites it from the table **only** `if (serviceRecords.length > 0)`.
Live `service_catalog_items` = **0 rows**. So the six priced services visible in the dossier's own
`finance_full.png` — `A01.07.001 Первичная консультация стоматолога · 1 200 ₽`, `A16.07.093 Изоляция
коффердамом · 1 500 ₽`, and four more — are **demo constants from `sampleData.ts`**, not clinic data.
The dossier looked at that capture, quoted five other strings from it, and did not ask where the
prices came from.

**(c) There are two sources of truth for money, and they disagree today.** Documents do not use the
dashboard array: `db/documentQuery.ts:345` calls `getServiceCatalogForOrganization`
(`db/pricelistQuery.ts:22-23`), which selects `service_catalog_items` straight from Postgres — **0
rows**. So the payment screen shows six priced services while the contract / receipt / tax-deduction
generator sees an empty catalogue. The code comment at `domainStateHydration.ts:779-781` is a warning
about exactly this class of failure («…поиск услуги возвращал бы демонстрационную позицию с другой
ценой — и она попала бы в договор и в чек»). Packet #1 should be rewritten around this, not around
four 404s.

---

## 5. THE THIRD MISS — PACKET #3 IS RIGHT FOR A REASON IT DID NOT CHECK, AND THE DEFECT IS DEEPER

Packet #3 («point the feed at `communication_outbox`, a query change not a UI change») is
**feasible** — I checked the column list and `communication_outbox` does have `patient_id uuid`.
The dossier recommended it without checking that.

The defect it reported (`0 writers`) is not the whole defect. `patient_communication_timelines` has
**no `patient_id` column at all**:

```
id, organization_id, patient_name (text), event_type, status_color,
audio_recording_url, comment, created_at
```

`patientCommunicationTimelinesQuery.ts:17-25` therefore resolves `patients.fullName` and does an
**exact `eq` on `patient_name` free text**. So even if a writer appeared, the feed would silently miss
rows on any case or spacing variance — and the dossier's own capture shows a patient stored as
«орлова марина петровна» in the same list as «Орлова Марина Петровна». The table cannot answer the
question by shape, which is a stronger argument for the repoint than «0 writers» and should be in the
packet.

Bonus, visible in `patients_light_full.png` and unnoticed: «орлова марина петровна» and
«Орлов Кирилл Сергеевич» carry **the same phone, +7 916 200-10-20** — live empirical support for its
own FINDING 9 (duplicate creation), sitting in the capture it opened.

---

## 6. TWO CLAIMS THAT ARE WEAKER THAN STATED

**`ShiftView` chair load.** The dossier lists `ShiftView.tsx:463-497` as chair load shown ungated. I
read it. `:482` renders `mostLoadedResource?.title` — a *resource*, doctor or chair (empty state at
`:496`: «Врачей и кресел пока нет в настройках.»), arriving as a prop at `:74`. For a one-chair,
one-doctor practice that is that doctor's own day utilisation — which the capability module's own
comment (`:17-18`) explicitly says should **stay** («Выработка одного врача — это одна строка: мало,
но осмысленно, поэтому она остаётся»). And the entire card is behind `{showAnalytics && (` at
**:463 — the very line the dossier cites as the start of the violation** — i.e. behind the
«Показать аналитику» disclosure it credits as good §4 in the same table row. Only the collapsed
header text at `:448` («…загрузка кресел…») is genuinely unconditional. This is the weakest of
packet #4's five sites and is presented as equal to `ScheduleView.tsx:359-364`, which is real.

**The two `display:none` inputs.** Packet #5 says delete them. They carry
`autoComplete="tel"` and `autoComplete="bday"` and bind `newPatientPhone` / `newPatientBirthDate`,
which the create flow consumes — the exact shape of deliberate hidden browser-autofill targets. The
dossier established that they are invisible; it did not establish that they are purposeless. Do not
ship that deletion on this evidence.

---

## 7. COVERAGE AGAINST THE BRIEF — WHAT WAS QUIETLY SKIPPED

The brief ordered 14 views x 5 questions. It delivered 14 x 4.

1. **Question 4 is not answered for any view.** «How many controls are visible before the user
   scrolls» is measured nowhere. The dossier is *honest* about this (methodLimit #4, FINDING 11) and
   its reason is good — it disproved the per-file count method on `DocumentsView.tsx`. But honesty is
   not delivery: one of the five ordered columns is empty in all fourteen rows, and the second half
   of Q4 («does anything presuppose colleagues, multiple chairs or multiple clinics») is answered
   only for chairs and colleagues.
2. **«multiple clinics» is never examined.** `rg -c 'филиал|multi-clinic|нескольк'` over the dossier
   -> 0. Its own row counts show `organizations = 4` against `clinics = 1`, which is precisely the
   smell the question was aimed at, and it recorded the number as a correction without asking what
   four organizations over one clinic means for a solo dentist.
3. **The brief's explicit `undefined` / `NaN` check was not run.** `rg -c 'NaN' dossier.md` -> 0;
   `rg -c 'undefined' dossier.md` -> 0. It searched for raw exceptions, English strings and bare
   status codes — three of the five tokens the brief names — and skipped two without saying so.
   Candidate surfaces exist (`components/analytics/analyticsWidgetData.ts`,
   `pages/analyticsDoctorMetrics.ts`, `components/communications/MessageDeliveryConsole.tsx`,
   `components/settings/MigrationWizard.tsx` all contain bare `toFixed(`/interpolation sites).
4. Everything else was delivered: all 14 views have a route-existence answer (Q1), a writer answer
   (Q2), an empty/error answer (Q3) and a verdict with named evidence (Q5); DEEP vs SHORT is declared
   explicitly and matches the priority list the brief gave (shift, schedule, patients, visit, finance,
   documents DEEP — exactly the six named).

---

## 8. DOCUMENT INHERITANCE — CLEAN, WITH TWO EXCEPTIONS

`rg -c 'RECON_DOSSIER|VISUAL_VERDICT|progress.md'` over the dossier -> **0, 0, 0.** It cites none of
them as evidence. `competitive-audit` appears **once**, in methodLimit #11, to state that it did
**not** read the folder as evidence. That is the correct handling of a formally rejected source and
it should be credited, not just tolerated.

It also disowns two numbers it was handed rather than repeating them: the `436 / 434 / 187` route
figures (declared unverifiable because the gate would not run) and `organizations = 2` (re-measured
to 4). That is the behaviour the campaign has been failing at.

Two numbers *are* inherited without a command:

- **«~1,014-field context object»** (FINDING 15, packet 10). Traced to `ARCHON_PROMPT.md:136`,
  `ARCHON_PROMPT.md:219` and `RECON_DOSSIER.md:135`. Never re-derived on this run. Load-bearing only
  rhetorically, but it is a document number.
- **«cycle 7 rescued three sections from being unreachable»** (view 10 row). No command, no
  file:line, no artefact — campaign lore.

And one citation is a bad inheritance in itself: `.agents/AGENTS.md:209` for the colour ban, which is
at `:231`.

---

## 9. SEVERITY DISCIPLINE — DEFENSIBLE

Not everything is HIGH. The distribution is 4 HIGH / 4 MEDIUM / 3 LOW / 2 INFO, and the INFO entries
do real work: one **argues against its own headline** (DocumentsView is not the §4 overload a control
count suggests) and one is a positive census of what actually works. It also declines to promote a
dramatic finding — `handleQuickConsult` printing a raw English JSON blob is kept at LOW *because no
user can reach it*, which is the correct call and the opposite of the campaign's habit.

One misgrade: **marketing at LOW** depends on the false «already correctly quarantined» premise
(§3 above). Correct it to MEDIUM.

## 10. `mattersForSolo` — GENUINELY SOLO-AWARE, NOT ENTERPRISE THINKING IN DISGUISE

It repeatedly *declines* to build things a one-dentist practice does not need, which is the tell:
doctor-payout dashboard («meaningless when the doctor is the owner» — recommend deletion), BPMN,
Yandex calendar sync, RAM watchdogs, merge queues, the whole marketing view. It correctly identifies
the two error paths that matter most as the mid-visit ones (photo upload, document signing) on the
grounds that a solo dentist has no IT support. That reasoning is sound and specific.

Two soft spots:

- **ЕГИСЗ (packet 8)** is justified as «a legal obligation in Russia; a panel that silently fails to
  send is a compliance risk». Probably true, but asserted with no citation of the obligation and no
  check of whether a solo private practice is in scope. It ranks 8th on an unverified premise.
- **Reclamations** is called «the one place a single-handed dentist would record that a filling
  failed» and «it cannot be recorded at all». Overstated: the visit diary is REAL by its own
  FINDING 13, and that is where a solo dentist would in practice write it. The widget is dead; the
  *capability* is not absent.

## 11. `methodLimits` — HONEST AND SPECIFIC, NOT A FORMALITY

Eleven items, each naming an instrument, a concrete idiom gap and the consequence. It names three
corrections against its own drafts, including one (`.insert(schema.generatedDocuments)` scored as
zero-writer) that is **explicitly the same class as «45 hollow modules of 50»** and was caught by
cross-checking against live row counts. It reports a false negative its own regex produced
(`/api/ws/schedule` on `wsApp.get`) and downgrades its 312-route table to «a lower bound» because of
it. It refuses to convert its control counts into a surface-weight claim. It labels every REAL verdict
«ПРОВЕРЕНО статически, НЕ ПРОВЕРЕНО поведенчески».

This is the best methodLimits section in the campaign. Its failures are failures of **scope**, not of
candour — which is why the misses in §3 and §4 above are worth ordering as a follow-up rather than
treated as a reason to distrust the artefact.

---

## 12. THE SINGLE MOST VALUABLE THING NOBODY HAS LOOKED AT

**The `clinic_mode` write/read vocabulary seam (§3).** Four commands, one afternoon, and it decides
whether every §5 modularity feature shipped in this campaign is live or dead code. Today the evidence
says dead: the column can only hold `demo`, `single` or `network`; the reader recognises only
`solo_doctor`, `one_chair`, `small_clinic`, `network_clinic`; `domainStateHydration.ts:350` coerces
everything to `one_chair`; and `one_chair` has `marketingSection`, so nothing organizational is
hidden from anybody. It invalidates two of the dossier's fourteen verdicts, re-grades one severity,
redirects packet #4, and is confirmed visually by a capture already on disk.

Runner-up: **the split price catalogue (§4)** — the payment screen and the document generator read
different sources, one of which is compiled into the API binary. That is a money-correctness defect
and it outranks the four 404s the dossier put at #1.

Third: **nothing in this campaign has authenticated.** Every §3/§4 verdict for fourteen views rests
on reading JSX plus three captures, and `schedule`, `shift` and `visit` have no valid desktop capture
at all. One logged-in session at a fixed viewport would answer brief question 4 for all fourteen
views and settle the hardcoded-colour prediction in packet 9, which is currently static reasoning
about pixels nobody has seen.

---

### Artefacts I added (read-only instruments, no repo changes)

- `.agents/archon/recon/R1-tab-depth-audit/critic-db-recheck.mjs` — SELECT-only, `pg_class`-based
  table/row enumeration plus column introspection. Prints no connection string.
