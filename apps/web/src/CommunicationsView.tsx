import { SmartMicrophoneButton } from './components/SmartMicrophoneButton';
import { useState } from "react";
import { CheckCircle2, FileText, History, MessageSquare, Send, Mic } from "lucide-react";
import type { CommunicationTaskOutcome, Dashboard, GeneratedDocument, StaffRole } from "@dental/shared";
import { EmptyState } from "./components/EmptyState";
import { MessageDeliveryConsole } from "./components/communications/MessageDeliveryConsole";
import { CampaignPanel } from "./components/communications/CampaignPanel";
import { hasCapability } from "./lib/clinicCapabilities";

type CommunicationTask = Dashboard["communicationTasks"][number];
type CommunicationTemplate = Dashboard["communicationTemplates"][number];
type CommunicationEvent = Dashboard["communicationEvents"][number];

type CommunicationsViewProps = {
  communicationChannelLabels: Record<CommunicationTask["channel"], string>;
  communicationDocumentTaskActionLabels: Partial<Record<GeneratedDocument["kind"], string>>;
  communicationIntentLabels: Record<CommunicationTask["intent"], string>;
  communicationNote: string;
  communicationPriorityLabels: Record<CommunicationTask["priority"], string>;
  communicationSavingTaskId: string | null;
  communicationStatusLabels: Record<CommunicationTask["status"], string>;
  completeCommunicationTask: (taskId: string, outcome: CommunicationTaskOutcome) => void | Promise<void>;
  dashboard: Dashboard;
  documentKindsForCommunicationTask: (task: CommunicationTask) => readonly GeneratedDocument["kind"][];
  documentLabels: Record<GeneratedDocument["kind"], string>;
  formatDateTime: (value: string) => string;
  onCommunicationNoteChange: (value: string) => void;
  onGoToSchedule: () => void;
  openCommunicationTaskDocumentWorkflow: (task: CommunicationTask, kind: GeneratedDocument["kind"]) => void;
  sortedCommunicationTasks: CommunicationTask[];
  staffRoleLabels: Record<StaffRole, string>;
};

function ruCount(value: number, forms: [string, string, string]): string {
  const absolute = Math.abs(value);
  const lastTwo = absolute % 100;
  const last = absolute % 10;
  const form = lastTwo >= 11 && lastTwo <= 14 ? forms[2] : last === 1 ? forms[0] : last >= 2 && last <= 4 ? forms[1] : forms[2];
  return `${value} ${form}`;
}

const communicationTaskOutcomeLabels: Record<CommunicationTaskOutcome, string> = {
  no_answer: "Нет ответа",
  callback_requested: "Перезвонить",
  reschedule_requested: "Перенос записи",
  promised_payment: "Обещал оплату",
  document_pickup: "Заберет документы"
};

const communicationTaskOutcomeOptions = Object.entries(communicationTaskOutcomeLabels) as [CommunicationTaskOutcome, string][];

