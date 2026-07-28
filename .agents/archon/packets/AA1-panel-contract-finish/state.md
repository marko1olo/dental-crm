# AA1-panel-contract-finish — state

STATUS: DONE
COMMIT: dba665723784ad18ea55474309927eaf379c52c2
HEAD at start: 12df066db76d63686a326cb3c7384bda0e406a95
HEAD moved three times under me: 12df066db -> f3071534e -> 456ed32d9 -> dba665723 (mine).
No hash was ever taken from memory.

## Log
- STARTED — packet dir created, state.md written before any reading.
- AUTHORITY READ — .agents/AGENTS.md (full), .agents/INDEX.md (full), .agents/UI_STANDARDS.md (full).
- DEFECT CONFIRMED — `git diff -- apps/web/src/lib/panelStateText.ts` read in full; contract renames
  `PanelSubject.title` -> `notLoadedTitle` and `PanelText.retryable: boolean` -> `retryLabel: string|null`
  plus new `panelRetryLabel(status)`; 400/422 cause no longer promises a page refresh.
- INVENTORY PRODUCED before any behaviour change (below).
- EDIT WRITTEN — 12 files.
- SELF-CHECK PASSED — `node --import tsx --test apps/web/src/lib/panelStateText.test.ts`
  -> tests 24 / pass 24 / fail 0, TRUE_EXIT=0.
  Single-file `npx tsc` probe with tsconfig.base-matching flags -> 0 errors in any file I touched.
- COMMITTED dba665723 — 12 files, pathspec form, verified with `git log -1 --stat`,
  Russian subject intact (has_cyrillic: true), foreign staged files NOT swept.
- PROVEN — see handoff.md ПРОВЕРЕНО. Also `npm run smoke:web-text-encoding` exit 0.
- DONE — handoff.md written.

## Migration inventory (measured)
ALREADY MIGRATED before I started (dead agent's own work, verified on disk):
- components/patients/PatientTaskTicketsWidget.tsx  «Задачи по пациенту не загружены»
- components/patients/PatientReclamationsWidget.tsx «Рекламации и осложнения не загружены»
- components/patients/PatientArchiveAndBlacklistWidget.tsx «Статус блокировки записи не прочитан»
- components/PanelLoadFailure.tsx — already read `text.retryLabel`

MIGRATED BY ME (were still on the old `title:` field):
1. components/finance/FamilyWalletPanel.tsx   «Данные семейного кошелька не загружены»
   (another agent committed this file, with my edit inside it, as db611bffb — HEAD line 39)
2. components/imaging/VisiographAnalyzer.tsx  «Снимки пациента не загружены»
3. components/odontogram/TreatmentEstimator.tsx «Позиции плана лечения не загружены»
4. components/useVisitDiaryLogic.ts           «Записи приёма не загружены»
5. hooks/useMaxSettings.ts                    «Настройки MAX не загружены»
6. hooks/useWhatsappSettings.ts               «Настройки WhatsApp не загружены»
7. components/schedule/WaitlistDrawer.tsx     dead `title` field removed, `: PanelSubject` restored
8. lib/panelStateText.test.ts                 fixture + 3 `.retryable` assertions rewritten into
                                              7 real behaviour tests + 2 project-wide source scans

ONE DECISION instead of two — components/PanelLoadFailure.tsx: `onRetry` made REQUIRED (all seven
call sites already passed it), button markup is now `{text.retryLabel && (...)}` only.

## ImagingView countLabel — DEFECT ABSENT at HEAD
`apps/web/src/ImagingView.tsx` has NO working-tree diff. `countLabel` is imported at line 101 and
exported from AppHelpers.tsx:2539. Commit e8f01692e added BOTH the import and the call site in one
commit. A single-file tsc probe reports zero `countLabel` errors. The brief's 11th error was measured
before e8f01692e landed. No work invented.

## LEAD MUST RUN (§7a — I am forbidden from these)
- npm run typecheck -w @dental/web     (expect 0; was 11, all this migration)
- npm run test -w @dental/web          (my file is in src/**/*.test.ts)
No packages/shared change in this packet, so NO `npm run build -w @dental/shared` is needed.
