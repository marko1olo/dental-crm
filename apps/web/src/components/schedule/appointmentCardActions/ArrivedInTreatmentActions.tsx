import React from "react";
import { CheckCircle2, Clock, FileText, Stethoscope } from "lucide-react";
import { showToast } from "../../GlobalToast";
import { useAppStore } from "../../../store/appStore";
import { usePatientStore } from "../../../store/patientStore";
import type { AppointmentCardPrimaryActionsProps } from "./types";
import { handleStartTreatmentAndOpenVisit } from "./visitSyncHelper";

export function ArrivedInTreatmentActions({
	appointment,
	displayStatus,
	isQuickStatusUpdating,
	appointmentPatient,
	appointmentPatientName,
	onOpenVisit,
	handleQuickStatusChange,
	handleShiftAppointmentTime,
}: AppointmentCardPrimaryActionsProps) {
	if (displayStatus === "arrived") {
		return (
			<div className="flex items-center gap-1.5 shrink-0" data-testid="card-primary-actions">
				<button
					type="button"
					disabled={false}
					aria-busy={isQuickStatusUpdating || undefined}
					onClick={(e) => {
						e.stopPropagation();
						if (isQuickStatusUpdating) return;
						void handleStartTreatmentAndOpenVisit(appointment, appointmentPatient, handleQuickStatusChange, onOpenVisit);
					}}
					className="primary-button h-8 px-2.5 rounded-lg bg-[var(--teal)] hover:opacity-90 active:scale-95 text-white font-semibold text-[13px] inline-flex items-center gap-1.5 cursor-pointer transition-all shadow-2xs whitespace-nowrap pointer-coarse:min-h-[44px]"
					title="Пациент в кресле (Клавиша 2)"
					data-testid="appointment-action-in-treatment-btn"
				>
					<Stethoscope size={14} />
					<span>В кресло</span>
				</button>
				<button
					type="button"
					disabled={false}
					aria-busy={isQuickStatusUpdating || undefined}
					onClick={(e) => {
						e.stopPropagation();
						if (isQuickStatusUpdating) return;
						void handleShiftAppointmentTime(15);
					}}
					className="secondary-button h-8 px-2.5 rounded-lg bg-[var(--warn-bg)] text-[var(--warn-fg)] border border-[var(--warn-fg)]/40 hover:opacity-90 active:scale-95 font-medium text-[13px] inline-flex items-center gap-1.5 cursor-pointer transition-all whitespace-nowrap pointer-coarse:min-h-[44px]"
					title="Сдвинуть запись на +15 минут при опоздании"
					data-testid="appointment-action-delay-btn"
				>
					<Clock size={14} />
					<span>+15 мин</span>
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
					void handleQuickStatusChange("completed");
				}}
				className="primary-button h-8 px-2.5 rounded-lg bg-[var(--ink)] text-[var(--paper)] hover:opacity-90 active:scale-95 font-semibold text-[13px] inline-flex items-center gap-1.5 cursor-pointer transition-all shadow-2xs whitespace-nowrap pointer-coarse:min-h-[44px]"
				title="Завершить приём (Клавиша 3)"
				data-testid="appointment-action-complete-btn"
			>
				<CheckCircle2 size={14} />
				<span>Завершить</span>
			</button>
			<button
				type="button"
				onClick={(e) => {
					e.stopPropagation();
					const pid = appointmentPatient?.id || appointment.patientId;
					if (pid) usePatientStore.getState().setSelectedPatientId(pid);
					if (typeof window !== "undefined") window.location.hash = "#visit";
					if (onOpenVisit) onOpenVisit();
					else useAppStore.getState().setCurrentView("visit");
					showToast(`Открыта карта визита: ${appointmentPatientName}`, "info");
				}}
				className="secondary-button h-8 px-2.5 rounded-lg bg-[var(--paper-soft)] hover:bg-[var(--line)] text-[var(--ink)] border border-[var(--line)] font-medium text-[13px] inline-flex items-center gap-1.5 cursor-pointer transition-all whitespace-nowrap"
				title="Открыть дневник приёма"
				data-testid="appointment-action-open-visit-btn"
			>
				<FileText size={14} className="text-[var(--teal)]" />
				<span>Медкарта</span>
			</button>
		</div>
	);
}
