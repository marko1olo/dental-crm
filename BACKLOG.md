## 2026-08-01 — AI recognition jobs history (GET /api/ai/recognition-jobs)

**Gap:** `POST /api/ai/recognition-jobs` already created jobs from Settings → ИИ «Лаборатория нейросетей» and showed only the last `recognitionJob` in memory. `GET /api/ai/recognition-jobs` (`listAiRecognitionJobsFromDb`, requireClinicalReadAccess + org) had **zero web callers**. After reload or preset change staff could not see queue/history or reopen a prior draft.

**Ship:** `AiRecognitionJobsPanel.tsx` — self-contained GET with `auth.denteClinicalReadHeaders`; table (when/kind/target/status/confidence/source/preview); row expand for resultText + warnings; «В лабораторию» via `setRecognitionJob` so «Передать в карту» works; refresh + auto-reload when workbench posts a new job id. Mounted under workbench in `SettingsAiTab` (`data-testid ai-recognition-jobs-mount`). data-testid: `ai-recognition-jobs-panel`, `ai-recognition-jobs-refresh`, `ai-recognition-jobs-list`, `ai-recognition-jobs-empty`, `ai-recognition-jobs-error`, `ai-recognition-jobs-loading`, `ai-recognition-job-row-*`, `ai-recognition-job-open-*`, `ai-recognition-job-detail-*`, `ai-recognition-job-status-*`.

**Verify:** `npx tsc -p apps/web --noEmit` exit 0; live GET without auth → 401/403 (route up); web grep `recognition-jobs` → panel GET + useAppLogic POST.

## 2026-08-01 — Public booking admin copy-link (Settings → Отзывы)

**Gap:** `PublicBookingWidget` + `/api/public/booking` (doctors/slots/book) already LIVE; hash `#/portal/booking/<orgId>` parsed by `publicPortalRouteFromHash` — but **admin UI «скопировать ссылку» отсутствовал**. Owner could not hand a working booking URL from the cabinet without hand-building the path (old QrGatewayPanel printed broken `?clinicId=`). Lab-order already copies portal links; booking did not.

**Ship:** `buildPublicBookingPortalUrl(organizationId, origin?)` in `publicPortalRoute.ts` — single builder matching `PUBLIC_BOOKING_PORTAL_PATH`. `PublicBookingLinkPanel.tsx` — reads `dashboard.clinicSettings.profile.organizationId`, readonly URL, clipboard copy + open tab, honest missing-org state. Mounted atop `SettingsMarketingTab` (`data-testid public-booking-link-mount`). data-testid: `public-booking-link-panel`, `public-booking-link-url`, `public-booking-link-copy`, `public-booking-link-open`, `public-booking-link-missing-org`.

**Verify:** `npx tsc -p apps/web --noEmit` exit 0; web grep `buildPublicBookingPortalUrl` / `public-booking-link` → panel + Marketing mount + helper.

## 2026-08-01 — Patient card attachments (GET/POST /api/patients/:id/attachments)

**Gap:** `POST /api/patients/:patientId/attachments` already wrote multipart to disk + `attachments.patient_id` + sha256 and `GET /api/attachments/:id/download` worked — but **zero web callers** on patient-level POST. Visit diary photos used `/api/files/visits/...` only. No GET list for patient-level files: upload-without-list was incomplete gameplay (passport/scan/contract had no card UI).

**Ship:** API `files.ts` — `GET /api/patients/:patientId/attachments` (org+patient scoped, `{files:[{id,url,name,type}]}` mirror of visit list); POST 201 also returns `file` shape alongside legacy `attachment`. Web `PatientAttachmentsPanel.tsx` — list + multipart upload field `file` + download via `fetchAuthedApiFileObjectUrl` (token headers; bare `<a href>` is 401). Headers: `denteAdminSecretRequestHeaders`. Mounted on `PatientsView` after WhatsApp when `selectedPatientId` set. data-testid: `patient-attachments-panel`, `patient-attachments-input`, `patient-attachments-list`, `patient-attachments-empty`, `patient-attachments-error`, `patient-attachment-row-*`, `patient-attachment-download-*`, `patient-attachments-mount`.

**Verify:** `npx tsc -p apps/web --noEmit` exit 0; live GET/POST without auth → 401/403 (route up); web grep patient attachments → panel + PatientsView mount.

## 2026-08-01 — WhatsApp direct send on patient card (POST /api/whatsapp/send)

**Gap:** `POST /api/whatsapp/send` already called Meta Cloud API (`sendWhatsappTextMessage`), wrote `communication_events` sent|failed, broadcast `INBOX_NEW_MESSAGE` — but **zero web callers**. Settings had only settings/status; outbox is queue/campaign. Admin on patient card could not send one-off WhatsApp without CLI.

**Ship:** `PatientWhatsappSendPanel.tsx` — self-contained compose (message + submit); `denteAdminSecretRequestHeaders` (same path as WhatsApp settings; `requireNonDoctorAccess`); RU errors for 400/403/404/422/502 + server `message`. Mounted on `PatientsView` after consents when `selectedPatientId` set (phone/name hints from selected + draft). data-testid: `patient-whatsapp-send-panel`, `patient-whatsapp-send-message`, `patient-whatsapp-send-submit`, `patient-whatsapp-send-error`, `patient-whatsapp-send-ok`, `patient-whatsapp-send-mount`.

**Verify:** `npx tsc -p apps/web --noEmit` exit 0; live POST without auth → 401/403 (route up); web grep `whatsapp/send` → panel only.

## 2026-08-01 — Outbox enqueue compose (POST /api/communications/outbox)

**Gap:** API `POST /api/communications/outbox` accepted one-off queue items (template or free body + recipient), but MessageDeliveryConsole only listed/cancelled/retried/dispatched. Staff could not queue a single SMS/email/WhatsApp/Telegram without a campaign or auto-reminders.

**Ship:** Compose form «Поставить в очередь» in `MessageDeliveryConsole.tsx` — channel, intent, scope, recipient, optional template or free body, email subject; POST with `denteClinicalMutationHeaders`; server message + journal reload. data-testids: `outbox-enqueue-*`.

**Verify:** `npx tsc -p apps/web --noEmit` exit 0; live POST enqueue 201.

## 2026-08-01 — Leads permanent DELETE (Kanban + store)

- **Gap:** `DELETE /api/leads/:id` (leads.ts, requireResolvedStaffOrAdminOrganizationId, org-scoped, LEAD_DELETED WS) already removed a row from `crm_leads`, but **zero web callers**. Kanban could only drag to «Отказ» (status=trash) — card stayed in DB forever; spam/test/wrong inquiries could not be erased from the funnel without SQL/CLI. Store had GET/POST/PATCH/PUT + convert bare fetch; no `deleteLead`.
- **Ship:** `leadsStore.ts` — `deleteLead(id)` via `DELETE ${API_URL}/leads/:id` + clinic/staff token headers; optimistic remove + rollback; RU `leadsFailureMessage` on failure. `LeadsKanbanView.tsx` — «Удалить» in edit modal (existing lead only, not «new»); confirm explains trash column vs hard-delete; toast on success/error; `data-testid="lead-delete-permanent"`; Trash2 + min 44×44 touch. Distinct from drag-to-«Отказ».
- **Verify:** `npx tsc -p apps/web --noEmit` exit 0; live POST lead → DELETE 200 `{success:true}` → GET list absent (probe); WS LEAD_DELETED already refreshes board.

## 2026-08-01 — Form 043/у layout polish + 4-state visual audit (VisitDiaryEditor)

- **Gap:** Form № 043/у (VisitDiaryEditor SOAP diary) had incomplete draft-print path, sub-40px ICD clear touch target, and screenshot harness used path `/visit/:id` (hash router ignores it) plus a page.evaluate theme seed bug (`theme is not defined`). Visual audit could not prove Mobile/PC × Light/Dark.
- **Ship:** `VisitDiaryEditor.tsx` — unconditional `useAppLogicContext` (Rules of Hooks); draft unlocked header «Печать 043/у» always available; ICD clear → `vde-043__btn--icon` 40×40 + aria-label. `visit-diary-043.css` — theme-safe vars, icon/mic ≥40px touch targets, mobile full-width excludes icon buttons. `scripts/form043-viewport-shots.mjs` — `#visit` hash routing, real demo auth, Edge preferred, theme seed fix `{s,t}`, open odontogram tab + print preview, overflow/touch/theme audit.
- **Verify:** `npx tsc -p apps/web --noEmit` exit 0; 4 shots clean (form043_mobile_light/dark, form043_pc_light/dark): hasEditor+hasPreview, issues=[], smallTargets=0; report `.dente-ops-shots/form043_audit_report.json` (gitignored).

