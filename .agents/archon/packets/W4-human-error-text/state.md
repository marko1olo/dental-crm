# W4-human-error-text — state

STATUS: DONE
COMMITS: f717aaa5a90c1a9afbe703001faf31b717c59e65, b99bc14da183a2a75ef17ae743bdd97ad6922fb5,
         cf40daaccb80920771a31ee51bb61c5a1aa20f9b
SELF-CHECK PASSED: node --import tsx --test apps/web/src/lib/panelStateText.test.ts → 16/16, exit 0.
SMOKE: npm run smoke:web-text-encoding → ok true, 429 files, 0 mojibake, exit 0 (run 3×, after each commit).
PROVEN: the three widget endpoints probed live on 127.0.0.1:4100 — see handoff.md.
DOSSIER WRONG: RECON_DOSSIER §3 says ScannerView / LeadsKanbanView / InventoryView are unreachable.
  They are NOT: workspaceShell.tsx:52 lists them in appViews and App.tsx:4774/4788/4796 renders them.
BIGGER FINDING, NOT MINE TO FIX: /api/patients/:id/reclamations and /api/patients/:id/tickets DO NOT
  EXIST in apps/api/src at all (404 live, 0 source matches). Both widgets have always 404'd.
HEAD at start: 54db1c590be322d16858cd5d69e70a451bece62e
`git status --porcelain` on my claim: CLEAN (dirty tracked files are only
.agents/AGENTS.md, apps/api/.data/*.json, apps/web/tsconfig.tsbuildinfo,
packages/shared/dist/*, scratch/audit-settings-props.mjs — none of them mine, none staged by me).

## Log
- STARTED — packet dir created, state.md written before any read.
- AUTHORITY READ — .agents/AGENTS.md (12 mandates), .agents/INDEX.md, .agents/UI_STANDARDS.md,
  .agents/archon/VISUAL_VERDICT.md (all addenda), .agents/archon/RECON_DOSSIER.md. Reference standard
  read: components/reports/ManagerReportsPanel.tsx (header + failure path),
  lib/patientDuplicatesApi.ts, pages/analyticsDoctorMetrics.ts (the model for a pure,
  node:test-able message module), components/analytics/analyticsWidgetData.test.ts (test conventions).
- DEFECT CONFIRMED — inventory below, every line re-read on disk.

---

## INVENTORY (hunted by BEHAVIOUR, not by marker)

### A. Bare HTTP status code interpolated into user-visible Russian — 15 sites
`rg -n 'Сервер ответил (ошибкой )?\$\{|сервер ответил кодом \$\{|код \$\{res\.status|ответ \$\{response\.status|HTTP \$\{res\.status|вернул код \$\{' --glob '!**/*.test.*' apps/web/src` → **15**

| file:line | text | reachable? |
|---|---|---|
| `hooks/usePatientResource.ts:84` | `Сервер ответил ошибкой ${res.status}. Данные не загружены.` | **7 live widgets**, 3 render it verbatim |
| `AppHelpers.tsx:4142` | `сервер вернул код ${response.status}` | fallback only for statuses outside 400/401/403/404/409/413/422/429/5xx → rare |
| `lib/patientDuplicatesApi.ts:65` | `Сервер ответил ${response.status}` | duplicates panel |
| `components/reports/ManagerReportsPanel.tsx:141` | same | reports |
| `components/schedule/DayConfirmationsPanel.tsx:99` | same | schedule |
| `components/patients/RecallListPanel.tsx:104,130` | same | patients |
| `components/communications/{CampaignPanel:76,MessageDeliveryConsole:179}` | same | **NOT MINE — second author's area** |
| `components/leads/LeadsKanbanView.tsx:64` | `…сервер ответил кодом ${response.status}…` | **UNREACHABLE** — AppRouter.tsx is dead code (dossier §3) |
| `pages/DoctorPayoutDashboard.tsx:25` | `HTTP ${res.status}` | **UNREACHABLE** — route-less page |
| `hooks/useOfflineQueue.ts:94` | `Ошибка синхронизации данных (код ${res.status}). Изменения утеряны.` | **UNREACHABLE — zero importers** (verified `rg -l '\buseOfflineQueue\b' apps/web/src` → only its own file) |
| `ScannerView.tsx:70` | `…сервер ответил кодом ${response.status}. Список ниже неполный.` | **UNREACHABLE** — dead AppRouter view |
| `pages/analyticsDoctorMetrics.ts:222` | `Сервер ответил ${status}…` | analytics (packet P1's file) |
| `components/workspace/RecentPatientHistoryWidget.tsx:51` | `История карточек: ответ ${response.status}` | thrown, **never rendered** — caught into a human `failed` state at :105/:155 |

### B. Failure rendered as "нет данных" — the conflation the packet names as itself the defect
`hooks/usePatientResource.ts:30-33` states in its own docblock that it exists because
«отказ сервера … раньше оставлял пустое значение, и виджет показывал "данных нет". Это ложь».
**Three of its six widget consumers never destructure `error`, so they still do exactly that:**

| file:line | what the user sees on a FAILED load |
|---|---|
| `components/patients/PatientReclamationsWidget.tsx:153` | «Рекламации и осложнения отсутствуют» — a **complications/claims register** reporting "none" when the read failed |
| `components/patients/PatientTaskTicketsWidget.tsx:234` | «Нет активных задач по пациенту» |
| `components/patients/PatientArchiveAndBlacklistWidget.tsx:53` | `isBlacklisted = … ?? (reasons[0]?.isBookingBlocked ?? false)` → on a failed read the card says the patient is **not** blocked and arms «Добавить в черный список». The comment at :139-141 handles the *loading* case for exactly this reason; the *failed* case falls straight through it. |

Consumers that DO handle it (leave alone, they only inherit the better message):
`components/crm/PatientArchiveReasonsAndBlacklistsWidget.tsx:98`,
`components/patients/PatientCommunicationTimelineWidget.tsx:122`,
`components/crm/PatientCommunicationTimelinesWidget.tsx:134`.

### C. Developer/vendor text shown to a dentist — `SmartParsePreview.tsx` (7 consumers: VisitView, PatientsView, ScheduleView, PaymentCapture, PriceDictationBar, NewAppointmentForm, VisitDictation)
| line | text | why it is a defect |
|---|---|---|
| `:41` | `Ошибка API (Локальный режим): Подключите ключи в .env для реального LLM-парсинга` | names `.env`, «API», «LLM-парсинга»; and it **invents the cause** — it is set on ANY failure, including a plain network drop (§7, §10) |
| `:147` | `Пусто... Назовите услугу и цену.` | «Пусто...» is not a state |
| `:182` | `Пусто...` | says nothing at all |
| `:262` | `Llama-3 анализирует...` | vendor model name as a loading state |
| `:272` | `Неизвестный контекст диктовки: {type}` | leaks an internal enum |

### D. Toasts that answer none of the three questions — 37 `showToast("Ошибка…")` sites, 14 files
Worst, and on the patient card (my claim): `PatientTaskTicketsWidget.tsx:67,71,96,119` and
`PatientReclamationsWidget.tsx:74,78,103,138` — «Ошибка сети», «Ошибка при удалении»,
«Ошибка при фиксации», «Ошибка при обновлении статуса». No cause, no next step, and after
«Ошибка при обновлении статуса» the optimistic row has already flipped.

### E. Empty states that say nothing more than the fact (noted, NOT fixed — §8, not spreading thin)
`components/CommandPalette.tsx:108` and `components/Omnibar.tsx:178` «Ничего не найдено»;
`components/schedule/WaitlistDrawer.tsx:335`, `components/schedule/LabOrdersPanel.tsx:384`,
`components/workspace/RecentPatientHistoryWidget.tsx:102,152` «Загрузка...».

---

## SCOPE I FIX (§8: five surfaces genuinely fixed, not forty touched)
1. NEW `apps/web/src/lib/panelStateText.ts` — the one pure owner of loading / empty-but-fine / failed
   text, with a status→cause vocabulary that never emits a bare code.
2. `apps/web/src/hooks/usePatientResource.ts` — kills the bare code for all 7 consumers at once.
3. `apps/web/src/components/patients/PatientReclamationsWidget.tsx` — B + D.
4. `apps/web/src/components/patients/PatientTaskTicketsWidget.tsx` — B + D.
5. `apps/web/src/components/patients/PatientArchiveAndBlacklistWidget.tsx` — B (the dangerous one).
6. `apps/web/src/SmartParsePreview.tsx` — C.
+ `apps/web/src/lib/panelStateText.test.ts` — node:test over the pure functions.

NOT fixed, recorded as debt: A rows marked UNREACHABLE (fixing dead code is not a fix),
`components/communications/**` (second author's area), `AppHelpers.tsx:4142` (rare fallback, and the
function is consumed from App.tsx which W3 owns), E.
