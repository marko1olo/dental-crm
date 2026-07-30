# CC2-egisz-facade-honesty — state

STATUS: RUN 3 STARTED — resumed after TWO predecessor deaths. Re-deriving live state; every note
below is treated as a HYPOTHESIS to re-verify, not as fact.
HEAD at start of run 1: ed297c24f5a3649e04046798ea5144d601a4b507 (STALE, do not reason from it)
HEAD at start of run 2: 7d5328f9fa8b4f00f79c133bf8f512e263dd4401 (STALE)
HEAD at start of run 3: pending re-read
Run 2 status of claimed files: both .tsx CLEAN. Index EMPTY (the foreign staged pair is gone from
the index — someone committed it). Predecessor left ONE untracked artefact:
apps/web/src/components/integrations/egiszAvailability.ts (?? in git status) — mine, will be
re-read and completed, not trusted blindly.

## Confirmed by live probe (token signed from apps/api/src/routes/auth.js TOKEN_SECRET)
- GET  /api/clinical/egisz/integration-status -> HTTP 200
  {"ok":true,"configured":false,"frmoStatus":"NOT_CONFIGURED","frmrStatus":"NOT_CONFIGURED",
   "remdStatus":"NOT_CONFIGURED","capabilities":{"cdaGeneration":true,"ukepSigning":false,
   "remdTransmission":false},"missingConfiguration":["EGISZ_N3_BASE_URL","EGISZ_N3_GUID",
   "EGISZ_N3_LPU_ID","EGISZ_FRMO_ID"],...}
- GET  /api/egisz/logs/<uuid>                 -> HTTP 404 {"message":"Route GET:... not found","error":"Not Found","statusCode":404}
- POST /api/egisz/send                        -> HTTP 404 same shape
- GET  /api/integrations/egisz-blank-permissions -> HTTP 404 same shape
- rg setNotFoundHandler apps/api/src -> exit 1, NONE. data.error === "Not Found" is stable.
- routes/egisz.ts has exactly 4 routes at :79, :123, :163, :192. Confirmed by full read.
- egisz_logs: 0 rows, cols id,patient_id,visit_id,status,transaction_id,error_details,created_at
  (NO organization_id). Confirmed.
- organizations: exactly 2 (4a3420d1 one_chair real, d0000000 small_clinic fixture). Confirmed.
- visits: 10 rows, ALL org d0000000 (fixture), 0 with a diagnosis. Real clinic has 0 visits.

## DOSSIER CORRECTION
Brief says "EgiszMonitor is mounted: SettingsView.tsx:40 import, :1622 render". WRONG — those two
lines mount EgiszBlankPermissionsWidget. EgiszMonitor's ONLY mount is
VisitOdontogramTab.tsx:4 import / :74-79 render behind workspaceFlags.hasEngineeringStatus.

## RUN 3 RE-DERIVED FACTS (measured by me, not inherited)
- HEAD d691c33410eb0316a66c38ff03c97945ea19530b. Both claimed .tsx CLEAN. Index EMPTY.
- Predecessor left TWO untracked files, both mine, both complete and green:
  apps/web/src/components/integrations/egiszAvailability.ts (pure module)
  apps/web/src/tests/egiszAvailability.test.ts (13 tests)
  `node --import tsx --test src/tests/egiszAvailability.test.ts` -> pass 13 fail 0 TRUE_EXIT=0.
- routes/egisz.ts read IN FULL. Exactly 4 routes: :79 GET /api/clinical/egisz/integration-status,
  :123 POST /api/clinical/egisz/validate-doctor-snils, :163 GET /api/egisz/multiple-diagnoses,
  :192 GET /api/egisz/visits/:visitId/cda. NONE of the three the UI calls.
- rg setNotFoundHandler apps/api/src -> exit 1, none. Fastify default 404 body is stable.
- STATIC PROOF the three routes are unserved AT THIS HEAD:
  `node --import tsx --test apps/api/src/tests/webCallsExistingRoutes.test.ts` -> pass 3 exit 0.
  Its 3rd test ("починенные адреса удаляются из списка долга") FAILS if any KNOWN_MISSING entry
  became served. /api/egisz/send (:86), /api/egisz/logs (:87),
  /api/integrations/egisz-blank-permissions (:64) are all still in that list and it passes.

## !! DEV SERVER IS DOWN — CONTRADICTS THE BRIEF !!
curl -m 8 http://127.0.0.1:4100/api/health  -> exit 7, http_code 000
curl -m 8 http://127.0.0.1:4100/            -> exit 7, http_code 000
curl -m 8 http://127.0.0.1:5173/            -> exit 7, http_code 000
The brief states "DEV SERVER ALREADY RUNNING AND SHARED". It is not. I am forbidden to start one.
=> API VERIFIED is UNAVAILABLE to me this run. The live-probe bodies in the section above were
   captured by my predecessor while the server was up; I did NOT re-verify them over HTTP and I
   do not claim them as my own proof.