## 2026-07-31 — Speech chunks inspector (GET /api/speech/chunks)

- **Gap:** `GET /api/speech/chunks?recordingId&visitId&patientId` (speech.ts handleSpeechChunks, requireClinicalReadAccess, scope validateSpeechClinicalScope) already returned per-chunk transcript/status/quality/warnings via `listSpeechTranscriptionChunks`, but **zero web callers**. Visit screen only showed recovery KPI from `GET /api/speech/recordings/recovery` — when recoveryState was missing_chunks / failed_chunks / quality_review the doctor could not see WHICH fragment was empty, failed, or needs edit, nor assemble that recording back into the dictation field from a fragment table.
- **Ship:** `SpeechChunksInspector.tsx` — self-contained (`useAppLogicContext`: auth clinical read headers, dashboard.activeVisit scope, speechRecordingRecovery, loadSpeechRecordingRecovery, assembleSpeechRecording); collapsible «Фрагменты диктовки»; recovery recording list with state labels; GET chunks on expand/select; table index/status/quality/transcript/when; «Собрать в диктовку» reuses existing assemble (does not write EMR itself). Mounted in `VisitView.tsx` after dictation-box, before VisiographAnalyzer. data-testid: `speech-chunks-inspector`, `speech-chunks-inspector-summary`, `speech-chunks-refresh-recovery`, `speech-chunks-reload`, `speech-chunks-assemble`, `speech-chunks-assemble-note`, `speech-chunks-recordings`, `speech-chunks-recording-*`, `speech-chunks-list`, `speech-chunk-row-*`, `speech-chunks-error`.
- **Verify:** panel clean under `npx tsc -p apps/web --noEmit` (pre-existing dicom test noise only); web grep `/api/speech/chunks` → SpeechChunksInspector only; mount markers SpeechChunksInspector in VisitView.

## 2026-07-31 — X-ray scan DELETE (VisiographAnalyzer)

- **Gap:** `DELETE /api/xray/scans/:id` (xray.ts:238, requireClinicalMutationAccess, org-scoped) already removed a row from `xray_scans`, but **zero web callers**. Visiograph history could only open a scan — wrong upload or foreign report stayed in the patient card forever.
- **Ship:** `VisiographAnalyzer.tsx` — `deleteScan` via `DELETE /api/xray/scans/:id` + `denteClinicalMutationHeaders`; confirm dialog; trash on each history row + «Удалить из архива» on open history view; optimistic filter of `scanHistory`; clear current scan if ids match; human `deleteFailure` separate from history/save failures. data-testid: `xray-scan-delete-${id}`, `xray-scan-open-${id}`, `xray-scan-delete-current`, `xray-scan-delete-failure`.
- **Verify:** panel clean under `npx tsc -p apps/web --noEmit` (pre-existing dicom test noise only); markers Trash2 / method DELETE / denteClinicalMutationHeaders present; API route still 204/404 as before.

## 2026-07-31 — Diary template CREATE (VisitDiaryTemplateSelector)

- **Gap:** `POST /api/templates` already created custom visit templates (`isBuiltIn: false`, title required, optional category/prefilled*/defaultIcd10) under requireClinicalMutationAccess — but **zero web callers**. Doctor could seed built-ins and delete customs after prior ships, but could not add a clinic-specific protocol from the visit diary screen without SQL/CLI.
- **Ship:** `VisitDiaryTemplateSelector.tsx` — create form (title required + category/anamnesis/objective/treatment/ICD-10); `createTemplate` via `POST /api/templates` + `denteClinicalMutationHeaders`; open «Свой» / «Создать свой протокол» when unlocked; reload list + select created id; server `message` on error. data-testid: `diary-template-create-open`, `diary-template-create-form`, `diary-template-create-title`, `diary-template-create-submit`, `diary-template-create-cancel`.
- **Verify:** panel clean under `npx tsc -p apps/web --noEmit` (pre-existing dicom test noise only); live POST without session → 401/403 (route up); web grep method POST bare `/api/templates` → selector only.

## 2026-07-31 — Appointments byStatus table (ManagerReportsPanel)

- **Gap:** `GET /api/reports/summary` already returned `appointments.byStatus` (group-by status counts from managerReports.ts) and the panel type included the field — but the UI only rendered arrival/completion/cancel/noShow **rates**. Owner saw «неявки 9 %» and could not see how many records were still «назначен» / «на приёме» / «подтверждён» — where the day stalls. No second API needed; numbers already in the summary payload.
- **Ship:** `ManagerReportsPanel.tsx` — `appointmentStatusLabels` (RU for scheduled/confirmed/arrived/in_treatment/completed/cancelled/no_show/rescheduled/waiting); table after rates hint: Статус / Записей / Доля; filter count>0, sort desc; share via formatPercent; unknown status printed raw. data-testid: `manager-reports-appointments-by-status`.
- **Verify:** panel clean under `npx tsc -p apps/web --noEmit` (pre-existing dicom test noise only); no new fetch — data from existing summary load.

## 2026-07-31 — Diary template DELETE (VisitDiaryTemplateSelector)

- **Gap:** `DELETE /api/templates/:id` already enforced org scope, 404 NotFound, 403 CannotDeleteBuiltIn for `isBuiltIn`, and db delete for custom visit templates — but **zero web callers**. Doctor could seed/restore built-ins after seed ship, but could not remove an obsolete custom protocol from the visit diary dropdown without SQL/CLI.
- **Ship:** `VisitDiaryTemplateSelector.tsx` — `isBuiltIn` on Template; `deleteSelectedTemplate` via `DELETE /api/templates/:id` + `denteClinicalMutationHeaders`; button «Удалить» only when selected template is custom and diary unlocked; Russian confirm; clear selection + reload list; server `message` on error (CannotDeleteBuiltIn). data-testid: `diary-template-delete`.
- **Verify:** panel clean under `npx tsc -p apps/web --noEmit` (pre-existing dicom test noise only); live DELETE without session → 401/403 (route up); web grep `diary-template-delete` → selector only.

## 2026-07-31 — Diary clinical templates seed (VisitDiaryTemplateSelector)

- **Gap:** `POST /api/templates/seed` already called `ensureClinicalTemplatesSeeded` (insert missing built-ins by title, `isBuiltIn: true`) and returned `{ success, count }`, but **zero web callers**. GET `/api/templates` auto-seeds only when the org list is fully empty; on 503 `ClinicalTemplatesSeedFailed`, partial customs without built-ins, or a failed first visit, the doctor saw a silent empty «Клинический шаблон» dropdown with no recovery — CLI/SQL only.
- **Ship:** `VisitDiaryTemplateSelector.tsx` — empty/load-failure/503 state with Russian copy + button «Установить встроенные протоколы» (`POST /api/templates/seed` via `denteClinicalMutationHeaders`); non-empty list keeps select + subtle «Восстановить встроенные» (idempotent by title). Reload list after success; toast with count; server `message` on error. data-testid: `diary-template-empty`, `diary-template-seed`, `diary-template-restore`, `diary-template-select`. Mount already in `VisitDiaryEditor` (unlocked diary header).
- **Verify:** panel clean under `npx tsc -p apps/web --noEmit` (pre-existing dicom test noise only); live POST seed without session → 403 OrgRequired (route up); web grep `templates/seed` → selector only.

## 2026-07-31 — Staff authority grants panel (Settings → Персонал)

- **Gap:** `PUT /api/settings/staff/:staffId/authority` already wrote column grants (`can_sign_medical_records` / `can_manage_money` / `can_manage_imports`) with roleDerived/grants/effective semantics and 409 on role-revocation, and POST create accepted the three flags in body (zod dropped them silently on create form) — but **zero web callers** on the PUT. Owner could not grant an assistant cash-desk access or import rights without SQL; role-locked flags had no UI.
- **Ship:** `StaffAuthorityPanel.tsx` — self-contained (`useAppLogicContext` + `denteAdminSecretRequestHeaders`); staff list from dashboard; expandable rows; three checkboxes; role-locked disabled; local overrides after PUT (dashboard still returns roleDerived only — debt noted in panel header). Mounted on `SettingsStaffTab` after `StaffCommissionsPanel`. data-testid: `staff-authority-panel`, `staff-authority-list`, `staff-authority-check-*`.
- **Verify:** panel has zero TS errors under `npx tsc -p apps/web --noEmit` (pre-existing dicom test noise only); live PUT without auth → 401 AuthRequired (route up); web grep `/authority` + `staff-authority-panel` → StaffAuthorityPanel only.

