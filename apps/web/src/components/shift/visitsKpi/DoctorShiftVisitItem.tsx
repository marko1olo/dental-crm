import React from "react";
import { ClipboardCheck, CreditCard, UserCheck } from "lucide-react";
import { formatClockTime, STATUS_LABELS } from "./visitsKpiTypes";

export interface DoctorShiftVisitItemProps {
	readonly app: any;
	readonly patient: any;
	readonly doctor?: any;
	readonly isCurrent: boolean;
	readonly manyDoctors?: boolean | undefined;
	readonly onOpenAppointmentEmk?: ((patientId: string) => void) | undefined;
	readonly onOpenCashier?: ((patientId: string) => void) | undefined;
}

export const DoctorShiftVisitItem: React.FC<DoctorShiftVisitItemProps> = ({
	app,
	patient,
	doctor,
	isCurrent,
	manyDoctors,
	onOpenAppointmentEmk,
	onOpenCashier,
}) => {
	const timeStart = formatClockTime(app.startsAt);
	const timeEnd = formatClockTime(app.endsAt);
	const statusKey = String(app.status || app.appointmentStatus || app.state || "planned").toLowerCase();
	const isInChair = ["in_chair", "in_treatment", "in_progress"].includes(statusKey);
	const isDone = ["completed", "done"].includes(statusKey);

	return (
		<div
			className={`today-schedule-item min-h-[44px] py-2 px-3 min-w-0 ${isCurrent ? "current-active" : ""}`}
			style={{ width: "100%", borderRadius: "8px" }}
		>
			<div
				className="today-schedule-item-info min-w-0 flex-1 cursor-pointer"
				onClick={() => patient && onOpenAppointmentEmk?.(patient.id)}
				role="button"
				tabIndex={0}
				onKeyDown={(e) => {
					if ((e.key === "Enter" || e.key === " ") && patient) {
						e.preventDefault();
						onOpenAppointmentEmk?.(patient.id);
					}
				}}
			>
				<span className="today-schedule-time shrink-0">{timeStart} – {timeEnd}</span>
				<strong className="today-schedule-name break-words leading-tight" style={{ color: "var(--ink)" }}>
					{patient ? patient.fullName : "Неизвестный пациент"}
				</strong>
				<span className="today-schedule-reason break-words leading-tight">
					{app.reason || "плановый осмотр"}
					{manyDoctors && doctor ? ` · ${doctor.fullName}` : ""}
				</span>
			</div>

			<div style={{ display: "flex", alignItems: "center", gap: "6px", flexShrink: 0 }}>
				<span className={`status-pill status-${statusKey} shrink-0`}>
					{STATUS_LABELS[statusKey] ?? "Ожидает приема"}
				</span>

				{isDone ? (
					<button
						type="button"
						className="secondary-button"
						style={{ fontSize: "13px", height: "36px", padding: "0 14px", borderRadius: "8px", display: "inline-flex", alignItems: "center", gap: "6px", cursor: "pointer" }}
						onClick={() => patient && onOpenCashier?.(patient.id)}
						title="Перейти к оплате на кассе"
					>
						<CreditCard size={14} aria-hidden="true" /> На кассу
					</button>
				) : isInChair ? (
					<button
						type="button"
						className="primary-button"
						style={{ fontSize: "13px", height: "36px", padding: "0 14px", borderRadius: "8px", display: "inline-flex", alignItems: "center", gap: "6px", background: "var(--teal)", color: "#fff", cursor: "pointer" }}
						onClick={() => patient && onOpenAppointmentEmk?.(patient.id)}
						title="Открыть карту и продолжить прием"
					>
						<ClipboardCheck size={14} aria-hidden="true" /> ЭМК
					</button>
				) : (
					<button
						type="button"
						className="primary-button"
						style={{ fontSize: "13px", height: "36px", padding: "0 14px", borderRadius: "8px", display: "inline-flex", alignItems: "center", gap: "6px", background: "var(--teal)", color: "#fff", cursor: "pointer" }}
						onClick={() => patient && onOpenAppointmentEmk?.(patient.id)}
						title="Принять пациента в кресло в 1 клик"
						data-testid="btn-call-to-chair"
					>
						<UserCheck size={14} aria-hidden="true" /> Вызвать в кабинет
					</button>
				)}
			</div>
		</div>
	);
};
