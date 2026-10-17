import React from "react";
import { CreditCard, FileText, Printer } from "lucide-react";
import { showToast } from "../../GlobalToast";
import { useAppStore } from "../../../store/appStore";
import { usePatientStore } from "../../../store/patientStore";
import { printBlankMedicalContract } from "../../patients/blankContractPrint";
import type { AppointmentCardContextMenuProps } from "./types";

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
}: Pick<
	AppointmentCardContextMenuProps,
	| "appointment"
	| "dashboard"
	| "appointmentPatient"
	| "appointmentPatientName"
	| "appointmentDoctor"
	| "repeatAppointment"
	| "copyAppointmentToBuffer"
	| "openAppointmentEditor"
> & { onClose: () => void }) {
	return (
		<>
			<div className="px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-[var(--muted)] border-t border-[var(--line)] mt-1 pt-1">
				Операции с приемом
			</div>
			<button
				type="button"
				className="w-full text-left px-2.5 py-1.5 h-8 min-h-[32px] sm:h-8 sm:min-h-[32px] touch:min-h-[44px] rounded-lg text-xs font-medium text-[var(--ink)] hover:bg-[var(--teal-soft)] hover:text-[var(--teal-dark)] transition-colors flex items-center gap-2 cursor-pointer"
				role="menuitem"
				onClick={() => {
					onClose();
					if (appointmentPatient?.id) usePatientStore.getState().setSelectedPatientId(appointmentPatient.id);
					useAppStore.getState().setCurrentView("patients");
					showToast(`Открыта карта пациента: ${appointmentPatientName}`, "info");
				}}
				title="Открыть медицинскую карту пациента"
			>
				<FileText size={14} className="text-[var(--teal)] shrink-0" />
				<span>Медицинская карта</span>
			</button>
			<button
				type="button"
				className="w-full text-left px-2.5 py-1.5 h-8 min-h-[32px] sm:h-8 sm:min-h-[32px] touch:min-h-[44px] rounded-lg text-xs font-medium text-[var(--ink)] hover:bg-[var(--teal-soft)] hover:text-[var(--teal-dark)] transition-colors flex items-center gap-2 cursor-pointer"
				role="menuitem"
				onClick={() => {
					onClose();
					void printBlankMedicalContract(appointmentPatient, {
						doctorName: appointmentDoctor?.fullName,
						clinicName: dashboard?.clinicSettings?.profile?.clinicName,
					});
				}}
				title="Распечатать пустой договор со строками _______ для пациента"
				data-testid="appointment-card-print-blank-contract-btn"
			>
				<Printer size={14} className="text-[var(--teal)] shrink-0" />
				<span>Печать бланка договора (_______)</span>
			</button>
			<button
				type="button"
				className="w-full text-left px-2.5 py-1.5 h-8 min-h-[32px] sm:h-8 sm:min-h-[32px] touch:min-h-[44px] rounded-lg text-xs font-medium text-[var(--ink)] hover:bg-[var(--teal-soft)] hover:text-[var(--teal-dark)] transition-colors flex items-center gap-2 cursor-pointer"
				role="menuitem"
				onClick={() => {
					onClose();
					if (appointmentPatient?.id) usePatientStore.getState().setSelectedPatientId(appointmentPatient.id);
					useAppStore.getState().setCurrentView("finance");
					showToast(`Касса: расчёт ${appointmentPatientName}`, "info");
				}}
				title="Перейти в кассу для расчёта"
			>
				<CreditCard size={14} className="text-[var(--teal)] shrink-0" />
				<span>Принять оплату / Касса</span>
			</button>
			<button
				type="button"
				className="secondary-button appointment-repeat-button w-full text-left px-2.5 py-1.5 h-8 min-h-[32px] sm:h-8 sm:min-h-[32px] touch:min-h-[44px] rounded-lg text-xs font-medium text-[var(--ink)] hover:bg-[var(--teal-soft)] hover:text-[var(--teal-dark)] transition-colors flex items-center justify-between cursor-pointer"
				role="menuitem"
				onClick={() => { onClose(); repeatAppointment(appointment); }}
				title="Повторить запись (Клавиша R)"
			>
				<span>Повторить запись</span>
				<span className="text-[10px] font-mono opacity-70">R</span>
			</button>
			{copyAppointmentToBuffer && (
				<button
					type="button"
					className="secondary-button appointment-buffer-button w-full text-left px-2.5 py-1.5 h-8 min-h-[32px] sm:h-8 sm:min-h-[32px] touch:min-h-[44px] rounded-lg text-xs font-medium text-[var(--ink)] hover:bg-[var(--teal-soft)] hover:text-[var(--teal-dark)] transition-colors flex items-center justify-between cursor-pointer"
					role="menuitem"
					onClick={() => { onClose(); copyAppointmentToBuffer(appointment); }}
					title="Скопировать в буфер (Клавиша B)"
				>
					<span>Скопировать в буфер</span>
					<span className="text-[10px] font-mono opacity-70">B</span>
				</button>
			)}
			<button
				type="button"
				className="secondary-button appointment-edit-button w-full text-left px-2.5 py-1.5 h-8 min-h-[32px] sm:h-8 sm:min-h-[32px] touch:min-h-[44px] rounded-lg text-xs font-medium text-[var(--ink)] hover:bg-[var(--teal-soft)] hover:text-[var(--teal-dark)] transition-colors flex items-center justify-between cursor-pointer"
				role="menuitem"
				onClick={() => { onClose(); openAppointmentEditor(appointment); }}
				title="Настроить запись в редакторе (Клавиша Enter)"
			>
				<span>Настроить запись</span>
				<span className="text-[10px] font-mono opacity-70">Enter</span>
			</button>
		</>
	);
}
