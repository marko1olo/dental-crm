import { readFileSync } from "node:fs";

const appSource = readFileSync("apps/web/src/App.tsx", "utf8");
const scheduleSource = readFileSync("apps/web/src/ScheduleView.tsx", "utf8");
const cssSource = readFileSync("apps/web/src/styles/main.css", "utf8");

function requireIn(source, needle, message) {
  if (!source.includes(needle)) throw new Error(message);
}

function forbidIn(source, needle, message) {
  if (source.includes(needle)) throw new Error(message);
}

requireIn(appSource, 'lazy(() => import("./ScheduleView")', "App.tsx must lazy-load ScheduleView.");
requireIn(appSource, "<ScheduleView", "App.tsx must render the lazy schedule boundary.");
forbidIn(appSource, 'className="schedule-command-grid"', "App.tsx must not inline schedule command cards.");
forbidIn(appSource, "sortedAppointments.map((appointment", "App.tsx must not inline appointment rows.");

requireIn(scheduleSource, "export function ScheduleView", "ScheduleView must export the route component.");
requireIn(scheduleSource, "type ScheduleViewProps = {", "ScheduleView props must stay explicitly typed.");
requireIn(scheduleSource, '<div className="panel schedule-panel" id="schedule">', "ScheduleView must own schedule panel.");
requireIn(scheduleSource, 'className="schedule-command-grid"', "ScheduleView must preserve schedule command cards.");
requireIn(scheduleSource, "highestUtilizationLoad", "ScheduleView must compute busiest resources without mutating dashboard loads.");
requireIn(scheduleSource, "scheduleFilteredSummary", "ScheduleView must produce a plain-language filtered shift summary.");
requireIn(scheduleSource, "scheduleLoadSummaryCards", "ScheduleView must render operator-readable schedule summary cards.");
requireIn(scheduleSource, 'data-testid="schedule-shift-summary"', "ScheduleView must expose an addressable shift summary.");
requireIn(scheduleSource, 'aria-label="Короткая сводка смены"', "Schedule shift summary must be named for assistive technology.");
requireIn(scheduleSource, 'aria-live="polite"', "Schedule shift summary must announce filter and workload changes politely.");
requireIn(scheduleSource, "sortedAppointments.map((appointment", "ScheduleView must preserve appointment rows.");
requireIn(scheduleSource, "saveAppointmentSchedule", "ScheduleView must preserve appointment save action.");
requireIn(scheduleSource, "createAppointmentFromDraft", "ScheduleView must preserve quick appointment creation.");
requireIn(scheduleSource, "todayScheduleDate", "ScheduleView must centralize the clinic-timezone today shortcut.");
requireIn(scheduleSource, "resetScheduleFilters", "ScheduleView must expose a one-click filter recovery path.");
requireIn(scheduleSource, "focusNewAppointmentEditor", "ScheduleView must help admins jump from empty results to new appointment creation.");
requireIn(scheduleSource, "openScheduleSuggestion", "ScheduleView suggestions must actively scroll to their target section.");
requireIn(scheduleSource, "newAppointmentMissingSteps", "ScheduleView must explain missing fields before creating an appointment.");
requireIn(scheduleSource, "appointmentDraftMissingSteps", "ScheduleView must explain missing fields before saving an edited appointment.");
requireIn(scheduleSource, "!draft.patientId ? \"выберите пациента\" : null", "ScheduleView edited appointments must require a patient before saving.");
requireIn(scheduleSource, "!draft.doctorUserId ? \"выберите врача\" : null", "ScheduleView edited appointments must require a doctor before saving.");
requireIn(scheduleSource, "!draft.chairId ? \"выберите кресло\" : null", "ScheduleView edited appointments must require a chair before saving.");
requireIn(scheduleSource, "schedule-create-missing", "ScheduleView must render the appointment creation missing-field panel.");
requireIn(scheduleSource, "schedule-save-missing", "ScheduleView must render the appointment edit missing-field panel.");
requireIn(scheduleSource, "disabled={newAppointmentSaveState === \"saving\" || !newAppointmentReadyToCreate}", "ScheduleView must block incomplete appointment creation.");
requireIn(scheduleSource, 'id="new-appointment-create-missing"', "New appointment missing-field guidance must be addressable.");
requireIn(scheduleSource, 'aria-describedby={!newAppointmentReadyToCreate ? "new-appointment-create-missing" : undefined}', "New appointment create button must point to missing-field guidance.");
requireIn(scheduleSource, "disabled={appointmentSaveState === \"saving\" || !appointmentReadyToSave}", "ScheduleView must block invalid appointment edits.");
requireIn(scheduleSource, "aria-busy={appointmentSaveState === \"saving\" || undefined}", "Schedule appointment save button must expose busy state.");
requireIn(scheduleSource, "appointmentSaveMissingId", "ScheduleView must create a stable guidance id for each edited appointment.");
requireIn(scheduleSource, "id={appointmentSaveMissingId}", "Appointment edit missing-date guidance must be addressable.");
requireIn(scheduleSource, "aria-describedby={!appointmentReadyToSave && appointmentMissingSteps.length ? appointmentSaveMissingId : undefined}", "Appointment save button must point to missing-field guidance.");
requireIn(scheduleSource, "const appointmentEditorId = `appointment-editor-${appointment.id}`;", "ScheduleView must create a stable editor id for each appointment row.");
requireIn(scheduleSource, "activeVisitLockedAppointmentStatuses", "ScheduleView must declare active-visit terminal statuses for handoff safety.");
requireIn(scheduleSource, "const appointmentHasOpenVisit = appointment.id === dashboard.activeVisit.appointmentId && dashboard.activeVisit.status === \"draft\";", "ScheduleView must detect rows linked to an open visit.");
requireIn(scheduleSource, "const appointmentActiveVisitStatusLocked =", "ScheduleView must block terminal status drafts while the visit is open.");
requireIn(scheduleSource, "const appointmentPatientName = patientName(dashboard.patients, appointment.patientId);", "ScheduleView must compute one appointment patient name for row text and accessible actions.");
requireIn(scheduleSource, "<h3>{appointmentPatientName}</h3>", "Schedule appointment rows must render the same patient name used by accessible actions.");
requireIn(scheduleSource, "handoff-lock", "Schedule rows must visibly mark the open-visit patient handoff lock.");
requireIn(scheduleSource, "appointment-handoff-note", "Schedule editor must explain why the patient/status handoff is locked.");
requireIn(scheduleSource, "закройте прием перед закрывающим статусом записи", "Schedule editor must explain the active-visit terminal status blocker.");
requireIn(scheduleSource, "aria-expanded={appointmentEditing}", "Schedule appointment edit buttons must expose whether the editor is open.");
requireIn(scheduleSource, "aria-controls={appointmentEditorId}", "Schedule appointment edit buttons must point to the editor they open.");
requireIn(scheduleSource, "aria-label={`Настроить запись: ${appointmentPatientName}, ${formatTime(appointment.startsAt)}-${formatTime(appointment.endsAt)}`}", "Repeated schedule edit buttons must name the exact appointment.");
requireIn(scheduleSource, "title={`Настроить запись: ${appointmentPatientName}, ${formatTime(appointment.startsAt)}-${formatTime(appointment.endsAt)}`}", "Repeated schedule edit buttons must expose the exact appointment in their hover hint.");
requireIn(scheduleSource, "id={appointmentEditorId}", "Appointment editor id must match the edit button controls relationship.");
requireIn(scheduleSource, "aria-label={`Редактирование записи: ${appointmentPatientName}`}", "Appointment editor must name the appointment being edited.");
requireIn(scheduleSource, "aria-describedby={appointmentHasOpenVisit ? appointmentHandoffNoteId : undefined}", "Locked active-visit patient selector must point to handoff guidance.");
requireIn(scheduleSource, "disabled={appointmentHasOpenVisit && activeVisitLockedAppointmentStatuses.has(status)}", "Active-visit appointment status select must block terminal status options.");
requireIn(scheduleSource, "const adminSecretReady = scheduleAdminSecretDraft.trim().length > 0;", "ScheduleView must use a named admin unlock readiness guard.");
requireIn(scheduleSource, 'aria-describedby={!adminSecretReady ? "schedule-admin-unlock-guidance" : undefined}', "Schedule admin unlock input must point to missing-secret guidance.");
requireIn(scheduleSource, "Секрет администратора клиники для сохранения расписания", "Schedule admin unlock label must be operator-readable.");
requireIn(scheduleSource, 'placeholder="введите секрет администратора"', "Schedule admin unlock placeholder must not expose the raw header name.");
forbidIn(scheduleSource, "x-dente-admin-secret", "Schedule admin unlock must not expose the raw header name.");
requireIn(scheduleSource, 'id="schedule-admin-unlock-guidance"', "ScheduleView must render missing admin secret guidance.");
requireIn(scheduleSource, "Введите секрет администратора клиники, чтобы сохранять расписание.", "Schedule admin unlock guidance must explain why the secret is needed.");
requireIn(scheduleSource, "Этот секрет относится только к расписанию. Он не разблокирует настройки клиники, Telegram или клинические данные.", "Schedule admin unlock must state the schedule-only access boundary.");
requireIn(scheduleSource, "disabled={!adminSecretReady}", "Schedule admin unlock button must use the readiness guard.");
requireIn(scheduleSource, "Админ-доступ активен для расписания.", "Schedule admin unlocked state must use clinic-readable wording.");
requireIn(scheduleSource, "Настройки, Telegram и клинические данные остаются отдельными зонами доступа.", "Schedule unlocked state must keep other access domains separate.");
forbidIn(scheduleSource, "Админ-доступ активен для расписания, настроек и Telegram.", "Schedule admin unlocked state must not imply settings or Telegram access.");
forbidIn(scheduleSource, "Админ-доступ DENTE активен", "Schedule admin unlocked state must not expose internal DENTE wording.");
forbidIn(scheduleSource, "telegramAdminSecretDraft", "ScheduleView admin draft naming must stay schedule-owned.");
forbidIn(scheduleSource, "telegramAdminSecretSession", "ScheduleView admin session naming must stay schedule-owned.");
forbidIn(scheduleSource, "setTelegramAdminSecretDraft", "ScheduleView admin draft setter must stay schedule-owned.");
forbidIn(scheduleSource, "unlockTelegramAdminSession", "ScheduleView unlock action must stay schedule-owned.");
forbidIn(scheduleSource, "lockTelegramAdminSession", "ScheduleView lock action must stay schedule-owned.");
requireIn(scheduleSource, 'data-testid="schedule-empty-state"', "ScheduleView must render an addressable empty state when filters hide all appointments.");
requireIn(scheduleSource, "Нет записей по выбранным фильтрам", "Schedule empty state must explain why the timeline is empty.");
requireIn(scheduleSource, "Расписание не сломалось", "Schedule empty state must reassure non-technical users with a concrete recovery path.");
requireIn(scheduleSource, "sortedAppointments.length === 0", "ScheduleView must branch explicitly for empty filtered timelines.");
requireIn(scheduleSource, 'onClick={focusNewAppointmentEditor}', "Schedule empty state must jump to appointment creation.");
requireIn(cssSource, ".schedule-empty-state", "Schedule empty state must have a dedicated responsive layout.");
requireIn(cssSource, ".schedule-empty-actions", "Schedule empty actions must wrap cleanly on narrow screens.");
requireIn(cssSource, ".schedule-shift-summary", "Schedule shift summary must have a dedicated compact layout.");
requireIn(cssSource, ".schedule-shift-summary-grid", "Schedule shift summary cards must have a responsive grid.");
requireIn(cssSource, ".schedule-shift-summary-grid,\n  .schedule-filter-strip", "Schedule shift summary grid must collapse with schedule filters on mobile.");
requireIn(cssSource, ".schedule-empty-state {\n    align-items: stretch;", "Schedule empty state must stack safely on mobile.");
requireIn(cssSource, ".schedule-empty-actions .primary-button", "Schedule empty-state actions must become full-width mobile buttons.");
requireIn(
  scheduleSource,
  'onClick={unlockScheduleAdminSession}\n                      aria-describedby={!adminSecretReady ? "schedule-admin-unlock-guidance" : undefined}',
  "Schedule admin unlock button must also point to missing-secret guidance."
);
requireIn(appSource, "appointmentScheduleDateMissingSteps", "App.tsx must validate appointment dates before schedule mutations.");
requireIn(appSource, "appointmentScheduleMissingFields", "App.tsx must validate required appointment fields before schedule mutations.");
requireIn(appSource, "return appointmentScheduleMissingFields(draft, dashboard?.clinicSettings.profile.mode);", "New and edited appointment validation must share the same required-field helper.");
requireIn(appSource, "Перед сохранением записи", "Appointment save handler must explain invalid dates.");
requireIn(appSource, "Перед созданием записи", "Appointment create handler must explain invalid or missing fields.");
requireIn(appSource, "Дождитесь завершения текущего создания записи.", "Appointment create handler must guard duplicate submits.");
forbidIn(scheduleSource, "Record<string, any>", "ScheduleView must not hide its props behind Record<string, any>.");
forbidIn(scheduleSource, ": any", "ScheduleView must not use explicit any annotations.");

console.log(
  JSON.stringify(
    {
      ok: true,
      scheduleViewLazy: true,
      appScheduleRowsRemoved: true,
      appointmentActionsPreserved: true
    },
    null,
    2
  )
);