## DOSSIER CORRECTIONS (2 found)
1. Brief: "EgiszMonitor is mounted: SettingsView.tsx:40 import, :1622 render". WRONG twice.
   Those lines mount EgiszBlankPermissionsWidget, and the render is :1621 not :1622.
   EgiszMonitor's ONLY mount is VisitOdontogramTab.tsx:4 import / :76 render, inside
   `activeAppointment?.id ? ... :` AND behind `workspaceFlags.hasEngineeringStatus` (default false,
   useWorkspaceProfile.ts:93). Verified by `rg -n EgiszMonitor apps/web/src` — 1 import, 1 render.
2. Brief: "Playwright/vitest" etc — not touched. No correction.

## INVENTORY A — every fetch inside my claim (3 sites)
1. EgiszMonitor.tsx:37 GET /api/egisz/logs/${patientId} — 404. `if (res.ok)` NO else. LIES.
2. EgiszMonitor.tsx:73 POST /api/egisz/send — 404. Body read before res.ok; data.error="Not Found"
   is truthy so the Russian fallback at :85 is DEAD CODE. Prints «Ошибка: Not Found». LIES.
3. EgiszBlankPermissionsWidget.tsx:18 GET /api/integrations/egisz-blank-permissions — 404.
   NO res.ok check at all (:20), Array.isArray(object)=false -> [] (:22) -> :52 prints
   «Правила выгрузки бланков ЕГИСЗ не настроены». Sends the admin to do impossible work. WORST.
   SECONDARY DEFECT I found that the brief did not name: this fetch sends NO auth headers
   (`fetch(url, { })` — an empty options object). Even if the route existed it would be refused,
   because every sibling widget passes auth.denteClinicalReadHeaders() (LandingFieldMappingsWidget:20).

## INVENTORY B — every user-visible string in my claim, verdict each
EgiszMonitor.tsx
  :117 «Интеграция с ЕГИСЗ (РЭМД)»            KEEP (true title)
  :122 «Успешно выгружено СЭМД. Транзакция:»  UNREACHABLE TODAY (needs a 200 from a route that
                                             does not exist). Keep, gate behind real journal.
  :126 «Ошибка: {errorDetails}»               REMOVE — interpolates the server `error` field.
  :129 «Данные приема готовы к отправке»      REMOVE — THE CORE LIE. Initial state, printed over 404.
  :144 «Отправить в ЕГИСЗ» / «Повторить выгрузку»  Button ENABLED at :137 whenever status!=Accepted.
  :151 «Сгенерированный CDA XML (Предпросмотр)» KEEP — must not be dropped (see below).
EgiszBlankPermissionsWidget.tsx
  :36  title=... tooltip                      §3: reason must not live in a tooltip.
  :40  «Справочник бланков: попольное управление разрешениями ЕГИСЗ» KEEP (jargon, but titles are
                                             out of scope for a honesty packet; noted as debt)
  :44  «Правила ЕГИСЗ»                        KEEP
  :49  «Загрузка правил ЕГИСЗ...»             KEEP as loading
  :52  «Правила выгрузки бланков ЕГИСЗ не настроены»  REMOVE — collapses missing-route into
                                             not-configured. This is the specific bug.
  :66/:72/:76 row texts                       KEEP (only render on a real 200)

## INVENTORY C — EGISZ facades OUTSIDE my claim (found, NOT fixed, no edit rights)
1. components/settings/SettingsClinicTab.tsx:473-478 — toggle «ЕГИСЗ-адаптер включен» writes
   clinicProfile.egiszEnabled. `rg egiszEnabled apps/api/src packages` shows it is only stored and
   echoed (shared/src/index.ts:1442/:4496, settingsQuery.ts:111, documents.ts:375, sampleData).
   NO route reads it to decide anything; integration-status reads env vars only. Switching it ON
   changes NOTHING — a fourth costume of the same defect.
2. workspace/onboarding/steps/Step3Modules.tsx:36-37 «Интеграция с ЕГИСЗ» module checkbox,
   default false (useOnboardingLogic.ts:73). Offers a module that cannot transmit.
3. VisitView.tsx:1563,1578 and App.tsx:4266 — already HONEST prose (names the missing writer /
   the missing adapter). No defect.

## Log
- [x] STARTED
- [x] AUTHORITY READ (.agents/AGENTS.md, INDEX.md, UI_STANDARDS.md complete)
- [x] DEFECT CONFIRMED — all three 404 sites reproduced statically at HEAD d691c334
- [x] INVENTORY (A, B, C above)
- [ ] EDIT WRITTEN
- [ ] SELF-CHECK PASSED
- [ ] COMMITTED <hash>
- [ ] PROVEN
- [ ] DONE

## About to run
Edit apps/web/src/components/EgiszMonitor.tsx (full rewrite of the fetch+render logic onto
resolveEgiszPanelState, consuming GET /api/clinical/egisz/integration-status), then
EgiszBlankPermissionsWidget.tsx onto resolveEgiszCatalogState + auth headers.
xmlPreview MUST be preserved — dropping it would delete a real display path.
