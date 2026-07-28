# CRITIQUE — RC4-egisz-legal-clock (adversarial re-measurement)

Author: adversarial critic. Did NOT write the dossier. Read-only on source; this file is the only write.
Instruments deliberately different from the dossier's where possible: live API, `ast-grep` parser (not
regex), and my own SQL in addition to re-running its scripts verbatim.

VERDICT: **TRUSTWORTHY_WITH_CORRECTIONS.** Headline fully reproduced. One published number is wrong and
fixture-contaminated; one absence claim is false.

---

## 1. WHAT REPRODUCED (verbatim)

### 1.1 Live API — all four probes exact

```
GET /api/clinical/egisz/integration-status
{"ok":true,"configured":false,"frmoStatus":"NOT_CONFIGURED","frmrStatus":"NOT_CONFIGURED",
"remdStatus":"NOT_CONFIGURED","capabilities":{"cdaGeneration":true,"ukepSigning":false,
"remdTransmission":false},"missingConfiguration":["EGISZ_N3_BASE_URL","EGISZ_N3_GUID",
"EGISZ_N3_LPU_ID","EGISZ_FRMO_ID"],"checkedAt":"2026-07-28T17:17:13.116Z"}   HTTP:200

POST /api/egisz/send
{"message":"Route POST:/api/egisz/send not found","error":"Not Found","statusCode":404}   HTTP:404

GET /api/egisz/logs/abc
{"message":"Route GET:/api/egisz/logs/abc not found","error":"Not Found","statusCode":404}   HTTP:404

GET /api/integrations/egisz-blank-permissions
{"message":"Route GET:/api/integrations/egisz-blank-permissions not found","error":"Not Found",
"statusCode":404}   HTTP:404
```
`data.error === "Not Found"` in all three 404 bodies, so EgiszMonitor.tsx:126 «Ошибка: {errorDetails}»
does render the English string. `rg -n "setNotFoundHandler" apps/api/src` → EXIT=1: no custom handler,
the 404 shape is stable. All confirmed. (Dossier omitted `checkedAt` from its quote — immaterial.)

### 1.2 Inventory and line counts — exact
`fd -I -i 'egisz' --exclude node_modules --exclude dist` → exactly 8 files.
`wc -l` → 341 / 161 / 87. Exact.
`rg -n "registerEgiszRoutes" apps/api/src` → server.ts:61 import, server.ts:450 call. Exact.

### 1.3 Both components, line by line — every cited line correct
`apps/web/src/components/EgiszMonitor.tsx`: :37 `fetch(\`/api/egisz/logs/${patientId}\`)`; :38 `if
(res.ok) {`; :23-25 initial state `"Pending"`; :56-58 catch is `console.error(err)` only; :129 renders
«Данные приема готовы к отправке»; :73 POST to `/api/egisz/send`; :78 `await res.json()`; :83
`if (!res.ok)`; :85 `setErrorDetails(data.error || "Неизвестная ошибка")` — `data.error` is truthy
("Not Found"), so the Russian fallback never fires; :126 prints it; :137 `disabled={isLoading || status
=== "Accepted"}` and :141 `bg-sky-600` — the blue button is enabled on Pending; :144 «Отправить в ЕГИСЗ».
Chain confirmed end to end.

`apps/web/src/components/integrations/EgiszBlankPermissionsWidget.tsx`: :18 fetch; :20
`.then((res) => res.json())` with **no `res.ok` check at all**; :22 `setPermissions(Array.isArray(data) ?
data : [])` — the 404 body is a JSON object, not an array, so `[]`; :23 `setLoading(false)`; :50
`permissions.length === 0`; :52 «Правила выгрузки бланков ЕГИСЗ не настроены». Confirmed.

