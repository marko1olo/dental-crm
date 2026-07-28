# AA2-guard-root-cause — state

STATUS: DEFECT CONFIRMED
HEAD at start: f3071534e3514592a50b664fbad2fd4d8dd36482

## Claim status at start
`git status --porcelain -- <claim>` =>
  `?? apps/web/src/tests/patientCardDecomposition.test.ts`  (UNTRACKED, never committed:
  `git log --all -- <it>` is empty). The lead's own dispatch says it read this file in full and
  judges it GOOD, and it is inside my claim, so committing it is my assignment, not a collision.
Everything else in my claim is clean at HEAD.

## Authority read (complete)
.agents/AGENTS.md, .agents/INDEX.md, Y3 packet state.md, the guard + rules + guard test in full,
panelsAreMounted.test.ts in full, patientCardDecomposition.test.ts in full,
pages/PublicBookingWidget.tsx in full, root+web package.json scripts, main.tsx, AppShell.tsx.

## Guard files located (cycle 9, packet Y3)
- scripts/check-component-mount-reachability.mjs      (758 lines)
- scripts/lib/component-mount-rules.yml               (276 lines)
- scripts/tests/check-component-mount-reachability.test.mjs (285 lines)

## Defects CONFIRMED at real lines
1. CENSUS FALSE BY CONSTRUCTION. rules yml:32-34 can express only
   `export function $NAME($$$PARAMS) { $$$BODY }` / `export const $NAME = ($$$PARAMS) => $$$BODY` /
   `export const $NAME = $WRAPPER($$$WRAPPED)`. A type annotation on the id defeats all three.
   PROOF, stronger than the reviewer's count: the guard's own run does NOT list
   pages/PublicBookingWidget.tsx (declared `export const PublicBookingWidget: React.FC = () =>`
   at line 46) nor components/plan/ComparativePlannerDashboard.tsx:125 (same shape) — the two
   orphans the lead confirmed by hand. Guard run: 158 components declared, 28 violations, exit 1,
   11s wall.
2. BLANK REASON SILENCES A VIOLATION AND EXITS 0. guard:658-664 `if (allowed) { verdict.
   allowlistReason = allowed.reason; return false; }` — the entry OBJECT is the truthiness test,
   the reason is not. With `reason: ""` the row is excluded from `findings` (so «нарушений 0»,
   exit 0 at :758) while :738 prints `[НАРУШЕНИЕ]` because `""` is falsy. guard:194
   `relativePath.startsWith(entry.path)` makes it a prefix, so one 4-line entry
   `{ path: "apps/web/src", reason: "" }` silences all 28.
3. WIRED TO NO GATE. Absent from root package.json (139 scripts read) and from
   apps/web/package.json (5 scripts). Its own test is referenced by nothing.
4. THIRD OWNER of an invariant that already had two, and they contradict: DocumentUkepSignButton
   is `[НАРУШЕНИЕ]` to the guard and an allowed exception with a written reason in
   apps/web/src/tests/documentsViewDecomposition.test.ts:162-222.

## Plan
- DELETE all three guard files; repo-wide `git grep` for dangling references.
- Build apps/web/src/tests/utils/componentReachability.ts — one @babel/parser walk, whole
  apps/web/src census, exact-path allowlist (no prefixes => the blanket hole cannot exist).
- panelsAreMounted.test.ts becomes the single owner: hand-list of 7 panels replaced by the census.
- patientCardDecomposition.test.ts loses its DUPLICATE orphan scan (its ComparativePlannerDashboard
  reason moves verbatim into the single allowlist); keeps its unique form assertions.
- PublicBookingWidget.tsx: decide (mount / delete / allowlist-with-reason).

## RESUMED (second instance; first died after DEFECT CONFIRMED)
HEAD now dba665723784ad18ea55474309927eaf379c52c2 (was f3071534e). Claim re-checked:
only `?? apps/web/src/tests/patientCardDecomposition.test.ts` (untracked, mine to commit).
Foreign staged in index (NOT mine, protected by pathspec): .agents/lead/commitmsg-modularity-headers.txt,
apps/api/src/db/rebookingConversionRulesQuery.ts,
apps/web/src/components/analytics/RebookingConversionRulesWidget.tsx.

## INVENTORY — MEASURED MYSELF (babel walk, apps/web, read-only node --input-type=module -e)
370 files parsed, 0 parse errors. 244 exported PascalCase decls, **193 JSX-bearing**.
Shapes: 156 `export function`, **34 `export const X: React.FC = () =>` (ANNOTATED-arrow)**,
1 plain arrow, 1 function-with-return-type, 1 ArrayExpression (SPECIALIZATIONS, not a component).
=> ast-grep saw 158. Gap = 34+1 = 35, EXACTLY the annotated shapes. Defect 1 quantified.
Reachability from main.tsx: 255/370 files reachable, 158 components OK, **35 violations**
(24 ORPHAN + 11 UNREACHABLE-FILE, all non-test). Walk 2833 ms total.
FALSE POSITIVES CHECKED: SmartImportStudio, LegacyMigrationStudio, Odontogram, Badge, HelpHUD,
TourEngine, AudioWaveform => zero importers, verified by rg. OnboardingSetupWizard imported only
by OnboardingPreview.tsx which is itself an orphan => explains all 11 UNREACHABLE-FILE.

