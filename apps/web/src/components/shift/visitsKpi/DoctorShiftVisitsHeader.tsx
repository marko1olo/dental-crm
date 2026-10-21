import React from "react";
import { Calendar, ClipboardCheck, Monitor } from "lucide-react";
import { appointmentsCountLabel } from "./visitsKpiTypes";

export interface DoctorShiftVisitsHeaderProps {
	readonly count: number;
	readonly onOpenQueueBoardModal?: (() => void) | undefined;
	readonly onOpenSchedule?: (() => void) | undefined;
}

export const DoctorShiftVisitsHeader: React.FC<DoctorShiftVisitsHeaderProps> = ({
	count,
	onOpenQueueBoardModal,
	onOpenSchedule,
}) => (
	<div className="today-schedule-header">
		<h3 style={{ color: "var(--ink)", margin: 0, display: "flex", alignItems: "center", gap: "8px", fontSize: "14px", fontWeight: 700 }}>
			<ClipboardCheck size={16} aria-hidden="true" /> Сводка приёмов на смене
		</h3>
		<div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
			<span className="today-schedule-count" style={{ fontSize: "12px", fontWeight: 600, color: "var(--muted)" }}>
				{appointmentsCountLabel(count)}
			</span>
			{onOpenQueueBoardModal && (
				<button
					type="button"
					className="secondary-button"
					style={{ fontSize: "13px", fontWeight: 600, padding: "0 12px", height: "36px", borderRadius: "8px", display: "inline-flex", alignItems: "center", gap: "6px", cursor: "pointer" }}
					onClick={onOpenQueueBoardModal}
					title="Открыть интерактивную доску очереди и ТВ-табло"
					data-testid="btn-open-today-queue-board"
				>
					<Monitor size={14} aria-hidden="true" /> Доска очереди
				</button>
			)}
			{onOpenSchedule && (
				<button
					type="button"
					className="secondary-button"
					style={{ fontSize: "13px", fontWeight: 600, padding: "0 12px", height: "36px", borderRadius: "8px", display: "inline-flex", alignItems: "center", gap: "6px", cursor: "pointer" }}
					onClick={onOpenSchedule}
					title="Перейти к полной сетке расписания"
				>
					<Calendar size={14} aria-hidden="true" /> В расписание →
				</button>
			)}
		</div>
	</div>
);
