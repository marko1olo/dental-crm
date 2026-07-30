# W4-human-error-text — ADVERSARIAL REVIEW

REVIEWER: adversarial, did not write this code. Posture: disbelief; every claim re-executed.
COMMIT ATTACKED: cf40daaccb80920771a31ee51bb61c5a1aa20f9b
FULL CLAIM RANGE: f717aaa5a..cf40daacc (3 commits), parent 54db1c590
REPO HEAD AT REVIEW: 64d176936 — a LATER commit by another agent (documents packet) landed after W4.
VERDICT: **NEEDS_REWORK** (core fix real and reproducible; two live user-facing defects inside the
packet's own scope, one proof that is a shell artefact, one undisclosed steady-state consequence).

---

## 1. WHAT I REPRODUCED AND CONFIRMED

### Defect was real at the parent — CONFIRMED
`git grep -nE '<bare-status regex>' 54db1c590 -- apps/web/src ':!*.test.*'` → **exactly 15 lines**,
including `hooks/usePatientResource.ts:84` and `ScannerView.tsx:70`. At HEAD the same regex → **14**,
of which one is the new doc comment in `lib/panelStateText.ts:100` quoting the old defect. So 15 → 13
live, and the two closed are precisely the two claimed. **Measurement exact.**

At `54db1c590`, none of `PatientReclamationsWidget` / `PatientTaskTicketsWidget` /
`PatientArchiveAndBlacklistWidget` destructured `error` from the hook. The three widgets that did
(`crm/PatientArchiveReasonsAndBlacklistsWidget:98`, `patients/PatientCommunicationTimelineWidget:122`,
`crm/PatientCommunicationTimelinesWidget:134`) render `Статус не загружен: {error} …` inline, so they
inherit the new lowercase cause and the composed sentence reads correctly — I read all three JSX sites
and the whitespace is preserved on one line. The packet's notProven #5 is closable by reading: no
regression there, it is an improvement (the old string injected a capital-С mid-sentence).

### UNIT VERIFIED — CONFIRMED, re-executed
`node --import tsx --test apps/web/src/lib/panelStateText.test.ts` → `tests 16 / pass 16 / fail 0`,
**EXIT=0**. The test is substantive, not tautological: it pins
`resolvePanelPhase({isLoading:false,hasFailure:true,isEmpty:true}) === "failed"`, walks all 8 flag
combinations, and asserts every `requestFailureCause` output digit-free and Latin-free over 15
statuses + null. I independently composed all 14 failure titles through the module (dumped to
`%TEMP%\w4probe.json`): no bare code, no Latin, in any branch.

### SMOKE VERIFIED — CONFIRMED
`npm run smoke:web-text-encoding` → `{"ok":true,"checkedFiles":430,"mojibakeHits":0,
"garbledQuestionHits":0,"requiredSnippets":13}`, **EXIT=0**. 430 vs the claimed 429 is explained: the
script walks the working tree, and another agent added a file after W4. Not a W4 discrepancy.

### WEB TEST SUITE — CONFIRMED GREEN (packet did not claim this; I ran it)
`npm run test -w @dental/web` → `tests 608 / pass 608 / fail 0`, EXIT=0. The new test file coexists.
`node --import tsx --test apps/api/src/tests/webCallsExistingRoutes.test.ts` → 3/3 pass, EXIT=0: W4
introduced no new call to a non-existent route.

### API VERIFIED — CONFIRMED against the live server
`/api/health` → 200. `GET /api/patients/<uuid>/archive-status` → **401** `{"error":"AuthRequired"}`;
`.../reclamations` → **404**; `.../tickets` → **404**. Exactly as claimed. Independent of dist
staleness: `rg` over `apps/api/dist` finds neither route either, and `apps/api/src` registers neither.

### REACHABILITY — CONFIRMED, line numbers exact
At `cf40daacc`, `components/patients/PatientOverviewTab.tsx:153/157/165` mount the three widgets —
the packet's numbers are byte-exact. `PatientsView.tsx:465` renders `PatientOverviewTab`.
`workspaceShell.tsx:52` `appViews` contains `"scanner"`; `App.tsx:4789` renders it inside
`WorkspaceRouteErrorBoundary`. `SmartParsePreview` is mounted from exactly the 6 claimed call sites.

### DECOMPOSITION IS USED, NOT ORPHANED — CONFIRMED
`PanelLoadFailure` is imported and rendered by all three widgets
(`PatientReclamationsWidget:225`, `PatientTaskTicketsWidget:296`, `PatientArchiveAndBlacklistWidget:199`).
`resolvePanelPhase`, `panelStateText`, `actionFailureToast`, `unconfirmedActionToast`,
`requestFailureCause`, `panelFailureCause` all have real production consumers.

### TYPECHECK — the gate is RED at HEAD, but NOT because of W4
`npm run typecheck -w @dental/web` and then `npx tsc -b --force --noEmit` (full rebuild, no incremental
cache) both produce **exactly 3 errors, all in `src/App.tsx` (4775/4789/4797)**: `"inventory"` /
`"scanner"` / `"leads"` not assignable to `LazyWorkspaceView`
(`apps/web/src/workspaceRouteErrorBoundary.tsx:3`). Introduced by `41a22b63d` (11:49), which
`git merge-base --is-ancestor 41a22b63d 54db1c590` proves predates W4's parent. **Zero errors in any
of W4's 9 files** — `include: ["src"]` covers the new `.test.ts`, so the additive `failureStatus` field
(6 consumers) and the nested fragment at `PatientArchiveAndBlacklistWidget.tsx:194-232` are both
type-clean. W4's two declared type risks are DISPROVED; the gate is someone else's debt.

### GIT HYGIENE — CLEAN
Three commits, one author, exactly the 9 claimed source files and nothing else. No other agent's dirty
file (`DocumentsView.tsx`, `components/documents/**`, `.agents/AGENTS.md`, `packages/shared/dist`,
`tsbuildinfo`) appears in any commit. Conventional Commits satisfied (§12). No mojibake in any subject
or body. The self-reported Latin-`d` typo («Правится дossier») is real and is the ONLY Latin-inside-
Cyrillic token in all three bodies — the packet found its own defect before I did.
The packet dir files (`state.md`, `handoff.md`, `commitmsg*.txt`) are UNTRACKED — listed in FILES
CHANGED but never committed. Notes, not claim; harmless, but the file list overstates git content.

### §4 JUSTIFICATION IS TRUE
`components/EmptyState.tsx:33,39` really is `padding: '36px 24px'` + `boxShadow: var(--shadow-1)` +
`glass-panel`. Declining to reuse it for a failure line is a correct §4 call, not an excuse.

---

## 2. FINDINGS

### F1 — HIGH. `type="prices"` can never be parsed; the new 400 text sends the user in a circle
`apps/api/src/routes/ai.ts:193` — `type: z.enum(["schedule", "patient", "visit"])`. `"prices"` is not
in the enum. `SmartParsePreviewProps.type` is `"schedule" | "patient" | "visit" | "prices"` and
`PriceDictationBar.tsx:86` passes `type="prices"`; `handleAiParse` posts `{ text, type }`.
Proven live:
```
POST /api/ai/parse-dictation {"text":"test","type":"prices"} -> HTTP=400
{"error":"ParseDictationValidationError","message":"Оеверный формат для AI-разбора."}
```
W4's new 400 branch (`SmartParsePreview.tsx:57`) therefore renders, every single time the operator
presses «ИИ-Анализ» in Настройки → Прайс-лист (`SettingsPricesTab.tsx:429`):
> «Разобрать надиктованное не удалось: сервер не принял запрос — обновите страницу и повторите. Пока
> можно ввести данные вручную.»

Reloading the page cannot ever help — it is a permanent contract mismatch, not a transient refusal.
§3: the "what to do next" is a dead end, which is the exact disease the packet was chartered to kill.
§10: the UI asserts a transient cause the server does not have. The packet probed the three patient
endpoints against the live server but never probed the endpoint behind the file it rewrote.

### F2 — HIGH. Reclamations: a failed READ now removes the ability to WRITE
`PatientReclamationsWidget.tsx:219` early-returns a bare card containing only `PanelLoadFailure`. That
return drops the panel header and both `setIsAdding(true)` triggers (`:267` empty branch, `:300` ready
branch). Once `phase === "failed"`, `isAdding` can never become true, so the "record a complication"
form is unreachable. Since the GET is a permanent 404, it is unreachable permanently; on a transient
500/offline the operator loses the ability to record a complaint because a *read* failed — two
independent operations. The sibling `PatientTaskTicketsWidget` renders its failure block *inside* the
card (`:295`), keeping header + «Создать» + the stale list. The asymmetry proves oversight, not design.
Not reported in the handoff.

### F3 — MEDIUM. `PanelText.retryable` has zero production readers; «Повторить» contradicts its own text
`retryable` is set in `panelStateText` and asserted by the test, but nothing reads it: `PanelLoadFailure`
renders «Повторить» purely from `onRetry !== undefined`. Verified by `rg '\bretryable\b' apps/web/src`
— only the module and the test. Consequences:
- the test "повторить предлагается только при отказе" proves a property of a field the product ignores;
- `retryable` is `true` for **every** status, including 404 («сервер не знает такого раздела … сообщите
  администратору») and 401 («войдите в смену заново …»). The button offers an action the sentence next
  to it says will not work. §3: mixed signal in the fix itself.

### F4 — MEDIUM. Two stated proofs are artefacts, not evidence
Claimed: "`rg -n 'reclamations' apps/api/src` -> 0 matches, `rg -n '/tickets' apps/api/src` -> 0
matches". Re-run:
- `rg -n 'reclamations' apps/api/src` → **1 match**, `apps/api/src/tests/webCallsExistingRoutes.test.ts:87`.
  The claim is simply false.
- `rg -n '/tickets' apps/api/src` → 0 matches **only because Git-Bash rewrites a leading-slash argument
  into a Windows path**. Proven: `node -e "console.log(process.argv.slice(1))" '/tickets'` prints
  `[ 'C:/Program Files/Git/tickets' ]`. With `MSYS2_ARG_CONV_EXCL='*' rg -nF '/tickets' apps/api/src`
  the match at line 88 appears.

Material consequence: because the greps "found nothing", the builder never opened
`webCallsExistingRoutes.test.ts`, and so presented as a fresh discovery ("BIGGER FINDING, NOT MINE TO
FIX") a debt the repo had **already registered by name**, with a ratchet test and the comment
«Рекламации и задачи по пациенту — таблицы есть, маршрутов нет» (lines 86-88, `KNOWN_MISSING`).
The *conclusion* survives — the routes genuinely do not exist (live 404, zero registrations in
`apps/api/src`, zero in `apps/api/dist`) — but two of the three cited proofs do not.
(In the packet's favour: I checked the repo's own comment and it is the wrong one — there is no
`reclamations` or `patient_tickets` table in `schema.ts` (123 `pgTable`s) or in `apps/api/drizzle`.
"Needs tables plus a migration" is therefore accurate, not invented.)

### F5 — MEDIUM. The steady state of the fix is two permanent alarms per patient, and the flag that
### would solve it sits at the packet's own mount site
Both routes 404 forever, so on **every** patient card in **every** clinic with default settings the
overview tab now shows two permanent amber `role="alert"` blocks with a «Повторить» that provably can
never succeed, telling the operator the clinic's software is incompletely updated. That is honest
(§1/§10) and better than lying, but it is a §4 cost the handoff never states as a consequence or a
decision for the lead.
The mechanism already exists: `organizations.has_reclamations` / `has_tasks`
(`apps/api/drizzle/0012_add_feature_flags.sql`), surfaced as `workspaceFlags.hasReclamations` /
`hasTasks`, and both widgets are already gated on them at `PatientOverviewTab.tsx:152` and `:156` —
the two lines immediately above the widgets W4 edited. §5 ("via flags not hardcode") makes flipping the
default, or gating on route availability, the obvious closing move. The packet did not mention the flags
at all.

### F6 — LOW/MEDIUM. `SmartParsePreview` still shows *failed* and *empty* simultaneously
`aiError` renders at `:343`, **above** `renderContent()` at `:348`, and `internalData` is not cleared on
failure (`:36-42` sets it from `parsedData` only when `isVisible` flips). With empty `parsedData` the
operator sees, at the same moment:
> «… Пока можно ввести данные вручную.» **and** «Название услуги не распознано. Скажите название и цену
> одной фразой — например: «Лечение кариеса, 4500».»

Two contradictory next steps. This is the loading ≠ empty ≠ failed conflation the packet's own brief
names as itself the defect, fixed in the three patient widgets and left standing in the same commit.

### F7 — LOW. Missed in the file the packet enumerated
- `SmartParsePreview.tsx:98` «Не удалось распознать детали. Попробуйте еще раз или используйте ИИ.» —
  same class as the 5 it fixed, absent from inventory section C and from the debt list.
- User-visible English badges «Action» at `:105`, `:111`, `:179`. The brief explicitly ordered hunting
  "English literals reaching the user".

### F8 — LOW. One measurement is not reproducible
"37 `showToast("Ошибка…")` sites across 14 files": re-derived with
`git grep -ohE 'showToast\(\s*"Ошибка' 54db1c590 -- apps/web/src | wc -l` → **38 sites / 15 files** at
the parent, **30 / 13** at HEAD. The delta (−8) is exact; the base is off by one site and one file.

### F9 — LOW. "5 rewritten" includes one dead branch
`SmartParsePreview.tsx` `default:` (old `:272`) is unreachable: `type` is a closed 4-member union and
all 6 call sites pass a literal. The packet refuses to fix dead code on principle elsewhere
(`LeadsKanbanView`, `useOfflineQueue`, handoff Долг 1 & 5). Reachable count is 4, not 5.

### F10 — LOW (latent). `panelStateText` hardcodes plural agreement
`` title: `${subject.title} не загружены: …` `` — fine for today's three compound subjects, wrong for
any singular one («Статус не загружены»). A trap for the next author.

### F11 — LOW. Two vocabularies left inside the function W4 fixed
`ScannerView.tsx:114` (network-drop branch of the same loader) still reads «Журнал стерилизации не
загружен: нет связи с сервером. Список ниже неполный.» — no next step — while the adjacent HTTP branch
now always names an action via `requestFailureCause`. §3 gap left in the file claimed closed.

### F12 — INFO. One asserted input is unreachable in the product
The test pins `resolvePanelPhase({isLoading:false,hasFailure:true,isEmpty:false}) === "failed"`, but
`usePatientResource` calls `setData(emptyRef.current)` before every fetch, so a failing reload always
empties first. "All 8 combinations" is true of the function, not of the product.

### F13 — INFO, outside W4 but adjacent and undisclosed
The API's own Russian is corrupted where W4's new text now translates it:
`apps/api/src/routes/ai.ts:204` «**О**еверный формат для AI-разбора.» (Н→О) and `:242` «**Н**шибка
парсинга диктовки». `smoke:web-text-encoding` walks only `apps/web/src`, so §11's mojibake gate covers
nothing in `apps/api`.

---

## 3. HYPOTHESES I TESTED AND DISPROVED (recorded so they are not re-litigated)

- **"`PanelLoadFailure` is an orphaned extraction."** DISPROVED — imported and rendered by all three widgets.
- **"The hook has 7 consumers, so '0 of 6' is false."** DISPROVED, and it was *my* regex artefact:
  `PatientNoShowRisk.tsx` matches `usePatientResource` only in a comment at `:26` explaining the hook
  does NOT fit (it POSTs). Real count is 6. The packet's `state.md` §A "7 live widgets" is the wrong
  number; the MEASUREMENTS "3 of 6 → 0 of 6" is right.
- **"`confirmModalOpen` can be open while `statusUnknown`, letting the operator blacklist on an unread
  status."** DISPROVED — `PatientArchiveAndBlacklistWidget.tsx:73-76` resets `confirmModalOpen` on
  `patientId` change, and no other path turns a succeeded read into a failed one while the panel is open.
- **"W4 broke the typecheck."** DISPROVED — 3 errors, all `App.tsx`, from `41a22b63d`, which predates
  W4's parent. `tsc -b --force --noEmit` reports nothing in W4's 9 files.
- **"W4 swept another author's work into the index."** DISPROVED — 9 files, exactly as claimed.
- **"The 15→13 bare-status measurement is inflated."** DISPROVED — exact.
- **"'Needs tables plus a migration' is invented."** DISPROVED — no such table in `schema.ts` or
  `apps/api/drizzle`; the repo's own `KNOWN_MISSING` comment «таблицы есть» is the inaccurate one.
- **Fabricated-screenshot class:** nothing to fabricate. The packet claimed no PNG, explicitly refused
  UI VERIFIED, labelled the esbuild check "PARSE VERIFIED … proves nothing about types", and disclosed
  its own commit-body typo. On the honesty axis this packet is materially above the campaign baseline.

---

## 4. REQUIRED REWORK (numbered, actionable)

1. Fix the `prices` dictation contract before the text: either add `"prices"` to
   `apps/api/src/routes/ai.ts:193`'s `z.enum` (backend, lead's gate) or stop `PriceDictationBar` from
   offering «ИИ-Анализ». Until one of those, `SmartParsePreview`'s 400 branch must not say «обновите
   страницу и повторите» — that instruction is provably unreachable. Re-prove with the live POST.
2. Remove the `phase === "failed"` early return in `PatientReclamationsWidget.tsx:219`. Render
   `PanelLoadFailure` inside the card exactly as `PatientTaskTicketsWidget.tsx:295` does, so the header
   and «Добавить» survive a failed read.
3. Make «Повторить» conditional on the failure actually being retryable. Either have `PanelLoadFailure`
   honour `text.retryable`, or drive `retryable` from the status (false for 401/403/404) and gate the
   button on it. Then the unit test proves something the product uses.
4. Correct the two grep claims in `handoff.md`/`state.md` (`rg -n 'reclamations' apps/api/src` → 1 match;
   `/tickets` → 0 only because of MSYS argument conversion), and credit
   `apps/api/src/tests/webCallsExistingRoutes.test.ts:86-88` `KNOWN_MISSING` as the pre-existing record
   of this debt.
5. Surface the flag decision to the lead: with both routes permanently 404, state explicitly that every
   patient card now carries two permanent alerts, and put `organizations.has_reclamations` /
   `has_tasks` (`0012_add_feature_flags.sql`, gated at `PatientOverviewTab.tsx:152/156`) on the table as
   the §5-compliant alternative to shipping a permanent alarm.
6. Separate failed from empty in `SmartParsePreview`: when `aiError` is set, do not also render the
   empty-state prompt. One state, one next step.
7. Close or record the remainder in the file already claimed clean: `SmartParsePreview.tsx:98` and the
   three English «Action» badges at `:105/:111/:179`; `ScannerView.tsx:114`'s actionless network text.
8. Restate the two soft numbers: 38 sites / 15 files (not 37/14) for `showToast("Ошибка`, and 4
   reachable rewrites in `SmartParsePreview` (not 5 — the `default:` branch is dead under the closed
   `type` union).

## 5. REVIEWER-CAUSED CHURN (disclosed)
`apps/web/tsconfig.tsbuildinfo` was already dirty from another writer before I started
(`f37bd9f6b1dd415ad56ceb7c76c6f6b8`); running `tsc -b --force --noEmit` rewrote it
(`d2d9c004d25f930f66f89d9a730924da`). No source file touched, nothing staged, nothing committed. My
only new file is this `review.md`. Separately, `scripts/ops-panels-shots.mjs` stopped being dirty
during my session — another agent is active in this worktree.
