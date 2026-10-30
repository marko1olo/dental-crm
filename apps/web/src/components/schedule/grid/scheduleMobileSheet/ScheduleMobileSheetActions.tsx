import type { Appointment } from "@dental/shared";
import { Edit3, FileText, User } from "lucide-react";
import React from "react";
import { useAppStore } from "../../../../store/appStore";
import { usePatientStore } from "../../../../store/patientStore";
import { showToast } from "../../../GlobalToast";

export interface ScheduleMobileSheetActionsProps {
	selectedMobileAppt: Appointment;
	mPatName: string;
	onAppointmentClick: (appointment: Appointment) => void;
	onQuickStatusChange?:
		| ((appointmentId: string, status: Appointment["status"]) => void)
		| undefined;
	onClose: () => void;
}

export const ScheduleMobileSheetActions: React.FC<
	ScheduleMobileSheetActionsProps
> = ({
	selectedMobileAppt,
	mPatName,
	onAppointmentClick,
	onQuickStatusChange,
	onClose,
}) => {
	const handleOpenVisitCard = () => {
		onClose();
		if (selectedMobileAppt.patientId) {
			usePatientStore
				.getState()
				.setSelectedPatientId(selectedMobileAppt.patientId);
		}
		if (
			selectedMobileAppt.status !== "in_treatment" &&
			selectedMobileAppt.status !== "completed"
		) {
			if (onQuickStatusChange) {
				onQuickStatusChange(selectedMobileAppt.id, "in_treatment");
			}
		}
		useAppStore.getState().setCurrentView("visit");
		if (typeof window !== "undefined") {
			window.location.hash = "#visit";
		}
		showToast(`Открыта карта приёма: ${mPatName}`, "info");
	};

	const handleEditAppointment = () => {
		onClose();
		onAppointmentClick(selectedMobileAppt);
	};

	const isInChair = selectedMobileAppt.status === "in_treatment";

	return (
		<div className="pt-3 space-y-2">
			<button
				type="button"
				onClick={handleOpenVisitCard}
				className="primary-button w-full min-h-[48px] rounded-2xl bg-[var(--teal,var(--brand-primary))] text-white text-sm font-bold flex items-center justify-center gap-2 shadow-md cursor-pointer active:scale-98 transition-all"
				data-testid={`mobile-sheet-open-visit-${selectedMobileAppt.id}`}
				title="Открыть карту приёма пациента в Дневнике/ЭМК (#visit)"
			>
				{isInChair ? <FileText size={17} /> : <User size={17} />}
				<span>
					{isInChair ? "Открыть карту приёма" : "Начать приём в кресле"}
				</span>
			</button>

			<button
				type="button"
				onClick={handleEditAppointment}
				className="secondary-button w-full min-h-[44px] rounded-2xl bg-[var(--paper-soft)] border border-[var(--line)] hover:bg-[var(--paper)] text-[var(--ink)] text-sm font-semibold flex items-center justify-center gap-2 cursor-pointer active:scale-98 transition-all"
				data-testid={`mobile-sheet-edit-appt-${selectedMobileAppt.id}`}
				title="Редактировать параметры визита в расписании"
			>
				<Edit3 size={15} className="text-[var(--muted)]" />
				<span>Изменить запись в расписании</span>
			</button>
		</div>
	);
};
