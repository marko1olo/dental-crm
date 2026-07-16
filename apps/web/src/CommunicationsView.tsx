import type {
	CommunicationTaskOutcome,
	Dashboard,
	GeneratedDocument,
	StaffRole,
} from "@dental/shared";
import { motion } from "framer-motion";
import {
	CheckCircle2,
	FileText,
	History,
	MessageSquare,
	Mic,
	Send,
} from "lucide-react";
import { useState } from "react";
import { SmartMicrophoneButton } from "./components/SmartMicrophoneButton";

type CommunicationTask = Dashboard["communicationTasks"][number];
type CommunicationTemplate = Dashboard["communicationTemplates"][number];
type CommunicationEvent = Dashboard["communicationEvents"][number];

type CommunicationsViewProps = {
	communicationChannelLabels: Record<CommunicationTask["channel"], string>;
	communicationDocumentTaskActionLabels: Partial<
		Record<GeneratedDocument["kind"], string>
	>;
	communicationIntentLabels: Record<CommunicationTask["intent"], string>;
	communicationNote: string;
	communicationPriorityLabels: Record<CommunicationTask["priority"], string>;
	communicationSavingTaskId: string | null;
	communicationStatusLabels: Record<CommunicationTask["status"], string>;
	completeCommunicationTask: (
		taskId: string,
		outcome: CommunicationTaskOutcome,
	) => void | Promise<void>;
	dashboard: Dashboard;
	documentKindsForCommunicationTask: (
		task: CommunicationTask,
	) => readonly GeneratedDocument["kind"][];
	documentLabels: Record<GeneratedDocument["kind"], string>;
	formatDateTime: (value: string) => string;
	onCommunicationNoteChange: (value: string) => void;
	onGoToSchedule: () => void;
	openCommunicationTaskDocumentWorkflow: (
		task: CommunicationTask,
		kind: GeneratedDocument["kind"],
	) => void;
	sortedCommunicationTasks: CommunicationTask[];
	staffRoleLabels: Record<StaffRole, string>;
};

function ruCount(value: number, forms: [string, string, string]): string {
	const absolute = Math.abs(value);
	const lastTwo = absolute % 100;
	const last = absolute % 10;
	const form =
		lastTwo >= 11 && lastTwo <= 14
			? forms[2]
			: last === 1
				? forms[0]
				: last >= 2 && last <= 4
					? forms[1]
					: forms[2];
	return `${value} ${form}`;
}

const communicationTaskOutcomeLabels: Record<CommunicationTaskOutcome, string> =
	{
		no_answer: "Нет ответа",
		callback_requested: "Перезвонить",
		reschedule_requested: "Перенос записи",
		promised_payment: "Обещал оплату",
		document_pickup: "Заберет документы",
	};