## 2026-07-31 — Waitlist matches per appointment (schedule gameplay)

- **Gap:** `GET /api/appointments/:appointmentId/waitlist-matches` already returned full ranked candidates (`WaitlistMatch` + reason, same doctor / time / priority / waiting days) for a cancelled or no_show future slot, but **zero web callers**. `FreedSlotsPanel` only showed `topMatches` (limit 3) from `/api/schedule/freed-slots`. Admin opening a cancelled card in the day timeline had no «кому звонить» list beyond the summary strip.
- **Ship:** `WaitlistMatchesBlock.tsx` — self-contained (`useAppLogicContext` + clinical read headers); loads full report; phone / «Позвонил» / priority / reason. Mounted on `AppointmentCard` for future `cancelled`|`no_show`, and on `FreedSlotsPanel` expand («Полный подбор» / «Все из очереди»). data-testid: `waitlist-matches-block`, `appointment-card-waitlist-matches`, `freed-slot-full-matches`.
- **Verify:** `npx tsc -p apps/web --noEmit` exit 0; live GET without auth → 401 AuthRequired; web grep `waitlist-matches` → block + AppointmentCard + FreedSlotsPanel.

## 2026-07-31 — Staff commissions GET overview (Settings → Персонал)


## 2026-07-31 — Ход рассылки в CampaignPanel (GET campaigns/:id/progress)

**Проблема.** API `GET /api/communications/campaigns/:campaignId/progress` отдавал
`byStatus` + `total` по outbox-строкам рассылки, но веб **ни разу** не вызывал
маршрут. Администратор видел только бейдж «Выполняется» / «Завершена» и кнопку
«Остановить» — сколько ушло, сколько в очереди, сколько failed, узнать было
нельзя без ручного фильтра журнала доставки.

**Сделано.** `CampaignPanel`: тип `CampaignProgress`, `loadProgress`, кнопка
«Ход отправки» для running/completed/cancelled, панель метрик (queued/sent/
delivered/failed/…), автоопрос 8 с пока status=running, обновление после
launch/cancel, подгрузка вместе с предпросмотром. data-testid:
`campaign-progress-panel`, `campaign-progress-metrics`, `campaign-progress-btn-*`.

**Проверка.** `npx tsc -p apps/web --noEmit` exit 0; live GET progress без
секрета → 401/403 (маршрут жив).


- **Gap:** `GET /api/settings/staff/commissions` already returned active `doctor_commissions` rates (`userId`, `commissionPct`, `materialCostDeductionPct`, `effectiveFrom`), and PUT `/api/settings/staff/:staffId/commission` was already wired in `DoctorPayoutDashboard` — but **zero web callers** on the GET list. Owner only saw rates inside the monthly payouts table; doctors with no visits that month looked “без ставки” even when a rate row existed.
- **Ship:** `StaffCommissionsPanel.tsx` — self-contained (`useAppLogicContext` + `denteAdminSecretRequestHeaders`); loads GET list, joins staff FIO from dashboard, inline edit via existing PUT; mounted at top of `SettingsStaffTab` (`data-testid staff-commissions-panel`).
- **Verify:** `npx tsc -p apps/web --noEmit`; live GET `/api/settings/staff/commissions` → 401/403 without admin secret (route up); web grep `settings/staff/commissions` → panel.

## 2026-07-31 — Patient communication consents gameplay (Patients)

- **Gap:** `GET/PUT /api/communications/consents/:patientId` already stored per-channel service/marketing consent (granted|revoked, defaults service=granted marketing=revoked), but **zero web callers** — staff could not record opt-in/out; campaigns/outbox had no UI source of truth on the patient card.
- **Ship:** `PatientCommunicationConsentsPanel.tsx` — self-contained (`useAppLogicContext` + clinical read/mutation headers); matrix SMS/WhatsApp/Telegram/email/phone/MAX/VK/in_person × service|marketing; save dirty cells via PUT. Mounted on `PatientsView` when `selectedPatientId` is set (next to communication timelines).
- **Verify:** `npx tsc -p apps/web --noEmit`; live GET empty patient → 401 AuthRequired or 400; web grep `communications/consents` → panel + PatientsView.

## 2026-07-31 — AI visit-note-draft gameplay (Visit)

- **Gap:** `POST /api/ai/visit-note-draft` already built SOAP visit note fields from transcript + specialty (rule + optional neural, `visitNoteDraftRequestSchema` / `visitNoteDraftSchema`), but **zero web callers** — dictation never became a structured visit note on screen.
- **Ship:** `VisitNoteDraftPanel.tsx` — self-contained (`useAppLogicContext` + `denteClinicalReadHeaders`); transcript + specialty; run → show complaint/anamnesis/objective/diagnosis/plan + quality; copy/apply. Mounted on `VisitView` when `activePatient.id` is set.
- **Verify:** `npx tsc -p apps/web --noEmit`; live empty body → 400 `VisitNoteDraftValidationError`; web grep `visit-note-draft` → panel + VisitView.

## 2026-07-31 — Diary revise gameplay (admin correct signed 043/у)

- **Gap:** `POST /api/diaries/:id/revise` already archived prior SOAP text into `visit_diary_revisions` and updated the locked diary (admin-only `OnlyAdminsCanRevise`), and `GET …/revisions` already fed the revision counter — but the Visit diary editor had **zero web callers** for revise. After ЭЦП lock, admin could not fix a typo in МКБ-10 / SOAP without SQL.
- **Ship:** `useVisitDiaryLogic.ts` — `beginRevise` / `cancelRevise` / `doRevise` (clinical mutation headers, reason ≥3 chars, message-first RU toasts, keeps `isLocked`, refreshes hash + revisionCount; autosave skips while revising). `VisitDiaryEditor.tsx` — `fieldsDisabled = isLocked && !isRevising` unlocks SOAP/ICD/tooth/complications in revise mode; locked footer «Исправить» (`diary-revise-begin`) + revise panel (reason + cancel/save); header badge «ПРАВКА» while revising.
- **Verify:** `npx tsc -p apps/web --noEmit` GREEN; live `POST /api/diaries/:id/revise` without admin → 403 `OnlyAdminsCanRevise` (route up); web grep `/revise` → `useVisitDiaryLogic.ts`; `diary-revise-begin` / `diary-revise-panel` in editor; `disabled={isLocked}` on SOAP fields = 0 (all via `fieldsDisabled`).

## 2026-07-31 — Live audit logs GET UI (Settings → Аудит)

- **Gap:** `GET /api/audit/logs` returned the full org audit trail (entityType/entityId/limit filters, immutability 152-ФЗ), but the Settings audit tab only rendered `dashboard.auditEvents` (dashboard slice) — zero web callers for the live route.
- **Ship:** Created self-contained `apps/web/src/AuditLogsPanel.tsx` — fetches `GET /api/audit/logs` with `denteClinicalReadHeaders`, Russian UI, entity filters, limit, refresh, immutable notice; mounted above `SettingsAuditTab` when `settingsTab === "audit"` in `SettingsView.tsx`.
- **Verify:** web caller hit on `AuditLogsPanel.tsx`; live API `GET /api/audit/logs` → 401 AuthRequired (route up); `DELETE /api/audit/logs` → 403 AuditLogImmutable; `npx tsc -p apps/web --noEmit` GREEN.


## 2026-07-31 — CRM Custom Task Types UI (ClinicalTasksPanel)

- **Gap:** `GET /api/crm/custom-task-types` returned organization-customized task types from `custom_crm_task_types` DDL table, but had zero web callers — doctors were limited to standard hardcoded phase buttons.
- **Ship:** Updated `ClinicalTasksPanel.tsx` — fetches `/api/crm/custom-task-types` via `denteClinicalReadHeaders` and dynamically renders organization-specific task buttons styled with `type.colorHex`.
- **Verify:** `npm run check:encoding` clean (2822 files verified); `npm run typecheck` GREEN across all packages.

