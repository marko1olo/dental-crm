import type {
	CommunicationTaskOutcome, Dashboard, GeneratedDocument, StaffRole,
} from "@dental/shared";
import { FileText, MessageSquare } from "lucide-react";
import { useState } from "react";
import { showToast } from "../GlobalToast";
import { AppointmentConfirmWidget } from "./AppointmentConfirmWidget";
import {
	CommunicationOutcomeSelector,
	communicationTaskOutcomeLabels,
	communicationTaskOutcomeOptions,
} from "./CommunicationOutcomeSelector";

export { communicationTaskOutcomeLabels, communicationTaskOutcomeOptions };

type CommunicationTask = Dashboard["communicationTasks"][number];

export interface CommunicationTaskCardProps {
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
	appointments: Dashboard["appointments"];
}

export function CommunicationTaskCard({
	communicationChannelLabels, communicationDocumentTaskActionLabels,
	communicationIntentLabels, communicationPriorityLabels,
	communicationSavingTaskId, communicationStatusLabels,
	completionNoteDescriptionId, completeCommunicationTask,
	documentKinds, documentLabels, formatDateTime,
	openCommunicationTaskDocumentWorkflow, staffRoleLabels, task, appointments,
}: CommunicationTaskCardProps) {
	const [selectedOutcome, setSelectedOutcome] = useState<CommunicationTaskOutcome | "">("");
	const isTaskSaving = communicationSavingTaskId === task.id;
	const communicationSaveInProgress = communicationSavingTaskId !== null;
	const savingStatusId = `communication-task-saving-${task.id}`;

	const linkedAppointment = task.intent === "appointment_confirmation" && task.appointmentId
		? (appointments?.find((a) => a.id === task.appointmentId) ?? null) : null;

	function handleCompleteTask() {
		if (!selectedOutcome) {
			document.getElementById(`communication-task-outcome-${task.id}`)?.focus();
			showToast("Выберите результат звонка", "info");
			return;
		}
		void completeCommunicationTask(task.id, selectedOutcome);
	}

	return (
		<article
			className={`communication-task priority-${task.priority}`} key={task.id}
			style={{ contentVisibility: "auto", containIntrinsicSize: "1px 64px", contain: "content" }}
		>
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
					{linkedAppointment ? (
						<AppointmentConfirmWidget
							appointmentId={task.appointmentId!} startsAt={linkedAppointment.startsAt}
							formatDateTime={formatDateTime} disabled={communicationSaveInProgress}
						/>
					) : (
						documentKinds?.slice(0, 1).map((kind) => {
							const label = communicationDocumentTaskActionLabels[kind] ?? documentLabels[kind];
							return (
								<button
									className="secondary-button" type="button" key={kind}
									onClick={() => openCommunicationTaskDocumentWorkflow(task, kind)}
									aria-label={`${label}: ${task.title}`} style={{ minHeight: "36px" }}
								>
									<FileText aria-hidden="true" /> {label}
								</button>
							);
						})
					)}
					{isTaskSaving && (
						<span className="communication-task-saving" id={savingStatusId} role="status" aria-live="polite">
							Сохраняю в журнал
						</span>
					)}
					<CommunicationOutcomeSelector
						taskId={task.id} taskTitle={task.title} selectedOutcome={selectedOutcome}
						setSelectedOutcome={setSelectedOutcome} onComplete={handleCompleteTask}
						isTaskSaving={isTaskSaving} disabled={communicationSaveInProgress}
						completionNoteDescriptionId={completionNoteDescriptionId} savingStatusId={savingStatusId}
					/>
				</div>
			)}
		</article>
	);
}
