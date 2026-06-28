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
  Gauge
} from "lucide-react";
import { useState, useMemo } from "react";
import { formatShortDate, money, minutesLabel, patientInsightRiskLabels } from "./AppHelpers";
import { workloadStateLabels } from "./workspaceUiLabels";
import { ActionIcon } from "./workspaceShell";

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
      .filter((app: any) => app.doctorUserId === activeDoctor.id)
      .sort((a: any, b: any) => a.startsAt.localeCompare(b.startsAt));
  }, [dashboard, activeDoctor]);

  const [showDetails, setShowDetails] = useState(false);
  const [showAnalytics, setShowAnalytics] = useState(false);
  const [showOtherQueues, setShowOtherQueues] = useState(false);
  return (
    <>

        <section className="shift-hero" id="shift">
          <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
            <div className="now-card">
              <p className="eyebrow">Сейчас в работе</p>
              {activePatient ? (
                <>
                  <div className="patient-hero">
                    <div className="avatar">{activePatient.fullName.slice(0, 1)}</div>
                    <div>
                      <h2>{activePatient.fullName}</h2>
                      <p>{activePatient.phone ?? "телефон не указан"}</p>
                    </div>
                  </div>
                  <div className="hero-actions">
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
                      disabled={!activePatientHasCallablePhone}
                      title={activePatientHasCallablePhone ? "Позвонить пациенту" : "В карточке пациента нет телефона"}
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
                  {!activePatientHasCallablePhone ? (
                    <p className="hero-call-guidance" id="shift-call-guidance" role="status" aria-live="polite">
                      В карточке пациента нет телефона. Откройте «Пациенты» и добавьте номер, чтобы кнопка звонка стала активной.
                    </p>
                  ) : null}
                </>
              ) : (
                <div style={{ padding: "20px 0", color: "#6b7280", fontSize: "15px" }}>
                  Нет активного приема. Выберите пациента или запланируйте запись в расписании.
                </div>
              )}
            </div>

            {/* РАСПИСАНИЕ НА СЕГОДНЯ */}
            <div className="today-schedule-box" style={{ background: "var(--paper-strong)", border: "1px solid var(--line)", borderRadius: "8px", boxShadow: "var(--shadow)", padding: "18px" }}>
              <h3 style={{ margin: "0 0 12px 0", fontSize: "14px", fontWeight: "700", color: "var(--slate-800)", display: "flex", alignItems: "center", gap: "8px" }}>
                <ClipboardCheck size={16} color="var(--teal)" /> Расписание приемов на сегодня
              </h3>
              {doctorTodayAppointments.length > 0 ? (
                <div className="today-schedule-list" style={{ display: "flex", flexDirection: "column", gap: "8px", maxHeight: "280px", overflowY: "auto", paddingRight: "4px" }}>
                  {doctorTodayAppointments.map((app: any) => {
                    const patient = dashboard.patients.find((p: any) => p.id === app.patientId);
                    const isCurrent = activePatient && activePatient.id === app.patientId;
                    
                    const timeStart = new Date(app.startsAt).toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" });
                    const timeEnd = new Date(app.endsAt).toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" });

                    const statusLabels: Record<string, string> = {
                      planned: "запланирован",
                      confirmed: "подтвержден",
                      arrived: "ожидает",
                      in_treatment: "на приеме",
                      completed: "завершен",
                      cancelled: "отменен",
                      no_show: "не пришел"
                    };

                    return (
                      <div 
                        key={app.id} 
                        className={`today-schedule-item status-${app.status} ${isCurrent ? "current-active" : ""}`}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          padding: "10px 12px",
                          border: isCurrent ? "2px solid var(--teal)" : "1px solid var(--line)",
                          borderRadius: "8px",
                          background: isCurrent ? "rgba(13, 148, 136, 0.05)" : "var(--paper-light)",
                          cursor: "pointer",
                          transition: "all 0.2s ease"
                        }}
                        onClick={() => {
                          if (patient) {
                            setSelectedPatientId(patient.id);
                            window.location.hash = "visit";
                          }
                        }}
                      >
                        <div style={{ display: "flex", flexDirection: "column", gap: "2px", minWidth: 0 }}>
                          <span style={{ fontSize: "11px", fontWeight: "800", color: "var(--slate-500)" }}>
                            {timeStart} – {timeEnd}
                          </span>
                          <strong style={{ fontSize: "13px", color: "var(--slate-800)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                            {patient ? patient.fullName : "Неизвестный пациент"}
                          </strong>
                          <span style={{ fontSize: "11px", color: "var(--slate-500)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                            {app.reason || "плановый осмотр"}
                          </span>
                        </div>
                        <span className={`visit-document-badge status-${app.status === "in_treatment" || app.status === "completed" || app.status === "confirmed" ? "signed" : "draft"}`} style={{ fontSize: "9px", fontWeight: "800", textTransform: "uppercase", padding: "2px 6px", borderRadius: "4px", whiteSpace: "nowrap" }}>
                          {statusLabels[app.status] || app.status}
                        </span>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p style={{ fontSize: "12px", color: "var(--slate-500)", margin: 0 }}>
                  Сегодня у вас нет запланированных приемов.
                </p>
              )}
            </div>
          </div>

          <div className="next-actions" aria-label="Следующие действия">
            {visibleRecommendedActions.map((action: any) => (
              <button
                className={`action-tile priority-${action.priority}`}
                key={action.id}
                type="button"
                onClick={() => {
                  window.location.hash = action.section;
                }}
              >
                <ActionIcon section={action.section} />
                <div>
                  <span>{action.metricLabel}</span>
                  <p>{action.title}</p>
                  <small>
                    {recommendedActionPriorityLabels[action.priority]} · {action.detail}
                  </small>
                </div>
              </button>
            ))}
          </div>
        </section>

        <section className="care-path" aria-label="Путь приема">
          {["Запись", "ЭМК", "Оплата", "Документы"].map((step, index) => (
            <div className={`path-step ${index <= 1 ? "done" : ""}`} key={step}>
              <span>{index + 1}</span>
              <p>{step}</p>
            </div>
          ))}
        </section>

        <div className="shift-details-toggle">
          <button
            className="text-button shift-details-btn"
            type="button"
            aria-expanded={showDetails}
            onClick={() => setShowDetails((v) => !v)}
          >
            {showDetails ? <ChevronUp size={16} aria-hidden="true" /> : <ChevronDown size={16} aria-hidden="true" />}
            {showDetails ? "Скрыть детали смены" : "Показать детали смены"}
          </button>
        </div>

        {showDetails && (
          <>
            <section className="role-focus-strip" aria-label="Фокус текущей роли">
              <div>
                <UserCheck aria-hidden="true" />
                <div>
                  <p className="eyebrow">Фокус: {staffRoleLabels[selectedWorkspaceRole]}</p>
                  <h2>{activeRoleQueue?.title ?? activeRolePolicy?.title ?? "Рабочая очередь"}</h2>
                  <p>{activeRoleQueue?.nextAction ?? activeRolePolicy?.requiresApprovalFor[0] ?? "Открыть смену и проверить очередь"}</p>
                </div>
              </div>
              <div className="role-focus-meta" aria-label="Доступы текущей роли">
                <span>{activeRoleQueue?.openItems ?? 0} открыто</span>
                {activeRolePolicy ? <span>Старт: {viewLabels[activeRolePolicy.defaultSection]}</span> : null}
                {activeRoleWritableSections.slice(0, 3).map((section: any) => (
                  <span key={section}>пишет: {viewLabels[section]}</span>
                ))}
                {activeRoleRestrictedSections[0] ? <span>ограничено: {viewLabels[activeRoleRestrictedSections[0]]}</span> : null}
              </div>
            </section>

            <section className="shift-intelligence" aria-label="Операционный контроль смены">
              <div className="analytics-toggle-container" style={{ gridColumn: "1 / -1" }}>
                <button
                  className="secondary-button"
                  type="button"
                  aria-expanded={showAnalytics}
                  onClick={() => setShowAnalytics((v) => !v)}
                  style={{ minHeight: "30px", padding: "0 12px", fontSize: "12px" }}
                >
                  {showAnalytics ? "Скрыть аналитику" : "Показать аналитику"}
                </button>
              </div>

              {showAnalytics && (
                <>
                  <article className="mode-fit-card">
                    <div className="mode-fit-head">
                      <Building2 aria-hidden="true" />
                      <div>
                        <p className="eyebrow">Режим клиники</p>
                        <h2>{dashboard.shiftIntelligence.modeFit.title}</h2>
                      </div>
                      <strong>{dashboard.shiftIntelligence.modeFit.fitScore}%</strong>
                    </div>
                    <p>{dashboard.shiftIntelligence.modeFit.lowFrictionNextStep}</p>
                    <div className="mode-fit-list">
                      {(dashboard.shiftIntelligence.modeFit.blockers.length
                        ? dashboard.shiftIntelligence.modeFit.blockers
                        : dashboard.shiftIntelligence.modeFit.upgrades
                      ).map((item: any) => (
                        <span key={item}>{item}</span>
                      ))}
                    </div>
                  </article>

                  <article className="mode-fit-card resource-focus-card">
                    <div className="mode-fit-head">
                      <Gauge aria-hidden="true" />
                      <div>
                        <p className="eyebrow">Загрузка</p>
                        <h2>{mostLoadedResource?.title ?? "Нет ресурсов"}</h2>
                      </div>
                      <strong>{mostLoadedResource ? `${mostLoadedResource.utilizationPercent}%` : "0%"}</strong>
                    </div>
                    {mostLoadedResource ? (
                      <>
                        <p>
                          {minutesLabel(mostLoadedResource.bookedMinutes)} · {mostLoadedResource.appointmentCount} записей ·{" "}
                          {workloadStateLabels[mostLoadedResource.state as keyof typeof workloadStateLabels]}
                        </p>
                        <div className="load-meter" aria-label={`Загрузка ${mostLoadedResource.utilizationPercent}%`}>
                          <span style={{ width: `${Math.min(100, mostLoadedResource.utilizationPercent)}%` }} />
                        </div>
                        <div className="mode-fit-list">
                          {mostLoadedResource.flags.slice(0, 3).map((flag: any) => (
                            <span key={flag}>{flag}</span>
                          ))}
                        </div>
                      </>
                    ) : (
                      <p>Врачей и кресел пока нет в настройках.</p>
                    )}
                  </article>
                </>
              )}

              <div className="role-queue-header-row">
                <h3>Задачи по ролям</h3>
                {dashboard.shiftIntelligence.roleQueues.length > 1 && (
                  <button
                    className="text-button toggle-queues-btn"
                    type="button"
                    onClick={() => setShowOtherQueues((v) => !v)}
                  >
                    {showOtherQueues ? "Скрыть другие роли" : "Показать другие роли"}
                  </button>
                )}
              </div>

              <div className="role-queue-grid">
                {dashboard.shiftIntelligence.roleQueues
                  .filter((q: any) => q.role === activeQueueRole || showOtherQueues)
                  .map((queue: any) => (
                    <article className={`role-queue-card ${queue.role === activeQueueRole ? "active" : ""}`} key={queue.role}>
                      <div>
                        <UserCheck aria-hidden="true" />
                        <span>{staffRoleLabels[queue.role]}</span>
                      </div>
                      <h3>{queue.title}</h3>
                      <p>{queue.nextAction}</p>
                      <strong>{queue.openItems}</strong>
                      <small>{queue.blockedBy[0] ?? queue.automationHint}</small>
                    </article>
                  ))}
              </div>

              <div className="shift-warning-list">
                {shiftWarnings.slice(0, 4).map((warning: any) => (
                  <article className={`shift-warning warning-${warning.severity}`} key={warning.id}>
                    <AlertTriangle aria-hidden="true" />
                    <div>
                      <span>{warningSeverityLabels[warning.severity]} · {staffRoleLabels[warning.ownerRole]}</span>
                      <h3>{warning.title}</h3>
                      <p>{warning.detail}</p>
                    </div>
                    <button className="text-button" type="button" onClick={() => openScheduleWarning(warning)}>
                      {warning.actionLabel}
                    </button>
                  </article>
                ))}
              </div>
            </section>
          </>
        )}
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
      <section className="patient-cockpit" aria-label="Карточка пациента">
        <div className="patient-summary-card">
          <p className="eyebrow">Карточка пациента</p>
          <h2>Пациент не выбран</h2>
          <div className="patient-facts">
            <span>Выберите пациента в списке или расписании, чтобы увидеть его данные.</span>
          </div>
        </div>
      </section>
    );
  }

  return (
    <>
        <section className="patient-cockpit" aria-label="Карточка пациента">
          <div className="patient-summary-card">
            <p className="eyebrow">Карточка пациента</p>
            <h2>{activePatient.fullName}</h2>
            <div className="patient-facts">
              <span>{activePatient.birthDate ?? "дата рождения не указана"}</span>
              <span>{activePatient.phone ?? "телефон не указан"}</span>
              <span>{activePatient.notes ?? "без критических заметок"}</span>
            </div>
            {activePatientInsight ? (
              <div className={`patient-insight-panel risk-${activePatientInsight.riskLevel}`}>
                <div className="patient-insight-head">
                  <span>{patientInsightRiskLabels[activePatientInsight.riskLevel as keyof typeof patientInsightRiskLabels]}</span>
                  <strong>{activePatientInsight.nextBestAction}</strong>
                </div>
                <div className="patient-insight-meta">
                  <span>{activePatientInsight.balanceDueRub ? `остаток ${money(activePatientInsight.balanceDueRub)}` : "оплата спокойна"}</span>
                  <span>{activePatientInsight.openTasks} задач связи</span>
                  <span>{activePatientInsight.missingDocumentKinds.length} документов</span>
                  {activePatientInsight.recallDueAt ? <span>повторный визит {formatShortDate(activePatientInsight.recallDueAt)}</span> : null}
                </div>
                <p>{activePatientInsight.riskReasons.slice(0, 2).join(" · ")}</p>
              </div>
            ) : null}
          </div>
          <div className="patient-feature-grid">
            <article className="clickable-card" onClick={() => { window.location.hash = "visit"; }} style={{ cursor: "pointer" }}>
              <History aria-hidden="true" />
              <div>
                <h3>История (ЭМК)</h3>
                <p>Приемы, диагнозы, зубная карта, файлы и решения врача в одном месте. Нажмите, чтобы открыть прием.</p>
              </div>
            </article>
            <article className="clickable-card" onClick={() => { window.location.hash = "documents"; }} style={{ cursor: "pointer" }}>
              <FileText aria-hidden="true" />
              <div>
                <h3>Документы</h3>
                <p>{activeUsableDocuments.length} документа по текущему лечению, включая договор и акт. Нажмите, чтобы открыть.</p>
              </div>
            </article>
            <article className="clickable-card" onClick={() => { window.location.hash = "finance"; }} style={{ cursor: "pointer" }}>
              <CreditCard aria-hidden="true" />
              <div>
                <h3>Оплаты</h3>
                <p>
                  Оплачено {money(dashboard.billingSummary.totalPaidRub)}, остаток {money(dashboard.billingSummary.totalDueRub)}. Нажмите, чтобы перейти.
                </p>
              </div>
            </article>
            <article className="clickable-card" onClick={() => { window.location.hash = "communications"; }} style={{ cursor: "pointer" }}>
              <MessageSquare aria-hidden="true" />
              <div>
                <h3>Связь</h3>
                <p>{activeCommunicationTasks.length} задач: подтверждения, долги, инструкции и повторные визиты. Нажмите для перехода.</p>
              </div>
            </article>
            <article className="clickable-card" onClick={() => { window.location.hash = "imaging"; }} style={{ cursor: "pointer" }}>
              <ImageIcon aria-hidden="true" />
              <div>
                <h3>Снимки</h3>
                <p>{activeImagingStudies.length} снимка: прицельные, ОПТГ, ТРГ, КТ и фото. Нажмите для просмотра.</p>
              </div>
            </article>
          </div>
        </section>
    </>
  );
}
