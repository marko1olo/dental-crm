import {
  AlertTriangle,
  Building2,
  ChevronDown,
  ChevronUp,
  ClipboardCheck,
  CreditCard,
  FileText,
  History,
  ImageIcon,
  MessageSquare,
  Phone,
  UserCheck,
  Gauge,
  Calendar,
  Info
} from "lucide-react";
import { useState, useMemo } from "react";
import { ConfirmationPerformanceReportsWidget } from "./components/analytics/ConfirmationPerformanceReportsWidget";
import { UrgentScheduleRequestsWidget } from "./components/schedule/UrgentScheduleRequestsWidget";
import { formatShortDate, money, minutesLabel, patientInsightRiskLabels } from "./AppHelpers";
import { workloadStateLabels } from "./workspaceUiLabels";
import { ActionIcon } from "./workspaceShell";

/** Calendar date in local clinic time. */
function localCalendarDateString(date: Date = new Date()): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function calendarDateOfInstant(value: unknown): string | null {
  if (typeof value !== "string" || !value) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : localCalendarDateString(parsed);
}

export function ShiftView({
  activePatient,
  activePatientHasCallablePhone,
  activePatientCallablePhone,
  visibleRecommendedActions,
  recommendedActionPriorityLabels,
  staffRoleLabels,
  selectedWorkspaceRole,
  activeRoleQueue,
  activeRolePolicy,
  activeRoleWritableSections,
  viewLabels,
  activeRoleRestrictedSections,
  dashboard,
  activeQueueRole,
  shiftWarnings,
  warningSeverityLabels,
  openScheduleWarning,
  setError,
  mostLoadedResource,
  setSelectedPatientId,
  activeDoctor
}: any) {
  const doctorTodayAppointments = useMemo(() => {
    if (!dashboard || !dashboard.appointments || !activeDoctor) return [];
    return dashboard.appointments
      .filter((app: any) =>
        app.doctorUserId === activeDoctor.id &&
        calendarDateOfInstant(app.startsAt) === (dashboard.todayIso || localCalendarDateString())
      )
      .sort((a: any, b: any) => String(a.startsAt).localeCompare(String(b.startsAt)));
  }, [dashboard, activeDoctor]);

  const patientsById = useMemo(() => {
    const index = new Map<string, any>();
    for (const patient of dashboard?.patients ?? []) index.set(patient.id, patient);
    return index;
  }, [dashboard?.patients]);

  const [showDetails, setShowDetails] = useState(false);
  const [showAnalytics, setShowAnalytics] = useState(false);
  const [showOtherQueues, setShowOtherQueues] = useState(false);
  return (
    <>

        <section className="shift-hero" id="shift">
            <div className="now-card" style={{ padding: "20px", borderRadius: "14px", border: "1px solid var(--line)", background: "var(--paper)", boxShadow: "var(--shadow-1)", display: "flex", flexDirection: "column", gap: "16px" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "10px" }}>
                <p className="eyebrow">Сейчас в работе</p>
                {activePatient ? (
                  <span className="status-pill status-in_treatment" style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}>
                    <span style={{ width: "6px", height: "6px", borderRadius: "50%", background: "var(--ok-fg)", animation: "dntPulse 1.8s ease infinite" }} />
                    прием идет
                  </span>
                ) : null}
              </div>
              {activePatient ? (
                <>
                  <div className="patient-hero" style={{ display: "flex", alignItems: "center", gap: "14px" }}>
                    <div className="avatar">{activePatient.fullName.slice(0, 1)}</div>
                    <div style={{ minWidth: 0 }}>
                      <h2 style={{ margin: 0, fontSize: "19px", fontWeight: 700, letterSpacing: "-0.01em" }}>{activePatient.fullName}</h2>
                      <p style={{ margin: "2px 0 0", fontSize: "13px", color: "var(--muted)", fontVariantNumeric: "tabular-nums" }}>{activePatient.phone ?? "телефон не указан"}</p>
                    </div>
                  </div>
                  <div className="hero-actions" style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                    <button className="primary-button" type="button" onClick={() => { window.location.hash = "visit"; }}>
                      <ClipboardCheck aria-hidden="true" /> Открыть прием
                    </button>
                    <button className="secondary-button" type="button" onClick={() => { window.location.hash = "imaging"; }}>
                      <ImageIcon aria-hidden="true" /> Снимки
                    </button>
                    <button
                      className="secondary-button"
                      type="button"
                      aria-describedby={!activePatientHasCallablePhone ? "shift-call-guidance" : undefined}
                      aria-disabled={!activePatientHasCallablePhone}
                      title={activePatientHasCallablePhone ? "Позвонить пациенту" : "В карточке пациента нет телефона"}
                      style={{ opacity: !activePatientHasCallablePhone ? 0.6 : 1 }}
                      onClick={() => {
                        if (!activePatientHasCallablePhone) {
                          setError("В карточке пациента нет телефона. Добавьте номер в разделе «Пациенты», чтобы позвонить.");
                          return;
                        }
                        window.location.href = `tel:${activePatientCallablePhone}`;
                      }}
                    >
                      <Phone aria-hidden="true" /> Позвонить
                    </button>
                  </div>
                  
                  {/* Compact Status Tracker */}
                  <div style={{ display: "flex", gap: "12px", background: "var(--paper-soft)", padding: "9px 14px", borderRadius: "10px", border: "1px solid var(--line)", alignItems: "center", fontSize: "12.5px", fontWeight: 600 }}>
                    <span style={{ color: "var(--muted)" }}>Статус:</span>
                    <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                      <span style={{ color: "var(--teal-dark)", fontWeight: 600, display: "flex", alignItems: "center", gap: "4px" }}>1. Запись</span>
                      <span style={{ color: "var(--line-strong)" }}>→</span>
                      <span style={{ color: dashboard?.activeVisit ? "var(--teal-dark)" : "var(--muted)", fontWeight: dashboard?.activeVisit ? 600 : 500 }}>2. ЭМК</span>
                      <span style={{ color: "var(--line-strong)" }}>→</span>
                      <span style={{ color: "var(--muted)", fontWeight: 500 }}>3. Оплата</span>
                    </div>
                  </div>

                  {!activePatientHasCallablePhone ? (
                    <p className="hero-call-guidance" id="shift-call-guidance" role="status" aria-live="polite" style={{ marginTop: "4px", fontSize: "12px", color: "var(--muted)" }}>
                      В карточке пациента нет телефона. Откройте «Пациенты» и добавьте номер, чтобы кнопка звонка стала активной.
                    </p>
                  ) : null}
                </>
              ) : (
                <div style={{ padding: "24px 0", color: "var(--muted)", fontSize: "14px" }}>
                  Нет активного приема. Выберите пациента или запланируйте запись в расписании.
                </div>
              )}
            </div>

            {/* РАСПИСАНИЕ НА СЕГОДНЯ */}
            <div className="today-schedule-box" style={{ padding: "20px", borderRadius: "14px", border: "1px solid var(--line)", background: "var(--paper)", boxShadow: "var(--shadow-1)", display: "flex", flexDirection: "column" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "12px" }}>
                <h3 style={{ margin: 0, display: "flex", alignItems: "center", gap: "8px", fontSize: "14px", fontWeight: 700 }}>
                  <ClipboardCheck size={16} color="var(--teal)" /> Расписание приемов на сегодня
                </h3>
                <span style={{ fontSize: "11.5px", fontWeight: 600, color: "var(--muted)" }}>{doctorTodayAppointments.length} приемов</span>
              </div>
              {doctorTodayAppointments.length > 0 ? (
                <div className="today-schedule-list" style={{ display: "flex", flexDirection: "column", gap: "8px", maxHeight: "280px", overflowY: "auto", paddingRight: "2px" }}>
                  {doctorTodayAppointments.map((app: any) => {
                    const patient = patientsById.get(app.patientId);
                    const isCurrent = activePatient && activePatient.id === app.patientId;
                    
                    const timeStart = new Date(app.startsAt).toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" });
                    const timeEnd = new Date(app.endsAt).toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" });

                    const statusKey = String(app.status || "").toLowerCase();
                    const statusLabels: Record<string, string> = {
                      planned: "запланирован",
                      confirmed: "подтвержден",
                      arrived: "ожидает",
                      in_treatment: "на приеме",
                      in_progress: "на приеме",
                      completed: "завершен",
                      cancelled: "отменен",
                      no_show: "не пришел"
                    };

                    return (
                      <div 
                        key={app.id} 
                        className={`today-schedule-item ${isCurrent ? "current-active" : ""}`}
                        style={{ 
                          display: "flex", 
                          justifyContent: "space-between", 
                          alignItems: "flex-start", 
                          gap: "10px",
                          padding: "11px 13px", 
                          background: isCurrent ? "var(--teal-surface)" : "var(--paper)", 
                          border: isCurrent ? "1px solid var(--teal-ring)" : "1px solid var(--line)", 
                          borderLeft: isCurrent ? "3px solid var(--teal)" : "1px solid var(--line)",
                          borderRadius: "10px",
                          cursor: "pointer",
                          transition: "all 0.15s ease"
                        }}
                        onClick={() => {
                          if (patient) {
                            setSelectedPatientId(patient.id);
                            window.location.hash = "visit";
                          }
                        }}
                      >
                        <div className="today-schedule-item-info" style={{ display: "flex", flexDirection: "column", gap: "2px", minWidth: 0 }}>
                          <span className="today-schedule-time" style={{ fontSize: "11.5px", fontWeight: 600, color: isCurrent ? "var(--teal-dark)" : "var(--muted)", fontVariantNumeric: "tabular-nums" }}>
                            {timeStart} – {timeEnd}
                          </span>
                          <strong className="today-schedule-name" style={{ fontSize: "13.5px", color: "var(--ink)", fontWeight: 700 }}>
                            {patient ? patient.fullName : "Неизвестный пациент"}
                          </strong>
                          <span className="today-schedule-reason" style={{ fontSize: "12.5px", color: "var(--muted)" }}>
                            {app.reason || "плановый осмотр"}
                          </span>
                        </div>
                        <span className={`status-pill status-${statusKey}`}>
                          {statusLabels[statusKey] || app.status}
                        </span>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="today-schedule-empty" style={{ margin: "16px 0 0", color: "var(--muted)", fontSize: "13px" }}>
                  Сегодня у вас нет запланированных приемов.
                </p>
              )}
            </div>
        </section>

        <div className="shift-dashboard-grid" style={{ display: "flex", flexDirection: "column", gap: "16px", marginTop: "16px" }}>
          <>
            <section className="role-focus-strip" aria-label="Фокус текущей роли" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "14px", padding: "14px 18px", borderRadius: "14px", background: "linear-gradient(135deg, var(--teal-surface), transparent 60%), var(--paper)", border: "1px solid var(--line)", boxShadow: "var(--shadow-1)", flexWrap: "wrap" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "12px", minWidth: "240px" }}>
                <div style={{ width: "38px", height: "38px", flexShrink: 0, borderRadius: "11px", background: "var(--teal-soft)", color: "var(--teal-dark)", display: "flex", alignItems: "center", justifyCenter: "center" }}>
                  <UserCheck aria-hidden="true" size={20} style={{ margin: "auto" }} />
                </div>
                <div>
                  <p className="eyebrow" style={{ margin: 0, fontSize: "10.5px", fontWeight: 700, letterSpacing: "0.09em", textTransform: "uppercase" }}>Фокус: {staffRoleLabels?.[selectedWorkspaceRole] ?? selectedWorkspaceRole}</p>
                  <h2 style={{ margin: "1px 0 0", fontSize: "15px", fontWeight: 700, color: "var(--ink)" }}>{activeRoleQueue?.title ?? activeRolePolicy?.title ?? "Рабочая очередь"}</h2>
                  <p style={{ margin: "1px 0 0", fontSize: "12.5px", color: "var(--muted)" }}>{activeRoleQueue?.nextAction ?? activeRolePolicy?.requiresApprovalFor?.[0] ?? "Открыть смену и проверить очередь"}</p>
                </div>
              </div>
              <div className="role-focus-meta" style={{ display: "flex", flexWrap: "wrap", gap: "6px", alignItems: "center" }} aria-label="Доступы текущей роли">
                <span className="status-pill">{activeRoleQueue?.openItems ?? 0} открыто</span>
                {activeRolePolicy ? <span className="status-pill">Старт: {viewLabels?.[activeRolePolicy.defaultSection] ?? activeRolePolicy.defaultSection}</span> : null}
                {(activeRoleWritableSections ?? []).slice(0, 3).map((section: any) => (
                  <span key={section} className="status-pill status-confirmed">✓ {viewLabels?.[section] ?? section}</span>
                ))}
                {activeRoleRestrictedSections?.[0] ? <span className="status-pill status-cancelled">ограничено: {viewLabels?.[activeRoleRestrictedSections[0]] ?? activeRoleRestrictedSections[0]}</span> : null}
              </div>
            </section>

            <section className="shift-intelligence" aria-label="Операционный контроль смены" style={{ background: "var(--paper)", border: "1px solid var(--line)", borderRadius: "14px", padding: "18px 20px", boxShadow: "var(--shadow-1)", display: "flex", flexDirection: "column", gap: "16px" }}>
              <div>
                <UrgentScheduleRequestsWidget
                  headerExtra={
                    <button
                      className="secondary-button"
                      type="button"
                      aria-expanded={showAnalytics}
                      onClick={() => setShowAnalytics((v) => !v)}
                      style={{ minHeight: "30px", padding: "0 12px", fontSize: "12px" }}
                    >
                      {showAnalytics ? "Скрыть аналитику" : "Показать аналитику"}
                    </button>
                  }
                />
              </div>

              {showAnalytics && (
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                  <article className="mode-fit-card" style={{ padding: "16px", borderRadius: "12px", border: "1px solid var(--line)", background: "var(--paper-soft)" }}>
                    <div className="mode-fit-head" style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                      <Building2 aria-hidden="true" />
                      <div>
                        <p className="eyebrow">Режим клиники</p>
                        <h2 style={{ fontSize: "15px", margin: 0 }}>{dashboard?.shiftIntelligence?.modeFit?.title ?? "По умолчанию"}</h2>
                      </div>
                      <strong style={{ marginLeft: "auto", fontSize: "18px", color: "var(--teal-dark)" }}>{dashboard?.shiftIntelligence?.modeFit?.fitScore ?? 0}%</strong>
                    </div>
                    <p style={{ fontSize: "12.5px", color: "var(--muted)", margin: "8px 0" }}>{dashboard?.shiftIntelligence?.modeFit?.lowFrictionNextStep ?? ""}</p>
                  </article>

                  <article className="mode-fit-card resource-focus-card" style={{ padding: "16px", borderRadius: "12px", border: "1px solid var(--line)", background: "var(--paper-soft)" }}>
                    <div className="mode-fit-head" style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                      <Gauge aria-hidden="true" />
                      <div>
                        <p className="eyebrow">Загрузка</p>
                        <h2 style={{ fontSize: "15px", margin: 0 }}>{mostLoadedResource?.title ?? "Нет ресурсов"}</h2>
                      </div>
                      <strong style={{ marginLeft: "auto", fontSize: "18px", color: "var(--teal-dark)" }}>{mostLoadedResource ? `${mostLoadedResource.utilizationPercent}%` : "0%"}</strong>
                    </div>
                    {mostLoadedResource ? (
                      <>
                        <p style={{ fontSize: "12.5px", color: "var(--muted)", margin: "8px 0" }}>
                          {minutesLabel(mostLoadedResource.bookedMinutes)} · {mostLoadedResource.appointmentCount} записей
                        </p>
                        <div className="load-meter" aria-label={`Загрузка ${mostLoadedResource.utilizationPercent}%`} style={{ height: "4px", borderRadius: "4px", background: "var(--line)", overflow: "hidden" }}>
                          <span style={{ display: "block", height: "100%", width: `${Math.min(100, mostLoadedResource.utilizationPercent)}%`, background: "var(--teal)" }} />
                        </div>
                      </>
                    ) : (
                      <p style={{ fontSize: "12.5px", color: "var(--muted)", margin: "8px 0" }}>Врачей и кресел пока нет в настройках.</p>
                    )}
                  </article>
                  <div style={{ gridColumn: "1 / -1", marginTop: "4px" }}>
                    <ConfirmationPerformanceReportsWidget />
                  </div>
                </div>
              )}

              <div className="role-queue-header-row" style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <h3 style={{ margin: 0, fontSize: "14px", fontWeight: 700, letterSpacing: "0.02em" }}>Задачи по ролям</h3>
                {(dashboard?.shiftIntelligence?.roleQueues ?? []).length > 1 && (
                  <button
                    className="text-button toggle-queues-btn"
                    type="button"
                    onClick={() => setShowOtherQueues((v) => !v)}
                  >
                    {showOtherQueues ? "Скрыть другие роли" : "Показать другие роли"}
                  </button>
                )}
              </div>

              <div className="role-queue-grid" style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "12px" }}>
                {(dashboard?.shiftIntelligence?.roleQueues ?? [])
                  .filter((q: any) => q.role === activeQueueRole || showOtherQueues)
                  .map((queue: any) => (
                    <article 
                      className={`role-queue-card ${queue.role === activeQueueRole ? "active" : ""}`} 
                      key={queue.role}
                      style={{
                        position: "relative",
                        padding: "14px 16px",
                        border: queue.role === activeQueueRole ? "1px solid var(--teal-ring)" : "1px solid var(--line)",
                        borderRadius: "12px",
                        background: queue.role === activeQueueRole ? "var(--teal-surface)" : "var(--paper)",
                        boxShadow: "var(--shadow-1)",
                        transition: "all 0.15s ease"
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "8px" }}>
                        <span style={{ display: "inline-flex", alignItems: "center", gap: "6px", fontSize: "11px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: queue.role === activeQueueRole ? "var(--teal-dark)" : "var(--muted)" }}>
                          <UserCheck size={14} aria-hidden="true" />
                          {staffRoleLabels?.[queue.role] ?? queue.role}
                        </span>
                        <strong style={{ fontSize: "22px", fontWeight: 800, color: queue.role === activeQueueRole ? "var(--teal-dark)" : "var(--ink)", fontVariantNumeric: "tabular-nums" }}>{queue.openItems}</strong>
                      </div>
                      <h3 style={{ margin: "8px 0 0", fontSize: "14px", fontWeight: 700, color: "var(--ink)" }}>{queue.title}</h3>
                      <p style={{ margin: "2px 0 0", fontSize: "12.5px", color: "var(--ink-2)" }}>{queue.nextAction}</p>
                      <small style={{ display: "block", marginTop: "8px", fontSize: "11.5px", color: "var(--muted)" }}>{queue.blockedBy?.[0] ?? queue.automationHint}</small>
                    </article>
                  ))}
              </div>
            </section>
          </>
        </div>
    </>
  );
}

export function PatientCockpit({
  activePatient,
  activePatientInsight,
  dashboard,
  activeCommunicationTasks,
  activeImagingStudies,
  activeUsableDocuments
}: any) {
  if (!activePatient) {
    return (
      <section className="patient-cockpit dnt-cockpit" aria-label="Карточка пациента">
        <div className="patient-summary-card" style={{ background: "var(--paper)", border: "1px solid var(--line)", borderRadius: "14px", padding: "20px", boxShadow: "var(--shadow-1)" }}>
          <p className="eyebrow" style={{ margin: "0 0 8px", fontSize: "11px", fontWeight: 700, letterSpacing: "0.09em", textTransform: "uppercase", color: "var(--muted)" }}>Карточка пациента</p>
          <h2 style={{ margin: 0, fontSize: "17px", fontWeight: 700 }}>Пациент не выбран</h2>
          <div className="patient-facts" style={{ marginTop: "8px", fontSize: "13px", color: "var(--muted)" }}>
            <span>Выберите пациента в списке или расписании, чтобы увидеть его данные.</span>
          </div>
        </div>
      </section>
    );
  }

  return (
    <>
        <section className="patient-cockpit dnt-cockpit" aria-label="Карточка пациента">
          <div className="patient-summary-card" style={{ background: "var(--paper)", border: "1px solid var(--line)", borderRadius: "14px", padding: "20px", boxShadow: "var(--shadow-1)", display: "flex", flexDirection: "column", gap: "14px" }}>
            <p className="eyebrow" style={{ margin: 0, fontSize: "11px", fontWeight: 700, letterSpacing: "0.09em", textTransform: "uppercase", color: "var(--muted)" }}>Карточка пациента</p>
            <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
              <div style={{ width: "44px", height: "44px", flexShrink: 0, borderRadius: "12px", background: "var(--teal-soft)", color: "var(--teal-dark)", display: "flex", alignItems: "center", justifyCenter: "center", fontSize: "18px", fontWeight: 800 }}>
                {activePatient.fullName.slice(0, 1)}
              </div>
              <div style={{ minWidth: 0 }}>
                <h2 style={{ margin: 0, fontSize: "16px", fontWeight: 700, color: "var(--ink)" }}>{activePatient.fullName}</h2>
                <p style={{ margin: "1px 0 0", fontSize: "12px", color: "var(--muted)" }}>карта #{activePatient.id ? activePatient.id.slice(0, 6) : "1042"}</p>
              </div>
            </div>

            <div className="patient-info-list" style={{ display: "flex", flexDirection: "column", gap: "9px", fontSize: "13px", color: "var(--ink-2)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <Calendar size={14} style={{ color: "var(--muted)", flexShrink: 0 }} />
                <span>Дата рождения: <strong style={{ color: "var(--ink)", fontWeight: 600 }}>{activePatient.birthDate ?? "не указана"}</strong></span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <Phone size={14} style={{ color: "var(--muted)", flexShrink: 0 }} />
                <span>Телефон: <strong style={{ color: "var(--ink)", fontWeight: 600, fontVariantNumeric: "tabular-nums" }}>{activePatient.phone ?? "не указан"}</strong></span>
              </div>
              {activePatient.notes && (
                <div style={{ display: "flex", alignItems: "flex-start", gap: "8px" }}>
                  <Info size={14} style={{ color: "var(--muted)", flexShrink: 0, marginTop: "2px" }} />
                  <span>Заметки: <strong style={{ color: "var(--ink)", fontWeight: 600 }}>{activePatient.notes}</strong></span>
                </div>
              )}
            </div>

            {activePatientInsight ? (
              <div className={`patient-insight-panel risk-${activePatientInsight.riskLevel}`} style={{ padding: "12px 14px", borderRadius: "11px", background: activePatientInsight.riskLevel === "high" ? "var(--bad-bg)" : activePatientInsight.riskLevel === "medium" ? "var(--warn-bg)" : "var(--paper-soft)", border: "1px solid " + (activePatientInsight.riskLevel === "high" ? "var(--bad-fg)" : activePatientInsight.riskLevel === "medium" ? "var(--warn-fg)" : "var(--line)") }}>
                <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "7px" }}>
                  <span style={{ fontSize: "10.5px", fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.06em", color: activePatientInsight.riskLevel === "high" ? "var(--bad-fg)" : activePatientInsight.riskLevel === "medium" ? "var(--warn-fg)" : "var(--muted)" }}>
                    {patientInsightRiskLabels[activePatientInsight.riskLevel as keyof typeof patientInsightRiskLabels]}
                  </span>
                  <strong style={{ fontSize: "12.5px", color: "var(--ink)" }}>{activePatientInsight.nextBestAction}</strong>
                </div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: "6px", fontSize: "11.5px", fontWeight: 600 }}>
                  {activePatientInsight.balanceDueRub ? <span style={{ background: "var(--paper)", padding: "3px 8px", borderRadius: "6px", border: "1px solid var(--line)", color: "var(--ink)" }}>💰 Долг {money(activePatientInsight.balanceDueRub)}</span> : null}
                  {activePatientInsight.openTasks > 0 ? <span style={{ background: "var(--paper)", padding: "3px 8px", borderRadius: "6px", border: "1px solid var(--line)", color: "var(--ink)" }}>📞 {activePatientInsight.openTasks} задач</span> : null}
                  {activePatientInsight.missingDocumentKinds.length > 0 ? <span style={{ background: "var(--paper)", padding: "3px 8px", borderRadius: "6px", border: "1px solid var(--line)", color: "var(--ink)" }}>📄 {activePatientInsight.missingDocumentKinds.length} док-тов</span> : null}
                  {activePatientInsight.recallDueAt ? <span style={{ background: "var(--paper)", padding: "3px 8px", borderRadius: "6px", border: "1px solid var(--line)", color: "var(--ink)" }}>повтор {formatShortDate(activePatientInsight.recallDueAt)}</span> : null}
                </div>
              </div>
            ) : null}
          </div>

          <div className="patient-feature-grid" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "12px" }}>
            <article className="clickable-card" onClick={() => { window.location.hash = "visit"; }} style={{ padding: "16px", borderRadius: "13px", border: "1px solid var(--line)", background: "var(--paper)", boxShadow: "var(--shadow-1)", cursor: "pointer", display: "flex", flexDirection: "column", gap: "10px", transition: "all 0.18s ease" }}>
              <History aria-hidden="true" size={24} style={{ color: "var(--teal-dark)" }} />
              <div>
                <h3 style={{ margin: 0, fontSize: "14px", fontWeight: 700, color: "var(--ink)" }}>ЭМК / История</h3>
                <p className="tile-meta" style={{ margin: "2px 0 0", fontSize: "12px", color: "var(--muted)" }}>Приёмы · диагнозы · зубная карта</p>
              </div>
            </article>
            <article className="clickable-card" onClick={() => { window.location.hash = "documents"; }} style={{ padding: "16px", borderRadius: "13px", border: "1px solid var(--line)", background: "var(--paper)", boxShadow: "var(--shadow-1)", cursor: "pointer", display: "flex", flexDirection: "column", gap: "10px", transition: "all 0.18s ease" }}>
              <FileText aria-hidden="true" size={24} style={{ color: "var(--teal-dark)" }} />
              <div>
                <h3 style={{ margin: 0, fontSize: "14px", fontWeight: 700, color: "var(--ink)" }}>Документы</h3>
                <p className="tile-meta" style={{ margin: "2px 0 0", fontSize: "12px", color: "var(--muted)" }}>{activeUsableDocuments.length > 0 ? `${activeUsableDocuments.length} шт.` : "нет"} по визиту</p>
              </div>
            </article>
            <article className="clickable-card" onClick={() => { window.location.hash = "finance"; }} style={{ padding: "16px", borderRadius: "13px", border: "1px solid var(--line)", background: "var(--paper)", boxShadow: "var(--shadow-1)", cursor: "pointer", display: "flex", flexDirection: "column", gap: "10px", transition: "all 0.18s ease" }}>
              <CreditCard aria-hidden="true" size={24} style={{ color: "var(--teal-dark)" }} />
              <div>
                <h3 style={{ margin: 0, fontSize: "14px", fontWeight: 700, color: "var(--ink)" }}>Оплаты</h3>
                <p className="tile-meta" style={{ margin: "2px 0 0", fontSize: "12px", color: "var(--muted)" }}>{money(dashboard?.billingSummary?.totalPaidRub ?? 0)} · долг {money(dashboard?.billingSummary?.totalDueRub ?? 0)}</p>
              </div>
            </article>
            <article className="clickable-card" onClick={() => { window.location.hash = "communications"; }} style={{ padding: "16px", borderRadius: "13px", border: "1px solid var(--line)", background: "var(--paper)", boxShadow: "var(--shadow-1)", cursor: "pointer", display: "flex", flexDirection: "column", gap: "10px", transition: "all 0.18s ease" }}>
              <MessageSquare aria-hidden="true" size={24} style={{ color: "var(--teal-dark)" }} />
              <div>
                <h3 style={{ margin: 0, fontSize: "14px", fontWeight: 700, color: "var(--ink)" }}>Связь</h3>
                <p className="tile-meta" style={{ margin: "2px 0 0", fontSize: "12px", color: "var(--muted)" }}>{activeCommunicationTasks.length > 0 ? `${activeCommunicationTasks.length} задач` : "задач нет"}</p>
              </div>
            </article>
            <article className="clickable-card" onClick={() => { window.location.hash = "imaging"; }} style={{ padding: "16px", borderRadius: "13px", border: "1px solid var(--line)", background: "var(--paper)", boxShadow: "var(--shadow-1)", cursor: "pointer", display: "flex", flexDirection: "column", gap: "10px", transition: "all 0.18s ease" }}>
              <ImageIcon aria-hidden="true" size={24} style={{ color: "var(--teal-dark)" }} />
              <div>
                <h3 style={{ margin: 0, fontSize: "14px", fontWeight: 700, color: "var(--ink)" }}>Снимки</h3>
                <p className="tile-meta" style={{ margin: "2px 0 0", fontSize: "12px", color: "var(--muted)" }}>{activeImagingStudies.length > 0 ? `${activeImagingStudies.length} снимка` : "снимков нет"}</p>
              </div>
            </article>
          </div>
        </section>
    </>
  );
}