### 1.4 Mounting — confirmed
`SettingsView.tsx:40` import, `:1622` `<EgiszBlankPermissionsWidget />`. The removed-panels comment ending
«Не возвращать, пока не появится код, который в эти таблицы пишет» sits directly above. Confirmed.
`apps/web/src/components/visit/VisitOdontogramTab.tsx`: :4 import, :74
`{workspaceFlags.hasEngineeringStatus && (`, :76-79 render, :77 `visitId={activeAppointment.id}`, :70-73
the same key to `VisitDiaryEditor`. Confirmed.
`useWorkspaceProfile.ts:93` `hasEngineeringStatus: false`; :100-103 zustand `persist` → localStorage;
`WorkspaceFeaturesSelector.tsx:225` «Инженерный статус (Отладка)». Confirmed.
I widened the flag search past the dossier's scope: `rg -n "hasEngineeringStatus" apps/api/src
packages/shared/src` → **EXIT=1**. Absent from the server AND from the shared contract. Its claim survives
the stronger test.

### 1.5 The four real routes — confirmed, and the brief's belief really is half-wrong
egisz.ts:79 `/api/clinical/egisz/integration-status`; :123 `/api/clinical/egisz/validate-doctor-snils`;
:163 `/api/egisz/multiple-diagnoses` — and :177-180 is a genuine
`db.select().from(schema.egiszMultipleDiagnoses).where(eq(...organizationId, orgId))`; :192
`/api/egisz/visits/:visitId/cda` with org isolation at :216-221 and «Приём не найден.» at :227.
The dossier's DEMOLISHED #1 is correct.

### 1.6 Zero UI consumers — re-derived with a PARSER, closing the dossier's admitted AST blind spot
`ast-grep 0.45.0`, pattern `fetch($$$A)`:
- `apps/web/src` .tsx → **218** fetch call nodes; `apps/web/src` .ts → **62**.
- Mentioning `egisz`: exactly **3**, exactly the three the dossier names.
- Mentioning `integration-status` / `/cda` / `validate-doctor-snils` / `multiple-diagnoses`: **0**.

A full text sweep `rg -in "egisz" apps/web/src` finds no URL assembled from variables. The empty
intersection is real under a parser, not just a regex.

### 1.7 Database — everything except the org count
egisz_logs: exists, 7 columns, **no `organization_id`** (`column "organization_id" does not exist`),
0 rows, created by `0000_freezing_randall_flagg.sql:521-529`, enum `Pending, Sent, Error, Accepted`
matching EgiszMonitor.tsx:23-25 letter for letter. `rg -n "egisz_logs|egiszLogs"
apps/api/src/db/schema.ts` → EXIT=1. Confirmed.
egisz_blank_permissions: 12 columns = union of both sets, `patient_opt_out_respect` real; 0103 creates the
widget's set; `0118_align_tables_with_schema.sql:112-118` adds the second set and drops NOT NULL on
`form_code`/`field_name`; `schema.ts:1905-1913` declares only `doctor_id/blank_code/blank_title/is_allowed/
created_at`. The dossier's self-correction (DEMOLISHED #3) is right: Drizzle drifted, not the widget.
egisz_multiple_diagnoses: exactly 3 refs (`schema.ts:1240`, `egisz.ts:179`, `:180`) — reader, no writer;
migration 0064 gives it `patient_name text` and no `patient_id`/`visit_id`. Confirmed.
patient_consents: **exactly 2 refs in the whole monorepo** — `schema.ts:370` and
`scripts/migrateStateToDb.ts:46 await db.delete(schema.patientConsents)`. 0 rows. Confirmed exactly.
`communication_consent_scope` → exactly `service`, `marketing`; `schema.ts:2281`; the comment at
2276-2280 ties it to ФЗ «О рекламе» ст. 18 ч. 1. consentLoader reads only
`patientCommunicationConsents`. Confirmed.
Clock: `visits.signed_at` declared `schema.ts:413`, written `visitsQuery.ts:99 signedAt: new Date()`.
Deadline columns across the whole schema: exactly 3 (`clinical_tasks.due_at`,
`communication_tasks.due_at`, `scheduler_reservations.recall_due_at`) — none about reporting.
Calendar tables: only `yandex_calendar_syncs`. I re-checked `packages/shared/src` for a production
calendar: the single hit is «Производственная форма для лаборатории» (a lab order form), unrelated.
`publicBooking.ts:112-114` — `isWorking: workingDays ? workingDays.includes(weekday) : weekday !== 0`,
i.e. Mon-Sat default, a clinic schedule and not the RF production calendar. Confirmed.
Env: `rg -l "EGISZ_" --hidden -g ".env*" .` → EXIT=1; a names-only search of `.env.example`/`.env`/
`.env.local` for `EGISZ|FRMO|FRMR|REMD|N3` → EXIT=1. No secret values read. Confirmed.
`apps/api/add-egisz-schema.cjs:44` — `fs.appendFileSync("src/db/schema.ts", schemaAddition)`. §8a
violation confirmed. It is worse than reported: the appended block also declares `visitDiaries` and
`visitTemplates`, not just the EGISZ tables.
visits: 10 rows, all in fixture `d0000000…d001`, `signed=0`, `synced=0`. My independent check:
`select count(*) from visits where organization_id::text not like 'd0000000%'` → **0**.
`select count(*) from visits where signed_at is not null` → **0**. tooth_states 25, all in real
`4a3420d1…`. generated_documents 4, all real. All EGISZ/consent tables 0 rows. Confirmed.

### 1.8 No invented law — clean
`findings.md` marks every legal statement `[LAW?]`, records that `fd -I -i "egisz"` finds no приказ, no
методические рекомендации, no XSD, and explicitly refuses to supply a deadline number. Its reasoning —
a fabricated deadline is more dangerous than none, because a reminder gets built on it — is correct and
is the single best judgement call in the dossier. **No fabricated legal rule found.**

---

## 2. WHAT DID NOT REPRODUCE

### 2.1 «organizations — 4 строки» → I MEASURE **2**. Fixture contamination, again.

I ran the dossier's own `db-probe.cjs` verbatim:
```
### orgs (2 rows)
[{"id":"d0000000-0000-4000-8000-00000000d001","name":"Демо-клиника для снимков","clinic_mode":"small_clinic"},
 {"id":"4a3420d1-6ffb-4459-bd8f-7f7087f5e191","name":"Стоматология, 1 кабинет","clinic_mode":"one_chair"}]
