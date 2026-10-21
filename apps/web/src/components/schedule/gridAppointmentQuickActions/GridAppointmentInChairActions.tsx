import type { Appointment } from "@dental/shared";
import { Check, CreditCard, Stethoscope } from "lucide-react";
import type React from "react";
import { useAppStore } from "../../../store/appStore";
import { usePatientStore } from "../../../store/patientStore";
import { showToast } from "../../GlobalToast";
import { isAppointmentInChair } from "../appointmentCardHelpers";

export interface GridAppointmentInChairActionsProps {
	appointment: Appointment;
	pName: string;
	patObj?: any;
	onQuickStatusChange: (id: string, status: any) => void;
}

export function GridAppointmentInChairActions({
	appointment: a,
	pName,
	patObj,
	onQuickStatusChange,
}: GridAppointmentInChairActionsProps) {
	const handleOpenVisit = (e: React.MouseEvent) => {
		e.stopPropagation();
		const pid = a.patientId || patObj?.id;
		if (pid) {
			usePatientStore.getState().setSelectedPatientId(pid);
		}
		if (typeof window !== "undefined") {
			window.location.hash = "#visit";
		}
		useAppStore.getState().setCurrentView("visit");
		showToast(`Открыта карта приёма: ${pName}`, "info");
	};

	const handleComplete = (e: React.MouseEvent) => {
		e.stopPropagation();
		onQuickStatusChange(a.id, "completed");
		showToast(`Приём ${pName} завершён — направлен на кассу`, "success");
	};

	const handleOpenFinance = (e: React.MouseEvent) => {
		e.stopPropagation();
		if (patObj?.id) {
			usePatientStore.getState().setSelectedPatientId(patObj.id);
		}
		useAppStore.getState().setCurrentView("finance");
		showToast(`Касса: оплата визита ${pName}`, "info");
	};

	return (
		<>
			{isAppointmentInChair(a.status) && (
				<>
					<button
						type="button"
						onClick={handleOpenVisit}
						className="icon-button primary-button h-6 w-6 min-h-[24px] min-w-[24px] p-0 rounded-md text-[10px] font-extrabold bg-[var(--teal)] hover:bg-[var(--teal-dark)] text-white border border-[var(--teal)] transition-all flex items-center justify-center cursor-pointer active:scale-95 shadow-xs shrink-0"
						title="Открыть карту приёма пациента у кресла (#visit)"
						data-testid={`dentalpro-quick-open-visit-${a.id}`}
					>
						<Stethoscope size={12} className="shrink-0" />
						<span className="sr-only">Приём</span>
					</button>
					<button
						type="button"
						onClick={handleComplete}
						className="icon-button secondary-button h-6 w-6 min-h-[24px] min-w-[24px] p-0 rounded-md text-[10px] font-extrabold bg-[var(--paper-soft)] hover:bg-[var(--paper)] text-[var(--ink)] border border-[var(--line)] transition-all flex items-center justify-center cursor-pointer active:scale-95 shadow-2xs shrink-0"
						title="Завершить приём у кресла и отправить на оплату"
						data-testid={`dentalpro-quick-complete-${a.id}`}
					>
						<Check size={12} className="stroke-[3]" />
						<span className="sr-only">Завершить</span>
					</button>
				</>
			)}
			{a.status === "completed" && (
				<button
					type="button"
					onClick={handleOpenFinance}
					className="icon-button secondary-button h-6 w-6 min-h-[24px] min-w-[24px] p-0 rounded-md text-[10px] font-extrabold bg-[var(--teal-soft)] hover:bg-[var(--teal)] text-[var(--teal-dark)] hover:text-white border border-[var(--teal)]/40 transition-all flex items-center justify-center cursor-pointer active:scale-95 shadow-2xs shrink-0"
					title="Перейти к оплате на кассе"
					data-testid={`dentalpro-quick-pay-${a.id}`}
				>
					<CreditCard size={12} />
					<span className="sr-only">Касса</span>
				</button>
			)}
		</>
	);
}
