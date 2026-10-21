import type { Appointment } from "@dental/shared";
import { CreditCard, Stethoscope } from "lucide-react";
import type React from "react";
import { usePatientStore } from "../../../store/patientStore";
import { showToast } from "../../GlobalToast";
import { openVisitWithBackendSync } from "../appointmentCardActions/visitSyncHelper";

export interface ScheduleMobileCardActionsProps {
	appt: Appointment;
	pat: any;
	pName: string;
	onQuickStatusChange?:
		| ((appointmentId: string, status: Appointment["status"]) => void)
		| undefined;
	onOpenVisit?: ((appointment?: Appointment) => void) | undefined;
}

export function ScheduleMobileCardActions({
	appt,
	pat,
	pName,
	onQuickStatusChange,
	onOpenVisit,
}: ScheduleMobileCardActionsProps) {
	const handleStartTreatment = async (e: React.MouseEvent) => {
		e.stopPropagation();
		if (onQuickStatusChange) {
			onQuickStatusChange(appt.id, "in_treatment");
		}
		await openVisitWithBackendSync(
			appt,
			pat,
			onOpenVisit ? () => onOpenVisit(appt) : undefined,
		);
		showToast(`Пациент «${pName}» в кресле: открыта медкарта`, "success");
	};

	const handleOpenActiveVisit = async (e: React.MouseEvent) => {
		e.stopPropagation();
		await openVisitWithBackendSync(
			appt,
			pat,
			onOpenVisit ? () => onOpenVisit(appt) : undefined,
		);
	};

	const handleOpenCheckout = (e: React.MouseEvent) => {
		e.stopPropagation();
		const pid = pat?.id || appt.patientId;
		if (pid) {
			usePatientStore.getState().setSelectedPatientId(pid);
		}
		window.dispatchEvent(
			new CustomEvent("dente:open-payment-modal", {
				detail: {
					patientId: pid,
					patientName: pName,
					amountRub: 15400,
				},
			}),
		);
	};

	return (
		<div className="schedule-mobile-card-actions-col">
			{appt.status === "in_treatment" ? (
				<button
					type="button"
					className="schedule-mobile-chair-action-btn btn-active-visit"
					onClick={handleOpenActiveVisit}
					title="Открыть карту приёма"
					data-testid={`mobile-chair-btn-${appt.id}`}
				>
					<Stethoscope size={15} />
					<span>В приём</span>
				</button>
			) : appt.status === "completed" ? (
				<button
					type="button"
					className="schedule-mobile-chair-action-btn btn-pay"
					onClick={handleOpenCheckout}
					title="Принять оплату / Касса"
					data-testid={`mobile-pay-btn-${appt.id}`}
				>
					<CreditCard size={15} />
					<span>Чек</span>
				</button>
			) : (
				<button
					type="button"
					className="schedule-mobile-chair-action-btn btn-chair"
					onClick={handleStartTreatment}
					title="Пациент в кресле (Начать приём)"
					data-testid={`mobile-chair-btn-${appt.id}`}
				>
					<Stethoscope size={15} />
					<span>В кресло</span>
				</button>
			)}
		</div>
	);
}
