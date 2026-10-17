import React from "react";
import { CreditCard, RotateCcw } from "lucide-react";
import { showToast } from "../../GlobalToast";
import { useAppStore } from "../../../store/appStore";
import { usePatientStore } from "../../../store/patientStore";
import type { AppointmentCardPrimaryActionsProps } from "./types";

export function CompletedActions({
	appointment,
	appointmentPatient,
	appointmentPatientName,
	repeatAppointment,
}: AppointmentCardPrimaryActionsProps) {
	return (
		<div className="flex items-center gap-1.5 shrink-0" data-testid="card-primary-actions">
			<button
				type="button"
				onClick={(e) => {
					e.stopPropagation();
					const pid = appointmentPatient?.id || appointment.patientId;
					if (pid) usePatientStore.getState().setSelectedPatientId(pid);
					useAppStore.getState().setCurrentView("finance");
					showToast(`Касса: расчёт ${appointmentPatientName}`, "info");
				}}
				className="primary-button h-8 px-2.5 rounded-lg bg-[var(--good-soft)] text-[var(--good-fg)] border border-[var(--good)]/40 hover:bg-[var(--good-surface)] active:scale-95 font-semibold text-[13px] inline-flex items-center gap-1.5 cursor-pointer transition-all shadow-2xs whitespace-nowrap"
				title="Принять оплату"
				data-testid="appointment-action-billing-btn"
			>
				<CreditCard size={14} className="text-[var(--good-fg)]" />
				<span>Оплата</span>
			</button>
			<button
				type="button"
				onClick={(e) => {
					e.stopPropagation();
					repeatAppointment(appointment);
				}}
				className="secondary-button h-8 px-2.5 rounded-lg bg-[var(--paper-soft)] hover:bg-[var(--line)] text-[var(--ink)] border border-[var(--line)] font-medium text-[13px] inline-flex items-center gap-1.5 cursor-pointer transition-all whitespace-nowrap"
				title="Повторить запись (Клавиша R)"
				data-testid="appointment-action-repeat-btn"
			>
				<RotateCcw size={14} />
				<span>Повторить</span>
			</button>
		</div>
	);
}
