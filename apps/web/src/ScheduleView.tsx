import { useSettingsStore } from "./store/settingsStore";
import { useScheduleStore } from "./store/scheduleStore";
import { Plus, ShieldCheck } from "lucide-react";
import { useState } from "react";
import type { ChangeEvent, KeyboardEvent } from "react";
import type { Appointment, AppointmentReadiness, Dashboard, ResourceLoad, ScheduleSuggestion, StaffRole } from "@dental/shared";
import { motionSafeScrollIntoView } from "./motionPreference";

type AppointmentScheduleDraft = {
  patientId: string;
  doctorUserId: string;
  assistantUserId: string;
  chairId: string;
  status: Appointment["status"];
  startsAt: string;
  endsAt: string;
  reason: string;
  comment: string;
};

type AppointmentScheduleSaveState = "idle" | "saving" | "saved" | "error";
type TextFieldChangeEvent = ChangeEvent<HTMLInputElement | HTMLTextAreaElement>;
type SelectChangeEvent = ChangeEvent<HTMLSelectElement>;
const activeVisitLockedAppointmentStatuses = new Set<Appointment["status"]>(["completed", "cancelled", "no_show"]);

type ScheduleViewProps = {
  appointmentLabels: Record<Appointment["status"], string>;
  appointmentReadinessById: Map<string, AppointmentReadiness>;
  appointmentReadinessLabels: Record<AppointmentReadiness["state"], string>;
  appointmentScheduleDraftFromAppointment: (appointment: Appointment) => AppointmentScheduleDraft;
  closeAppointmentEditor: (appointmentId: string) => void;
  createAppointmentFromDraft: () => Promise<boolean>;
  dashboard: Dashboard;
  editingAppointmentId: string | null;
  formatTime: (value: string) => string;
  fromDateTimeLocalValue: (value: string, timeZone?: string | null) => string;
  lockScheduleAdminSession: () => void;
  newAppointmentError: string | null;
  normalizedAppointmentStatus: (value: unknown, fallback?: Appointment["status"]) => Appointment["status"];
  normalizedAppointmentStatusFilter: (value: unknown) => Appointment["status"] | "all";
  openAppointmentEditor: (appointment: Appointment) => void;
  patientName: (patients: Dashboard["patients"], patientId: string | null) => string;
  recommendedActionPriorityLabels: Record<ScheduleSuggestion["priority"], string>;
  resetNewAppointmentDraft: () => void;
  saveAppointmentSchedule: (appointmentId: string, options?: { closeEditorOnSave?: boolean }) => Promise<boolean>;
  
  shiftWarnings: Dashboard["shiftIntelligence"]["scheduleWarnings"];
  sortedAppointments: Appointment[];
  staffRoleLabels: Record<StaffRole, string>;
  scheduleAdminSecretDraft: string;
  scheduleAdminSecretSession: string;
  toDateTimeLocalValue: (value: string, timeZone?: string | null) => string;
  unlockScheduleAdminSession: () => void;
  updateAppointmentScheduleDraft: <K extends keyof AppointmentScheduleDraft>(
    appointmentId: string,
    key: K,
    value: AppointmentScheduleDraft[K]
  ) => void;
  updateNewAppointmentDraft: <K extends keyof AppointmentScheduleDraft>(key: K, value: AppointmentScheduleDraft[K]) => void;
  visibleScheduleSuggestions: ScheduleSuggestion[];
};