function CommunicationTaskCard({
  communicationChannelLabels,
  communicationDocumentTaskActionLabels,
  communicationIntentLabels,
  communicationPriorityLabels,
  communicationSavingTaskId,
  communicationStatusLabels,
  completionNoteDescriptionId,
  completeCommunicationTask,
  documentKinds,
  documentLabels,
  formatDateTime,
  openCommunicationTaskDocumentWorkflow,
  staffRoleLabels,
  task
}: {
  communicationChannelLabels: Record<CommunicationTask["channel"], string>;
  communicationDocumentTaskActionLabels: Partial<Record<GeneratedDocument["kind"], string>>;
  communicationIntentLabels: Record<CommunicationTask["intent"], string>;
  communicationPriorityLabels: Record<CommunicationTask["priority"], string>;
  communicationSavingTaskId: string | null;
  communicationStatusLabels: Record<CommunicationTask["status"], string>;
  completionNoteDescriptionId: string;
  completeCommunicationTask: (taskId: string, outcome: CommunicationTaskOutcome) => void | Promise<void>;
  documentKinds: readonly GeneratedDocument["kind"][];
  documentLabels: Record<GeneratedDocument["kind"], string>;
  formatDateTime: (value: string) => string;
  openCommunicationTaskDocumentWorkflow: (task: CommunicationTask, kind: GeneratedDocument["kind"]) => void;
  staffRoleLabels: Record<StaffRole, string>;
  task: CommunicationTask;
}) {
  const [selectedOutcome, setSelectedOutcome] = useState<CommunicationTaskOutcome | "">("");
  const isTaskSaving = communicationSavingTaskId === task.id;
  const communicationSaveInProgress = communicationSavingTaskId !== null;
  const outcomeSelectId = `communication-task-outcome-${task.id}`;
  const savingStatusId = `communication-task-saving-${task.id}`;

  function handleCompleteTask() {
    if (!selectedOutcome) return;
    void completeCommunicationTask(task.id, selectedOutcome);
  }

  return (
    <article className={`communication-task priority-${task.priority}`} key={task.id}>
      <MessageSquare aria-hidden="true" />
      <div>
        <span>
          {communicationIntentLabels[task.intent]} · {communicationChannelLabels[task.channel]} · {staffRoleLabels[task.assignedRole]}
        </span>
        <h3>{task.title}</h3>
        <p>{task.body}</p>
        <small>
          {formatDateTime(task.dueAt)} · {communicationPriorityLabels[task.priority]} · {communicationStatusLabels[task.status]}
        </small>
      </div>
      {task.status === "completed" ? (
        <span className="status-pill status-completed">
          {task.lastOutcome ? communicationTaskOutcomeLabels[task.lastOutcome] : "закрыто"}
        </span>
      ) : (
        <div className="communication-task-actions">
          {documentKinds.map((kind, index) => {
            const documentActionLabel = communicationDocumentTaskActionLabels[kind] ?? documentLabels[kind];
            return (
            <button
              className={index === 0 ? "primary-button" : "secondary-button"}
              type="button"
              key={kind}
              onClick={() => openCommunicationTaskDocumentWorkflow(task, kind)}
              aria-label={`${documentActionLabel}: ${task.title}`}
            >
              <FileText aria-hidden="true" /> {documentActionLabel}
            </button>
            );
          })}
          {isTaskSaving ? (
            <span className="communication-task-saving" id={savingStatusId} role="status" aria-live="polite">
              Сохраняю в журнал
            </span>
          ) : null}
          <div className="communication-outcome-select">
            <label htmlFor={outcomeSelectId} style={{ fontSize: '13px', color: 'var(--slate-500)', fontWeight: 500, marginBottom: '8px', display: 'block' }}>Исход</label>
            <select
              id={outcomeSelectId}
              value={selectedOutcome}
              onChange={(e) => setSelectedOutcome(e.target.value as CommunicationTaskOutcome)}
              style={{ display: "none" }} // keep chips visual but have a linked select for accessibility
            >
              <option value="">Выберите исход...</option>
              {communicationTaskOutcomeOptions.map(([outcome, label]) => (
                <option key={outcome} value={outcome}>{label}</option>
              ))}
            </select>
            <div className="quick-chips-row" style={{ flexWrap: 'wrap' }}>
              {communicationTaskOutcomeOptions.map(([outcome, label]) => (
                <button
                  key={outcome}
                  type="button"
                  className={`quick-chip ${selectedOutcome === outcome ? 'selected' : ''}`}
                  onClick={() => setSelectedOutcome(outcome as CommunicationTaskOutcome)}
                  disabled={communicationSaveInProgress}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
          <button
            aria-label={`Закрыть задачу связи: ${task.title}`}
            aria-busy={isTaskSaving || undefined}
            aria-describedby={isTaskSaving ? `${completionNoteDescriptionId} ${savingStatusId}` : completionNoteDescriptionId}
            className="secondary-button"
            type="button"
            onClick={handleCompleteTask}
            disabled={communicationSaveInProgress || !selectedOutcome}
          >
            <CheckCircle2 aria-hidden="true" /> {isTaskSaving ? "Закрываю" : "Закрыть"}
          </button>
        </div>
      )}
    </article>
  );
}

function CommunicationTemplateRow({
  communicationChannelLabels,
  staffRoleLabels,
  template
}: {
  communicationChannelLabels: Record<CommunicationTask["channel"], string>;
  staffRoleLabels: Record<StaffRole, string>;
  template: CommunicationTemplate;
}) {
  return (
    <article key={template.id}>
      <Send aria-hidden="true" />
      <div>
        <strong>{template.title}</strong>
        <p>{communicationChannelLabels[template.channel]} · {staffRoleLabels[template.audienceRole]}</p>
      </div>
    </article>
  );
}

function CommunicationEventRow({
  communicationChannelLabels,
  communicationStatusLabels,
  event,
  formatDateTime
}: {
  communicationChannelLabels: Record<CommunicationTask["channel"], string>;
  communicationStatusLabels: Record<CommunicationTask["status"], string>;
  event: CommunicationEvent;
  formatDateTime: (value: string) => string;
}) {
  return (
    <article key={event.id}>
      <History aria-hidden="true" />
      <div>
        <strong>{communicationChannelLabels[event.channel]} · {communicationStatusLabels[event.status]}</strong>
        <p>{event.message} · {formatDateTime(event.createdAt)}</p>
      </div>
    </article>
  );
}

export function CommunicationsView({
  communicationChannelLabels,
  communicationDocumentTaskActionLabels,
  communicationIntentLabels,
  communicationNote,
  communicationPriorityLabels,
  communicationSavingTaskId,
  communicationStatusLabels,
  completeCommunicationTask,
  dashboard,
  documentKindsForCommunicationTask,
  documentLabels,
  formatDateTime,
  onCommunicationNoteChange,
  onGoToSchedule,
  openCommunicationTaskDocumentWorkflow,
  sortedCommunicationTasks,
  staffRoleLabels
}: any = {}) {
  const communicationNoteInputId = "communication-closing-note";
  const communicationNoteDescriptionId = "communication-closing-note-guidance";
  // Режим клиники решает, какие разделы уместны. Пока профиль не загружен,
  // режим не известен — тогда показывается всё (см. clinicCapabilities).
  const clinicMode = dashboard?.clinicSettings?.profile?.mode ?? null;

  const communicationSummaryHasNumbers = Boolean(
    (dashboard?.communicationSummary?.openTasks ?? 0) ||
      (dashboard?.communicationSummary?.dueToday ?? 0) ||
      (dashboard?.communicationSummary?.overdue ?? 0) ||
      (dashboard?.communicationSummary?.urgentTasks ?? 0) ||
      (dashboard?.communicationSummary?.appointmentConfirmations ?? 0) ||
      (dashboard?.communicationSummary?.postVisitInstructions ?? 0)
  );

  return (
    <div className="panel communications-panel" id="communications" data-testid="communications-view">
      <div className="panel-heading">
        <h2 title="Центр коммуникаций с пациентами: подтверждения визитов, рассылки, чаты и звонки">Связь с пациентами</h2>
        <button className="text-button" type="button" onClick={onGoToSchedule} title="Перейти к сетке расписания">
          Расписание
        </button>
      </div>

      {/*
        Сводка из четырёх счётчиков нужна тогда, когда в ней есть хоть что-то.
        В клинике без задач связи это были четыре нуля в ряд — они занимали
        верх экрана и не сообщали ничего, кроме того, что и так видно по
        пустому списку ниже. Показываем сводку, когда есть о чём сводить.
      */}
      {communicationSummaryHasNumbers ? (
      <div className="communications-summary-grid" aria-label="Сводка связи">
        <article className={dashboard?.communicationSummary?.urgentTasks ? "communication-urgent" : ""}>
          <span>Открыто</span>
          <strong>{dashboard?.communicationSummary?.openTasks ?? 0}</strong>
          <p>{ruCount(dashboard?.communicationSummary?.urgentTasks ?? 0, ["срочная", "срочные", "срочных"])}</p>
        </article>
        <article>
          <span>Сегодня</span>
          <strong>{dashboard?.communicationSummary?.dueToday ?? 0}</strong>
          <p>{ruCount(dashboard?.communicationSummary?.overdue ?? 0, ["просрочена", "просрочены", "просрочено"])}</p>
        </article>
        <article>
          <span>Подтверждения</span>
          <strong>{dashboard?.communicationSummary?.appointmentConfirmations ?? 0}</strong>
          <p>записи и первичные визиты</p>
        </article>
        <article>
          <span>После приема</span>
          <strong>{dashboard?.communicationSummary?.postVisitInstructions ?? 0}</strong>
          <p>инструкции пациентам</p>
        </article>
      </div>
      ) : null}

      {/*
        Поле заметки нужно только при закрытии задачи связи: оно уходит в
        `POST /api/communications/tasks/complete` вместе с taskId. Раньше блок
        висел на экране всегда — и у клиники без единой задачи это была форма
        без объекта: «Заметка закрытия» чего, если закрывать нечего.
      */}
      {(sortedCommunicationTasks ?? []).length ? (
      <div className="communication-note-row bg-[var(--paper)] border border-[var(--line)] text-[var(--ink)] rounded-xl p-4 mb-5">
        <div className="flex justify-between items-center mb-3">
          <div>
            <label htmlFor={communicationNoteInputId} className="text-sm font-semibold text-[var(--ink)] block">
              Что сказал пациент
            </label>
            <span id={communicationNoteDescriptionId} className="text-xs text-[var(--muted)]">Запись попадёт в задачу, которую вы закроете ниже, и останется в журнале клиники.</span>
          </div>
          <SmartMicrophoneButton
            context="general"
            onResult={(t) => {
              const prev = communicationNote || "";
              onCommunicationNoteChange(prev ? `${prev}, ${t}` : t);
            }}
            className="inline-flex gap-1.5 items-center px-3 py-1.5 text-[var(--teal-dark,#0f766e)] bg-[var(--teal-soft,#ccfbf1)] border-none rounded-lg font-semibold text-xs hover:opacity-80 transition-opacity"
          />
        </div>
        <textarea
          id={communicationNoteInputId}
          value={communicationNote}
          onChange={(event) => onCommunicationNoteChange(event.target.value)}
          aria-describedby={communicationNoteDescriptionId}
          placeholder="Нажмите для ввода или надиктуйте результат связи..."
          rows={2}
          className="w-full p-2.5 rounded-lg border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)] text-sm resize-y mb-3 focus:outline-none focus:ring-2 focus:ring-[var(--focus-ring,rgba(20,184,166,0.5))]"
        />
        <div className="quick-chips-row flex-wrap gap-2">
          <span className="text-xs text-[var(--muted)] self-center mr-1">Шаблоны:</span>
          {["Недозвон", "Обещал оплатить", "Подумает", "Перезвонить позже", "Запрос документов"].map((chip) => (
            <button
              key={chip}
              type="button"
              className="quick-chip focus:outline-none focus:ring-2 focus:ring-[var(--focus-ring,rgba(20,184,166,0.5))] transition-all hover:scale-[1.02]"
              onClick={() => {
                const prev = communicationNote || "";
                onCommunicationNoteChange(prev ? `${prev}, ${chip.toLowerCase()}` : chip);
              }}
            >
              + {chip}
            </button>
          ))}
        </div>
      </div>
      ) : null}

      {/*
        Пульт отправки: настоящие шлюзы, журнал с причиной отказа, редактор
        шаблонов и правила рассылки.

        Рассылки по базе показываются не всем. Отдельному врачу они не нужны —
        его режим описан как «минимум экранов», маркетинга у него нет, а лишний
        раздел на экране стоит дороже, чем отсутствующая возможность. Решение
        принимает таблица режимов в lib/clinicCapabilities.ts, а не сравнение
        строк здесь.
      */}
      <MessageDeliveryConsole />
      {hasCapability(clinicMode, "massCampaigns") ? <CampaignPanel /> : null}

      <div className="communication-layout">
        <section className="communication-task-list" aria-label="Очередь связи">
          {(sortedCommunicationTasks ?? []).length ? (
            (sortedCommunicationTasks ?? []).map((task) => (
              <CommunicationTaskCard
                communicationChannelLabels={communicationChannelLabels}
                communicationDocumentTaskActionLabels={communicationDocumentTaskActionLabels}
                communicationIntentLabels={communicationIntentLabels}
                communicationPriorityLabels={communicationPriorityLabels}
                communicationSavingTaskId={communicationSavingTaskId}
                communicationStatusLabels={communicationStatusLabels}
                completionNoteDescriptionId={communicationNoteDescriptionId}
                completeCommunicationTask={completeCommunicationTask}
                documentKinds={documentKindsForCommunicationTask(task)}
                documentLabels={documentLabels}
                formatDateTime={formatDateTime}
                key={task.id}
                openCommunicationTaskDocumentWorkflow={openCommunicationTaskDocumentWorkflow}
                staffRoleLabels={staffRoleLabels}
                task={task}
              />
            ))
          ) : (
            <EmptyState
              title="Очередь связи пуста"
              description="Когда появятся подтверждения, запросы документов или инструкции после приема, они отобразятся здесь."
              action={
                <button className="text-button" type="button" onClick={onGoToSchedule}>
                  Открыть расписание
                </button>
              }
              className="my-4 py-8"
            />
          )}
        </section>

        <aside className="communication-side">
          <section>
            <div className="panel-heading">
              <h3>Шаблоны</h3>
              <span className="status-pill status-arrived">{(dashboard?.communicationTemplates ?? []).length}</span>
            </div>
            <div className="template-list">
              {(dashboard?.communicationTemplates ?? []).map((template) => (
                <CommunicationTemplateRow
                  communicationChannelLabels={communicationChannelLabels}
                  key={template.id}
                  staffRoleLabels={staffRoleLabels}
                  template={template}
                />
              ))}
            </div>
          </section>

          <section>
            <div className="panel-heading">
              <h3>Журнал</h3>
              <span className="status-pill status-confirmed">{(dashboard?.communicationEvents ?? []).length}</span>
            </div>
            <div className="template-list">
              {(dashboard?.communicationEvents ?? []).map((event) => (
                <CommunicationEventRow
                  communicationChannelLabels={communicationChannelLabels}
                  communicationStatusLabels={communicationStatusLabels}
                  event={event}
                  formatDateTime={formatDateTime}
                  key={event.id}
                />
              ))}
            </div>
          </section>
        </aside>
      </div>

      {/*
        ЗДЕСЬ БЫЛА СЕТКА ИЗ 14 ВИДЖЕТОВ. Убрана после проверки живыми запросами:

          404 (маршрута не существует вовсе) — 9 штук:
            appointment-channel-inheritances, chat-message-dispatch-statuses,
            collaborative-chat-processing-states, message-template-catalogs,
            messenger-file-attachments, previous-chat-dialog-histories,
            uis-call-speech-transcripts, uis-mass-appointment-confirmations,
            uis-sms-chat-quotas
          200 с пустым массивом (таблицы пусты) — 5 штук:
            email-dispatch-logs, quick-appointment-confirmations,
            uis-omni-messenger-queues, confirmation-performance-reports,
            prodoctorov-sync

        То есть все четырнадцать показывали «данные отсутствуют» и занимали
        четыре экрана прокрутки под рабочими панелями. Их назначение уже
        закрыто настоящими инструментами выше:
          справочник шаблонов        → редактор в «Отправке сообщений»
          логи отправки по e-mail    → журнал очереди с причиной отказа
          квоты SMS                  → остаток на счету в состоянии шлюзов
          массовое подтверждение     → «Рассылки»
          отчёт по подтверждениям    → «Обзвон и подтверждения» и отчёты

        Дописывать девять отсутствующих маршрутов ради виджетов, которых никто
        не просил, значило бы выдумывать контракты. Файлы виджетов удалены,
        кроме ConfirmationPerformanceReportsWidget: он используется ещё в
        аналитике и в смене.
      */}
    </div>
  );
}