## DOSSIER CORRECTION (both allowlist reasons were STALE)
panelsAreMounted's 5-item reason for ComparativePlannerDashboard: items 1 (priceRub) and 2
(priceId: null) are FIXED (see :382, :444, :796 «БЫЛО/Раньше» comments; file now uses kopecks).
patientCardDecomposition's comment about hardcoded 4000/8000/35000/15000 ₽ is FIXED (:353-355 «БЫЛО»).
STILL TRUE, re-verified: updatePlanStatus (:247-258) POSTs {id,status,items}; the server schema
apps/api/src/routes/odontogram.ts:120-124 has NO `status` field and `name` defaults to
«Комплексный план лечения» => every status button silently RENAMES the plan and drops the status.
DMS: contractsArray[0] (:226-227) applied to any patient, feeds money at :992-1016.
TreatmentEstimator is mounted at components/odontogram/OdontogramModule.tsx:740 on the same POST.

## DECISION on pages/PublicBookingWidget.tsx => (c) allowlist with a specific reason
Working component (loading/error/empty/409, local-date fix, Russian errors); API live
(server.ts:457, smoke-clinical-mutation-guard.mjs:200-212 knows its 3 routes). Deleting it = wrong.
Mounting it needs a SECOND circuit: apps/web has ONE html entry, no rollup `input`, main.tsx
unconditionally renders AppShell + installApiAuthFetch attaches clinic tokens. Either a second
Vite entry or a hash gate in AppShell.tsx — both OUTSIDE my claim, and an architecture call.

## RESUMED AGAIN (third instance; second died after INVENTORY)
HEAD now 54ee3398ce8783c4f3e274440d0553b8a9192da5. Claim re-checked: untracked and mine =
`apps/web/src/tests/patientCardDecomposition.test.ts`, `apps/web/src/tests/utils/componentReachability.ts`
(849 строк, написан вторым экземпляром, ПРОВЕРЕН запуском: 314/314 разобрано, 194 компонента, 4074 мс).
Foreign staged (NOT mine): rebookingConversionRulesQuery.ts, RebookingConversionRulesWidget.tsx,
pages/DoctorPayoutDashboard.css, pages/FinancialDashboard.css, pages/FinancialDashboard.tsx.
Foreign dirty (NOT mine, not touched): tests/operationsPanelsStyling.test.ts,
scripts/smoke-dental-persistence-routes-source.mjs, scripts/smoke-patients-usability-source.mjs,
scripts/lib/shot-audit.mjs, components/finance/CashDayTally.tsx.

## RE-VERIFIED MYSELF AT THIS HEAD
- Guard files on disk: 758+276+285 строк. `git grep` HEAD repo-wide: ноль ИМПОРТОВ; только упоминания
  в прозе (.agents/lead/*.md, ManagerReportsPanel.tsx:595, pages/DoctorPayoutDashboard.tsx:8) — не мои
  файлы, ломающегося загрузчика нет.
- Ни в root package.json, ни в apps/web/package.json скрипта нет. Defect 3 CONFIRMED.
- `npm test -w @dental/web` = `node --import tsx --import ./testCssStub.mjs --test "src/**/*.test.ts"
  "src/**/*.test.tsx"` => мои файлы уже в наборе, НОВЫЙ npm-скрипт не нужен.
- Перепись: 314 файлов, 0 ошибок разбора, 188 файлов с компонентами, 194 компонента, 35 несмонтированных,
  4074 мс. Дубликатов имён нет.
- Причина ComparativePlannerDashboard проверена ЗАНОВО: odontogram.ts:120-125 `treatmentPlanUpsertSchema`
  без поля `status`, `name` с `.default("Комплексный план лечения")`; schema.ts:1404
  `status: text("status").notNull().default("draft")` (строчными), а экран сравнивает с "Draft"
  (:48, :120, :976-980, :1241); ДМС `contractsArray[0]` (:227).
- PublicBookingWidget: main.tsx:33-39 безусловно рендерит AppShell после installApiAuthFetch();
  единственная точка входа apps/web/index.html; vite.config.ts:63-64 только manualChunks, без `input`.
  Адреса живые: server.ts:457, apps/api/src/tests/webCallsExistingRoutes.test.ts:110. => (c) карантин.

## COLLISION HANDLED (см. handoff.md)
scripts/check-component-mount-reachability.mjs был ГРЯЗНЫМ: 32 незакоммиченные строки, вводящие
DEBT_CEILING = 26 — храповик ВНУТРЬ стража, который пакет велит удалить. Диff сохранён в
preserved-uncommitted-guard-edit.diff и закоммичен. Файл удалён `git rm -f`.

## Log
- [x] STARTED
- [x] AUTHORITY READ
- [x] DEFECT CONFIRMED
- [x] INVENTORY
- [x] EDIT WRITTEN
- [x] SELF-CHECK PASSED (panels 9/9 exit 0, patientCard 9/9 exit 0)
- [x] COMMITTED 82fd6427916f8633afa37d5bf7a8b92441cbd8f1
- [x] PROVEN (5 отрицательных контролей сработали; encoding smoke ok; замер 3853 мс)
- [x] DONE
