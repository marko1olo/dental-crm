import React from "react";
import { Calendar, CreditCard, Zap } from "lucide-react";

export interface DoctorKickoffActionsProps {
	readonly appointmentsCount?: number | undefined;
	readonly isShiftOpen?: boolean | undefined;
	readonly isCashReady?: boolean | undefined;
	readonly onToggleShift?: (() => void) | undefined;
	readonly onOpenSchedule?: (() => void) | undefined;
	readonly onOpenCheckout?: (() => void) | undefined;
}

export function DoctorKickoffActions({
	appointmentsCount = 0,
	isShiftOpen = true,
	isCashReady = true,
	onToggleShift,
	onOpenSchedule,
	onOpenCheckout,
}: DoctorKickoffActionsProps) {
	return (
		<div className="doctor-kickoff-actions">
			{onToggleShift && (
				<button
					type="button"
					onClick={onToggleShift}
					className={`kickoff-action-btn ${isShiftOpen ? "btn-shift-active" : "btn-shift-open primary-button"}`}
					title={
						isShiftOpen
							? "Рабочая смена врача активна (нажмите для завершения)"
							: "Открыть смену врача"
					}
					style={{ minHeight: "44px" }}
				>
					<Zap size={15} aria-hidden="true" />
					<span>{isShiftOpen ? "Смена открыта" : "Открыть смену"}</span>
				</button>
			)}

			{onOpenSchedule && (
				<button
					type="button"
					onClick={onOpenSchedule}
					className="kickoff-action-btn secondary-button"
					title="Перейти к расписанию на сегодня"
					style={{ minHeight: "44px" }}
				>
					<Calendar size={15} aria-hidden="true" />
					<span>Расписание ({appointmentsCount})</span>
				</button>
			)}

			{onOpenCheckout && (
				<button
					type="button"
					onClick={onOpenCheckout}
					className="kickoff-action-btn secondary-button"
					title="Перейти к кассе клиники"
					style={{ minHeight: "44px" }}
				>
					<CreditCard size={15} aria-hidden="true" />
					<span>{isCashReady ? "Касса готова" : "Касса"}</span>
				</button>
			)}
		</div>
	);
}