const communicationTaskOutcomeOptions = Object.entries(
	communicationTaskOutcomeLabels,
) as [CommunicationTaskOutcome, string][];

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
	task,
}: {
	communicationChannelLabels: Record<CommunicationTask["channel"], string>;
	communicationDocumentTaskActionLabels: Partial<
		Record<GeneratedDocument["kind"], string>
	>;
	communicationIntentLabels: Record<CommunicationTask["intent"], string>;
	communicationPriorityLabels: Record<CommunicationTask["priority"], string>;
	communicationSavingTaskId: string | null;
	communicationStatusLabels: Record<CommunicationTask["status"], string>;
	completionNoteDescriptionId: string;
	completeCommunicationTask: (
		taskId: string,
		outcome: CommunicationTaskOutcome,
	) => void | Promise<void>;
	documentKinds: readonly GeneratedDocument["kind"][];
	documentLabels: Record<GeneratedDocument["kind"], string>;
	formatDateTime: (value: string) => string;
	openCommunicationTaskDocumentWorkflow: (
		task: CommunicationTask,
		kind: GeneratedDocument["kind"],
	) => void;
	staffRoleLabels: Record<StaffRole, string>;
	task: CommunicationTask;
}) {
	const [selectedOutcome, setSelectedOutcome] = useState<
		CommunicationTaskOutcome | ""
	>("");
	const isTaskSaving = communicationSavingTaskId === task.id;
	const communicationSaveInProgress = communicationSavingTaskId !== null;
	const outcomeSelectId = `communication-task-outcome-${task.id}`;
	const savingStatusId = `communication-task-saving-${task.id}`;

	function handleCompleteTask() {
		if (!selectedOutcome) return;
		void completeCommunicationTask(task.id, selectedOutcome);
	}

	return (
		<article
			className={`communication-task priority-${task.priority}`}
			key={task.id}
		>
			<MessageSquare aria-hidden="true" />
			<div>
				<span>
					{communicationIntentLabels[task.intent]} ·{" "}
					{communicationChannelLabels[task.channel]} ·{" "}
					{staffRoleLabels[task.assignedRole]}
				</span>
				<h3>{task.title}</h3>
				<p>{task.body}</p>
				<small>
					{formatDateTime(task.dueAt)} ·{" "}
					{communicationPriorityLabels[task.priority]} ·{" "}
					{communicationStatusLabels[task.status]}
				</small>
			</div>
			{task.status === "completed" ? (
				<span className="status-pill status-completed">
					{task.lastOutcome
						? communicationTaskOutcomeLabels[task.lastOutcome]
						: "закрыто"}
				</span>
			) : (
				<div className="communication-task-actions">
					{documentKinds.map((kind, index) => {
						const documentActionLabel =
							communicationDocumentTaskActionLabels[kind] ??
							documentLabels[kind];
						return (
							<button
								className={index === 0 ? "primary-button" : "secondary-button"}
								type="button"
								key={kind}
								onClick={() =>
									openCommunicationTaskDocumentWorkflow(task, kind)
								}
								aria-label={`${documentActionLabel}: ${task.title}`}
							>
								<FileText aria-hidden="true" /> {documentActionLabel}
							</button>
						);
					})}
					{isTaskSaving ? (
						<span
							className="communication-task-saving"
							id={savingStatusId}
							role="status"
							aria-live="polite"
						>
							Сохраняю в журнал
						</span>
					) : null}
					<div className="communication-outcome-select">
						<label
							htmlFor={outcomeSelectId}
							style={{
								fontSize: "13px",
								color: "var(--slate-500)",
								fontWeight: 500,
								marginBottom: "8px",
								display: "block",
							}}
						>
							Исход
						</label>
						<select
							id={outcomeSelectId}
							value={selectedOutcome}
							onChange={(e) =>
								setSelectedOutcome(e.target.value as CommunicationTaskOutcome)
							}
							style={{ display: "none" }} // keep chips visual but have a linked select for accessibility
						>
							<option value="">Выберите исход...</option>
							{communicationTaskOutcomeOptions.map(([outcome, label]) => (
								<option key={outcome} value={outcome}>
									{label}
								</option>
							))}
						</select>
						<div className="quick-chips-row" style={{ flexWrap: "wrap" }}>
							{communicationTaskOutcomeOptions.map(([outcome, label]) => (
								<button
									key={outcome}
									type="button"
									className={`quick-chip ${selectedOutcome === outcome ? "selected" : ""}`}
									onClick={() =>
										setSelectedOutcome(outcome as CommunicationTaskOutcome)
									}
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
						aria-describedby={
							isTaskSaving
								? `${completionNoteDescriptionId} ${savingStatusId}`
								: completionNoteDescriptionId
						}
						className="secondary-button"
						type="button"
						onClick={handleCompleteTask}
						disabled={communicationSaveInProgress || !selectedOutcome}
					>
						<CheckCircle2 aria-hidden="true" />{" "}
						{isTaskSaving ? "Закрываю" : "Закрыть"}
					</button>
				</div>
			)}
		</article>
	);
}

function CommunicationTemplateRow({
	communicationChannelLabels,
	staffRoleLabels,
	template,
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
				<p>
					{communicationChannelLabels[template.channel]} ·{" "}
					{staffRoleLabels[template.audienceRole]}
				</p>
			</div>
		</article>
	);
}

function CommunicationEventRow({
	communicationChannelLabels,
	communicationStatusLabels,
	event,
	formatDateTime,
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
				<strong>
					{communicationChannelLabels[event.channel]} ·{" "}
					{communicationStatusLabels[event.status]}
				</strong>
				<p>
					{event.message} · {formatDateTime(event.createdAt)}
				</p>
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
	staffRoleLabels,
}: CommunicationsViewProps) {
	const communicationNoteInputId = "communication-closing-note";
	const communicationNoteDescriptionId = "communication-closing-note-guidance";

	return (
		<motion.div
			className="panel communications-panel glass-panel"
			initial={{ opacity: 0, y: 15 }}
			animate={{ opacity: 1, y: 0 }}
			transition={{ duration: 0.4 }}
			id="communications"
		>
			<div className="panel-heading">
				<h2>Связь с пациентами</h2>
				<button className="text-button" type="button" onClick={onGoToSchedule}>
					Расписание
				</button>
			</div>

			<div className="communications-summary-grid" aria-label="Сводка связи">
				<article
					className={
						dashboard.communicationSummary.urgentTasks
							? "communication-urgent"
							: ""
					}
				>
					<span>Открыто</span>
					<strong>{dashboard.communicationSummary.openTasks}</strong>
					<p>
						{ruCount(dashboard.communicationSummary.urgentTasks, [
							"срочная",
							"срочные",
							"срочных",
						])}
					</p>
				</article>
				<article>
					<span>Сегодня</span>
					<strong>{dashboard.communicationSummary.dueToday}</strong>
					<p>
						{ruCount(dashboard.communicationSummary.overdue, [
							"просрочена",
							"просрочены",
							"просрочено",
						])}
					</p>
				</article>
				<article>
					<span>Подтверждения</span>
					<strong>
						{dashboard.communicationSummary.appointmentConfirmations}
					</strong>
					<p>записи и первичные визиты</p>
				</article>
				<article>
					<span>После приема</span>
					<strong>
						{dashboard.communicationSummary.postVisitInstructions}
					</strong>
					<p>инструкции пациентам</p>
				</article>
			</div>

			<div
				className="communication-note-row"
				style={{
					background: "var(--paper)",
					padding: "16px",
					borderRadius: "12px",
					border: "1px solid var(--slate-200)",
					marginBottom: "20px",
					boxShadow: "0 2px 4px rgba(15,23,42,0.02)",
				}}
			>
				<div
					style={{
						display: "flex",
						justifyContent: "space-between",
						alignItems: "center",
						marginBottom: "12px",
					}}
				>
					<div>
						<label
							htmlFor={communicationNoteInputId}
							style={{
								fontSize: "14px",
								fontWeight: 600,
								color: "var(--slate-800)",
								display: "block",
							}}
						>
							Заметка закрытия
						</label>
						<span
							id={communicationNoteDescriptionId}
							style={{ fontSize: "12px", color: "var(--slate-500)" }}
						>
							Задача закрывается с событием и попадает в аудит.
						</span>
					</div>
					<SmartMicrophoneButton
						context="general"
						onResult={(t) => {
							const prev = communicationNote || "";
							onCommunicationNoteChange(prev ? `${prev}, ${t}` : t);
						}}
						style={{
							display: "inline-flex",
							gap: "6px",
							alignItems: "center",
							padding: "6px 12px",
							color: "var(--brand-600)",
							background: "var(--brand-50)",
							border: "none",
							borderRadius: "8px",
							fontWeight: 600,
						}}
					/>
				</div>
				<textarea
					id={communicationNoteInputId}
					value={communicationNote}
					onChange={(event) => onCommunicationNoteChange(event.target.value)}
					aria-describedby={communicationNoteDescriptionId}
					placeholder="Нажмите для ввода или надиктуйте результат связи..."
					rows={2}
					style={{
						width: "100%",
						padding: "10px 12px",
						borderRadius: "8px",
						border: "1px solid var(--slate-300)",
						fontSize: "14px",
						resize: "vertical",
						marginBottom: "12px",
					}}
				/>
				<div
					className="quick-chips-row"
					style={{ flexWrap: "wrap", gap: "8px" }}
				>
					<span
						style={{
							fontSize: "12px",
							color: "var(--slate-400)",
							alignSelf: "center",
							marginRight: "4px",
						}}
					>
						Шаблоны:
					</span>
					{[
						"Недозвон",
						"Обещал оплатить",
						"Подумает",
						"Перезвонить позже",
						"Запрос документов",
					].map((chip) => (
						<button
							key={chip}
							type="button"
							className="quick-chip quick-chip--sm"
							style={{
								background: "var(--slate-100)",
								color: "var(--slate-700)",
								border: "1px solid var(--slate-200)",
								borderRadius: "16px",
								padding: "4px 10px",
								fontSize: "12px",
							}}
							onClick={() => {
								const prev = communicationNote || "";
								onCommunicationNoteChange(
									prev ? `${prev}, ${chip.toLowerCase()}` : chip,
								);
							}}
						>
							+ {chip}
						</button>
					))}
				</div>
			</div>

			<div className="communication-layout">
				<section className="communication-task-list" aria-label="Очередь связи">
					{sortedCommunicationTasks.length ? (
						sortedCommunicationTasks.map((task) => (
							<CommunicationTaskCard
								communicationChannelLabels={communicationChannelLabels}
								communicationDocumentTaskActionLabels={
									communicationDocumentTaskActionLabels
								}
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
								openCommunicationTaskDocumentWorkflow={
									openCommunicationTaskDocumentWorkflow
								}
								staffRoleLabels={staffRoleLabels}
								task={task}
							/>
						))
					) : (
						<article className="communication-empty-state">
							<MessageSquare aria-hidden="true" />
							<div>
								<p>
									Очередь связи пуста. Когда появятся подтверждения, запросы
									документов или инструкции после приема, они будут здесь.
								</p>
								<button
									className="text-button"
									type="button"
									onClick={onGoToSchedule}
								>
									Открыть расписание
								</button>
							</div>
						</article>
					)}
				</section>

				<aside className="communication-side">
					<section>
						<div className="panel-heading">
							<h3>Шаблоны</h3>
							<span className="status-pill status-arrived">
								{dashboard.communicationTemplates.length}
							</span>
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
							<span className="status-pill status-confirmed">
								{dashboard.communicationEvents.length}
							</span>
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
		</motion.div>
	);
}
