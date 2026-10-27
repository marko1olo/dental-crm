import React from "react";
import { Stethoscope, UserCheck } from "lucide-react";
import { playIntercomChime } from "../../../lib/intercomSound";
import type { AppointmentCardPrimaryActionsProps } from "./types";
import { handleStartTreatmentAndOpenVisit } from "./visitSyncHelper";

export function PlannedConfirmedActions({
	appointment,
	isQuickStatusUpdating,
	appointmentPatient,
	onOpenVisit,
	handleQuickStatusChange,
}: AppointmentCardPrimaryActionsProps) {
	return (
		<div className="flex items-center gap-1.5 shrink-0" data-testid="card-primary-actions">
			<button
				type="button"
				disabled={false}
				aria-busy={isQuickStatusUpdating || undefined}
				onClick={(e) => {
					e.stopPropagation();
					if (isQuickStatusUpdating) return;
					playIntercomChime("urgent");
					void handleQuickStatusChange("arrived");
				}}
				className="secondary-button h-8 px-2.5 rounded-lg border border-[var(--line)] bg-[var(--paper-soft)] hover:bg-[var(--line)]/50 active:scale-95 text-[var(--ink)] font-medium text-[13px] inline-flex items-center gap-1.5 cursor-pointer transition-all shadow-2xs whitespace-nowrap pointer-coarse:min-h-[44px]"
				title="Отметить прибытие пациента в клинику (Клавиша 1)"
				data-testid="appointment-action-arrived-btn"
			>
				<UserCheck size={14} className="text-amber-600 dark:text-amber-400" />
				<span>Прибыл</span>
			</button>
			<button
				type="button"
				disabled={false}
				aria-busy={isQuickStatusUpdating || undefined}
				onClick={(e) => {
					e.stopPropagation();
					if (isQuickStatusUpdating) return;
					void handleStartTreatmentAndOpenVisit(appointment, appointmentPatient, handleQuickStatusChange, onOpenVisit);
				}}
				className="primary-button h-8 px-2.5 rounded-lg bg-[var(--teal)] hover:bg-[var(--teal-strong,#0f766e)] active:scale-95 text-white font-semibold text-[13px] inline-flex items-center gap-1.5 cursor-pointer transition-all shadow-2xs whitespace-nowrap pointer-coarse:min-h-[44px]"
				title="Начать приём в кресле (Клавиша 2)"
				data-testid="appointment-action-in-treatment-btn"
			>
				<Stethoscope size={14} />
				<span>Начать приём</span>
			</button>
		</div>
	);
}
