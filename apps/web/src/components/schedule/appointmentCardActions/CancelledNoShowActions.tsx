import React from "react";
import { CalendarCheck, Clock, RotateCcw, UserCheck } from "lucide-react";
import type { AppointmentCardPrimaryActionsProps } from "./types";

export function CancelledNoShowActions({
	appointment,
	displayStatus,
	isQuickStatusUpdating,
	handleQuickStatusChange,
	repeatAppointment,
	openAppointmentEditor,
}: AppointmentCardPrimaryActionsProps) {
	if (displayStatus === "cancelled") {
		return (
			<div className="flex items-center gap-1.5 shrink-0" data-testid="card-primary-actions">
				<button
					type="button"
					disabled={false}
					aria-busy={isQuickStatusUpdating || undefined}
					onClick={(e) => {
						e.stopPropagation();
						if (isQuickStatusUpdating) return;
						void handleQuickStatusChange("confirmed");
					}}
					className="secondary-button h-8 px-2.5 rounded-lg bg-[var(--paper-soft)] hover:bg-[var(--line)] text-[var(--ink)] border border-[var(--line)] font-medium text-[13px] inline-flex items-center gap-1.5 cursor-pointer transition-all whitespace-nowrap pointer-coarse:min-h-[44px]"
					title="Восстановить отменённую запись"
					data-testid="appointment-action-restore-btn"
				>
					<RotateCcw size={14} />
					<span>Восстановить</span>
				</button>
				<button
					type="button"
					onClick={(e) => {
						e.stopPropagation();
						repeatAppointment(appointment);
					}}
					className="primary-button h-8 px-2.5 rounded-lg bg-[var(--teal)] hover:opacity-90 active:scale-95 text-white font-semibold text-[13px] inline-flex items-center gap-1.5 cursor-pointer transition-all shadow-2xs whitespace-nowrap"
					title="Записать на другое время (Клавиша R)"
					data-testid="appointment-action-repeat-btn"
				>
					<CalendarCheck size={14} />
					<span>Перезаписать</span>
				</button>
			</div>
		);
	}

	return (
		<div className="flex items-center gap-1.5 shrink-0" data-testid="card-primary-actions">
			<button
				type="button"
				disabled={false}
				aria-busy={isQuickStatusUpdating || undefined}
				onClick={(e) => {
					e.stopPropagation();
					if (isQuickStatusUpdating) return;
					void handleQuickStatusChange("arrived");
				}}
				className="secondary-button h-8 px-2.5 rounded-lg bg-[var(--paper-soft)] hover:bg-[var(--line)] text-[var(--ink)] border border-[var(--line)] font-medium text-[13px] inline-flex items-center gap-1.5 cursor-pointer transition-all shadow-2xs whitespace-nowrap pointer-coarse:min-h-[44px]"
				title="Отметить пациента прибывшим"
				data-testid="appointment-action-arrived-btn"
			>
				<UserCheck size={14} className="text-[var(--teal)] shrink-0" />
				<span>Прибыл</span>
			</button>
			<button
				type="button"
				onClick={(e) => {
					e.stopPropagation();
					openAppointmentEditor(appointment);
				}}
				className="secondary-button h-8 px-2.5 rounded-lg bg-[var(--paper-soft)] hover:bg-[var(--line)] text-[var(--ink)] border border-[var(--line)] font-medium text-[13px] inline-flex items-center gap-1.5 cursor-pointer transition-all whitespace-nowrap pointer-coarse:min-h-[44px]"
				title="Перенести или изменить время записи"
				data-testid="appointment-action-reschedule-btn"
			>
				<Clock size={14} className="text-[var(--ink-muted)] shrink-0" />
				<span>Перенести</span>
			</button>
		</div>
	);
}
