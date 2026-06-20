import {
  AlertTriangle,
  Building2,
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
  mostLoadedResource
}: any) {
  return (
    <>

        <section className="shift-hero" id="shift">
          <div className="now-card">
            <p className="eyebrow">Сейчас в работе</p>
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

          <div className="role-queue-grid">
            {dashboard.shiftIntelligence.roleQueues.map((queue: any) => (
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
            <article>
              <History aria-hidden="true" />
              <div>
                <h3>История</h3>
                <p>Приемы, диагнозы, зубная карта, файлы и решения врача в одном месте.</p>
              </div>
            </article>
            <article>
              <FileText aria-hidden="true" />
              <div>
                <h3>Документы</h3>
                <p>{activeUsableDocuments.length} документа по текущему лечению, включая договор и акт.</p>
              </div>
            </article>
            <article>
              <CreditCard aria-hidden="true" />
              <div>
                <h3>Оплаты</h3>
                <p>
                  Оплачено {money(dashboard.billingSummary.totalPaidRub)}, остаток {money(dashboard.billingSummary.totalDueRub)}.
                </p>
              </div>
            </article>
            <article>
              <MessageSquare aria-hidden="true" />
              <div>
                <h3>Связь</h3>
                <p>{activeCommunicationTasks.length} задач: подтверждения, долги, инструкции и повторные визиты.</p>
              </div>
            </article>
            <article>
              <ImageIcon aria-hidden="true" />
              <div>
                <h3>Снимки</h3>
                <p>{activeImagingStudies.length} снимка: прицельные, ОПТГ, ТРГ, КТ и фото без поиска по папкам.</p>
                <button className="text-button feature-link" type="button" onClick={() => { window.location.hash = "imaging"; }}>
                  Открыть просмотрщик
                </button>
              </div>
            </article>
          </div>
        </section>
    </>
  );
}
