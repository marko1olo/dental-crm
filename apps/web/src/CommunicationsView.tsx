import { CheckCircle2, FileText, History, MessageSquare, Send } from "lucide-react";
import type { Dashboard, GeneratedDocument, StaffRole } from "@dental/shared";

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
  completeCommunicationTask: (taskId: string) => void | Promise<void>;
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

function CommunicationTaskCard({
  communicationChannelLabels,
  communicationDocumentTaskActionLabels,
  communicationIntentLabels,
  communicationPriorityLabels,
  communicationSavingTaskId,
  communicationStatusLabels,
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
  completeCommunicationTask: (taskId: string) => void | Promise<void>;
  documentKinds: readonly GeneratedDocument["kind"][];
  documentLabels: Record<GeneratedDocument["kind"], string>;
  formatDateTime: (value: string) => string;
  openCommunicationTaskDocumentWorkflow: (task: CommunicationTask, kind: GeneratedDocument["kind"]) => void;
  staffRoleLabels: Record<StaffRole, string>;
  task: CommunicationTask;
}) {
  const isTaskSaving = communicationSavingTaskId === task.id;
  const communicationSaveInProgress = communicationSavingTaskId !== null;

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
        <span className="status-pill status-completed">закрыто</span>
      ) : (
        <div className="communication-task-actions">
          {documentKinds.map((kind, index) => (
            <button
              className={index === 0 ? "primary-button" : "secondary-button"}
              type="button"
              key={kind}
              onClick={() => openCommunicationTaskDocumentWorkflow(task, kind)}
            >
              <FileText aria-hidden="true" /> {communicationDocumentTaskActionLabels[kind] ?? documentLabels[kind]}
            </button>
          ))}
          {isTaskSaving ? (
            <span className="communication-task-saving" role="status" aria-live="polite">
              Сохраняю в журнал
            </span>
          ) : null}
          <button
            aria-busy={isTaskSaving || undefined}
            className="secondary-button"
            type="button"
            onClick={() => void completeCommunicationTask(task.id)}
            disabled={communicationSaveInProgress}
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
}: CommunicationsViewProps) {
  return (
    <div className="panel communications-panel" id="communications">
      <div className="panel-heading">
        <h2>Связь с пациентами</h2>
        <button className="text-button" type="button" onClick={onGoToSchedule}>
          Расписание
        </button>
      </div>

      <div className="communications-summary-grid" aria-label="Сводка связи">
        <article className={dashboard.communicationSummary.urgentTasks ? "communication-urgent" : ""}>
          <span>Открыто</span>
          <strong>{dashboard.communicationSummary.openTasks}</strong>
          <p>{ruCount(dashboard.communicationSummary.urgentTasks, ["срочная", "срочные", "срочных"])}</p>
        </article>
        <article>
          <span>Сегодня</span>
          <strong>{dashboard.communicationSummary.dueToday}</strong>
          <p>{ruCount(dashboard.communicationSummary.overdue, ["просрочена", "просрочены", "просрочено"])}</p>
        </article>
        <article>
          <span>Подтверждения</span>
          <strong>{dashboard.communicationSummary.appointmentConfirmations}</strong>
          <p>записи и первичные визиты</p>
        </article>
        <article>
          <span>После приема</span>
          <strong>{dashboard.communicationSummary.postVisitInstructions}</strong>
          <p>инструкции пациентам</p>
        </article>
      </div>

      <div className="communication-note-row">
        <label>
          Заметка закрытия
          <input value={communicationNote} onChange={(event) => onCommunicationNoteChange(event.target.value)} />
        </label>
        <span>Задача закрывается с событием и попадает в аудит.</span>
      </div>

      <div className="communication-layout">
        <section className="communication-task-list" aria-label="Очередь связи">
          {sortedCommunicationTasks.length ? (
            sortedCommunicationTasks.map((task) => (
              <CommunicationTaskCard
                communicationChannelLabels={communicationChannelLabels}
                communicationDocumentTaskActionLabels={communicationDocumentTaskActionLabels}
                communicationIntentLabels={communicationIntentLabels}
                communicationPriorityLabels={communicationPriorityLabels}
                communicationSavingTaskId={communicationSavingTaskId}
                communicationStatusLabels={communicationStatusLabels}
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
            <article className="communication-empty-state">
              <MessageSquare aria-hidden="true" />
              <p>Очередь связи пуста. Когда появятся подтверждения, запросы документов или инструкции после приема, они будут здесь.</p>
            </article>
          )}
        </section>

        <aside className="communication-side">
          <section>
            <div className="panel-heading">
              <h3>Шаблоны</h3>
              <span className="status-pill status-arrived">{dashboard.communicationTemplates.length}</span>
            </div>
            <div className="template-list">
              {dashboard.communicationTemplates.map((template) => (
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
              <span className="status-pill status-confirmed">{dashboard.communicationEvents.length}</span>
            </div>
            <div className="template-list">
              {dashboard.communicationEvents.map((event) => (
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
    </div>
  );
}
