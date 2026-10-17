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
				disabled={isQuickStatusUpdating}
				onClick={(e) => {
					e.stopPropagation();
					playIntercomChime("urgent");
					void handleQuickStatusChange("arrived");
				}}
				className="primary-button h-8 px-2.5 rounded-lg bg-[var(--good)] hover:opacity-90 active:scale-95 text-white font-medium text-[13px] inline-flex items-center gap-1.5 cursor-pointer transition-all shadow-2xs whitespace-nowrap"
				title="Отметить прибытие пациента в клинику (Клавиша 1)"
				data-testid="appointment-action-arrived-btn"
			>
				<UserCheck size={14} />
				<span>Прибыл</span>
			</button>
			<button
				type="button"
				disabled={isQuickStatusUpdating}
				onClick={(e) => {
					e.stopPropagation();
					void handleStartTreatmentAndOpenVisit(appointment, appointmentPatient, handleQuickStatusChange, onOpenVisit);
				}}
				className="primary-button h-8 px-2.5 rounded-lg bg-[var(--teal)] hover:opacity-90 active:scale-95 text-white font-semibold text-[13px] inline-flex items-center gap-1.5 cursor-pointer transition-all shadow-2xs whitespace-nowrap"
				title="Начать приём в кресле (Клавиша 2)"
				data-testid="appointment-action-in-treatment-btn"
			>
				<Stethoscope size={14} />
				<span>Начать приём</span>
			</button>
		</div>
	);
}