## 2026-07-31 — EGISZ Multiple Diagnoses UI (VisitEmkTab)

- **Gap:** `GET /api/egisz/multiple-diagnoses` queried structured accompanying diagnoses (`egiszMultipleDiagnoses` table) for EGISZ REMD CDA R2 compliance, but had zero web callers — doctors could not see or attach accompanying ICD-10 diagnoses to visit exports.
- **Ship:** Built `EgiszMultipleDiagnosesWidget.tsx` — self-contained widget fetching `/api/egisz/multiple-diagnoses` with `denteClinicalReadHeaders`; mounted inside `VisitEmkTab.tsx` directly above the CDA R2 XML download section.
- **Verify:** `npm run check:encoding` clean (2822 files verified); `npm run typecheck` GREEN across all packages.

## 2026-07-31 — EGISZ Doctor SNILS Validation UI (SettingsStaffTab)

- **Gap:** `POST /api/clinical/egisz/validate-doctor-snils` validated doctor SNILS format and 11-digit checksum against state EGISZ/FRMR standards, but had zero web callers — administrators entered doctor credentials blindly without validation.
- **Ship:** Created `DoctorSnilsValidationWidget.tsx` — self-contained widget calling `POST /api/clinical/egisz/validate-doctor-snils` with staff token headers; mounted in `SettingsStaffTab.tsx` when adding or editing doctor staff.
- **Verify:** `npm run check:encoding` clean (2820 files verified); `npm run typecheck` GREEN across `@dental/shared`, `@dental/api`, and `@dental/web`.

## 2026-07-31 — NDFL Tax Certificate XML Export UI (DocumentsView)

- **Gap:** `GET /api/documents/:id/tax-xml` generated valid KND 1151156 XML for FNS EDO submission, but button in `DocumentsView.tsx` had ambiguous label "Черновой файл ФНС" and lacked explicit ARIA metadata.
- **Ship:** Updated `DocumentsView.tsx` with explicit action button «Справка НДФЛ в XML (ФНС)», emerald status styling, and full ARIA accessibility guidance.
- **Verify:** `npm run check:encoding` clean (2819 files verified); `npm run typecheck` GREEN across `@dental/shared`, `@dental/api`, and `@dental/web`.

## 2026-07-31 — AI personalize UI (Visit + Finance)

- **Gap:** `POST /api/ai/treatment-plan-personalize` and `POST /api/ai/post-visit-personalize` already returned patient-friendly Russian text (rule fallback + optional neural), but **zero web callers** — doctor closed the visit and could only explain the plan / hand a memo manually.
- **Ship:** `ClinicalAiPersonalizePanel.tsx` — self-contained panel (`useAppLogicContext` + `denteClinicalReadHeaders`); builds `treatmentPlanPayloadSchema`-valid body from `dashboard.treatmentPlanItems` / scenarios + visit note fields; buttons «Объяснить план пациенту» / «Памятка после приёма»; copy + markdownish render.
- **Mount:** `VisitView.tsx` after ClinicalTasksPanel (complaint/diagnosis/treatmentPlan from visit note); `FinanceView.tsx` after ClinicalRulePanel (`patientId={documentPatient?.id ?? null}`, context=finance).
- **Verify:** live empty body → 400 ValidationError; valid payload → 200 with `patientFriendlyExplanation` / `allowedAfter`+`telegramSummary`; mounts grep only Visit+Finance.

## 2026-07-31 — Live clinical rules evaluate UI (Visit + Finance)


- **Gap:** `POST /api/clinical/rules/evaluate` already counted org-scoped rules from the live treatment plan (`evaluateClinicalRulesInDb`, enforceBlockers → 400 `ClinicalRuleBlocker`), but **zero web callers** — Visit/Finance only painted `dashboard.clinicalRuleEvaluations` snapshot from shift open. Doctor changed the plan → stale warnings until full dashboard reload.
- **Ship:** `ClinicalRulePanel.tsx` — self-fetch via `useAppLogicContext` + `denteClinicalReadHeaders`; `collectServiceIdsForPatient` mirrors sampleData (plan items + active scenarios); buttons «Пересчитать по плану» / «Проверить с блокировкой» (visit only); blocker 400 is gameplay signal, not generic error.
- **Mount:** `VisitView.tsx` `patientId` from activePatient / activeVisit; `FinanceView.tsx` `patientId={documentPatient?.id ?? null}`.
- **Verify:** `npx tsc -p apps/web --noEmit` clean; live POST without body → 400 `ClinicalRuleValidationError` (route up); web caller grep → only `ClinicalRulePanel.tsx`.

## 2026-07-31 — Clinical phase handoff UI (VisitView)

- **Gap:** `POST /api/clinical/phase-completions` + `GET /api/clinical/tasks` wrote to `clinical_tasks` (ClinicalRouter + clinicalTasksQuery) but had **zero web callers** — therapist/surgeon finished a phase and the prosthodontist never saw a task.
- **Ship:** `apps/web/src/ClinicalTasksPanel.tsx` (self-contained FreedSlotsPanel pattern: `denteClinicalReadHeaders` / `denteClinicalMutationHeaders`).
- **Mount:** `VisitView.tsx` after ClinicalRulePanel when `activePatient.id` is set; buttons «Завершить терапию — передать на ортопедию» / «Завершить хирургию — передать на ортопедию».
- **Verify:** `npx tsc -p apps/web --noEmit` clean; live API AuthRequired then staff headers.

# DENTE CRM — demon backlog (Lead Security + Full-Stack)
## 2026-07-31 — communications/variables в редакторе шаблонов

**БЫЛО:** GET `/api/communications/variables` отдавал каталог подстановок (`key`/`label`/`example`/`phi`) из `templateRenderer.communicationTemplateVariables`, но **zero web callers** — администратор набирал `{patient}` по памяти, мед. переменные не были видны до отказа предпросмотра.

**ТЕПЕРЬ:** `MessageDeliveryConsole` грузит каталог вместе со шлюзами/шаблонами; под полем текста — чипы вставки `{key}` (phi помечены «мед.»).

Файлы: `apps/web/src/components/communications/MessageDeliveryConsole.tsx`.

---

# Format: [ ] prio | what | where | proof
# [~] in progress + agent id | [x] done + commit hash