```
Independent SQL: `select count(*) from organizations` → **2**;
`select count(*) from organizations where id::text like 'dce70000%'` → **0**.

The two it named — `dce70000…901` «Клиника личного кабинета» and `dce70000…902` «Клиника диктовки Б» —
do not exist, and they were never clinics. `apps/api/src/tests/support/fixtureOrganizations.ts`:
- `:55` — `const FIXTURE_UUID_PREFIX = "dce70000";`
- `:79-80` — `LEGACY_SHARED_FIXTURE_ORGANIZATION_IDS = ["dce70000-0000-4000-8000-000000000901",
  "dce70000-0000-4000-8000-000000000902"]`
- `:67-69` — «в моей базе на момент разбора лежала «Клиника диктовки Б»
  `dce70000-0000-4000-8000-000000000902` от оборванного прогона теста диктовки»

So the dossier listed two of the repo's own declared test-fixture organizations — one of which the repo
documents as debris from an aborted dictation test — as clinics, while labelling only `d0000000…` as a
fixture. This is the exact error class the brief says already destroyed a dossier this campaign, and the
dossier made it in the very finding meant to answer the "split by organization_id" demand. It then
re-asserted the bad count while "correcting" someone else: DEMOLISHED #4 says «Организаций сейчас правда
4» — the count was wrong too, not just `clinic_mode`.

Mitigating, and it matters: the substantive conclusion is untouched, because the dossier itself wrote
«Итог ноль… расщеплять нечего» — every EGISZ and consent table is 0 rows in every organization, and I
confirmed that independently. The number is wrong; the inference built on it is not.

### 2.2 «patients — 3 реальных, 14 фикстурных, 1 фикстурный» → 2 groups, not 3
`4a3420d1…` = 3, `d0000000…` = 14. The trailing "+1" lived in one of the vanished fixture orgs.

### 2.3 «совпадения ТОЛЬКО в … webCallsExistingRoutes.test.ts:86,87» → 3 matches, not 2
Also `:130`, a comment («…`/api/egisz/logs/:id` от несуществующего `/api/egisz/logs`»). Same file, so
"no route exists" holds. Precision slip only.

---

## 3. OVERREACH

### 3.1 «смонтирован БЕЗУСЛОВНО, без всякого признака модульности» — the second half is FALSE
A real, contract-level, server-persisted EGISZ module flag exists and defaults to OFF:
- `packages/shared/src/index.ts:1442` — `egiszEnabled: z.boolean()` (and `:4496` optional variant)
- `apps/api/src/db/settingsQuery.ts:111` — `egiszEnabled: false` (server default)
- `apps/web/src/components/settings/SettingsClinicTab.tsx:471-479` — a real checkbox
  «ЕГИСЗ-адаптер включен», note «Нужен только при подключении к федеральной системе ЕГИСЗ»
- `apps/web/src/components/workspace/onboarding/steps/Step3Modules.tsx:36` — onboarding module
  `{ k: "egisz", label: "Интеграция с ЕГИСЗ" }`

The modularity signal exists, is user-facing, and is off by default. The widget simply never consults it.
That is a sharper defect than the one filed — and it breaks the recommended packet (§5a).

### 3.2 «Согласие на передачу наружу выразимо ИСКЛЮЧИТЕЛЬНО прозой, машиночитаемо не хранится» — overstated
Two machine-readable booleans sit between the two textareas the dossier cites, in the same form:
`PersonalDataProcessingConsentForm.tsx:93-108` — `personalDataCrossBorderAllowed` («Разрешена
трансграничная передача») and `personalDataAutomatedDecisionAllowed` («Разрешены автоматизированные
решения»). Neither covers ЕГИСЗ, a domestic state system, so the ЕГИСЗ conclusion survives intact — but
"exclusively prose" is false as written, and the honest sentence is narrower: *transfer to a state system*
has no machine-readable field.

### 3.3 The «second panel» is presented as an undocumented discovery — it is line 64 of the debt list
`/api/integrations/egisz-blank-permissions` is `webCallsExistingRoutes.test.ts:64`, in the same
`KNOWN_MISSING` array the dossier cites at :86-87 for the other two. That file's header (:3-11) already
diagnoses this exact §3 pattern in general: «отсутствующий маршрут молча превращается в пустой список…
он видит пустоту и делает вывод, что данных нет». The *rendering* defect is real, unfixed and correctly
prioritised — but the missing route is **declared debt with a written reason**, and the dossier's own
acceptance criterion #6 lists only the two `/api/egisz/*` lines, not this one. Novelty overstated.

### 3.4 Minor label overreach on the CDA route
«изоляция по организации в WHERE (:216-221)» is true for the visit, but the `appointments` lookup at
egisz.ts:244-248 filters on `appointments.id` only, with no organization predicate. Not exploitable — it
is reached only through an already org-scoped visit — but the blanket phrasing is looser than the code.

### 3.5 Systematic line-number drift, all immaterial, all one direction
`useAppLogic.tsx:2476-2484` → actual 2475-2483; `:2470-2474` → 2469-2473;
`PersonalDataProcessingConsentForm.tsx:107` («Срок хранения») → actual 110/112.
And the path is never spelled out: the file is `apps/web/src/components/visit/VisitOdontogramTab.tsx`.
`apps/web/src/components/VisitOdontogramTab.tsx` does not exist — I hit `sed: can't read` first try.

---

## 4. WHAT IT MISSED

### 4.1 The widget is not behind "a tab" — it renders under EVERY settings tab, and the repo says so
The tabpanel `<div>` opens at `SettingsView.tsx:1394` (`role="tabpanel"` at :1397), the widget is at :1622,
and that div closes at :1625. There is **no `settingsTab === …` guard** on it, unlike `:1564` (`imports`),
`:1577` (`imports`) and `:1590` (`audit`). And 27 lines above the render, `SettingsView.tsx:1595` states it
outright:

> «Этот блок висит под КАЖДОЙ вкладкой настроек, поэтому цена пустой карточки здесь максимальная: её
> видит владелец на любом экране и перестаёт верить живым числам рядом.»

The dossier filed «КАКАЯ ИМЕННО вкладка» as NOT ESTABLISHED and hedged to «любая клиника, открывшая
вкладку». The answer was inside the comment block it was already quoting, and it makes the dossier's own
severity claim **stronger**. Under-reading its own citation cost it its best sentence.

### 4.2 The identical twin defect, one line below, in the same grid
`YandexCalendarSyncsWidget` (`SettingsView.tsx:1623`) is the same anti-pattern byte for byte: no `res.ok`,
`Array.isArray(data) ? data : []`, 404 → «Подключённые Яндекс Календари отсутствуют». Its route
`/api/integrations/yandex-calendar-syncs` is `KNOWN_MISSING:65`; `yandex_calendar_syncs` → 0 rows; the only
`apps/api/src` references are the schema declaration and that debt line. The dossier asserts «Два виджета
строкой ниже в том же состоянии и остались» and then scopes the twin out. Правка 1 is ~8 lines; both is
~16 and leaves no half-fixed pair for the reviewer.

### 4.3 `activeAppointment` has a fallback — the key is not just wrong-table, it is arbitrary
`useAppLogic.tsx:2475-2483` ends `?? dashboard.appointments?.[0] ?? null`. With no active visit,
`activeAppointment` becomes *the first appointment in the list*, and both `EgiszMonitor` and
`VisitDiaryEditor` receive that unrelated row's id as `visitId`. The dossier caught the wrong-table half
and missed the wrong-row half.

### 4.4 `egisz_logs` has TWO foreign keys
`egisz_logs_visit_id_visits_id_fk` **and** `egisz_logs_patient_id_patients_id_fk` (patient_id →
patients.id). EgiszMonitor passes `patientId={activePatient.id}`, which *is* `patients.id`. So the precise
statement is: of the two FKs, exactly one would fail on insert. Same conclusion, tighter.

### 4.5 EgiszMonitor is currently unreachable in the only real clinic — measurable, and unmeasured
`select organization_id, count(*) from appointments group by 1` → **27 rows, all in fixture
`d0000000…d001`; real org `4a3420d1…` has 0.** `VisitOdontogramTab.tsx:68` gates the whole block on
`activeAppointment?.id`. So in the real organization, EgiszMonitor cannot render at all today, debug
toggle on or off. The dossier called reachability «низкая» and declared the localStorage flag unmeasurable
from the DB — true — but never measured the *appointment* precondition, which is fully measurable and
settles the priority argument outright.

### 4.6 The question it should have asked
Given that `egiszEnabled` exists in the shared contract, is persisted, defaults to `false`, and has a
user-facing switch labelled «ЕГИСЗ-адаптер включен» — **why is any ЕГИСЗ surface rendered at all when the
clinic's own EGISZ adapter flag is off?** That reframes the packet from "reword the failure into three
states" to "stop showing a federal-reporting promise to clinics that never enabled it". The second is
cheaper, deletes the panel for approximately every clinic rather than rewording it, cannot be mistaken for
a legal claim, and reuses a flag that already exists instead of inventing UI state.

---

## 5. JUDGEMENT OF THE RECOMMENDED PACKET

**It is genuinely one bounded packet.** Two files, client-only, `apps/api` untouched, three edits, no
migration, no schema change, no new route. It really does need no legal certainty. Ordering is sound
(правка 1 stands alone first). It hands `typecheck` and `check:encoding` to the lead, respecting §7a
one-writer-per-gate. Its three arguments for *not* doing adjacent work — no fabricated working-day clock
(no RF calendar exists, deadline unconfirmed), no third value in `communication_consent_scope` (would
conflate advertising consent with a legal basis for state transmission, §10), no drive-by revival of
`patient_consents` — are each backed by a measurement I reproduced. That is the strongest part of the
dossier.

**What would fail review:**

**(a) It never mentions `egiszEnabled`, and that is a regression waiting to ship.** An implementer
following правка 1 literally adds a NEW alarming «подсистема ЕГИСЗ недоступна» message under *every*
settings tab (§4.1) for *every* clinic — including the default-off majority who never asked for ЕГИСЗ
(`settingsQuery.ts:111`). Replacing «правила не настроены» with a subsystem-failure banner for a module
the clinic switched off is a louder lie, not a smaller one. The packet must either gate on
`clinicProfile.egiszEnabled` or state explicitly why it does not.

**(b) It leaves the identical twin in the same grid container** (§4.2). Half-fixing a visually paired
row is a predictable acceptance objection.

**(c) Two of three edits are misallocated.** Правки 2-3 target a component that is behind a localStorage
debug flag *and* cannot render in the only real organization (§4.5). The dossier concedes the priority
in prose and then spends two thirds of the packet against it anyway.

**(d) Its own verification plan concedes правки 2-3 cannot be exercised without seeding** («живых приёмов
в базе НОЛЬ… проверять придётся под фикстурой или создав приём»). That makes the packet unprovable
end-to-end without a DB write, colliding with the one-writer-per-gate rule it correctly cites elsewhere.
Правка 1, by contrast, is provable today with zero preparation — which is the argument for shipping правка
1 (plus the twin, plus the flag) alone.

---

## 6. VERDICT

**TRUSTWORTHY_WITH_CORRECTIONS.**

The central claim — four working EGISZ routes with zero UI callers, three UI calls to addresses that
return 404, and two mounted panels that render that 404 as «данные готовы к отправке» and «правила не
настроены» — is **fully reproduced**, and independently re-derived with a parser and against the live API.
The refusal to invent a legal deadline is exactly right.

It is not TRUSTWORTHY because I could not reproduce a published number: «4 организации» is 2, and the two
extra were the repo's own declared test fixtures (`FIXTURE_UUID_PREFIX = "dce70000"`) — the same
fixture-contamination failure that already destroyed a dossier this campaign, committed in the finding
that was supposed to be the fixture-aware one, and then re-asserted while correcting somebody else. Add
one false absence claim (`egiszEnabled` exists) that materially breaks the recommended packet, and one
overstatement ("exclusively prose") that survives only because ЕГИСЗ happens to be domestic.
