import type React from "react";
import { Calendar, CheckCircle2, Clock, RotateCcw, Send } from "lucide-react";
import type { RecallMetrics } from "./patientRecallEngine";

export interface PatientRecallsStatusChipsProps {
	readonly statusFilter: "all" | "due_now" | "invited" | "scheduled" | "declined" | "completed";
	readonly onStatusFilterChange: (status: "all" | "due_now" | "invited" | "scheduled" | "declined" | "completed") => void;
	readonly candidatesCount: number;
	readonly metrics: RecallMetrics;
}

export const PatientRecallsStatusChips: React.FC<PatientRecallsStatusChipsProps> = ({
	statusFilter,
	onStatusFilterChange,
	candidatesCount,
	metrics,
}) => {
	const chipCls = (status: string) =>
		`recall-chip border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)] font-semibold rounded-lg px-2.5 py-1.5 shadow-2xs hover:border-[var(--teal)] transition-colors ${
			statusFilter === status ? "active" : ""
		}`;

	return (
		<div className="recall-status-chips" role="radiogroup" aria-label="Фильтр по статусам реестра" style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
			<button type="button" className={chipCls("all")} onClick={() => onStatusFilterChange("all")}>
				Все
				<span className="recall-chip-badge">{candidatesCount}</span>
			</button>
			<button type="button" className={chipCls("due_now")} onClick={() => onStatusFilterChange("due_now")}>
				<Clock size={14} />
				Пора звать
				<span className="recall-chip-badge">{metrics.dueNowCount}</span>
			</button>
			<button type="button" className={chipCls("invited")} onClick={() => onStatusFilterChange("invited")}>
				<Send size={14} />
				Приглашен
				<span className="recall-chip-badge">{metrics.contactedCount}</span>
			</button>
			<button type="button" className={chipCls("scheduled")} onClick={() => onStatusFilterChange("scheduled")}>
				<Calendar size={14} />
				Записался
				<span className="recall-chip-badge">{metrics.scheduledCount}</span>
			</button>
			<button type="button" className={chipCls("declined")} onClick={() => onStatusFilterChange("declined")}>
				<RotateCcw size={14} />
				Отказ / Перенос
				<span className="recall-chip-badge">{metrics.declinedCount}</span>
			</button>
			<button type="button" className={chipCls("completed")} onClick={() => onStatusFilterChange("completed")}>
				<CheckCircle2 size={14} />
				Завершено
				<span className="recall-chip-badge">{metrics.completedCount}</span>
			</button>
		</div>
	);
};