export function ScheduleView(props: ScheduleViewProps) {
  const {
    scheduleDoctorFilterId,
    scheduleAssistantFilterId,
    scheduleChairFilterId,
    scheduleDefaultDoctorUserId,
    scheduleDefaultAssistantUserId,
    scheduleDefaultChairId,
    scheduleStatusFilter,
    scheduleDateFilter,
    staffScheduleDrafts,
    staffScheduleSavingId,
    staffScheduleDirtyIds,
    staffScheduleSaveStates,
    chairScheduleDrafts,
    chairScheduleSavingId,
    chairScheduleDirtyIds,
    chairScheduleSaveStates,
    appointmentScheduleDrafts,
    appointmentScheduleDirtyIds,
    appointmentScheduleSaveStates,
    appointmentScheduleErrors,
    newAppointmentDraft,
    newAppointmentSaveState,
    setScheduleDoctorFilterId,
    setScheduleAssistantFilterId,
    setScheduleChairFilterId,
    setScheduleDefaultDoctorUserId,
    setScheduleDefaultAssistantUserId,
    setScheduleDefaultChairId,
    setScheduleStatusFilter,
    setScheduleDateFilter,
    setStaffScheduleDrafts,
    setStaffScheduleSavingId,
    setStaffScheduleDirtyIds,
    setStaffScheduleSaveStates,
    setChairScheduleDrafts,
    setChairScheduleSavingId,
    setChairScheduleDirtyIds,
    setChairScheduleSaveStates,
    setAppointmentScheduleDrafts,
    setAppointmentScheduleDirtyIds,
    setAppointmentScheduleSaveStates,
    setAppointmentScheduleErrors,
    setNewAppointmentDraft,
    setNewAppointmentSaveState
  } = useScheduleStore();
  const {
    appointmentLabels,
    appointmentReadinessById,
    appointmentReadinessLabels,
    appointmentScheduleDraftFromAppointment,
    closeAppointmentEditor,
    createAppointmentFromDraft,
    dashboard,
    editingAppointmentId,
    formatTime,
    fromDateTimeLocalValue,
    lockScheduleAdminSession,
    newAppointmentError,
    normalizedAppointmentStatus,
    normalizedAppointmentStatusFilter,
    openAppointmentEditor,
    patientName,
    recommendedActionPriorityLabels,
    resetNewAppointmentDraft,
    saveAppointmentSchedule,
    shiftWarnings,
    sortedAppointments,
    staffRoleLabels,
    toDateTimeLocalValue,
    unlockScheduleAdminSession,
    updateAppointmentScheduleDraft,
    updateNewAppointmentDraft,
    visibleScheduleSuggestions
  } = props;
  const { setScheduleAdminSecretDraft, scheduleAdminSecretDraft, scheduleAdminSecretSession } = useSettingsStore();
  const [showShiftAnalytics, setShowShiftAnalytics] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);

  const adminSecretReady = scheduleAdminSecretDraft.trim().length > 0;
  const newAppointmentStartsAtMs = Date.parse(newAppointmentDraft.startsAt);
  const newAppointmentEndsAtMs = Date.parse(newAppointmentDraft.endsAt);
  const newAppointmentMissingSteps = [
    !newAppointmentDraft.patientId ? "выберите пациента" : null,
    !newAppointmentDraft.doctorUserId ? "выберите врача" : null,
    dashboard.clinicSettings.profile.mode !== "solo_doctor" && !newAppointmentDraft.assistantUserId ? "выберите ассистента" : null,
    !newAppointmentDraft.chairId ? "выберите кресло" : null,
    !newAppointmentDraft.startsAt.trim() ? "укажите начало приема" : null,
    newAppointmentDraft.startsAt.trim() && !Number.isFinite(newAppointmentStartsAtMs) ? "проверьте дату начала" : null,
    !newAppointmentDraft.endsAt.trim() ? "укажите окончание приема" : null,
    newAppointmentDraft.endsAt.trim() && !Number.isFinite(newAppointmentEndsAtMs) ? "проверьте дату окончания" : null,
    Number.isFinite(newAppointmentStartsAtMs) && Number.isFinite(newAppointmentEndsAtMs) && newAppointmentEndsAtMs <= newAppointmentStartsAtMs
      ? "окончание должно быть позже начала"
      : null
  ].filter((step): step is string => Boolean(step));
  const newAppointmentReadyToCreate = newAppointmentMissingSteps.length === 0;
  const appointmentDraftMissingSteps = (draft: AppointmentScheduleDraft) => {
    const startsAtMs = Date.parse(draft.startsAt);
    const endsAtMs = Date.parse(draft.endsAt);
    return [
      !draft.patientId ? "выберите пациента" : null,
      !draft.doctorUserId ? "выберите врача" : null,
      dashboard.clinicSettings.profile.mode !== "solo_doctor" && !draft.assistantUserId ? "выберите ассистента" : null,
      !draft.chairId ? "выберите кресло" : null,
      !draft.startsAt.trim() ? "укажите начало приема" : null,
      draft.startsAt.trim() && !Number.isFinite(startsAtMs) ? "проверьте дату начала приема" : null,
      !draft.endsAt.trim() ? "укажите окончание приема" : null,
      draft.endsAt.trim() && !Number.isFinite(endsAtMs) ? "проверьте дату окончания приема" : null,
      Number.isFinite(startsAtMs) && Number.isFinite(endsAtMs) && endsAtMs <= startsAtMs
        ? "окончание приема должно быть позже начала"
        : null
    ].filter((step): step is string => Boolean(step));
  };
  const todayScheduleDate = () => toDateTimeLocalValue(new Date().toISOString(), dashboard.clinicSettings.profile.timezone).slice(0, 10);
  const resetScheduleFilters = () => {
    setScheduleDateFilter("");
    setScheduleDoctorFilterId(null);
    setScheduleAssistantFilterId(null);
    setScheduleChairFilterId(null);
    setScheduleStatusFilter("all");
  };
  const focusNewAppointmentEditor = () => {
    const editor = document.querySelector<HTMLElement>(".appointment-create-editor");
    motionSafeScrollIntoView(editor, { block: "center" });
    editor?.querySelector<HTMLElement>("select, input, textarea, button")?.focus({ preventScroll: true });
  };
  const openScheduleSuggestion = (section: string) => {
    window.location.hash = section;
    const sectionId = section.replace(/^#/, "");
    window.requestAnimationFrame(() => {
      motionSafeScrollIntoView(document.getElementById(sectionId), { block: "start" });
    });
  };
  const highestUtilizationLoad = (loads: ResourceLoad[]) =>
    loads.reduce<ResourceLoad | null>((highestLoad, load) => {
      if (!highestLoad || load.utilizationPercent > highestLoad.utilizationPercent) return load;
      return highestLoad;
    }, null);
  const busiestDoctorLoad = highestUtilizationLoad(dashboard.shiftIntelligence.doctorLoads);
  const busiestChairLoad = highestUtilizationLoad(dashboard.shiftIntelligence.chairLoads);
  const activeScheduleFilterCount = [
    scheduleDateFilter.trim(),
    scheduleStatusFilter !== "all" ? scheduleStatusFilter : null
  ].filter((value): value is string => Boolean(value)).length;
  const scheduleFilteredSummary = [
    sortedAppointments.length ? `видно записей: ${sortedAppointments.length}` : "записи скрыты фильтрами",
    activeScheduleFilterCount ? `фильтров: ${activeScheduleFilterCount}` : "фильтры не ограничивают",
    shiftWarnings.length ? `предупреждений: ${shiftWarnings.length}` : "срочных предупреждений нет"
  ].join(" · ");
  const scheduleLoadSummaryCards = [
    {
      id: "doctor",
      title: "Самый загруженный врач",
      value: busiestDoctorLoad ? `${busiestDoctorLoad.utilizationPercent}%` : "нет загрузки",
      detail: busiestDoctorLoad
        ? `${busiestDoctorLoad.title}: ${busiestDoctorLoad.appointmentCount} записей, ${busiestDoctorLoad.bookedMinutes} мин.`
        : "смена не заполнена"
    },
    {
      id: "chair",
      title: "Самое занятое кресло",
      value: busiestChairLoad ? `${busiestChairLoad.utilizationPercent}%` : "нет загрузки",
      detail: busiestChairLoad
        ? `${busiestChairLoad.title}: ${busiestChairLoad.appointmentCount} записей, ${busiestChairLoad.nextFreeAt ? `свободно с ${formatTime(busiestChairLoad.nextFreeAt)}` : "окон нет"}`
        : "кресла не загружены"
    },
    {
      id: "visible",
      title: "На экране",
      value: `${sortedAppointments.length}`,
      detail: activeScheduleFilterCount ? `активных фильтров: ${activeScheduleFilterCount}` : "показана вся очередь"
    },
    {
      id: "control",
      title: "Контроль",
      value: shiftWarnings.length ? `${shiftWarnings.length}` : "0",
      detail: shiftWarnings[0]?.title ?? "нет срочных предупреждений"
    }
  ];

  return (
          <div className="panel schedule-panel" id="schedule">
            <div className="panel-heading">
              <h2>Очередь смены</h2>
              <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
                <button
                  className="secondary-button"
                  type="button"
                  onClick={() => setShowShiftAnalytics(!showShiftAnalytics)}
                  style={{ minHeight: "30px", padding: "0 12px", fontSize: "12px" }}
                >
                  {showShiftAnalytics ? "Скрыть аналитику" : "Показать аналитику"}
                </button>
                <button
                  className="text-button"
                  type="button"
                  onClick={() => setScheduleDateFilter(todayScheduleDate())}
                >
                  День
                </button>
              </div>
            </div>
            {showShiftAnalytics && (
              <div className="schedule-command-grid">
                <article>
                  <span>Врачи</span>
                  <strong>{dashboard.shiftIntelligence.doctorLoads.length}</strong>
                  <p>
                    {dashboard.shiftIntelligence.doctorLoads
                      .map((load: ResourceLoad) => `${load.title.split(" ")[0]} ${load.utilizationPercent}%`)
                      .join(" · ")}
                  </p>
                </article>
                <article>
                  <span>Ассистенты</span>
                  <strong>{dashboard.shiftIntelligence.assistantLoads.length}</strong>
                  <p>
                    {dashboard.shiftIntelligence.assistantLoads
                      .map((load: ResourceLoad) => `${load.title.split(" ")[0]} ${load.utilizationPercent}%`)
                      .join(" · ") || "не назначены"}
                  </p>
                </article>
                <article>
                  <span>Кресла</span>
                  <strong>{dashboard.shiftIntelligence.chairLoads.length}</strong>
                  <p>
                    {dashboard.shiftIntelligence.chairLoads
                      .map((load: ResourceLoad) => `${load.title} ${load.utilizationPercent}%`)
                      .join(" · ")}
                  </p>
                </article>
                <article>
                  <span>Контроль</span>
                  <strong>{shiftWarnings.length}</strong>
                  <p>{shiftWarnings[0]?.title ?? "нет срочных предупреждений"}</p>
                </article>
              </div>
            )}
            <section
              className="schedule-shift-summary"
              data-testid="schedule-shift-summary"
              aria-label="Короткая сводка смены"
              aria-live="polite"
            >
              <strong>{scheduleFilteredSummary}</strong>
              {showShiftAnalytics && (
                <div className="schedule-shift-summary-grid">
                  {scheduleLoadSummaryCards.map((card) => (
                    <article key={card.id}>
                      <span>{card.title}</span>
                      <strong>{card.value}</strong>
                      <p>{card.detail}</p>
                    </article>
                  ))}
                </div>
              )}
            </section>
            <div className="schedule-filter-strip" aria-label="Сохраненные фильтры расписания">
              <label>
                День
                <input
                  type="date"
                  value={scheduleDateFilter}
                  onChange={(event: TextFieldChangeEvent) => setScheduleDateFilter(event.target.value)}
                />
              </label>
              <label>
                Врач
                <select value={scheduleDoctorFilterId ?? ""} onChange={(event: SelectChangeEvent) => setScheduleDoctorFilterId(event.target.value || null)}>
                  <option value="">Все врачи</option>
                  {dashboard.clinicSettings.staff
                    .filter((member) => member.active && (member.role === "doctor" || member.role === "owner"))
                    .map((member) => (
                      <option key={member.id} value={member.id}>
                        {member.fullName}
                      </option>
                    ))}
                </select>
              </label>
              <label>
                Ассистент
                <select value={scheduleAssistantFilterId ?? ""} onChange={(event: SelectChangeEvent) => setScheduleAssistantFilterId(event.target.value || null)}>
                  <option value="">Все ассистенты</option>
                  {dashboard.clinicSettings.staff
                    .filter((member) => member.active && member.role === "assistant")
                    .map((member) => (
                      <option key={member.id} value={member.id}>
                        {member.fullName}
                      </option>
                    ))}
                </select>
              </label>
              <label>
                Кресло
                <select value={scheduleChairFilterId ?? ""} onChange={(event: SelectChangeEvent) => setScheduleChairFilterId(event.target.value || null)}>
                  <option value="">Все кресла</option>
                  {dashboard.clinicSettings.chairs
                    .filter((chair) => chair.active)
                    .map((chair) => (
                      <option key={chair.id} value={chair.id}>
                        {chair.name}
                      </option>
                    ))}
                </select>
              </label>
              <label>
                Статус
                <select
                  value={scheduleStatusFilter}
                  onChange={(event: SelectChangeEvent) => setScheduleStatusFilter(normalizedAppointmentStatusFilter(event.target.value))}
                >
                  <option value="all">Все статусы</option>
                  {(Object.keys(appointmentLabels) as Appointment["status"][]).map((status) => (
                    <option key={status} value={status}>
                      {appointmentLabels[status]}
                    </option>
                  ))}
                </select>
              </label>
              <div className="schedule-filter-actions">
                <button
                  className="secondary-button"
                  type="button"
                  onClick={() => setScheduleDateFilter(todayScheduleDate())}
                >
                  Сегодня
                </button>
                <button className="text-button" type="button" onClick={resetScheduleFilters}>
                  Сбросить фильтры
                </button>
              </div>
            </div>
            <details className="schedule-secret-collapsible">
              <summary>🔐 Разблокировать сохранение расписания</summary>
              <div className="appointment-editor schedule-admin-unlock" aria-label="Доступ к сохранению расписания">
              {!scheduleAdminSecretSession ? (
                <>
                  <label className="form-span-2">
                    Секрет администратора клиники для сохранения расписания
                    <input
                      type="password"
                      autoComplete="current-password"
                      value={scheduleAdminSecretDraft}
                      onChange={(event: TextFieldChangeEvent) => setScheduleAdminSecretDraft(event.target.value)}
                      onKeyDown={(event: KeyboardEvent<HTMLInputElement>) => {
                      if (event.key === "Enter" && adminSecretReady) {
                        event.preventDefault();
                        unlockScheduleAdminSession();
                      }
                    }}
                      placeholder="введите секрет администратора"
                      aria-describedby={!adminSecretReady ? "schedule-admin-unlock-guidance" : undefined}
                    />
                  </label>
                  {!adminSecretReady ? (
                    <p className="admin-unlock-guidance form-span-2" id="schedule-admin-unlock-guidance" role="status" aria-live="polite">
                      Введите секрет администратора клиники, чтобы сохранять расписание.
                    </p>
                  ) : null}
                  <div className="appointment-editor-actions">
                    <span className="save-state save-state-idle">Секрет хранится только до перезагрузки страницы.</span>
                    <span className="save-state save-state-idle">Этот секрет относится только к расписанию. Он не разблокирует настройки клиники, Telegram или клинические данные.</span>
                    <button
                      className="secondary-button"
                      type="button"
                      onClick={unlockScheduleAdminSession}
                      aria-describedby={!adminSecretReady ? "schedule-admin-unlock-guidance" : undefined}
                      disabled={!adminSecretReady}
                    >
                      <ShieldCheck aria-hidden="true" /> Разблокировать сохранение
                    </button>
                  </div>
                </>
              ) : (
                <div className="appointment-editor-actions">
                  <span className="save-state save-state-saved">Админ-доступ активен для расписания.</span>
                  <span className="save-state save-state-idle">Настройки, Telegram и клинические данные остаются отдельными зонами доступа.</span>
                  <button className="secondary-button" type="button" onClick={lockScheduleAdminSession}>
                    Забыть секрет
                  </button>
                </div>
              )}
              </div>
            </details>

            <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: "16px" }}>
              <button
                className="primary-button"
                type="button"
                aria-expanded={showCreateForm}
                onClick={() => setShowCreateForm((v) => !v)}
              >
                {showCreateForm ? "➖ Скрыть форму создания записи" : "➕ Создать запись в расписание"}
              </button>
            </div>

            {showCreateForm && (
              <div className="appointment-editor appointment-create-editor" aria-label="Создание записи">
                <label>
                  Начало
                  <input
                    type="datetime-local"
                    value={toDateTimeLocalValue(newAppointmentDraft.startsAt, dashboard.clinicSettings.profile.timezone)}
                    onChange={(event: TextFieldChangeEvent) =>
                      updateNewAppointmentDraft("startsAt", fromDateTimeLocalValue(event.target.value, dashboard.clinicSettings.profile.timezone))
                    }
                  />
                </label>
                <label>
                  Окончание
                  <input
                    type="datetime-local"
                    value={toDateTimeLocalValue(newAppointmentDraft.endsAt, dashboard.clinicSettings.profile.timezone)}
                    onChange={(event: TextFieldChangeEvent) =>
                      updateNewAppointmentDraft("endsAt", fromDateTimeLocalValue(event.target.value, dashboard.clinicSettings.profile.timezone))
                    }
                  />
                </label>
                <label>
                  Пациент
                  <select value={newAppointmentDraft.patientId} onChange={(event: SelectChangeEvent) => updateNewAppointmentDraft("patientId", event.target.value)}>
                    <option value="">Выберите пациента</option>
                    {dashboard.patients
                      .filter((patient) => patient.status === "active")
                      .map((patient) => (
                        <option key={patient.id} value={patient.id}>
                          {patient.fullName}
                        </option>
                      ))}
                  </select>
                </label>
                <label>
                  Врач
                  <select value={newAppointmentDraft.doctorUserId} onChange={(event: SelectChangeEvent) => updateNewAppointmentDraft("doctorUserId", event.target.value)}>
                    <option value="">Выберите врача</option>
                    {dashboard.clinicSettings.staff
                      .filter((member) => member.active && (member.role === "doctor" || member.role === "owner"))
                      .map((member) => (
                        <option key={member.id} value={member.id}>
                          {member.fullName}
                        </option>
                      ))}
                  </select>
                </label>
                <label>
                  Ассистент
                  <select value={newAppointmentDraft.assistantUserId} onChange={(event: SelectChangeEvent) => updateNewAppointmentDraft("assistantUserId", event.target.value)}>
                    <option value="">{dashboard.clinicSettings.profile.mode === "solo_doctor" ? "Не нужен в режиме соло" : "Выберите ассистента"}</option>
                    {dashboard.clinicSettings.staff
                      .filter((member) => member.active && member.role === "assistant")
                      .map((member) => (
                        <option key={member.id} value={member.id}>
                          {member.fullName}
                        </option>
                      ))}
                  </select>
                </label>
                <label>
                  Кресло
                  <select value={newAppointmentDraft.chairId} onChange={(event: SelectChangeEvent) => updateNewAppointmentDraft("chairId", event.target.value)}>
                    <option value="">Выберите кресло</option>
                    {dashboard.clinicSettings.chairs
                      .filter((chair) => chair.active)
                      .map((chair) => (
                        <option key={chair.id} value={chair.id}>
                          {chair.name}
                        </option>
                      ))}
                  </select>
                </label>
                <label>
                  Статус
                  <select value={newAppointmentDraft.status} onChange={(event: SelectChangeEvent) => updateNewAppointmentDraft("status", normalizedAppointmentStatus(event.target.value))}>
                    {(Object.keys(appointmentLabels) as Appointment["status"][]).map((status) => (
                      <option key={status} value={status}>
                        {appointmentLabels[status]}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="form-span-2">
                  Причина записи
                  <input value={newAppointmentDraft.reason} onChange={(event: TextFieldChangeEvent) => updateNewAppointmentDraft("reason", event.target.value)} />
                </label>
                <label className="form-span-2">
                  Комментарий
                  <textarea value={newAppointmentDraft.comment} onChange={(event: TextFieldChangeEvent) => updateNewAppointmentDraft("comment", event.target.value)} rows={2} />
                </label>
                {!newAppointmentReadyToCreate ? (
                  <div className="schedule-create-missing" id="new-appointment-create-missing" role="status" aria-live="polite">
                    <strong>Чтобы создать запись, осталось:</strong>
                    <ul>
                      {newAppointmentMissingSteps.map((step) => (
                        <li key={step}>{step}</li>
                      ))}
                    </ul>
                  </div>
                ) : null}
                <div className="appointment-editor-actions">
                  {newAppointmentError ? <span className="save-error">{newAppointmentError}</span> : null}
                  <span className={`save-state save-state-${newAppointmentSaveState}`}>
                    {newAppointmentSaveState === "saving"
                      ? "Создаю"
                      : newAppointmentSaveState === "saved"
                        ? "Запись создана"
                        : newAppointmentSaveState === "error"
                          ? "Ошибка создания"
                          : "Готово к созданию"}
                  </span>
                  <button className="secondary-button" type="button" onClick={resetNewAppointmentDraft} disabled={newAppointmentSaveState === "saving"} aria-busy={newAppointmentSaveState === "saving" || undefined}>
                    Сбросить
                  </button>
                  <button
                    className="primary-button"
                    type="button"
                    onClick={() => void createAppointmentFromDraft()}
                    disabled={newAppointmentSaveState === "saving" || !newAppointmentReadyToCreate}
                    aria-busy={newAppointmentSaveState === "saving" || undefined}
                    aria-describedby={!newAppointmentReadyToCreate ? "new-appointment-create-missing" : undefined}
                  >
                    <Plus aria-hidden="true" /> Создать запись
                  </button>
                </div>
              </div>
            )}
            <div className="schedule-suggestion-strip" aria-label="Подсказки расписания">
              {visibleScheduleSuggestions.map((suggestion) => (
                <button
                  className={`schedule-suggestion priority-${suggestion.priority}`}
                  key={suggestion.id}
                  type="button"
                  onClick={() => openScheduleSuggestion(suggestion.section)}
                >
                  <span>{recommendedActionPriorityLabels[suggestion.priority]}</span>
                  <strong>{suggestion.title}</strong>
                  <p>{suggestion.detail}</p>
                  <small>{staffRoleLabels[suggestion.ownerRole]} · {suggestion.reason}</small>
                </button>
              ))}
            </div>
            <div className="timeline">
              {sortedAppointments.map((appointment) => {
                const readiness = appointmentReadinessById.get(appointment.id);
                const appointmentDoctor = dashboard.clinicSettings.staff.find((member) => member.id === appointment.doctorUserId);
                const appointmentAssistant = appointment.assistantUserId
                  ? dashboard.clinicSettings.staff.find((member) => member.id === appointment.assistantUserId)
                  : null;
                const appointmentChair = dashboard.clinicSettings.chairs.find((chair) => chair.id === appointment.chairId);
                const appointmentDraft = appointmentScheduleDrafts[appointment.id] ?? appointmentScheduleDraftFromAppointment(appointment);
                const appointmentSaveState = appointmentScheduleSaveStates[appointment.id] ?? "idle";
                const appointmentSaveError = appointmentScheduleErrors[appointment.id] ?? null;
                const appointmentDirty = appointmentScheduleDirtyIds.has(appointment.id);
                const appointmentEditing = editingAppointmentId === appointment.id;
                const appointmentHasOpenVisit = appointment.id === dashboard.activeVisit.appointmentId && dashboard.activeVisit.status === "draft";
                const appointmentActiveVisitStatusLocked =
                  appointmentHasOpenVisit && activeVisitLockedAppointmentStatuses.has(appointmentDraft.status);
                const appointmentMissingSteps = [
                  ...appointmentDraftMissingSteps(appointmentDraft),
                  ...(appointmentActiveVisitStatusLocked ? ["закройте прием перед закрывающим статусом записи"] : [])
                ];
                const appointmentReadyToSave = appointmentDirty && appointmentMissingSteps.length === 0;
                const appointmentSaveMissingId = `appointment-save-missing-${appointment.id}`;
                const appointmentEditorId = `appointment-editor-${appointment.id}`;
                const appointmentHandoffNoteId = `appointment-handoff-note-${appointment.id}`;
                const appointmentPatientName = patientName(dashboard.patients, appointment.patientId);
                return (
                  <article className={`appointment-row ${readiness ? `readiness-${readiness.state}` : ""}`} key={appointment.id}>
                    <time>
                      {formatTime(appointment.startsAt)}
                      <span>{formatTime(appointment.endsAt)}</span>
                    </time>
                    <div>
                      <h3>{appointmentPatientName}</h3>
                      <p>
                        {appointment.reason} ·{" "}
                        {appointmentDoctor?.fullName.split(" ")[0] ?? "врач"} ·{" "}
                        {appointmentAssistant?.fullName.split(" ")[0] ?? "ассистент не назначен"} ·{" "}
                        {appointmentChair?.name ?? "кресло"}
                      </p>
                      {readiness ? (
                        <div className="appointment-readiness">
                          <span className={`readiness-pill readiness-${readiness.state}`}>
                            {appointmentReadinessLabels[readiness.state]} · {readiness.score}%
                          </span>
                          <span>{staffRoleLabels[readiness.ownerRole]}</span>
                          <span>{readiness.nextAction}</span>
                          {readiness.checks.slice(0, 3).map((check) => (
                            <span className={check.ready ? "check-ready" : "check-missing"} key={check.key}>
                              {check.title}
                            </span>
                          ))}
                          {readiness.warnings.slice(0, 2).map((warning) => (
                            <span className="check-warning" key={warning}>
                              {warning}
                            </span>
                          ))}
                          {appointmentHasOpenVisit ? <span className="handoff-lock">Открыт прием: пациент закреплен</span> : null}
                        </div>
                      ) : null}
                      {appointmentHasOpenVisit ? (
                        <p className="appointment-handoff-note" id={appointmentHandoffNoteId}>
                          Пациент и закрывающий статус этой записи меняются только после закрытия приема.
                        </p>
                      ) : null}
                    </div>
                    <span className={`status-pill status-${appointment.status}`}>
                      {appointmentLabels[appointment.status]}
                    </span>
                    <button
                      className="secondary-button appointment-edit-button"
                      type="button"
                      onClick={() => openAppointmentEditor(appointment)}
                      aria-expanded={appointmentEditing}
                      aria-controls={appointmentEditorId}
                      aria-label={`Настроить запись: ${appointmentPatientName}, ${formatTime(appointment.startsAt)}-${formatTime(appointment.endsAt)}`}
                      title={`Настроить запись: ${appointmentPatientName}, ${formatTime(appointment.startsAt)}-${formatTime(appointment.endsAt)}`}
                    >
                      Настроить
                    </button>
                    {appointmentEditing ? (
                      <div className="appointment-editor form-span-2" id={appointmentEditorId} aria-label={`Редактирование записи: ${appointmentPatientName}`}>
                        <label>
                          Начало
                          <input
                            type="datetime-local"
                            value={toDateTimeLocalValue(appointmentDraft.startsAt, dashboard.clinicSettings.profile.timezone)}
                            onChange={(event: TextFieldChangeEvent) =>
                              updateAppointmentScheduleDraft(
                                appointment.id,
                                "startsAt",
                                fromDateTimeLocalValue(event.target.value, dashboard.clinicSettings.profile.timezone)
                              )
                            }
                          />
                        </label>
                        <label>
                          Окончание
                          <input
                            type="datetime-local"
                            value={toDateTimeLocalValue(appointmentDraft.endsAt, dashboard.clinicSettings.profile.timezone)}
                            onChange={(event: TextFieldChangeEvent) =>
                              updateAppointmentScheduleDraft(
                                appointment.id,
                                "endsAt",
                                fromDateTimeLocalValue(event.target.value, dashboard.clinicSettings.profile.timezone)
                              )
                            }
                          />
                        </label>
                        <label>
                          Пациент
                          <select
                            value={appointmentDraft.patientId}
                            onChange={(event: SelectChangeEvent) => updateAppointmentScheduleDraft(appointment.id, "patientId", event.target.value)}
                            disabled={appointment.id === dashboard.activeVisit.appointmentId}
                            aria-describedby={appointmentHasOpenVisit ? appointmentHandoffNoteId : undefined}
                          >
                            <option value="">Не назначен</option>
                            {dashboard.patients
                              .filter((patient) => patient.status === "active")
                              .map((patient) => (
                                <option key={patient.id} value={patient.id}>
                                  {patient.fullName}
                                </option>
                              ))}
                          </select>
                        </label>
                        <label>
                          Врач
                          <select value={appointmentDraft.doctorUserId} onChange={(event: SelectChangeEvent) => updateAppointmentScheduleDraft(appointment.id, "doctorUserId", event.target.value)}>
                            <option value="">Не назначен</option>
                            {dashboard.clinicSettings.staff
                              .filter((member) => member.active && (member.role === "doctor" || member.role === "owner"))
                              .map((member) => (
                                <option key={member.id} value={member.id}>
                                  {member.fullName}
                                </option>
                              ))}
                          </select>
                        </label>
                        <label>
                          Ассистент
                          <select value={appointmentDraft.assistantUserId} onChange={(event: SelectChangeEvent) => updateAppointmentScheduleDraft(appointment.id, "assistantUserId", event.target.value)}>
                            <option value="">Не назначен</option>
                            {dashboard.clinicSettings.staff
                              .filter((member) => member.active && member.role === "assistant")
                              .map((member) => (
                                <option key={member.id} value={member.id}>
                                  {member.fullName}
                                </option>
                              ))}
                          </select>
                        </label>
                        <label>
                          Кресло
                          <select value={appointmentDraft.chairId} onChange={(event: SelectChangeEvent) => updateAppointmentScheduleDraft(appointment.id, "chairId", event.target.value)}>
                            <option value="">Не назначено</option>
                            {dashboard.clinicSettings.chairs
                              .filter((chair) => chair.active)
                              .map((chair) => (
                                <option key={chair.id} value={chair.id}>
                                  {chair.name}
                                </option>
                              ))}
                          </select>
                        </label>
                        <label>
                          Статус
                          <select value={appointmentDraft.status} onChange={(event: SelectChangeEvent) => updateAppointmentScheduleDraft(appointment.id, "status", normalizedAppointmentStatus(event.target.value))}>
                            {(Object.keys(appointmentLabels) as Appointment["status"][]).map((status) => (
                              <option key={status} value={status} disabled={appointmentHasOpenVisit && activeVisitLockedAppointmentStatuses.has(status)}>
                                {appointmentLabels[status]}
                              </option>
                            ))}
                          </select>
                        </label>
                        <label className="form-span-2">
                          Причина
                          <input value={appointmentDraft.reason} onChange={(event: TextFieldChangeEvent) => updateAppointmentScheduleDraft(appointment.id, "reason", event.target.value)} />
                        </label>
                        <label className="form-span-2">
                          Комментарий
                          <textarea value={appointmentDraft.comment} onChange={(event: TextFieldChangeEvent) => updateAppointmentScheduleDraft(appointment.id, "comment", event.target.value)} rows={2} />
                        </label>
                        <div className="appointment-editor-actions">
                          {appointmentSaveError ? <span className="save-error">{appointmentSaveError}</span> : null}
                          {appointmentMissingSteps.length ? (
                            <div className="schedule-create-missing schedule-save-missing" id={appointmentSaveMissingId} role="status" aria-live="polite">
                              <strong>Чтобы сохранить запись, исправьте:</strong>
                              <ul>
                                {appointmentMissingSteps.map((step) => (
                                  <li key={step}>{step}</li>
                                ))}
                              </ul>
                            </div>
                          ) : null}
                          <span className={`save-state save-state-${appointmentSaveState}`}>
                            {appointmentSaveState === "saving"
                              ? "Сохраняю"
                              : appointmentSaveState === "saved"
                                ? "Сохранено"
                                : appointmentSaveState === "error"
                                  ? "Ошибка сохранения"
                                  : "Ждет сохранения"}
                          </span>
                          <button className="secondary-button" type="button" disabled={appointmentSaveState === "saving"} aria-busy={appointmentSaveState === "saving" || undefined} onClick={() => closeAppointmentEditor(appointment.id)}>
                            Закрыть
                          </button>
                          <button
                            className="primary-button"
                            type="button"
                            onClick={() => void saveAppointmentSchedule(appointment.id)}
                            disabled={appointmentSaveState === "saving" || !appointmentReadyToSave}
                            aria-busy={appointmentSaveState === "saving" || undefined}
                            aria-describedby={!appointmentReadyToSave && appointmentMissingSteps.length ? appointmentSaveMissingId : undefined}
                          >
                            Сохранить запись
                          </button>
                        </div>
                      </div>
                    ) : null}
                  </article>
                );
              })}
              {sortedAppointments.length === 0 ? (
                <article className="schedule-empty-state" data-testid="schedule-empty-state" aria-label="Пустое расписание">
                  <div>
                    <strong>Нет записей по выбранным фильтрам</strong>
                    <p role="status" aria-live="polite">
                      Расписание не сломалось: выберите сегодняшний день, сбросьте фильтры или сразу откройте форму новой записи.
                    </p>
                  </div>
                  <div className="schedule-empty-actions">
                    <button className="secondary-button" type="button" onClick={() => setScheduleDateFilter(todayScheduleDate())}>
                      Сегодня
                    </button>
                    <button className="text-button" type="button" onClick={resetScheduleFilters}>
                      Сбросить фильтры
                    </button>
                    <button className="primary-button" type="button" onClick={focusNewAppointmentEditor}>
                      <Plus aria-hidden="true" /> Новая запись
                    </button>
                  </div>
                </article>
              ) : null}
            </div>
          </div>

          );
}
