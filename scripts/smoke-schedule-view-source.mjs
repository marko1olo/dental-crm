import { readFileSync } from "node:fs";

const appSource = readFileSync("apps/web/src/App.tsx", "utf8");
const scheduleSource = readFileSync("apps/web/src/ScheduleView.tsx", "utf8");

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
requireIn(scheduleSource, "sortedAppointments.map((appointment", "ScheduleView must preserve appointment rows.");
requireIn(scheduleSource, "saveAppointmentSchedule", "ScheduleView must preserve appointment save action.");
requireIn(scheduleSource, "createAppointmentFromDraft", "ScheduleView must preserve quick appointment creation.");
requireIn(scheduleSource, "newAppointmentMissingSteps", "ScheduleView must explain missing fields before creating an appointment.");
requireIn(scheduleSource, "appointmentDraftDateMissingSteps", "ScheduleView must explain invalid appointment edit dates before saving.");
requireIn(scheduleSource, "schedule-create-missing", "ScheduleView must render the appointment creation missing-field panel.");
requireIn(scheduleSource, "schedule-save-missing", "ScheduleView must render the appointment edit missing-date panel.");
requireIn(scheduleSource, "disabled={newAppointmentSaveState === \"saving\" || !newAppointmentReadyToCreate}", "ScheduleView must block incomplete appointment creation.");
requireIn(scheduleSource, "disabled={appointmentSaveState === \"saving\" || !appointmentReadyToSave}", "ScheduleView must block invalid appointment edits.");
requireIn(scheduleSource, "aria-busy={appointmentSaveState === \"saving\" || undefined}", "Schedule appointment save button must expose busy state.");
requireIn(scheduleSource, "const adminSecretReady = telegramAdminSecretDraft.trim().length > 0;", "ScheduleView must use a named admin unlock readiness guard.");
requireIn(scheduleSource, 'aria-describedby={!adminSecretReady ? "schedule-admin-unlock-guidance" : undefined}', "Schedule admin unlock input must point to missing-secret guidance.");
requireIn(scheduleSource, 'id="schedule-admin-unlock-guidance"', "ScheduleView must render missing admin secret guidance.");
requireIn(scheduleSource, "Введите секрет администратора клиники, чтобы сохранять расписание и настройки.", "Schedule admin unlock guidance must explain why the secret is needed.");
requireIn(scheduleSource, "disabled={!adminSecretReady}", "Schedule admin unlock button must use the readiness guard.");
requireIn(appSource, "appointmentScheduleDateMissingSteps", "App.tsx must validate appointment dates before schedule mutations.");
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
