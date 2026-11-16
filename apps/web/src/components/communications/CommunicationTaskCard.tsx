import type {
	CommunicationTaskOutcome, Dashboard, GeneratedDocument, StaffRole,
} from "@dental/shared";
import { FileText, MessageSquare } from "lucide-react";
import { useState } from "react";
import { showToast } from "../GlobalToast";
import { denteAdminSecretRequestHeaders } from "../../lib/denteRequestHeaders";
import { useSettingsStore } from "../../store/settingsStore";
import {
	CommunicationOutcomeSelector,
	communicationTaskOutcomeLabels,
	communicationTaskOutcomeOptions,
} from "./CommunicationOutcomeSelector";

export { communicationTaskOutcomeLabels, communicationTaskOutcomeOptions };

type CommunicationTask = Dashboard["communicationTasks"][number];

function AppointmentConfirmWidget({
	appointmentId,
	startsAt,
	formatDateTime,
	disabled,
}: {
	appointmentId: string;
	startsAt: string;
	formatDateTime: (val: string) => string;
	disabled: boolean;
}) {
	const [apptActionLoading, setApptActionLoading] = useState(false);
	const [apptActionDone, setApptActionDone] = useState<"confirmed" | "cancelled" | null>(null);
	const [apptActionError, setApptActionError] = useState<string | null>(null);

	const scheduleAdminSecretSession = useSettingsStore((state) => state.scheduleAdminSecretSession);

	async function handleConfirmAppointment(status: "confirmed" | "cancelled") {
		setApptActionLoading(true);
		setApptActionError(null);
		try {
			const res = await fetch(`/api/appointments/${appointmentId}`, {
				method: "PATCH",
				credentials: "include",
				headers: denteAdminSecretRequestHeaders({ "Content-Type": "application/json" }, scheduleAdminSecretSession),
				body: JSON.stringify({ status }),
			});
			if (!res.ok) {
				setApptActionError(
					res.status === 403
						? "Нет доступа к изменению расписания: введите секрет расписания в настройках"
						: `Ошибка обновления приёма (${res.status})`,
				);
			} else {
				setApptActionDone(status);
			}
		} catch {
			setApptActionError("Ошибка сети при обновлении приёма");
		} finally {
			setApptActionLoading(false);
		}
	}

	return (
		<div className="appointment-confirm-widget" style={{ borderLeft: "3px solid var(--teal)", paddingLeft: "10px", marginBottom: "8px" }}>
			<p style={{ margin: "0 0 6px", fontSize: "12px", color: "var(--muted)" }}>
				Приём: <strong>{formatDateTime(startsAt)}</strong>
			</p>
			{apptActionDone ? (
				<span className={`status-pill status-${apptActionDone}`}>
					Приём {apptActionDone === "confirmed" ? "подтверждён" : "отменён"}
				</span>
			) : (
				<button
					type="button" className="secondary-button" onClick={() => void handleConfirmAppointment("confirmed")}
					disabled={apptActionLoading || disabled} aria-label="Подтвердить приём" style={{ minHeight: "36px" }}
				>
					Подтвердить приём
				</button>
			)}
			{apptActionError && (
				<p role="alert" style={{ color: "var(--bad-fg, #b42318)", fontSize: "12px", marginTop: "4px" }}>
					{apptActionError}
				</p>
			)}
		</div>
	);
}

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
