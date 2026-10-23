import { CreditCard, FileText, Printer } from "lucide-react";
import { useAppStore } from "../../../store/appStore";
import { usePatientStore } from "../../../store/patientStore";
import { showToast } from "../../GlobalToast";
import { printBlankMedicalContract } from "../../patients/blankContractPrint";
import { AppointmentScheduleOpsButtons } from "./AppointmentScheduleOpsButtons";
import type { AppointmentCardContextMenuProps } from "./types";

interface OpsProps extends AppointmentCardContextMenuProps {
	readonly onClose: () => void;
}

const itemBtn =
	"w-full text-left px-2.5 py-1.5 h-8 min-h-[32px] touch:min-h-[44px] rounded-lg text-xs font-medium text-[var(--ink)] hover:bg-[var(--teal-soft)] hover:text-[var(--teal-dark)] transition-colors flex items-center gap-2 cursor-pointer";

export function OperationsMenuSection({
	appointment,
	dashboard,
	appointmentPatient,
	appointmentPatientName,
	appointmentDoctor,
	repeatAppointment,
	copyAppointmentToBuffer,
	openAppointmentEditor,
	onClose,
}: OpsProps) {
	const onOpenCard = () => {
		onClose();
		if (appointmentPatient?.id)
			usePatientStore.getState().setSelectedPatientId(appointmentPatient.id);
		useAppStore.getState().setCurrentView("patients");
		showToast(`Открыта карта пациента: ${appointmentPatientName}`, "info");
	};

	const onPrintContract = () => {
		onClose();
		void printBlankMedicalContract(appointmentPatient, {
			doctorName: appointmentDoctor?.fullName,
			clinicName: dashboard?.clinicSettings?.profile?.clinicName,
		});
	};

	const onOpenPayment = () => {
		onClose();
		if (appointmentPatient?.id)
			usePatientStore.getState().setSelectedPatientId(appointmentPatient.id);
		window.dispatchEvent(
			new CustomEvent("dente:open-payment-modal", {
				detail: {
					patientId: appointmentPatient?.id || appointment.patientId,
					patientName: appointmentPatientName,
				},
			}),
		);
	};

	return (
		<>
			<div className="px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-[var(--muted)] border-t border-[var(--line)] mt-1 pt-1">
				Операции с приемом
			</div>
			<button
				type="button"
				className={itemBtn}
				role="menuitem"
				onClick={onOpenCard}
				title="Открыть медицинскую карту пациента"
			>
				<FileText size={14} className="text-[var(--teal)] shrink-0" />
				<span>Медицинская карта</span>
			</button>
			<button
				type="button"
				className={itemBtn}
				role="menuitem"
				data-testid="appointment-card-print-blank-contract-btn"
				onClick={onPrintContract}
				title="Распечатать пустой договор со строками _______ для пациента"
			>
				<Printer size={14} className="text-[var(--teal)] shrink-0" />
				<span>Печать бланка договора (_______)</span>
			</button>
			<button
				type="button"
				className={itemBtn}
				role="menuitem"
				onClick={onOpenPayment}
				title="Перейти в кассу для расчёта"
			>
				<CreditCard size={14} className="text-[var(--teal)] shrink-0" />
				<span>Принять оплату / Касса</span>
			</button>
			<AppointmentScheduleOpsButtons
				appointment={appointment}
				repeatAppointment={repeatAppointment}
				copyAppointmentToBuffer={copyAppointmentToBuffer}
				openAppointmentEditor={openAppointmentEditor}
				onClose={onClose}
			/>
		</>
	);
}

export default OperationsMenuSection;
