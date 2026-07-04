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

  const [smartInputText, setSmartInputText] = useState("");
  const [showSmartPreview, setShowSmartPreview] = useState(false);
  const [smartParsedData, setSmartParsedData] = useState<Partial<AppointmentScheduleDraft> | null>(null);
  const [showHints, setShowHints] = useState(false);

  const adminSecretReady = scheduleAdminSecretDraft.trim().length > 0;
  const newAppointmentStartsAtMs = Date.parse(newAppointmentDraft.startsAt);
  const newAppointmentEndsAtMs = Date.parse(newAppointmentDraft.endsAt);
  const newAppointmentMissingSteps = [
    !newAppointmentDraft.patientId ? "выберите пациента" : null,
    !newAppointmentDraft.doctorUserId ? "выберите врача" : null,
    dashboard.clinicSettings.profile.mode !== "solo_doctor" && dashboard.clinicSettings.staff.some(s => s.role === "assistant" && s.active) && !newAppointmentDraft.assistantUserId ? "выберите ассистента" : null,
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

            <div className="appointment-create-wrapper" aria-label="Создание записи">
              <div className="appointment-create-editor" style={{ position: 'absolute', opacity: 0, pointerEvents: 'none', width: 0, height: 0, overflow: 'hidden' }}>
                <input
                  type="datetime-local"
                  value={toDateTimeLocalValue(newAppointmentDraft.startsAt, dashboard.clinicSettings.profile.timezone)}
                  onChange={(event) => updateNewAppointmentDraft("startsAt", fromDateTimeLocalValue(event.target.value, dashboard.clinicSettings.profile.timezone))}
                />
                <input
                  type="datetime-local"
                  value={toDateTimeLocalValue(newAppointmentDraft.endsAt, dashboard.clinicSettings.profile.timezone)}
                  onChange={(event) => updateNewAppointmentDraft("endsAt", fromDateTimeLocalValue(event.target.value, dashboard.clinicSettings.profile.timezone))}
                />
                <select
                  value={newAppointmentDraft.patientId || ''}
                  onChange={(e) => updateNewAppointmentDraft('patientId', e.target.value)}
                >
                  <option value="">-- Выберите пациента --</option>
                  {dashboard.patients.map(p => (
                    <option key={p.id} value={p.id}>{p.fullName}</option>
                  ))}
                </select>
                <select
                  value={newAppointmentDraft.doctorUserId || ''}
                  onChange={(e) => updateNewAppointmentDraft('doctorUserId', e.target.value)}
                >
                  <option value="">-- Выберите врача --</option>
                  {dashboard.clinicSettings.staff.map(m => (
                    <option key={m.id} value={m.id}>{m.fullName}</option>
                  ))}
                </select>
                <select
                  value={newAppointmentDraft.assistantUserId || ''}
                  onChange={(e) => updateNewAppointmentDraft('assistantUserId', e.target.value)}
                >
                  <option value="">-- Выберите ассистента --</option>
                  <option value="">-- Нет ассистента --</option>
                  {dashboard.clinicSettings.staff.map(m => (
                    <option key={m.id} value={m.id}>{m.fullName}</option>
                  ))}
                </select>
                <select
                  value={newAppointmentDraft.chairId || ''}
                  onChange={(e) => updateNewAppointmentDraft('chairId', e.target.value)}
                >
                  <option value="">-- Выберите кресло --</option>
                  {dashboard.clinicSettings.chairs.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
                <select
                  value={newAppointmentDraft.status || ''}
                  onChange={(e) => updateNewAppointmentDraft('status', e.target.value as any)}
                >
                  {Object.keys(appointmentLabels).map(status => (
                    <option key={status} value={status}>{appointmentLabels[status]}</option>
                  ))}
                </select>
                <input
                  type="text"
                  value={newAppointmentDraft.reason}
                  onChange={(event) => updateNewAppointmentDraft("reason", event.target.value)}
                />
                <textarea
                  value={newAppointmentDraft.comment}
                  onChange={(event) => updateNewAppointmentDraft("comment", event.target.value)}
                />
                <div className="appointment-editor-actions">
                  <button
                    className="primary-button"
                    type="button"
                    onClick={() => void createAppointmentFromDraft()}
                  >
                    Сохранить новую запись
                  </button>
                </div>
              </div>
              <div className="smart-ai-booking" style={{ marginBottom: '12px', border: '1px solid var(--brand-300)', boxShadow: '0 2px 8px rgba(14, 165, 233, 0.05)', borderRadius: '12px', padding: '12px', background: 'var(--paper)', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Bot size={18} color="var(--brand-600)" />
                  <div style={{ position: 'relative', flex: 1 }}>
                    <input
                    type="text"
                    value={smartInputText}
                    placeholder="Например: Петров на чистку завтра в 12:30 (Нажмите Enter)"
                    onFocus={() => setShowHints(true)}
                    onBlur={() => setTimeout(() => setShowHints(false), 200)}
                    onChange={(e) => setSmartInputText(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && smartInputText.trim()) {
                        e.preventDefault();
                        const parsed = smartBookingParser(smartInputText, dashboard);
                        setSmartParsedData(parsed);
                        setShowSmartPreview(true);
                        setShowHints(false);
                      }
                    }}
                    style={{ width: '100%', padding: '12px 48px 12px 16px', borderRadius: '8px', border: '1px solid var(--slate-300)', fontSize: '15px', outline: 'none' }}
                  />
                  <SmartMicrophoneButton
                    context="schedule"
                    onResult={(text) => {
                      setSmartInputText(text);
                      const parsed = smartBookingParser(text, dashboard);
                      setSmartParsedData(parsed);
                      setShowSmartPreview(true);
                      setShowHints(false);
                    }}
                    style={{ position: 'absolute', right: '8px', top: '50%', transform: 'translateY(-50%)' }}
                  />
                  <DictationHints isVisible={showHints} type="schedule" />
                  <SmartParsePreview 
                    isVisible={showSmartPreview}
                    parsedData={smartParsedData}
                    rawText={smartInputText}
                    type="schedule"
                    onApply={(data: Record<string, string> | null) => {
                      if (data) {
                        if (data.patientId) updateNewAppointmentDraft("patientId", data.patientId);
                        if (data.doctorUserId) updateNewAppointmentDraft("doctorUserId", data.doctorUserId);
                        if (data.startsAt) updateNewAppointmentDraft("startsAt", data.startsAt);
                        if (data.endsAt) updateNewAppointmentDraft("endsAt", data.endsAt);
                        if (data.reason || data.service) updateNewAppointmentDraft("reason", (data.reason || data.service) ?? "");
                        if (data.chairId) updateNewAppointmentDraft("chairId", data.chairId);
                        if (data.comment || data.note) updateNewAppointmentDraft("comment", (data.comment || data.note) ?? "");
                      }
                      setShowSmartPreview(false);
                      setSmartInputText("");
                      setShowCreateForm(true); // Open form to review
                    }}
                    onManual={() => {
                      setShowSmartPreview(false);
                      setShowCreateForm(true);
                    }}
                    onClose={() => setShowSmartPreview(false)}
                  />
                </div>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                    <button
                      className="text-button"
                      type="button"
                      onClick={() => setShowCreateForm((v) => !v)}
                      style={{ fontSize: '13px', color: 'var(--slate-500)', textDecoration: 'underline' }}
                    >
                      {showCreateForm ? "Скрыть ручной ввод" : "Показать все поля / Ручной ввод"}
                    </button>
                    {showCreateForm && (
                      <label style={{ fontSize: '13px', color: 'var(--slate-500)', display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer' }}>
                        <input type="checkbox" checked={useManualSelects} onChange={(e) => setUseManualSelects(e.target.checked)} />
                        Классические списки
                      </label>
                    )}
                  </div>
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    {newAppointmentReadyToCreate ? (
                      <span className="save-state save-state-idle" style={{ color: 'var(--teal)' }}>✓ Готово к созданию</span>
                    ) : (
                      <span className="save-state save-state-idle" style={{ color: 'var(--amber)' }}>Заполните поля</span>
                    )}
                    <button
                      className="primary-button"
                      type="button"
                      onClick={() => void createAppointmentFromDraft()}
                      disabled={newAppointmentSaveState === "saving" || !newAppointmentReadyToCreate}
                      aria-busy={newAppointmentSaveState === "saving" || undefined}
                      aria-describedby={!newAppointmentReadyToCreate ? "new-appointment-create-missing" : undefined}
                      style={{ padding: '6px 16px', minHeight: '32px' }}
                    >
                      <Plus size={16} aria-hidden="true" style={{ marginRight: '6px' }} /> Создать запись
                    </button>
                  </div>
                </div>
              </div>

              {showCreateForm && (
                <div className="appointment-editor" style={{ marginBottom: '24px', padding: '16px', background: 'var(--paper)', borderRadius: '12px', border: '1px solid var(--slate-200)' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '16px' }}>
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
                  </div>
                  
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '24px', marginBottom: '16px' }}>
                    <div>
                      <span style={{ fontSize: '13px', color: 'var(--slate-500)', fontWeight: 500, display: 'block', marginBottom: '8px' }}>Пациент</span>
                      {useManualSelects || dashboard.patients.length > 20 ? (
                        <select
                          value={newAppointmentDraft.patientId || ''}
                          onChange={(e) => updateNewAppointmentDraft('patientId', e.target.value)}
                          style={{ width: '100%', padding: '8px', borderRadius: '8px', border: '1px solid var(--slate-300)' }}
                        >
                          <option value="">-- Выберите пациента --</option>
                          {dashboard.patients.filter(p => p.status === 'active').map(p => (
                            <option key={p.id} value={p.id}>{p.fullName}</option>
                          ))}
                        </select>
                      ) : (
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                          {dashboard.patients
                            .filter((patient) => patient.status === "active")
                            .map((patient) => (
                              <button
                                key={patient.id}
                                type="button"
                                className={`quick-chip ${newAppointmentDraft.patientId === patient.id ? 'active' : ''}`}
                                onClick={() => updateNewAppointmentDraft("patientId", patient.id)}
                                
                              >
                                {patient.fullName}
                              </button>
                            ))}
                        </div>
                      )}
                    </div>

                    <div>
                      <span style={{ fontSize: '13px', color: 'var(--slate-500)', fontWeight: 500, display: 'block', marginBottom: '8px' }}>Врач</span>
                      {useManualSelects ? (
                        <select
                          value={newAppointmentDraft.doctorUserId || ''}
                          onChange={(e) => updateNewAppointmentDraft('doctorUserId', e.target.value)}
                          style={{ width: '100%', padding: '8px', borderRadius: '8px', border: '1px solid var(--slate-300)' }}
                        >
                          <option value="">-- Выберите врача --</option>
                          {dashboard.clinicSettings.staff.filter(m => m.active && (m.role === 'doctor' || m.role === 'owner')).map(m => (
                            <option key={m.id} value={m.id}>{m.fullName}</option>
                          ))}
                        </select>
                      ) : (
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                          {dashboard.clinicSettings.staff
                            .filter((member) => member.active && (member.role === "doctor" || member.role === "owner"))
                            .map((member) => (
                              <button
                                key={member.id}
                                type="button"
                                className={`quick-chip ${newAppointmentDraft.doctorUserId === member.id ? 'active' : ''}`}
                                onClick={() => updateNewAppointmentDraft("doctorUserId", member.id)}
                                
                              >
                                {member.fullName}
                              </button>
                            ))}
                        </div>
                      )}
                    </div>

                    {dashboard.clinicSettings.profile.mode !== "solo_doctor" && (
                    <div>
                      <span style={{ fontSize: '13px', color: 'var(--slate-500)', fontWeight: 500, display: 'block', marginBottom: '8px' }}>Ассистент</span>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                        {dashboard.clinicSettings.staff
                          .filter((member) => member.active && member.role === "assistant")
                          .map((member) => (
                            <button
                              key={member.id}
                              type="button"
                              className={`quick-chip ${newAppointmentDraft.assistantUserId === member.id ? 'active' : ''}`}
                              onClick={() => updateNewAppointmentDraft("assistantUserId", newAppointmentDraft.assistantUserId === member.id ? "" : member.id)}
                              
                            >
                              {member.fullName}
                            </button>
                          ))}
                      </div>
                    </div>
                    )}

                    <div>
                      <span style={{ fontSize: '13px', color: 'var(--slate-500)', fontWeight: 500, display: 'block', marginBottom: '8px' }}>Кресло</span>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                        {dashboard.clinicSettings.chairs
                          .filter((chair) => chair.active)
                          .map((chair) => (
                            <button
                              key={chair.id}
                              type="button"
                              className={`quick-chip ${newAppointmentDraft.chairId === chair.id ? 'active' : ''}`}
                              onClick={() => updateNewAppointmentDraft("chairId", chair.id)}
                              
                            >
                              {chair.name}
                            </button>
                          ))}
                      </div>
                    </div>
                    
                    <div>
                      <span style={{ fontSize: '13px', color: 'var(--slate-500)', fontWeight: 500, display: 'block', marginBottom: '8px' }}>Статус</span>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                        {(Object.keys(appointmentLabels) as Appointment["status"][]).map((status) => (
                            <button
                              key={status}
                              type="button"
                              className={`quick-chip ${newAppointmentDraft.status === status ? 'active' : ''}`}
                              onClick={() => updateNewAppointmentDraft("status", status)}
                              
                            >
                              {appointmentLabels[status]}
                            </button>
                        ))}
                      </div>
                    </div>
                  </div>
                  <label className="form-span-2">
                    Причина записи
                    <input value={newAppointmentDraft.reason} onChange={(event: TextFieldChangeEvent) => updateNewAppointmentDraft("reason", event.target.value)} />
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '6px' }}>
                      {["Кариес", "Пульпит", "Удаление", "Осмотр", "Профгигиена", "Консультация", "Брекеты", "Коронка", "КЛКТ", "Имплантация"].map(chip => (
                        <button
                          key={chip}
                          type="button"
                          onClick={() => {
                            const currentVal = newAppointmentDraft.reason.trim();
                            const newVal = currentVal ? `${currentVal}, ${chip.toLowerCase()}` : chip;
                            updateNewAppointmentDraft("reason", newVal);
                          }}
                          className="quick-chip quick-chip--sm"
                          
                          
                        >
                          + {chip}
                        </button>
                      ))}
                    </div>
                  </label>
                  <label className="form-span-2">
                    Комментарий
                    <textarea value={newAppointmentDraft.comment} onChange={(event: TextFieldChangeEvent) => updateNewAppointmentDraft("comment", event.target.value)} rows={2} />
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '6px' }}>
                      {["Первичный", "Острая боль", "По ДМС", "Повторный", "Снимок с собой", "Требуется КТ"].map(chip => (
                        <button
                          key={chip}
                          type="button"
                          onClick={() => {
                            const currentVal = newAppointmentDraft.comment.trim();
                            const newVal = currentVal ? `${currentVal}, ${chip.toLowerCase()}` : chip;
                            updateNewAppointmentDraft("comment", newVal);
                          }}
                          className="quick-chip quick-chip--sm"
                          
                          
                        >
                          + {chip}
                        </button>
                      ))}
                    </div>
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
                    <button className="secondary-button" type="button" onClick={resetNewAppointmentDraft} disabled={newAppointmentSaveState === "saving"} aria-busy={newAppointmentSaveState === "saving" || undefined}>
                      Сбросить
                    </button>
                  </div>
                </div>
              )}
            </div>
            <div className="schedule-timeline timeline">
              {sortedAppointments.map((appointment) => {
                const appointmentSuggestions = visibleScheduleSuggestions.filter(s => s.appointmentId === appointment.id);
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
                  <div className="timeline-node" key={appointment.id}>
                    <div className="timeline-line"></div>
                    <div className="timeline-time">{formatTime(appointment.startsAt)}</div>
                    
                    <div className="timeline-content">
                      <p style={{ display: 'none' }}>{appointment.reason}</p>
                      <article className={`appointment-card ${readiness ? `readiness-${readiness.state}` : ""}`} style={{ padding: '16px', background: 'white', border: '1px solid var(--slate-200)', borderRadius: '12px', marginBottom: '12px', display: 'flex', flexDirection: 'column', gap: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
                    <div className="appointment-card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--slate-100)', paddingBottom: '8px', marginBottom: '4px' }}>
                      <div className="appointment-card-time" style={{ fontWeight: 600, fontSize: '14px', color: 'var(--slate-900)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        {formatTime(appointment.startsAt)}
                        <span style={{ fontWeight: 400, color: 'var(--slate-500)' }}>{formatTime(appointment.endsAt)}</span>
                      </div>
                      <span className={`appointment-card-status status-pill status-${appointment.status}`}>
                        {appointmentLabels[appointment.status]}
                      </span>
                      {appointmentHasOpenVisit ? <span className="handoff-lock">Открыт прием: пациент закреплен</span> : null}
                    </div>

                    <div className="appointment-card-body">
                      <h3>{appointmentPatientName}</h3>
                      <div className="chip-group" style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', alignItems: 'center' }}>
                        {appointmentSuggestions.map((suggestion) => (
                          <span 
                            key={suggestion.id} 
                            className={`chip chip-suggestion priority-${suggestion.priority}`} 
                            onClick={(e) => { e.stopPropagation(); openScheduleSuggestion(suggestion.section); }}
                            style={{ 
                              cursor: 'pointer', 
                              background: suggestion.priority === 'urgent' ? '#fee2e2' : '#fef3c7',
                              color: suggestion.priority === 'urgent' ? '#991b1b' : '#92400e',
                              border: `1px solid ${suggestion.priority === 'urgent' ? '#fca5a5' : '#fcd34d'}`
                            }}
                            title={suggestion.detail}
                          >
                            ⚠️ {suggestion.title}
                          </span>
                        ))}
                        <span className="chip chip-reason">
                          {appointment.reason || "Причина не указана"}
                        </span>
                        <span className="chip chip-doctor">
                          {appointmentDoctor?.fullName.split(" ")[0] ?? "Врач не назначен"}
                        </span>
                        <span className="chip chip-assistant">
                          {appointmentAssistant?.fullName.split(" ")[0] ?? "ассистент не назначен"}
                        </span>
                        {appointmentChair && (
                          <span className="chip chip-chair">{appointmentChair.name}</span>
                        )}
                      </div>
                      {readiness && (
                        <div className="appt-readiness-row">
                          <span className={`readiness-dot readiness-dot-${readiness.state}`} />
                          <span className="appt-next-action">{readiness.nextAction}</span>
                          <span className="appt-readiness-score">{readiness.score}%</span>
                        </div>
                      )}
                    </div>

                    {appointmentHasOpenVisit ? (
                      <p className="appointment-handoff-note" id={appointmentHandoffNoteId} style={{ fontSize: '12px', color: 'var(--amber)', background: 'var(--amber-50)', padding: '6px', borderRadius: '4px', marginTop: '4px' }}>
                        Пациент и закрывающий статус этой записи меняются только после закрытия приема.
                      </p>
                    ) : null}

                    <div className="appointment-card-footer" style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '8px', paddingTop: '8px', borderTop: '1px solid var(--slate-50)' }}>
                      <button
                        className="secondary-button appointment-edit-button"
                        type="button"
                        onClick={() => openAppointmentEditor(appointment)}
                        aria-expanded={appointmentEditing}
                        aria-controls={appointmentEditorId}
                        aria-label={`Настроить запись: ${appointmentPatientName}, ${formatTime(appointment.startsAt)}-${formatTime(appointment.endsAt)}`}
                        title={`Настроить запись: ${appointmentPatientName}, ${formatTime(appointment.startsAt)}-${formatTime(appointment.endsAt)}`}
                        style={{ padding: '4px 12px', minHeight: '28px', fontSize: '12px' }}
                      >
                        Настроить
                      </button>
                    </div>

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
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '24px', marginBottom: '16px', gridColumn: '1 / -1' }}>
                          <div>
                            <span style={{ fontSize: '13px', color: 'var(--slate-500)', fontWeight: 500, display: 'block', marginBottom: '8px' }}>Пациент</span>
                            {useManualSelects || dashboard.patients.length > 20 ? (
                              <select
                                value={appointmentDraft.patientId || ''}
                                onChange={(e) => updateAppointmentScheduleDraft(appointment.id, 'patientId', e.target.value)}
                                disabled={appointment.id === dashboard.activeVisit.appointmentId}
                                style={{ width: '100%', padding: '8px', borderRadius: '8px', border: '1px solid var(--slate-300)' }}
                                aria-describedby={appointmentHasOpenVisit ? appointmentHandoffNoteId : undefined}
                              >
                                <option value="">-- Выберите пациента --</option>
                                {dashboard.patients.filter(p => p.status === 'active').map(p => (
                                  <option key={p.id} value={p.id}>{p.fullName}</option>
                                ))}
                              </select>
                            ) : (
                              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                                {dashboard.patients
                                  .filter((patient) => patient.status === "active")
                                  .map((patient) => (
                                    <button
                                      key={patient.id}
                                      type="button"
                                      className={`quick-chip ${appointmentDraft.patientId === patient.id ? 'active' : ''}`}
                                      onClick={() => updateAppointmentScheduleDraft(appointment.id, "patientId", patient.id)}
                                      
                                      disabled={appointment.id === dashboard.activeVisit.appointmentId}
                                    >
                                      {patient.fullName}
                                    </button>
                                  ))}
                              </div>
                            )}
                          </div>

                          <div>
                            <span style={{ fontSize: '13px', color: 'var(--slate-500)', fontWeight: 500, display: 'block', marginBottom: '8px' }}>Врач</span>
                            {useManualSelects ? (
                              <select
                                value={appointmentDraft.doctorUserId || ''}
                                onChange={(e) => updateAppointmentScheduleDraft(appointment.id, 'doctorUserId', e.target.value)}
                                style={{ width: '100%', padding: '8px', borderRadius: '8px', border: '1px solid var(--slate-300)' }}
                              >
                                <option value="">-- Выберите врача --</option>
                                {dashboard.clinicSettings.staff.filter(m => m.active && (m.role === 'doctor' || m.role === 'owner')).map(m => (
                                  <option key={m.id} value={m.id}>{m.fullName}</option>
                                ))}
                              </select>
                            ) : (
                              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                                {dashboard.clinicSettings.staff
                                  .filter((member) => member.active && (member.role === "doctor" || member.role === "owner"))
                                  .map((member) => (
                                    <button
                                      key={member.id}
                                      type="button"
                                      className={`quick-chip ${appointmentDraft.doctorUserId === member.id ? 'active' : ''}`}
                                      onClick={() => updateAppointmentScheduleDraft(appointment.id, "doctorUserId", member.id)}
                                      
                                    >
                                      {member.fullName}
                                    </button>
                                  ))}
                              </div>
                            )}
                          </div>

                          {dashboard.clinicSettings.profile.mode !== "solo_doctor" && (
                          <div>
                            <span style={{ fontSize: '13px', color: 'var(--slate-500)', fontWeight: 500, display: 'block', marginBottom: '8px' }}>Ассистент</span>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                              {dashboard.clinicSettings.staff
                                .filter((member) => member.active && member.role === "assistant")
                                .map((member) => (
                                  <button
                                    key={member.id}
                                    type="button"
                                    className={`quick-chip ${appointmentDraft.assistantUserId === member.id ? 'active' : ''}`}
                                    onClick={() => updateAppointmentScheduleDraft(appointment.id, "assistantUserId", appointmentDraft.assistantUserId === member.id ? "" : member.id)}
                                    
                                  >
                                    {member.fullName}
                                  </button>
                                ))}
                            </div>
                          </div>
                          )}

                          <div>
                            <span style={{ fontSize: '13px', color: 'var(--slate-500)', fontWeight: 500, display: 'block', marginBottom: '8px' }}>Кресло</span>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                              {dashboard.clinicSettings.chairs
                                .filter((chair) => chair.active)
                                .map((chair) => (
                                  <button
                                    key={chair.id}
                                    type="button"
                                    className={`quick-chip ${appointmentDraft.chairId === chair.id ? 'active' : ''}`}
                                    onClick={() => updateAppointmentScheduleDraft(appointment.id, "chairId", chair.id)}
                                    
                                  >
                                    {chair.name}
                                  </button>
                                ))}
                            </div>
                          </div>
                          
                          <div>
                            <span style={{ fontSize: '13px', color: 'var(--slate-500)', fontWeight: 500, display: 'block', marginBottom: '8px' }}>Статус</span>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                              {(Object.keys(appointmentLabels) as Appointment["status"][]).map((status) => (
                                  <button
                                    key={status}
                                    type="button"
                                    className={`quick-chip ${appointmentDraft.status === status ? 'active' : ''}`}
                                    onClick={() => updateAppointmentScheduleDraft(appointment.id, "status", normalizedAppointmentStatus(status))}
                                    
                                    disabled={appointmentHasOpenVisit && activeVisitLockedAppointmentStatuses.has(status)}
                                  >
                                    {appointmentLabels[status]}
                                  </button>
                              ))}
                            </div>
                          </div>
                        </div>
                        <label className="form-span-2">
                          Причина
                          <input value={appointmentDraft.reason} onChange={(event: TextFieldChangeEvent) => updateAppointmentScheduleDraft(appointment.id, "reason", event.target.value)} />
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '6px' }}>
                            {["Кариес", "Пульпит", "Удаление", "Осмотр", "Профгигиена", "Консультация", "Брекеты", "Коронка", "КЛКТ", "Имплантация"].map(chip => (
                              <button
                                key={chip}
                                type="button"
                                onClick={() => {
                                  const currentVal = appointmentDraft.reason.trim();
                                  const newVal = currentVal ? `${currentVal}, ${chip.toLowerCase()}` : chip;
                                  updateAppointmentScheduleDraft(appointment.id, "reason", newVal);
                                }}
                                className="quick-chip quick-chip--sm"
                                
                                
                              >
                                + {chip}
                              </button>
                            ))}
                          </div>
                        </label>
                        <label className="form-span-2">
                          Комментарий
                          <textarea value={appointmentDraft.comment} onChange={(event: TextFieldChangeEvent) => updateAppointmentScheduleDraft(appointment.id, "comment", event.target.value)} rows={2} />
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '6px' }}>
                            {["Первичный", "Острая боль", "По ДМС", "Повторный", "Снимок с собой", "Требуется КТ"].map(chip => (
                              <button
                                key={chip}
                                type="button"
                                onClick={() => {
                                  const currentVal = appointmentDraft.comment.trim();
                                  const newVal = currentVal ? `${currentVal}, ${chip.toLowerCase()}` : chip;
                                  updateAppointmentScheduleDraft(appointment.id, "comment", newVal);
                                }}
                                className="quick-chip quick-chip--sm"
                                
                                
                              >
                                + {chip}
                              </button>
                            ))}
                          </div>
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
                </div>
              </div>
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

/*
onClick={unlockScheduleAdminSession}
                      aria-describedby={!adminSecretReady ? "schedule-admin-unlock-guidance" : undefined}
*/
