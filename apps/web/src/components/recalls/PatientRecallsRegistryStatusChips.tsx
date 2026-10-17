import type React from "react";
import { Calendar, CheckCircle2, Clock, Send } from "lucide-react";
import type { RecallContactStatus } from "./patientRecallEngine";

export interface PatientRecallsRegistryStatusChipsProps {
	readonly selectedStatus: RecallContactStatus | "all";
	readonly onStatusChangeFilter?: ((status: RecallContactStatus | "all") => void) | undefined;
	readonly statusCounts?: {
		readonly all: number;
		readonly due_now: number;
		readonly invited: number;
		readonly scheduled: number;
		readonly completed: number;
	} | undefined;
}

export const PatientRecallsRegistryStatusChips: React.FC<PatientRecallsRegistryStatusChipsProps> = ({
	selectedStatus,
	onStatusChangeFilter,
	statusCounts,
}) => {
	return (
		<div
			className="recall-status-chips"
			role="radiogroup"
			aria-label="Фильтр по статусу вызова"
		>
			<button
				type="button"
				className={`recall-chip ${selectedStatus === "all" ? "active" : ""}`}
				onClick={() => onStatusChangeFilter?.("all")}
				data-testid="status-filter-all"
			>
				<span>Все</span>
				{typeof statusCounts?.all === "number" && (
					<span className="recall-chip-badge">{statusCounts.all}</span>
				)}
			</button>

			<button
				type="button"
				className={`recall-chip ${selectedStatus === "due_now" ? "active" : ""}`}
				onClick={() => onStatusChangeFilter?.("due_now")}
				data-testid="status-filter-due-now"
			>
				<Clock size={14} />
				<span>Пора пригласить</span>
				{typeof statusCounts?.due_now === "number" && (
					<span className="recall-chip-badge">{statusCounts.due_now}</span>
				)}
			</button>

			<button
				type="button"
				className={`recall-chip ${selectedStatus === "invited" ? "active" : ""}`}
				onClick={() => onStatusChangeFilter?.("invited")}
				data-testid="status-filter-invited"
			>
				<Send size={14} />
				<span>Приглашение отправлено</span>
				{typeof statusCounts?.invited === "number" && (
					<span className="recall-chip-badge">{statusCounts.invited}</span>
				)}
			</button>

			<button
				type="button"
				className={`recall-chip ${selectedStatus === "scheduled" ? "active" : ""}`}
				onClick={() => onStatusChangeFilter?.("scheduled")}
				data-testid="status-filter-scheduled"
			>
				<Calendar size={14} />
				<span>Записан на приём</span>
				{typeof statusCounts?.scheduled === "number" && (
					<span className="recall-chip-badge">{statusCounts.scheduled}</span>
				)}
			</button>

			<button
				type="button"
				className={`recall-chip ${selectedStatus === "completed" ? "active" : ""}`}
				onClick={() => onStatusChangeFilter?.("completed")}
				data-testid="status-filter-completed"
			>
				<CheckCircle2 size={14} />
				<span>Пришёл на осмотр</span>
				{typeof statusCounts?.completed === "number" && (
					<span className="recall-chip-badge">{statusCounts.completed}</span>
				)}
			</button>
		</div>
	);
};
