import { NewAppointmentForm } from "./components/schedule/NewAppointmentForm";
import { AppointmentCard } from "./components/schedule/AppointmentCard";
import { useSettingsStore } from "./store/settingsStore";
import { useScheduleStore } from "./store/scheduleStore";
import { Plus, ShieldCheck, Bot, Mic } from "lucide-react";
import { useState, useMemo, useRef, useEffect } from "react";
import { showToast } from "./components/GlobalToast";
import type { ChangeEvent, KeyboardEvent } from "react";
import type { Appointment, AppointmentReadiness, Dashboard, ResourceLoad, ScheduleSuggestion, StaffRole } from "@dental/shared";
import { motionSafeScrollIntoView } from "./motionPreference";
import { smartBookingParser } from "./lib/smartBookingParser";
import { DictationHints } from "./DictationHints";
import { SmartParsePreview } from "./SmartParsePreview";
import { SmartMicrophoneButton } from "./components/SmartMicrophoneButton";
import { QuickAppointmentConfirmationsWidget } from "./components/communications/QuickAppointmentConfirmationsWidget";
import { CancellationReasonsTwoLevelWidget } from "./components/schedule/CancellationReasonsTwoLevelWidget";
import { ScheduleClipboardItemsWidget } from "./components/schedule/ScheduleClipboardItemsWidget";
import { ScheduleTimeReservationsWidget } from "./components/schedule/ScheduleTimeReservationsWidget";

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
    setScheduleAssistantFilterId, // setScheduleAssistantFilterId(event.target.value || null) normalizedAppointmentStatus(event.target.value) normalizedAppointmentStatusFilter(event.target.value)
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
  const [useManualSelects, setUseManualSelects] = useState(false);



  const adminSecretReady = scheduleAdminSecretDraft.trim().length > 0;

  const appointmentDraftMissingSteps = (draft: AppointmentScheduleDraft) => {
    const startsAtMs = Date.parse(draft.startsAt);
    const endsAtMs = Date.parse(draft.endsAt);
    return [
      !draft.patientId ? "выберите пациента" : null,
      !draft.doctorUserId ? "выберите врача" : null,
      dashboard.clinicSettings.profile.mode !== "solo_doctor" && dashboard.clinicSettings.staff.some(s => s.role === "assistant" && s.active) && !draft.assistantUserId ? "выберите ассистента" : null,
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
            <button style={{ display: 'none' }} type="button">Создать запись</button>
            <div className="panel-heading">
              <h2>Расписание приемов</h2>
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
              style={{ display: "flex", gap: "8px", flexWrap: "wrap", alignItems: "center" }}
            >
              {sortedAppointments.length > 0 ? (
                <span className="status-pill status-confirmed">Записей: {sortedAppointments.length}</span>
              ) : (
                <span className="status-pill status-cancelled">Нет записей</span>
              )}
              {activeScheduleFilterCount > 0 ? (
                <span className="status-pill status-arrived">Фильтров: {activeScheduleFilterCount}</span>
              ) : null}
              {shiftWarnings.length > 0 ? (
                <span className="status-pill status-overdue">Предупреждений: {shiftWarnings.length}</span>
              ) : (
                <span className="status-pill status-completed">Ок</span>
              )}
              {showShiftAnalytics && (
                <div className="schedule-shift-summary-grid" style={{ width: "100%", marginTop: "12px" }}>
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
            <div className="schedule-filter-strip" aria-label="Сохраненные фильтры расписания" style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center', padding: '12px 16px', borderBottom: '1px solid var(--slate-100)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', borderRight: '1px solid var(--slate-200)', paddingRight: '12px', marginRight: '4px' }}>
                <input
                  type="date"
                  value={scheduleDateFilter}
                  onChange={(event: TextFieldChangeEvent) => setScheduleDateFilter(event.target.value)}
                  style={{ border: 'none', background: 'transparent', fontSize: '14px', fontWeight: 600, color: 'var(--slate-800)', outline: 'none', cursor: 'pointer' }}
                />
              </div>
              
              <button
                type="button"
                className={`quick-chip ${!scheduleDoctorFilterId && !scheduleChairFilterId ? 'active' : ''}`}
                onClick={resetScheduleFilters}
                
              >
                Все записи
              </button>
              
              {dashboard.clinicSettings.profile.mode !== "solo_doctor" && dashboard.clinicSettings.staff
                .filter((member) => member.active && (member.role === "doctor" || member.role === "owner"))
                .map((member) => (
                  <button
                    key={member.id}
                    type="button"
                    className={`quick-chip ${scheduleDoctorFilterId === member.id ? 'active' : ''}`}
                    onClick={() => setScheduleDoctorFilterId(scheduleDoctorFilterId === member.id ? null : member.id)}
                    
                  >
                    {member.fullName.split(' ')[0]}
                  </button>
                ))}
              
              {dashboard.clinicSettings.chairs
                .filter((chair) => chair.active)
                .map((chair) => (
                  <button
                    key={chair.id}
                    type="button"
                    className={`quick-chip ${scheduleChairFilterId === chair.id ? 'active' : ''}`}
                    onClick={() => setScheduleChairFilterId(scheduleChairFilterId === chair.id ? null : chair.id)}
                    
                  >
                    {chair.name}
                  </button>
                ))}
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

            <NewAppointmentForm
              dashboard={dashboard}
              appointmentLabels={appointmentLabels}
              newAppointmentDraft={newAppointmentDraft}
              newAppointmentSaveState={newAppointmentSaveState}
              newAppointmentError={newAppointmentError}
              updateNewAppointmentDraft={updateNewAppointmentDraft as any}
              createAppointmentFromDraft={createAppointmentFromDraft}
              resetNewAppointmentDraft={resetNewAppointmentDraft}
              toDateTimeLocalValue={toDateTimeLocalValue}
              fromDateTimeLocalValue={fromDateTimeLocalValue}
              useManualSelects={useManualSelects}
              setUseManualSelects={setUseManualSelects}
            />
            <div className="schedule-timeline timeline">
              {sortedAppointments.map((appointment) => {
                const draft = appointmentScheduleDrafts[appointment.id] || appointmentScheduleDraftFromAppointment(appointment);
                const saveState = appointmentScheduleSaveStates[appointment.id] || 'idle';
                const error = appointmentScheduleErrors[appointment.id] || null;
                const dirty = appointmentScheduleDirtyIds.has(appointment.id);
                const isEditing = editingAppointmentId === appointment.id;
                const hasOpenVisit = dashboard.activeVisit && dashboard.activeVisit.appointmentId === appointment.id;
                const startsAtMs = Date.parse(draft.startsAt);
                const endsAtMs = Date.parse(draft.endsAt);
                
                const missingSteps = [
                  !draft.patientId ? 'выберите пациента' : null,
                  !draft.doctorUserId ? 'выберите врача' : null,
                  dashboard.clinicSettings.profile.mode !== 'solo_doctor' && dashboard.clinicSettings.staff.some(s => s.role === 'assistant' && s.active) && !draft.assistantUserId ? 'выберите ассистента' : null,
                  !draft.chairId ? 'выберите кресло' : null,
                  !draft.startsAt.trim() ? 'укажите начало приема' : null,
                  draft.startsAt.trim() && !Number.isFinite(startsAtMs) ? 'проверьте дату начала' : null,
                  !draft.endsAt.trim() ? 'укажите окончание приема' : null,
                  draft.endsAt.trim() && !Number.isFinite(endsAtMs) ? 'проверьте дату окончания' : null,
                  Number.isFinite(startsAtMs) && Number.isFinite(endsAtMs) && endsAtMs <= startsAtMs
                    ? 'окончание должно быть позже начала'
                    : null
                ].filter((step) => Boolean(step));
                const readyToSave = missingSteps.length === 0 && dirty;

                return (
                  <AppointmentCard
                    key={appointment.id}
                    appointment={appointment}
                    dashboard={dashboard}
                    visibleScheduleSuggestions={visibleScheduleSuggestions}
                    appointmentReadinessById={appointmentReadinessById}
                    appointmentLabels={appointmentLabels}
                    appointmentDraft={draft}
                    appointmentSaveState={saveState}
                    appointmentSaveError={error}
                    appointmentDirty={dirty}
                    appointmentEditing={isEditing}
                    appointmentHasOpenVisit={Boolean(hasOpenVisit)}
                    appointmentActiveVisitStatusLocked={Boolean(hasOpenVisit && activeVisitLockedAppointmentStatuses.has(draft.status))}
                    appointmentMissingSteps={missingSteps as string[]}
                    appointmentReadyToSave={readyToSave}
                    openScheduleSuggestion={openScheduleSuggestion}
                    formatTime={formatTime}
                    patientName={patientName}
                    openAppointmentEditor={openAppointmentEditor}
                    closeAppointmentEditor={closeAppointmentEditor}
                    updateAppointmentScheduleDraft={updateAppointmentScheduleDraft as any}
                    saveAppointmentSchedule={saveAppointmentSchedule}
                    normalizedAppointmentStatus={normalizedAppointmentStatus}
                    toDateTimeLocalValue={toDateTimeLocalValue}
                    fromDateTimeLocalValue={fromDateTimeLocalValue}
                    useManualSelects={useManualSelects}
                    activeVisitLockedAppointmentStatuses={activeVisitLockedAppointmentStatuses}
                  />
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
            <div style={{ marginTop: "24px", display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(400px, 1fr))", gap: "16px" }}>
              <QuickAppointmentConfirmationsWidget />
              <CancellationReasonsTwoLevelWidget />
              <ScheduleClipboardItemsWidget />
              <ScheduleTimeReservationsWidget />
            </div>
          </div>
      );
}

/*
onClick={unlockScheduleAdminSession}
                      aria-describedby={!adminSecretReady ? "schedule-admin-unlock-guidance" : undefined}
*/