[x] P0 | safeLocalStorage helper created | apps/web/src/lib/safeLocalStorage.ts | 87c2fb1e1
[x] P0 | SettingsPricesTab: catalog-import → POST /catalog + staffMutationHeaders; EOPT-safe import result | SettingsPricesTab.tsx | 92aa28d17
[x] P0 | SettingsProfileTab: readDenteStaffToken + denteRequestHeaders | SettingsProfileTab.tsx | 5ec26b542
[x] P0 | SettingsStaffTab: staff mutations via staffMutationRequest (no bare clinic token as admin secret) | SettingsStaffTab.tsx | verified OK
[x] P0 | SettingsAccessTab: readDenteStaffToken | SettingsAccessTab.tsx | 5ec26b542
[x] P1 | denteRequestHeaders: staff/clinic via safeLocalStorage | denteRequestHeaders.ts | 5ec26b542
[x] P1 | Sweep bare dente_* token localStorage (App, leads, ws, diary, apiAuthFetch, auth writes) | apps/web/src | cbfd51852 typecheck GREEN
[x] P1 | Wire safeLocalStorage into apiAuthFetch readToken + DENTE_*_KEY | apiAuthFetch.ts | cbfd51852
[x] P1 | PatientPortal patient_token + themeStore + AuthArtBackground via safeLocalStorage | apps/web/src | 36d232886 typecheck GREEN
[x] P1 | AppHelpers+App non-token localStorage drafts via safe helpers | AppHelpers.tsx App.tsx | a316d9b83 typecheck GREEN
[x] P1 | Zod on settings staff/catalog via parseSettingsPayload + 400 proofs | settings.ts serviceCatalogWriteProof/Routes | verified existing
[x] P1 | MarketingView+useAppLogic+browserContinuity via safeLocalStorage | apps/web/src | 57c0b274c typecheck GREEN
[x] P2 | Integration tests schedule / payroll proofs | apps/api/src/tests | schedule 33/33 + commission+payout proofs GREEN (57c0b274c base)
[x] P1 | U1 unverified org mutation proof | apps/api/src/tests/security/unverifiedOrganizationMutation.test.ts | 6/6 GREEN EXIT 0
[x] P1 | sessionStorage bare access sweep | apps/web/src/main.tsx + safeLocalStorage.ts | bf6750c9d typecheck GREEN
[x] P2 | intake route proofs | apps/api/src/routes/imports.test.ts + documents tests | import intake 4/4 + documents 11+8 GREEN (bf6750c9d base)
[x] P1 | Zod-validate auth SaaS bodies (register/login/invites/accept/update-password/update-pin) | auth.ts + auth.test.ts | 34/34 GREEN typecheck OK | 0789876b9
[x] P1 | odontogram treatment plan price/discount → nonNegativeMoneyRubSchema (subkopeck 400 at Zod gate) | odontogram.ts + treatmentPlanFeedsMoney.test.ts | 5/5 GREEN typecheck OK | 88ce4ffcc
[x] P1 | lab order priceRub → nonNegativeMoneyRubSchema (create+update; subkopeck 400) | lab.ts + labOrderMoney.test.ts | 3/3 GREEN | 9b07ec966
[x] P1 | document sign/sign-ukep body Zod (null body 400 not 500) | sign.ts + signUkep.ts + documentSignBody.test.ts | 5/5 GREEN typecheck OK | cf94aec15
[x] P1 | inventory+telephony body Zod (null body 400 not 500) | inventory.ts + telephony.ts + inventoryTelephonyBody.test.ts | 5/5 GREEN typecheck OK | c4d05f67d
[x] P1 | insurance contract body Zod (null body 400 not 500; CompanyNameRequired preserved) | insurance.ts + insuranceBody.test.ts | 5/5 GREEN typecheck OK | ef9d2a984
[x] P1 | max+whatsapp webhook cast-after-200 body guard (null/non-object → 200 silent, no throw) | max.ts + whatsapp.ts + messengerWebhookBody.test.ts | 5/5 GREEN typecheck OK | 0824008c9
[x] P1 | imaging visiograph-ai body guard (null/non-object/empty → 400 Missing imageBase64, not 500) | imaging.ts + visiographBody.test.ts | 5/5 GREEN typecheck OK | 51d0562f0
[x] P1 | settings staff credentials body Zod (null/typed non-string → 400 not 500; empty msg preserved) | settings.ts + staffCredentialsBody.test.ts | 6/6 GREEN typecheck OK | a1f92626d
[x] P1 | auth clinic/login+staff/unlock body Zod (null/typed → 400 not 500; RU msgs preserved; pin number OK) | auth.ts + clinicStaffAuthBody.test.ts | 10/10 GREEN typecheck OK | a1c48e715
[x] P1 | auth set-password/set-pin/setup-init body Zod (AUTH-first 403 anon; authorized/public 400 not 500; RU msgs preserved) | auth.ts + authAdminSetupBody.test.ts | 17/17 GREEN typecheck OK | b01f3cbcd
[x] P1 | patient card body Zod (reclamations/tickets/archive-status; AUTH-first 401; empty→400≠500) | patients.ts + patientCardBody.test.ts | 10/10 GREEN typecheck OK | 8a50b0610
[x] P1 | next bare-cast body Zod (ai predict-no-show, clinical recent-patients, diary lock/revise, templates, receipts asRecord, outbox dispatch; AUTH-first; empty/array->400!=500) | ai+clinical+diary+templates+comms + nextCastsBody.test.ts | 17/17 GREEN typecheck OK | dad4d596e
[x] P1 | egisz snils + vk webhook + workspace preset body guards (AUTH-first; null/array; InvalidSnils* preserved) | egisz+vk+workspaceProfile + egiszVkBody.test.ts | 13/13 GREEN typecheck OK | c564d6fd9
[x] P1 | leads+finance_family+sterilization body Zod (AUTH-first; null/array→400≠500; RU ValidationError) | leads.ts+finance_family.ts+sterilization.ts + leadsFinanceSterilBody.test.ts | 20/20 GREEN typecheck OK | a0eb58194

[x] P1 | diary POST /api/diaries upsert body Zod (AUTH-first; null/array/{}→400≠500; RU ValidationError) | diary.ts + nextCastsBody.test.ts | 22/22 GREEN typecheck OK | 18050f0ec
[x] P0 | diary gameplay: doSave → POST /api/diaries (not visit draft/autosave); return id for doLock; message-first RU toasts | useVisitDiaryLogic.ts | ee9c055a9
[x] P1 | workspace profile POST body Zod (AUTH→safeParse→org; array/string→400 RU≠500/404) + saveWorkspaceFlags message-first gameplay | workspaceProfile.ts + useWorkspaceProfile.ts + egiszVkBody.test.ts | 17/17 GREEN | c61e6cc36
[x] P1 | ScannerView sterilization message-first RU (payload.message Cyrillic; StaffAuthRequired kept) | ScannerView.tsx | 36dc0ce02
[x] P1 | LeadsKanban message-first RU (leadsFailureMessage + toast on drag/edit; convert already OK) | leadsStore.ts + LeadsKanbanView.tsx | 36dc0ce02
[x] P1 | API EN 500→RU message (files/waitlist/lab/inventory reply.send) | files.ts waitlist.ts lab.ts inventory.ts + en500ReplyMessageRu.test.ts | afb0fa8f0
[x] P1 | useWorkspaceProfile applyWorkspacePreset message-first RU (no Failed to apply preset) | useWorkspaceProfile.ts | 28b2cef0f
[x] P1 | ScheduleView DayConfirmations+FreedSlots panels + Settings messengers tab wire | ScheduleView.tsx SettingsView.tsx | 3f7dbcd6b
[x] P0 | Schedule clipboard end-to-end (API writers + panel + AppointmentCard «В буфер» + ScheduleView toolbar) | schedule.ts + ScheduleClipboardPanel + AppointmentCard + ScheduleView | cd3fe5a69 typecheck GREEN; scheduleMutationGuard 6/6 (clipboard POST/DELETE/paste under admin secret)
[x] P1 | hasClinicalRules default true (API workspace + web DEFAULT_FLAGS) | workspaceProfile.ts + useWorkspaceProfile.ts | cd3fe5a69 flipped both defaults


[x] P2 | TODO/FIXME in settings components | apps/web/src/components/settings | none real (CSS .shift-todo only)



[x] P2 | Push main after each green commit | origin main | auth Zod pushed (0789876b9)


# replenish sources when empty:
# - UNVERIFIED markers
# - compiler warnings
# - orphan modules
# - generators never run


# SALVAGED FIXES FROM CLOSED PRs

## Salvaged fix from closed PR #570
- **Branch**: `code-health-remove-route-comments-3973124828772554239`
- **Title**: 🧹 [code health improvement] Remove dead route signature comments from templates route
- **Files Modified**:
  - `apps/api/src/routes/templates.ts` (172 lines added):
    > requireClinicalMutationAccess,
    > requireClinicalReadAccess,
    > resolveOrganizationId,
    > "список протоколов приёма не открыть",
    > "протокол приёма не открыть",
    > "новый протокол приёма не сохранить",
    > "заполненная форма остаётся на экране",
    > "удалить протокол приёма нельзя",
    > "встроенные протоколы приёма не установить",
    > "Этот протокол приёма не найден в вашей клинике. Так бывает, если его удалили, пока список был открыт на экране. Обновите список протоколов и выберите протокол заново.";

## Salvaged fix from closed PR #569
- **Branch**: `fix-shiftview-comments-9977644615051067169`
- **Title**: 🧹 [code health improvement] Remove historical changelog comments in ShiftView
- **Files Modified**:
  - `apps/web/src/ShiftView.tsx` (1145 lines added):
    > import { PatientAvatar } from "./components/PatientAvatar";
    > import { EmptyState } from "./components/EmptyState";
    > Info,
    > import {
    > formatShortDate,
    > money,
    > minutesLabel,
    > patientInsightRiskLabels,
    > } from "./AppHelpers";
    > return Number.isNaN(parsed.getTime())

