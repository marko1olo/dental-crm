import React from "react";
import { Calendar, CalendarPlus } from "lucide-react";

export interface DoctorShiftVisitsEmptyStateProps {
	readonly hasAnyAppointments: boolean;
	readonly totalCount: number;
	readonly onResetFilter: () => void;
	readonly onOpenSchedule?: () => void;
}

export const DoctorShiftVisitsEmptyState: React.FC<DoctorShiftVisitsEmptyStateProps> = ({
	hasAnyAppointments,
	totalCount,
	onResetFilter,
	onOpenSchedule,
}) => {
	if (hasAnyAppointments) {
		return (
			<div
				className="compact-schedule-empty-card"
				style={{
					padding: "14px",
					borderRadius: "10px",
					background: "var(--paper-soft, rgba(0,0,0,0.02))",
					border: "1px solid var(--line)",
					textAlign: "center",
					fontSize: "12.5px",
					color: "var(--muted)",
				}}
			>
				В этой очереди сейчас нет пациентов.{" "}
				<button
					type="button"
					style={{
						background: "none",
						border: "none",
						color: "var(--teal-dark, #0d9488)",
						textDecoration: "underline",
						cursor: "pointer",
						fontWeight: 600,
					}}
					onClick={onResetFilter}
				>
					Показать все записи ({totalCount})
				</button>
			</div>
		);
	}

	return (
		<div
			className="compact-schedule-empty-card"
			style={{
				display: "flex",
				flexDirection: "column",
				gap: "10px",
				padding: "14px",
				borderRadius: "12px",
				background: "var(--paper-soft, rgba(0,0,0,0.02))",
				border: "1px solid var(--line)",
			}}
		>
			<div style={{ display: "flex", alignItems: "center", gap: "10px", minWidth: 0 }}>
				<div
					style={{
						width: "32px",
						height: "32px",
						borderRadius: "8px",
						background: "var(--teal-surface)",
						color: "var(--teal-dark)",
						display: "flex",
						alignItems: "center",
						justifyContent: "center",
						flexShrink: 0,
					}}
				>
					<Calendar size={16} aria-hidden="true" />
				</div>
				<div style={{ minWidth: 0 }}>
					<strong style={{ display: "block", fontSize: "13px", fontWeight: 700, color: "var(--ink)", lineHeight: 1.25 }}>
						На сегодня записей нет
					</strong>
					<span style={{ display: "block", fontSize: "11.5px", color: "var(--muted)", lineHeight: 1.35 }}>
						Свободный день. Запишите пациента — запись сразу появится здесь.
					</span>
				</div>
			</div>
			<div>
				{onOpenSchedule && (
					<button
						className="secondary-button"
						style={{ fontSize: "13px", height: "36px", padding: "0 14px", borderRadius: "8px", display: "inline-flex", alignItems: "center", gap: "6px" }}
						type="button"
						onClick={onOpenSchedule}
					>
						<CalendarPlus aria-hidden="true" size={14} /> Открыть расписание
					</button>
				)}
			</div>
		</div>
	);
};
