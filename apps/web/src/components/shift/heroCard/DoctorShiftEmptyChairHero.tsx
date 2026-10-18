import React from "react";
import { Calendar, CalendarPlus, ClipboardCheck } from "lucide-react";

export interface DoctorShiftEmptyChairHeroProps {
	readonly todayAppointmentsCount: number;
	readonly onOpenSchedule: () => void;
}

export const DoctorShiftEmptyChairHero: React.FC<DoctorShiftEmptyChairHeroProps> = ({
	todayAppointmentsCount,
	onOpenSchedule,
}) => (
	<div
		className="compact-shift-empty-card"
		style={{
			display: "flex",
			flexDirection: "column",
			gap: "12px",
			padding: "4px 0 0",
		}}
	>
		<div style={{ display: "flex", alignItems: "center", gap: "12px", minWidth: 0 }}>
			<div
				style={{
					width: "36px",
					height: "36px",
					borderRadius: "10px",
					background: "var(--teal-surface)",
					color: "var(--teal-dark)",
					display: "flex",
					alignItems: "center",
					justifyContent: "center",
					flexShrink: 0,
				}}
			>
				<ClipboardCheck size={18} aria-hidden="true" />
			</div>
			<div style={{ minWidth: 0 }}>
				<h3 style={{ margin: 0, fontSize: "13.5px", fontWeight: 700, color: "var(--ink)", lineHeight: 1.25 }}>
					Кресло свободно
				</h3>
				<p style={{ margin: "2px 0 0", fontSize: "12px", color: "var(--muted)", lineHeight: 1.35 }}>
					{todayAppointmentsCount > 0
						? "Все приемы на сегодня завершены. Откройте расписание для записи на следующий день."
						: "На сегодня запланированных приёмов нет. Можно записать пациента или открыть расписание."}
				</p>
			</div>
		</div>

		<div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap", paddingTop: "2px" }}>
			<button
				type="button"
				className="secondary-button"
				style={{ fontSize: "13px", fontWeight: 600, padding: "0 14px", height: "36px", borderRadius: "8px", display: "inline-flex", alignItems: "center", gap: "6px", background: "var(--paper-soft)", border: "1px solid var(--line)", color: "var(--ink)" }}
				onClick={onOpenSchedule}
			>
				<CalendarPlus size={14} />
				<span>Записать пациента</span>
			</button>
			<button
				type="button"
				className="secondary-button"
				style={{ fontSize: "13px", fontWeight: 600, padding: "0 14px", height: "36px", borderRadius: "8px", display: "inline-flex", alignItems: "center", gap: "6px", background: "var(--paper-soft)", border: "1px solid var(--line)", color: "var(--ink)" }}
				onClick={onOpenSchedule}
			>
				<Calendar size={14} />
				<span>Расписание</span>
			</button>
		</div>
	</div>
);