## Salvaged fix from closed PR #567
- **Branch**: `test-levenshtein-distance-3426668440697656332`
- **Title**: 🧪 [testing improvement] Add tests for levenshteinDistance
- **Files Modified**:
  - `apps/api/src/services/ingestion/IdentityResolutionEngine.ts` (72 lines added):
    > export class IdentityResolutionEngine {
    > static levenshteinDistance(a: string, b: string): number {
    > if (a.length === 0) return b.length;
    > if (b.length === 0) return a.length;
    > const matrix = Array.from({ length: a.length + 1 }, () => new Array(b.length + 1).fill(0));
    > for (let i = 0; i <= a.length; i++) matrix[i]![0] = i;
    > for (let j = 0; j <= b.length; j++) matrix[0]![j] = j;
    > for (let i = 1; i <= a.length; i++) {
    > for (let j = 1; j <= b.length; j++) {
    > const cost = a[i - 1] === b[j - 1] ? 0 : 1;

## Salvaged fix from closed PR #562
- **Branch**: `code-health/remove-pricelistmatcher-comments-13359801031893125471`
- **Title**: 🧹 [code health improvement] Remove unnecessary configuration comments in PriceListMatcher
- **Files Modified**:
  - `apps/api/src/treatment/PriceListMatcher.ts` (2 lines added):
    > { name: "aliases", weight: 0.9 },
    > threshold: 0.4,

## Salvaged fix from closed PR #559
- **Branch**: `test-parse-preferred-weekday-11292030645725471312`
- **Title**: 🧪 Add comprehensive tests for parsePreferredWeekday
- **Files Modified**:
  - `apps/api/src/services/schedule/waitlistMatching.ts` (1 lines added):
    > if (typeof raw === "number") return null; // intentional bug

## Salvaged fix from closed PR #558
- **Branch**: `code-health/remove-oblique-snap-comment-17801685322905399077`
- **Title**: 🧹 Remove commented-out oblique snap code in Cornerstone3DViewer
- **Files Modified**:
  - `apps/web/src/components/dicom/Cornerstone3DViewer.tsx` (488 lines added):
    > import {
    > PanoramicRendererWindow,
    > type PanoramicVolumeInput,
    > } from "./PanoramicRendererWindow";
    > boneDensity: { averageHU: number; classification: string };
    > startWorld: vec3.fromValues(
    > implant.startWorld[0],
    > implant.startWorld[1],
    > implant.startWorld[2],
    > ),

## Salvaged fix from closed PR #557
- **Branch**: `perf-optimize-doctor-performance-17649089425278093903`
- **Title**: ⚡ Optimize doctorPerformance queries with Promise.all
- **Files Modified**:
  - `.data/dental-crm-state.json` (757 lines added):
    > "savedAt": "2026-07-29T22:33:10.883Z",
    > "clinicName": "Стоматология, 1 кабинет",
    > "legalName": "ИП Иванова М.С.",
    > "inn": "631234567890",
    > "ogrn": "318631300000000",
    > "address": "Самара, ул. Демонстрационная, 12",
    > "phone": "+7 927 111-22-33",
    > "email": "clinic@example.com",
    > "website": "https://example.com",
    > "medicalLicenseNumber": "Л041-01184-63/00000000",
  - `.data/speech-key-health.json` (8 lines added):
    > "savedAt": "2026-07-29T22:31:54.849Z",
    > "google_speech:26987e457b44": {
    > "cooldownUntil": 0,
    > "failures": 0,
    > "successes": 1,
    > "lastUsedAt": 1785364314849,
    > "lastStatusCode": null,
    > "lastError": null
  - `packages/shared/dist/index.js` (130 lines added):
    > const kopecksAreExact = (value) => Number.isFinite(value) && Math.abs(value * 100 - Math.round(value * 100)) < 1e-6;
    > export const moneyRubSchema = z
    > .number()
    > .refine(kopecksAreExact, { message: "сумма указывается с точностью до копейки" });
    > export const positiveMoneyRubSchema = moneyRubSchema.refine((value) => value > 0, {
    > message: "сумма должна быть больше нуля"
    > });
    > export const nonNegativeMoneyRubSchema = moneyRubSchema.refine((value) => value >= 0, {
    > message: "сумма не может быть отрицательной"
    > });
  - `perf_bench.ts` (21 lines added):
    > import { doctorPerformance } from './apps/api/src/services/reports/managerReports';
    > async function run() {
    > const scope = {
    > organizationId: 'org-test',
    > from: new Date('2020-01-01'),
    > to: new Date('2030-01-01'),
    > timeZone: 'UTC'
    > };
    > try {
    > await doctorPerformance(scope).catch(() => {});
  - `scratch.ts` (1 lines added):
    > import { db } from './apps/api/src/db/client.js';

## Salvaged fix from closed PR #555
- **Branch**: `perf-bulk-insert-patient-imports-4812499985887216910`
- **Title**: ⚡ Resolve N+1 query in Patient Imports
- **Files Modified**:
  - `apps/api/src/routes/imports.ts` (184 lines added):
    > normalizeDate,
    > import {
    > requireClinicalMutationContext,
    > requireClinicalReadContext,
    > } from "../accessGuard.js";
    > const headerAliases: Record<
    > string,
    > keyof Pick<ImportPreviewRow, "fullName" | "phone" | "birthDate" | "notes">
    > > = {
    > фио: "fullName",

## Salvaged fix from closed PR #552
- **Branch**: `fix-drop-constraints-logs-16443840779344071698`
- **Title**: 🧹 Remove leftover console.logs in drop_constraints_pglite.ts
- **СТАТУС 2026-08-06: УТРАТИЛО СИЛУ — целевой файл удалён.** `apps/api/drop_constraints_pglite.ts`
  снесён коммитом `8dba4744c` («chore(api): remove obsolete root scratch migration scripts») вместе с
  остальными корневыми scratch-скриптами. Правку применять некуда. Запись оставлена как история
  закрытого PR, а не как задача. Заодно: PGlite в проекте нет — движок нативный PostgreSQL 18.4
  (`.agents/DATABASE.md`).
- **Files Modified**:
  - `apps/api/drop_constraints_pglite.ts` (2 lines added):
    > } catch(e) { /* ignore expected error if constraint does not exist */ }
    > } catch(e) { /* ignore expected error if constraint does not exist */ }

## Salvaged fix from closed PR #550
- **Branch**: `fix-public-booking-dead-comments-14411843600716509679`
- **Title**: 🧹 [code health improvement] Remove dead comments explaining past bugs in publicBooking route
- **Files Modified**:
  - `apps/api/src/routes/publicBooking.ts` (554 lines added):
    > appointments,
    > clinics,
    > organizations,
    > patients,
    > users,
    > import {
    > schemaIssuePhrase,
    > schemaRefusalMessage,
    > } from "../utils/schemaRefusalWords.js";
    > const now = Date.now();

## Salvaged fix from closed PR #549
- **Branch**: `code-health/remove-migrate-console-logs-11441343709773525889`
- **Title**: 🧹 Remove leftover console.logs from migrate.ts
- **СТАТУС 2026-08-06: УТРАТИЛО СИЛУ — целевой файл удалён.** Речь про корневой
  `apps/api/migrate.ts` (PGlite-скрипт), снесённый коммитом `8dba4744c`. **Не путать с живым раннером
  `apps/api/src/scripts/migrate.ts`** — это другой файл, он работает через `node-postgres` и никакого
  `new PGlite(...)` в нём нет. Запись оставлена как история закрытого PR.
- **Files Modified**:
  - `apps/api/migrate.ts` (24 lines added):
    > const client = new PGlite("./dente-db");
    > try {
    > await client.query(
    > `ALTER TABLE "clinics" ADD COLUMN "marketing_settings" jsonb;`,
    > );
    > } catch (e) {
    > }
    > try {
    > await client.query(
    > `ALTER TABLE "clinics" ADD COLUMN "reporting_settings" jsonb;`,

## Salvaged fix from closed PR #539
- **Branch**: `chore/remove-mprmath-comments-876246097547690608`
- **Title**: 🧹 [Code Health] Remove commented-out explanation in mprMath.ts
- **Files Modified**:
  - `apps/web/src/mprMath.ts` (98 lines added):
    > m4[0] = m3[0] ?? 0;
    > m4[1] = m3[1] ?? 0;
    > m4[2] = m3[2] ?? 0;
    > m4[3] = 0;
    > m4[4] = m3[3] ?? 0;
    > m4[5] = m3[4] ?? 0;
    > m4[6] = m3[5] ?? 0;
    > m4[7] = 0;
    > m4[8] = m3[6] ?? 0;
    > m4[9] = m3[7] ?? 0;

## Salvaged fix from closed PR #531
- **Branch**: `fix-leftover-console-log-1848421230680775269`
- **Title**: 🧹 [code health] Remove leftover console.log in backupWorker
- **Files Modified**:
  - `apps/api/src/services/backupWorker.ts` (184 lines added):
    > success: boolean;
    > filePath?: string;
    > error?: string;
    > return (
    > process.env.DENTE_BACKUP_DIR?.trim() ||
    > path.resolve(process.cwd(), "../../backups")
    > );
    > const raw = process.env.CLINIC_ENCRYPTION_KEY?.trim();
    > if (!raw) {
    > return {

## Salvaged fix from closed PR #529
- **Branch**: `performance/workspace-profile-bulk-insert-1738597313535215752`
- **Title**: ⚡ Optimize workspace patient seeding with bulk inserts
- **Files Modified**:
  - `apps/api/src/routes/workspaceProfile.ts` (80 lines added):
    > export function workspaceFlagsFromStorage(
    > stored: unknown,
    > ): WorkspaceFeatureFlags {
    > const source =
    > stored && typeof stored === "object"
    > ? (stored as Record<string, unknown>)
    > : {};
    > const result = { ...DEFAULT_WORKSPACE_FEATURE_FLAGS } as Record<
    > string,
    > unknown

## Salvaged fix from closed PR #527
- **Branch**: `jules-testing-improvement-9506389929483520903`
- **Title**: 🧪 [testing improvement] Cover edge cases in addressableName formatting
- **Files Modified**:
  - `apps/api/.data/speech-key-health.json` (3 lines added):
    > "savedAt": "2026-07-29T20:33:33.812Z",
    > "successes": 264,
    > "lastUsedAt": 1785357213812,
  - `packages/shared/dist/index.js` (130 lines added):
    > const kopecksAreExact = (value) => Number.isFinite(value) && Math.abs(value * 100 - Math.round(value * 100)) < 1e-6;
    > export const moneyRubSchema = z
    > .number()
    > .refine(kopecksAreExact, { message: "сумма указывается с точностью до копейки" });
    > export const positiveMoneyRubSchema = moneyRubSchema.refine((value) => value > 0, {
    > message: "сумма должна быть больше нуля"
    > });
    > export const nonNegativeMoneyRubSchema = moneyRubSchema.refine((value) => value >= 0, {
    > message: "сумма не может быть отрицательной"
    > });

## Salvaged fix from closed PR #526
- **Branch**: `perf-waitlist-weekdays-true-9605777987176841602`
- **Title**: ⚡ Optimize wantedWeekdays lookup in waitlist matching
- **Files Modified**:
  - `apps/api/src/services/schedule/waitlistMatching.ts` (20 lines added):
    > const rangesArray = Array.isArray(row.preferredTimeRanges) ? row.preferredTimeRanges : [];
    > let dayFits = rangesArray.length === 0;
    > if (!dayFits) {
    > let found = false;
    > let hasValidDay = false;
    > for (let i = 0; i < rangesArray.length; i++) {
    > const item = rangesArray[i];
    > if (item && typeof item === "object") {
    > const day = parsePreferredWeekday((item as Record<string, unknown>).day);
    > if (day !== null) {

## Salvaged fix from closed PR #523
- **Branch**: `fix-notification-n1-7166612468703291580`
- **Title**: ⚡ [performance improvement] fix(api): optimize notification queue database updates
- **Files Modified**:
  - `apps/api/src/services/notificationWorker.ts` (124 lines added):
    > import {
    > outgoingNotifications,
    > denteTelegramChatLinks,
    > denteTelegramBotConfigs,
    > } from "../db/schema.js";
    > organizationId: string;
    > patientId: string;
    > type: string;
    > payload: any;
    > scheduledAt?: Date;

## Salvaged fix from closed PR #518
- **Branch**: `fix-colloquial-time-parsing-13653597019292396190`
- **Title**: 🧹 Fix parsing of colloquial time expressions with 'пол'
- **Files Modified**:
  - `.data/dental-crm-state.json` (74 lines added):
    > "savedAt": "2026-07-29T20:36:33.191Z",
    > "currency": "₽",
    > "themeColor": "teal",
    > "logoUrl": null,
    > "stampUrl": null,
    > "hasAssistants": true,
    > "hasMultipleChairs": true,
    > "hasDentalLab": true,
    > "hasInsuranceCoPay": true,
    > "hasInstallments": true,
  - `.data/speech-key-health.json` (8 lines added):
    > "savedAt": "2026-07-29T20:35:25.121Z",
    > "google_speech:26987e457b44": {
    > "cooldownUntil": 0,
    > "failures": 0,
    > "successes": 2,
    > "lastUsedAt": 1785357325121,
    > "lastStatusCode": null,
    > "lastError": null
  - `apps/api/src/ai/localDictationParser.ts` (1 lines added):
    > m = text.match(/(?<=^|[^а-яё])(пол(?:овин[аеу])?[\s\-]*|четверть\s+)([а-яё]+)/i);
  - `packages/shared/dist/index.js` (130 lines added):
    > const kopecksAreExact = (value) => Number.isFinite(value) && Math.abs(value * 100 - Math.round(value * 100)) < 1e-6;
    > export const moneyRubSchema = z
    > .number()
    > .refine(kopecksAreExact, { message: "сумма указывается с точностью до копейки" });
    > export const positiveMoneyRubSchema = moneyRubSchema.refine((value) => value > 0, {
    > message: "сумма должна быть больше нуля"
    > });
    > export const nonNegativeMoneyRubSchema = moneyRubSchema.refine((value) => value >= 0, {
    > message: "сумма не может быть отрицательной"
    > });

## Salvaged fix from closed PR #517
- **Branch**: `fix/remove-migrate-console-logs-13955975131268310997`
- **Title**: 🧹 refactor: remove spammy console logs in migration script
- **СТАТУС 2026-08-06: УТРАТИЛО СИЛУ — целевой файл удалён.** Корневой `apps/api/migrate.ts`
  (PGlite-скрипт) снесён коммитом `8dba4744c`. Живой раннер — `apps/api/src/scripts/migrate.ts`, это
  другой файл. Запись оставлена как история закрытого PR.
- **Files Modified**:
  - `apps/api/migrate.ts` (24 lines added):
    > const client = new PGlite("./dente-db");
    > try {
    > await client.query(
    > `ALTER TABLE "clinics" ADD COLUMN "marketing_settings" jsonb;`,
    > );
    > } catch (e) {
    > }
    > try {
    > await client.query(
    > `ALTER TABLE "clinics" ADD COLUMN "reporting_settings" jsonb;`,

## Salvaged fix from closed PR #516
- **Branch**: `jules-155648292377404905-a05c3aba`
- **Title**: 🧹 Remove leftover console.log in migrate.ts
- **СТАТУС 2026-08-06: УТРАТИЛО СИЛУ — целевой файл удалён.** Корневой `apps/api/migrate.ts`
  снесён коммитом `8dba4744c`. Живой раннер — `apps/api/src/scripts/migrate.ts`. Запись оставлена
  как история закрытого PR.
- **Files Modified**:
  - `apps/api/migrate.ts` (4 lines added):
    > } catch {}
    > } catch {}
    > } catch {}
    > } catch {}

## Salvaged fix from closed PR #515
- **Branch**: `perf/bulk-insert-workspace-seed-10594053989321798642`
- **Title**: ⚡ perf: optimize N+1 query in workspace visit seeding
- **Files Modified**:
  - `apps/api/src/routes/workspaceProfile.ts` (91 lines added):
    > export function workspaceFlagsFromStorage(
    > stored: unknown,
    > ): WorkspaceFeatureFlags {
    > const source =
    > stored && typeof stored === "object"
    > ? (stored as Record<string, unknown>)
    > : {};
    > const result = { ...DEFAULT_WORKSPACE_FEATURE_FLAGS } as Record<
    > string,
    > unknown

## Salvaged fix from closed PR #514
- **Branch**: `jules-fix-colloquial-time-parsing-6109630629763180349`
- **Title**: 🧹 fix(dictation): handle modifiers for colloquial time expressions
- **Files Modified**:
  - `.data/speech-key-health.json` (8 lines added):
    > "savedAt": "2026-07-29T20:40:44.414Z",
    > "google_speech:26987e457b44": {
    > "cooldownUntil": 0,
    > "failures": 0,
    > "successes": 1,
    > "lastUsedAt": 1785357644414,
    > "lastStatusCode": null,
    > "lastError": null
  - `apps/api/src/ai/localDictationParser.ts` (14 lines added):
    > const hourMap: Record<string, number> = { "пер": 12, "вто": 13, "тре": 14, "чет": 15, "пят": 16, "шес": 17, "сед": 18, "вос": 19, "дев": 8, "дес": 9, "оди": 10, "две": 11 };
    > let h = hourMap[word];
    > if (h !== undefined) {
    > if (text.includes("ночи")) {
    > if (h >= 12) h -= 12; // 12 -> 0, 1 -> 1, 2 -> 2
    > else if (h === 11) h += 12; // 11:30 ночи = 23:30
    > } else if (text.includes("дня")) {
    > if (h < 11) h += 12; // 8-10 -> 20-22
    > } else {
    > if (text.includes("утра") && h >= 12) h -= 12;

## Salvaged fix from closed PR #513
- **Branch**: `fix-setup-fresh-db-password-6372928070570540421`
- **Title**: 🔒 Fix hardcoded password in setup-fresh-db.ts
- **Files Modified**:
  - `apps/api/src/scripts/setup-fresh-db.ts` (37 lines added):
    > const SQL_FILE = path.resolve(
    > __dirname,
    > "../../drizzle/0000_freezing_randall_flagg.sql",
    > );
    > process.exit(1);
    > extensions: { electric: electricSync() },
    > .split(/-->\s*statement-breakpoint/gi)
    > .map((s) => s.trim())
    > .filter(Boolean);
    > try {

## Salvaged fix from closed PR #510
- **Branch**: `fix-dictation-time-parser-17284312605275932740`
- **Title**: Fix local dictation parsing for 'полпервого' / 'пол первого'
- **Files Modified**:
  - `apps/api/src/ai/localDictationParser.ts` (2 lines added):
    > m = text.match(/(?:(?:^|\s)(пол(?:овин[аеу])?|четверть)[\s\-]*)(перв|втор|трет|четверт|пят|шест|седьм|восьм|девят|десят|одиннадцат|двенадцат)[а-яё]*/i);
    > const word = (m[2] ?? "").substring(0, 3).toLowerCase();

## Salvaged fix from closed PR #509
- **Branch**: `perf-optimize-splitline-8793014319858349775`
- **Title**: ⚡ [performance improvement] Optimize splitLine with standard split and array join
- **Files Modified**:
  - `packages/shared/dist/index.js` (130 lines added):
    > const kopecksAreExact = (value) => Number.isFinite(value) && Math.abs(value * 100 - Math.round(value * 100)) < 1e-6;
    > export const moneyRubSchema = z
    > .number()
    > .refine(kopecksAreExact, { message: "сумма указывается с точностью до копейки" });
    > export const positiveMoneyRubSchema = moneyRubSchema.refine((value) => value > 0, {
    > message: "сумма должна быть больше нуля"
    > });
    > export const nonNegativeMoneyRubSchema = moneyRubSchema.refine((value) => value >= 0, {
    > message: "сумма не может быть отрицательной"
    > });
  - `packages/shared/dist/utils/strings.js` (12 lines added):
    > if (delimiter === "") {
    > return [line];
    > }
    > if (line.indexOf('"') === -1) {
    > return line.split(delimiter).map((v) => v.trim());
    > }
    > const current = [];
    > values.push(current.join("").trim());
    > current.length = 0;
    > current.push(char);
  - `packages/shared/src/utils/strings.ts` (23 lines added):
    > if (delimiter === "") {
    > return [line];
    > }
    > if (line.indexOf('"') === -1) {
    > return line.split(delimiter).map((v) => v.trim());
    > }
    > const current: string[] = [];
    > const char = line[index] as string;
    > values.push(current.join("").trim());
    > current.length = 0;

## Salvaged fix from closed PR #507
- **Branch**: `test/waitlist-matching-1887540507137609843`
- **Title**: 🧪 [testing improvement] Add comprehensive tests for slotFitsRanges
- **Files Modified**:
  - `.data/dental-crm-state.json` (74 lines added):
    > "savedAt": "2026-07-29T20:34:41.144Z",
    > "currency": "₽",
    > "themeColor": "teal",
    > "logoUrl": null,
    > "stampUrl": null,
    > "hasAssistants": true,
    > "hasMultipleChairs": true,
    > "hasDentalLab": true,
    > "hasInsuranceCoPay": true,
    > "hasInstallments": true,
  - `.data/speech-key-health.json` (8 lines added):
    > "savedAt": "2026-07-29T20:33:38.801Z",
    > "google_speech:26987e457b44": {
    > "cooldownUntil": 0,
    > "failures": 0,
    > "successes": 1,
    > "lastUsedAt": 1785357218801,
    > "lastStatusCode": null,
    > "lastError": null
  - `packages/shared/dist/index.js` (130 lines added):
    > const kopecksAreExact = (value) => Number.isFinite(value) && Math.abs(value * 100 - Math.round(value * 100)) < 1e-6;
    > export const moneyRubSchema = z
    > .number()
    > .refine(kopecksAreExact, { message: "сумма указывается с точностью до копейки" });
    > export const positiveMoneyRubSchema = moneyRubSchema.refine((value) => value > 0, {
    > message: "сумма должна быть больше нуля"
    > });
    > export const nonNegativeMoneyRubSchema = moneyRubSchema.refine((value) => value >= 0, {
    > message: "сумма не может быть отрицательной"
    > });

## Salvaged fix from closed PR #505
- **Branch**: `fix-local-dictation-time-parser-2433554812062406363`
- **Title**: 🐛 [fix] Correct local dictation parser explicit time extraction
- **Files Modified**:
  - `apps/api/src/ai/localDictationParser.ts` (4 lines added):
    > const explicitMatches = [...text.matchAll(/(?:в|на)\s*(\d{1,2}|[а-яё]+)(?:\s*(?:час|утра|дня|вечера))?(?!\s*\d)/gi)];
    > for (const match of explicitMatches) {
    > let h = parseInt(match[1] as string, 10);
    > if (isNaN(h)) h = parseWordNumber(match[1] as string) || 0;

## Salvaged fix from closed PR #503
- **Branch**: `testing-improve-sms-payload-edge-cases-4152881603525431415`
- **Title**: 🧪 [testing improvement] Cover SMS payload edge cases
- **Files Modified**:
  - `.data/dental-crm-state.json` (74 lines added):
    > "savedAt": "2026-07-29T20:31:08.917Z",
    > "currency": "₽",
    > "themeColor": "teal",
    > "logoUrl": null,
    > "stampUrl": null,
    > "hasAssistants": true,
    > "hasMultipleChairs": true,
    > "hasDentalLab": true,
    > "hasInsuranceCoPay": true,
    > "hasInstallments": true,
  - `.data/speech-key-health.json` (8 lines added):
    > "savedAt": "2026-07-29T20:30:06.164Z",
    > "google_speech:26987e457b44": {
    > "cooldownUntil": 0,
    > "failures": 0,
    > "successes": 1,
    > "lastUsedAt": 1785357006164,
    > "lastStatusCode": null,
    > "lastError": null
  - `packages/shared/dist/index.js` (130 lines added):
    > const kopecksAreExact = (value) => Number.isFinite(value) && Math.abs(value * 100 - Math.round(value * 100)) < 1e-6;
    > export const moneyRubSchema = z
    > .number()
    > .refine(kopecksAreExact, { message: "сумма указывается с точностью до копейки" });
    > export const positiveMoneyRubSchema = moneyRubSchema.refine((value) => value > 0, {
    > message: "сумма должна быть больше нуля"
    > });
    > export const nonNegativeMoneyRubSchema = moneyRubSchema.refine((value) => value >= 0, {
    > message: "сумма не может быть отрицательной"
    > });

## Salvaged fix from closed PR #500
- **Branch**: `fix/explicit-time-matching-12552457096991234595`
- **Title**: fix: localDictationParser explicit time matching logic
- **Files Modified**:
  - `apps/api/src/ai/localDictationParser.ts` (4 lines added):
    > const explicitMatches = [...text.matchAll(/(?:в|на)\s*(\d{1,2}|[а-яё]+)(?:\s*(?:час|часов|утра|дня|вечера))?(?!\s*\d)/gi)];
    > for (const match of explicitMatches) {
    > let h = parseInt(match[1] as string, 10);
    > if (isNaN(h)) h = parseWordNumber(match[1] as string) || 0;
