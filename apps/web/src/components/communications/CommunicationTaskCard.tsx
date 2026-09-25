import type {
	CommunicationTaskOutcome,
	Dashboard,
	GeneratedDocument,
	StaffRole,
} from "@dental/shared";
import { CheckCircle2, FileText, MessageSquare } from "lucide-react";
import { useState } from "react";
import { denteAdminSecretRequestHeaders } from "../../lib/denteRequestHeaders";
import { useSettingsStore } from "../../store/settingsStore";
import { showToast } from "../GlobalToast";

type CommunicationTask = Dashboard["communicationTasks"][number];

export const communicationTaskOutcomeLabels: Record<
	CommunicationTaskOutcome,
	string
> = {
	no_answer: "Нет ответа",
	callback_requested: "Перезвонить",
	reschedule_requested: "Перенос записи",
	promised_payment: "Обещал оплату",
	document_pickup: "Заберет документы",
};

export const communicationTaskOutcomeOptions = Object.entries(
	communicationTaskOutcomeLabels,
) as [CommunicationTaskOutcome, string][];

export interface CommunicationTaskCardProps {
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
	appointments: Dashboard["appointments"];
}

export function CommunicationTaskCard({
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
	appointments,
}: CommunicationTaskCardProps) {
	const [selectedOutcome, setSelectedOutcome] = useState<
		CommunicationTaskOutcome | ""
	>("");
	const [apptActionLoading, setApptActionLoading] = useState(false);
	const [apptActionDone, setApptActionDone] = useState<
		"confirmed" | "cancelled" | null
	>(null);
	const [apptActionError, setApptActionError] = useState<string | null>(null);
	const isTaskSaving = communicationSavingTaskId === task.id;
	const communicationSaveInProgress = communicationSavingTaskId !== null;
	const outcomeSelectId = `communication-task-outcome-${task.id}`;
	const savingStatusId = `communication-task-saving-${task.id}`;

	const linkedAppointment =
		task.intent === "appointment_confirmation" && task.appointmentId
			? (appointments.find((a) => a.id === task.appointmentId) ?? null)
			: null;

	const scheduleAdminSecretSession = useSettingsStore(
		(state) => state.scheduleAdminSecretSession,
	);

	async function handleConfirmAppointment(status: "confirmed" | "cancelled") {
		if (!task.appointmentId) return;
		setApptActionLoading(true);
		setApptActionError(null);
		try {
			const res = await fetch(`/api/appointments/${task.appointmentId}`, {
				method: "PATCH",
				credentials: "include",
				headers: denteAdminSecretRequestHeaders(
					{ "Content-Type": "application/json" },
					scheduleAdminSecretSession,
				),
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

	function handleCompleteTask() {
		if (!selectedOutcome) {
			showToast("Выберите результат звонка", "info");
			return;
		}
		void completeCommunicationTask(task.id, selectedOutcome);
	}

	return (
		<article
			className={`communication-task priority-${task.priority}`}
			key={task.id}
			style={{
				contentVisibility: "auto",
				containIntrinsicSize: "1px 64px",
				contain: "content",
			}}
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
					{linkedAppointment ? (
						<div
							className="appointment-confirm-widget"
							style={{
								borderLeft: "3px solid var(--teal)",
								paddingLeft: "10px",
								marginBottom: "10px",
							}}
						>
							<p
								style={{
									margin: "0 0 6px",
									fontSize: "13px",
									color: "var(--muted)",
								}}
							>
								Приём:{" "}
								<strong>{formatDateTime(linkedAppointment.startsAt)}</strong>
							</p>
							{apptActionDone ? (
								<span className={`status-pill status-${apptActionDone}`}>
									Приём{" "}
									{apptActionDone === "confirmed" ? "подтверждён" : "отменён"}
								</span>
							) : (
								<div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
									<button
										type="button"
										className="primary-button"
										onClick={() => void handleConfirmAppointment("confirmed")}
										disabled={apptActionLoading || communicationSaveInProgress}
										aria-label="Подтвердить приём"
										style={{ minHeight: "44px" }}
									>
										Подтвердил
									</button>
									<button
										type="button"
										className="secondary-button"
										onClick={() => void handleConfirmAppointment("cancelled")}
										disabled={apptActionLoading || communicationSaveInProgress}
										aria-label="Отменить приём"
										style={{ minHeight: "44px" }}
									>
										Отменил
									</button>
								</div>
							)}
							{apptActionError ? (
								<p
									role="alert"
									style={{
										color: "var(--bad-fg, #b42318)",
										fontSize: "12px",
										marginTop: "4px",
									}}
								>
									{apptActionError}
								</p>
							) : null}
						</div>
					) : null}
					{documentKinds?.map((kind, index) => {
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
								style={{ minHeight: "44px" }}
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
							style={{ display: "none" }}
						>
							<option value="">Выберите исход...</option>
							{communicationTaskOutcomeOptions?.map(([outcome, label]) => (
								<option key={outcome} value={outcome}>
									{label}
								</option>
							))}
						</select>
						<div className="quick-chips-row" style={{ flexWrap: "wrap" }}>
							{communicationTaskOutcomeOptions?.map(([outcome, label]) => (
								<button
									key={outcome}
									type="button"
									className={`quick-chip ${selectedOutcome === outcome ? "selected" : ""}`}
									onClick={() =>
										setSelectedOutcome(outcome as CommunicationTaskOutcome)
									}
									disabled={communicationSaveInProgress}
									style={{ minHeight: "44px" }}
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
						disabled={communicationSaveInProgress}
						style={{ minHeight: "44px" }}
					>
						<CheckCircle2 aria-hidden="true" />{" "}
						{isTaskSaving ? "Закрываю" : "Закрыть"}
					</button>
				</div>
			)}
		</article>
	);
}
