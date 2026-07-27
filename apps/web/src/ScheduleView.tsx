import { NewAppointmentForm } from "./components/schedule/NewAppointmentForm";
import { AppointmentCard } from "./components/schedule/AppointmentCard";
import { ScheduleTimeReservationsWidget } from "./components/schedule/ScheduleTimeReservationsWidget";
import { CancellationReasonsTwoLevelWidget } from "./components/schedule/CancellationReasonsTwoLevelWidget";
import { ExternalScheduleActionLogsWidget } from "./components/schedule/ExternalScheduleActionLogsWidget";
import { UrgentScheduleRequestsWidget } from "./components/schedule/UrgentScheduleRequestsWidget";
import { EmptyState } from "./components/EmptyState";

import { useSettingsStore } from "./store/settingsStore";
import { useScheduleStore } from "./store/scheduleStore";
import { Plus, ShieldCheck, Bot, Mic, Calendar } from "lucide-react";
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
  /** Открывает раздел, где закрывают предупреждение смены. */
  openScheduleWarning: (warning: Dashboard["shiftIntelligence"]["scheduleWarnings"][number]) => void;
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
  /** Перечитывание данных клиники: нужно для живого обновления сетки. */
  loadDashboard?: (options?: { adminSecret?: string }) => Promise<void>;
};

import { useAppLogicContext } from "./contexts/AppLogicContext";
import { useScheduleRealtime } from "./hooks/useScheduleRealtime";

