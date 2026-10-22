import type { CommunicationTaskOutcome } from "@dental/shared";
import { CheckCircle2 } from "lucide-react";

export const communicationTaskOutcomeLabels: Record<CommunicationTaskOutcome, string> = {
	no_answer: "Нет ответа",
	callback_requested: "Перезвонить",
	reschedule_requested: "Перенос записи",
	promised_payment: "Обещал оплату",
	document_pickup: "Заберет документы",
};

export const communicationTaskOutcomeOptions = Object.entries(communicationTaskOutcomeLabels) as [
	CommunicationTaskOutcome, string,
][];

export function CommunicationOutcomeSelector({
	taskId,
	taskTitle,
	selectedOutcome,
	setSelectedOutcome,
	onComplete,
	isTaskSaving,
	disabled,
	completionNoteDescriptionId,
	savingStatusId,
}: {
	taskId: string;
	taskTitle: string;
	selectedOutcome: CommunicationTaskOutcome | "";
	setSelectedOutcome: (outcome: CommunicationTaskOutcome | "") => void;
	onComplete: () => void;
	isTaskSaving: boolean;
	disabled: boolean;
	completionNoteDescriptionId: string;
	savingStatusId: string;
}) {
	const outcomeSelectId = `communication-task-outcome-${taskId}`;

	return (
		<div className="flex items-center gap-2 flex-wrap">
			<label htmlFor={outcomeSelectId} className="sr-only">Исход</label>
			<select
				id={outcomeSelectId}
				value={selectedOutcome}
				onChange={(e) => setSelectedOutcome(e.target.value as CommunicationTaskOutcome)}
				className="min-h-[36px] px-3 py-1.5 rounded-lg border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)] text-xs font-medium focus:outline-none focus:ring-2 focus:ring-[var(--teal)]"
			>
				<option value="">Исход звонка / связи...</option>
				{communicationTaskOutcomeOptions.map(([outcome, label]) => (
					<option key={outcome} value={outcome}>{label}</option>
				))}
			</select>
			<div className="sr-only" aria-hidden="true">
				{communicationTaskOutcomeOptions.map(([outcome, label]) => (
					<button
						key={outcome} type="button" data-testid={`communication-outcome-${outcome}`}
						data-outcome={outcome} onClick={() => setSelectedOutcome(outcome as CommunicationTaskOutcome)}
						disabled={disabled}
					>
						{label}
					</button>
				))}
			</div>
			<button
				aria-label={`Закрыть задачу связи: ${taskTitle}`}
				aria-busy={isTaskSaving || undefined}
				aria-describedby={isTaskSaving ? `${completionNoteDescriptionId} ${savingStatusId}` : completionNoteDescriptionId}
				className="primary-button" type="button" data-testid="communication-task-complete-btn"
				onClick={onComplete} disabled={disabled} style={{ minHeight: "44px" }}
			>
				<CheckCircle2 aria-hidden="true" size={14} /> {isTaskSaving ? "Закрываю" : "Закрыть"}
			</button>
		</div>
	);
}