export function ScheduleView(rawProps?: Partial<ScheduleViewProps>) {
  const logicContext = useAppLogicContext();
  const props = { ...logicContext, ...rawProps } as any;
  // Расписание перечитывается, когда запись создал или перенёс кто-то другой.
  // Без этого второй администратор видел устаревшую сетку до перезагрузки.
  //
  // Берётся из props, а не из logicContext: активный экземпляр ScheduleView
  // отрисован в App.tsx ВЫШЕ AppLogicProvider, поэтому там контекст пуст.
  // Первая версия читала logicContext?.loadDashboard и молча ничего не
  // делала — событие до страницы доходило, сетка не обновлялась.
  useScheduleRealtime(props.loadDashboard);
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
    openScheduleWarning,
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
  const {
    setScheduleAdminSecretDraft,
    scheduleAdminSecretDraft,
    scheduleAdminSecretSession,
    scheduleAdminSecretDemand
  } = useSettingsStore();
  const [showShiftAnalytics, setShowShiftAnalytics] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [useManualSelects, setUseManualSelects] = useState(false);



  const adminSecretReady = scheduleAdminSecretDraft.trim().length > 0;

  /*
    Поле секрета показываем только тогда, когда сервер действительно отказал в
    изменении расписания, либо секрет уже введён и его надо дать забыть.

    Раньше на экране постоянно висела строка «🔐 Разблокировать сохранение
    расписания» — замок без объяснения, зачем он и что случится. Он не охранял
    ничего: серверная проверка requireScheduleMutationAccess объявлена в
    apps/api/src/routes/schedule.ts и не вызывается ни в одном маршруте, а
    DENTE_SCHEDULE_ADMIN_SECRET не задан. Проверено живьём
    (scratch/verify-schedule-lock.mjs): создание приёма и перенос времени
    проходят без секрета и с заведомо неверным секретом.
  */
  const scheduleAdminSecretNeeded =
    scheduleAdminSecretDemand.length > 0 || scheduleAdminSecretSession.length > 0;
  const scheduleAdminSecretReason =
    scheduleAdminSecretDemand === "ScheduleAdminSecretMissing"
      ? "Сервер клиники не настроен на изменение расписания: в его настройках не задан секрет администратора. Секрет задаёт тот, кто устанавливал программу — без него запись не сохранится, сколько бы вы ни вводили здесь."
      : "Сервер клиники не принял изменение расписания без секрета администратора. Введите его, чтобы сохранить запись.";

  /**
   * Повторить запись: те же пациент, врач, ассистент, кресло, повод и
   * длительность переносятся в форму новой записи, время сдвигается на неделю
   * вперёд — остаётся поправить дату и нажать «Создать запись».
   *
   * Это замена «Буферу обмена переноса записей расписания». Тот показывал на
   * экране пустую коробку с обещанием «из клика по визиту вы можете скопировать
   * запись для быстрого вклеивания», хотя копировать было нечем: copyToBuffer
   * не вызывался ни из одного места, вставки не существовало, а у таблицы
   * schedule_clipboard_items во всём проекте нет ни одного писателя.
   *
   * Никакого нового контракта здесь нет: запись создаёт тот же
   * POST /api/appointments, и охрана пересечений на нём работает.
   */
  const repeatAppointment = (appointment: Appointment) => {
    const startsAtMs = Date.parse(appointment.startsAt);
    const endsAtMs = Date.parse(appointment.endsAt);
    const durationMs =
      Number.isFinite(startsAtMs) && Number.isFinite(endsAtMs) && endsAtMs > startsAtMs
        ? endsAtMs - startsAtMs
        : (dashboard.clinicSettings.profile.defaultVisitMinutes ?? 30) * 60_000;
    const weekAhead = Number.isFinite(startsAtMs)
      ? new Date(startsAtMs + 7 * 24 * 60 * 60_000)
      : new Date();

    /*
      Ассистент: если в исходной записи его нет, ставим того, кого форма и так
      подставляет по умолчанию (см. newAppointmentDraftFromDashboard: для не
      соло-режима берётся первый активный ассистент). Иначе повтор оставлял бы
      поле пустым, а форма тут же требовала «выберите ассистента» — и кнопка
      «Создать запись» была бы заперта у записи, которая в базе живёт без
      ассистента: сервер такие записи принимает.
    */
    const fallbackAssistant = (dashboard.clinicSettings?.staff ?? []).find(
      (member) => member.active && member.role === "assistant"
    );
    const repeatAssistantId =
      appointment.assistantUserId ??
      (dashboard.clinicSettings.profile.mode === "solo_doctor" ? null : fallbackAssistant?.id ?? null);

    updateNewAppointmentDraft("patientId", appointment.patientId);
    updateNewAppointmentDraft("doctorUserId", appointment.doctorUserId);
    updateNewAppointmentDraft("assistantUserId", repeatAssistantId ?? "");
    updateNewAppointmentDraft("chairId", appointment.chairId);
    updateNewAppointmentDraft("status", "planned");
    updateNewAppointmentDraft("startsAt", weekAhead.toISOString());
    updateNewAppointmentDraft("endsAt", new Date(weekAhead.getTime() + durationMs).toISOString());
    updateNewAppointmentDraft("reason", appointment.reason ?? "");
    updateNewAppointmentDraft("comment", "");
    setShowCreateForm(true);
    setUseManualSelects(true);
    if (typeof window !== "undefined") {
      window.requestAnimationFrame(() => {
        document
          .querySelector(".appointment-create-form, .new-appointment-form")
          ?.scrollIntoView({ behavior: "smooth", block: "center" });
      });
    }
  };

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
    // БЫЛО: фокус уходил в .appointment-create-editor — легаси-форму,
    // скрытую через opacity 0, размер 0 и pointer-events: none. Нажатие
    // «Создать запись» (и переход из листа ожидания) не меняло на экране
    // ничего, а клавиатурный фокус пропадал в невидимом элементе: человек
    // терял место в интерфейсе, а программа чтения с экрана начинала
    // зачитывать поля, которых на экране нет.
    //
    // Берём первый РЕАЛЬНО видимый элемент управления в блоке создания
    // записи. Выбор по видимости, а не по конкретному селектору, чтобы
    // правка пережила перестановку блоков внутри формы.
    const wrapper = document.querySelector<HTMLElement>(".appointment-create-wrapper");
    if (!wrapper) return;

    const isVisible = (element: HTMLElement) => {
      const rect = element.getBoundingClientRect();
      if (rect.width < 1 || rect.height < 1) return false;
      // opacity предка НЕ наследуется в вычисленный стиль потомка: у
      // ребёнка внутри opacity: 0 собственная opacity остаётся 1. Поэтому
      // цепочку предков приходится проходить вручную.
      for (let node: HTMLElement | null = element; node; node = node.parentElement) {
        const style = window.getComputedStyle(node);
        if (style.display === "none" || style.visibility === "hidden") return false;
        if (Number.parseFloat(style.opacity) === 0) return false;
      }
      return true;
    };

    const target = Array.from(
      wrapper.querySelectorAll<HTMLElement>("select, input, textarea, button"),
    ).find((element) => !element.hasAttribute("disabled") && isVisible(element));

    motionSafeScrollIntoView(target ?? wrapper, { block: "center" });
    target?.focus({ preventScroll: true });
  };
  const openScheduleSuggestion = (section: string) => {
    window.location.hash = section;
    const sectionId = section.replace(/^#/, "");
    window.requestAnimationFrame(() => {
      motionSafeScrollIntoView(document.getElementById(sectionId), { block: "start" });
    });
  };
  const highestUtilizationLoad = (loads?: ResourceLoad[]) =>
    (loads || []).reduce<ResourceLoad | null>((highestLoad, load) => {
      if (!highestLoad || load.utilizationPercent > highestLoad.utilizationPercent) return load;
      return highestLoad;
    }, null);
  const busiestDoctorLoad = highestUtilizationLoad(dashboard?.shiftIntelligence?.doctorLoads);
  const busiestChairLoad = highestUtilizationLoad(dashboard?.shiftIntelligence?.chairLoads);
  // БЫЛО: считались только фильтр по дате и по статусу. Администратор нажимал
  // чип конкретного врача, список падал с 40 записей до 3, а подпись продолжала
  // сообщать «фильтры не ограничивают» и «показана вся очередь» — и человек
  // делал вывод, что день пустой, и отказывал пациентам в приёме.
  // Фильтры по врачу, ассистенту и креслу реально применяются к списку
  // (см. sortedAppointments в useAppLogic), поэтому они обязаны быть здесь.
  const activeScheduleFilterCount = [
    scheduleDateFilter.trim(),
    scheduleStatusFilter !== "all" ? scheduleStatusFilter : null,
    scheduleDoctorFilterId,
    scheduleAssistantFilterId,
    scheduleChairFilterId
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
    <div className="panel schedule-panel" id="schedule" data-testid="schedule-view">
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
                  /* Было «День»: читается как режим показа (день/неделя),
                     а кнопка ставит фильтр на сегодняшнюю дату. */
                  onClick={() => setScheduleDateFilter(todayScheduleDate())}
                >
                  Сегодня
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
              ) : null}
              {activeScheduleFilterCount > 0 ? (
                <span className="status-pill status-arrived">Фильтров: {activeScheduleFilterCount}</span>
              ) : null}
              {/*
                Здесь стояли чипы «Нет записей», «Предупреждений: 1» и «Ок».
                Первый повторял пустое состояние панели ниже. Второй показывал
                только цифру: что именно требует внимания, было спрятано под
                кнопкой «Показать аналитику» в карточке «Контроль». Третий не
                говорил ничего. Теперь предупреждение называет себя и по нажатию
                ведёт туда, где его закрывают.
              */}
              {shiftWarnings.map((warning) => (
                <button
                  key={warning.id}
                  type="button"
                  className={`status-pill schedule-warning-chip ${warning.severity === "critical" ? "status-cancelled" : "status-overdue"}`}
                  onClick={() => openScheduleWarning(warning)}
                  title={warning.detail}
                >
                  {warning.title} — {warning.actionLabel.toLowerCase()}
                </button>
              ))}
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
            <div className="schedule-filter-strip" aria-label="Сохраненные фильтры расписания" style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center', padding: '12px 16px', borderBottom: '1px solid var(--paper-soft)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', borderRight: '1px solid var(--line)', paddingRight: '12px', marginRight: '4px' }}>
                <input
                  type="date"
                  aria-label="Фильтр расписания по дате"
                  value={scheduleDateFilter}
                  onChange={(event: TextFieldChangeEvent) => setScheduleDateFilter(event.target.value)}
                  style={{ border: '1px solid var(--line)', borderRadius: '8px', background: 'var(--paper-soft)', padding: '4px 8px', fontSize: '13px', fontWeight: 600, color: 'var(--ink)', outline: 'none', cursor: 'pointer' }}
                />
              </div>
              
              <button
                type="button"
                /* «Все записи» подсвечивается только когда НИ ОДИН фильтр не активен:
                   раньше чип оставался активным при фильтре по ассистенту, статусу
                   или дате, маскируя то, что список сокращён. */
                className={`quick-chip ${activeScheduleFilterCount === 0 ? 'active' : ''}`}
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
            {scheduleAdminSecretNeeded ? (
              <div className="appointment-editor schedule-admin-unlock" aria-label="Секрет администратора для сохранения расписания" role="group" style={{ display: "flex", flexDirection: "column", gap: "12px", padding: "16px", borderRadius: "10px", background: "var(--paper-soft)", border: "1px solid var(--line)", marginTop: "8px" }}>
              {!scheduleAdminSecretSession ? (
                <>
                  <p className="admin-unlock-guidance form-span-2" id="schedule-admin-unlock-guidance" role="status" aria-live="polite" style={{ margin: 0, fontWeight: 600 }}>
                    {scheduleAdminSecretReason}
                  </p>
                  <label className="form-span-2">
                    Секрет администратора клиники
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
                      aria-describedby="schedule-admin-unlock-guidance"
                    />
                  </label>
                  <div className="appointment-editor-actions">
                    <span className="save-state save-state-idle">Секрет хранится только до перезагрузки страницы и относится только к расписанию.</span>
                    <button
                      className="secondary-button"
                      type="button"
                      onClick={unlockScheduleAdminSession}
                      aria-describedby="schedule-admin-unlock-guidance"
                      disabled={!adminSecretReady}
                    >
                      <ShieldCheck aria-hidden="true" /> Запомнить и повторить сохранение
                    </button>
                  </div>
                </>
              ) : (
                <div className="appointment-editor-actions">
                  {/*
                    Раньше здесь стояло «Админ-доступ активен для расписания».
                    Это неправда: секрет никто не проверял — он просто лёг в
                    память и подставляется заголовком. Верен он или нет, видно
                    только при сохранении записи.
                  */}
                  <span className="save-state save-state-idle">Секрет запомнен до перезагрузки страницы. Он подставляется при сохранении записи — верен он или нет, покажет само сохранение.</span>
                  <button className="secondary-button" type="button" onClick={lockScheduleAdminSession}>
                    Забыть секрет
                  </button>
                </div>
              )}
              </div>
            ) : null}

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
                    repeatAppointment={repeatAppointment}
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
                <EmptyState
                  icon={<Calendar size={32} />}
                  title="Нет записей по выбранным фильтрам"
                  description="Расписание не сломалось: выберите сегодняшний день, сбросьте фильтры или сразу откройте форму новой записи."
                  glass={true}
                  action={
                    <div className="schedule-empty-actions" style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', justifyContent: 'center', marginTop: '12px' }}>
                      <button className="secondary-button focus:ring-2 focus:ring-teal-600 focus:outline-none transition-colors" type="button" onClick={() => setScheduleDateFilter(todayScheduleDate())}>
                        Сегодня
                      </button>
                      <button className="text-button focus:ring-2 focus:ring-teal-600 focus:outline-none transition-colors" type="button" onClick={resetScheduleFilters}>
                        Сбросить фильтры
                      </button>
                      <button className="primary-button focus:ring-2 focus:ring-teal-600 focus:outline-none transition-colors" type="button" onClick={focusNewAppointmentEditor}>
                        <Plus aria-hidden="true" /> Новая запись
                      </button>
                    </div>
                  }
                />
              ) : null}
            </div>

            {/* Schedule Utilities & Widgets Panel */}
            <div className="schedule-widgets-container mt-6" style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              <UrgentScheduleRequestsWidget />
              {/*
                Здесь стоял <ScheduleClipboardItemsWidget />: постоянно пустая
                коробка «Буфер обмена переноса записей расписания» с обещанием
                «из клика по визиту вы можете скопировать запись для быстрого
                вклеивания». Наполнить её было нечем — copyToBuffer не
                вызывался ни из одного места, вставки не существовало, а у
                таблицы schedule_clipboard_items во всём проекте нет ни одного
                писателя, только чтение. Обещанное действие теперь есть на самой
                записи кнопкой «Повторить».
              */}
              <ScheduleTimeReservationsWidget />
              <CancellationReasonsTwoLevelWidget />
              <ExternalScheduleActionLogsWidget />
            </div>
    </div>
  );
}



/*
onClick={unlockScheduleAdminSession}
                      aria-describedby={!adminSecretReady ? "schedule-admin-unlock-guidance" : undefined}
*/
