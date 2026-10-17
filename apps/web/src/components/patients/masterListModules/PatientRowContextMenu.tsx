import React from "react";
import type { Patient } from "@dental/shared";
import { Calendar, FileText, Phone, Receipt, ShieldCheck, UserCheck } from "lucide-react";
import { showToast } from "../../GlobalToast";
import { useAppStore } from "../../../store/appStore";
import { printBlankMedicalConsent, printBlankMedicalContract } from "../blankContractPrint";
import { initiateOutboundCall } from "../../telephony/initiateOutboundCall";

interface PatientRowContextMenuProps {
	readonly patient: Patient;
	readonly onClose: () => void;
	readonly onSelectPatient: (id: string) => void;
	readonly onOpenVisit: (patient: Patient) => void;
	readonly onBookAppointment: (patient: Patient) => void;
	readonly onOpenPatientCard: (patient: Patient) => void;
}

export const PatientRowContextMenu: React.FC<PatientRowContextMenuProps> = ({
	patient,
	onClose,
	onSelectPatient,
	onOpenVisit,
	onBookAppointment,
	onOpenPatientCard,
}) => (
	<div
		className="patient-row-menu-dropdown absolute right-0 top-full mt-1 z-50 flex flex-col gap-0.5 p-1.5 bg-[var(--paper)] border border-[var(--line)] rounded-xl shadow-2xl min-w-[210px] text-xs animate-in fade-in zoom-in-95 duration-100"
		role="menu"
		data-testid="patient-row-actions-dropdown"
		onClick={(e) => e.stopPropagation()}
	>
		<button
			type="button"
			className="patient-row-action-btn patient-row-chart-btn w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-medium text-[var(--ink)] hover:bg-[var(--teal-soft)] hover:text-[var(--teal-dark)] transition-colors flex items-center gap-2 cursor-pointer"
			role="menuitem"
			title={`Открыть приём и карту: ${patient.fullName}`}
			data-testid={`patient-row-chart-btn-${patient.id}`}
			onClick={() => { onClose(); onSelectPatient(patient.id); onOpenVisit(patient); }}
		>
			<FileText size={14} className="text-[var(--teal,var(--brand-primary))] shrink-0" />
			<span>В карту (Приём)</span>
		</button>

		<button
			type="button"
			className="patient-row-action-btn patient-row-book-btn w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-medium text-[var(--ink)] hover:bg-[var(--teal-soft)] hover:text-[var(--teal-dark)] transition-colors flex items-center gap-2 cursor-pointer"
			role="menuitem"
			title={`Записать на приём в расписание: ${patient.fullName}`}
			data-testid={`patient-row-book-btn-${patient.id}`}
			onClick={() => { onClose(); onSelectPatient(patient.id); onBookAppointment(patient); }}
		>
			<Calendar size={14} className="text-teal-600 dark:text-teal-400 shrink-0" />
			<span>Записать на приём</span>
		</button>

		<button
			type="button"
			className="w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-medium text-[var(--ink)] hover:bg-[var(--teal-soft)] hover:text-[var(--teal-dark)] transition-colors flex items-center gap-2 cursor-pointer"
			role="menuitem"
			onClick={() => { onClose(); onSelectPatient(patient.id); onOpenPatientCard(patient); }}
		>
			<UserCheck size={14} className="text-[var(--teal)] shrink-0" />
			<span>Паспортная карточка</span>
		</button>

		<button
			type="button"
			className="w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-medium text-[var(--ink)] hover:bg-[var(--teal-soft)] hover:text-[var(--teal-dark)] transition-colors flex items-center gap-2 cursor-pointer"
			role="menuitem"
			onClick={() => {
				onClose();
				onSelectPatient(patient.id);
				useAppStore.getState().setCurrentView("finance");
				showToast(`Касса: расчёт ${patient.fullName}`, "info");
			}}
		>
			<Receipt size={14} className="text-emerald-600 dark:text-emerald-400 shrink-0" />
			<span>Касса / Оплата</span>
		</button>

		<button
			type="button"
			className="w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-medium text-[var(--ink)] hover:bg-[var(--teal-soft)] hover:text-[var(--teal-dark)] transition-colors flex items-center gap-2 cursor-pointer"
			role="menuitem"
			onClick={() => { onClose(); void printBlankMedicalContract(patient); }}
		>
			<FileText size={14} className="text-blue-600 dark:text-blue-400 shrink-0" />
			<span>Печать бланка договора (____)</span>
		</button>

		<button
			type="button"
			className="w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-medium text-[var(--ink)] hover:bg-[var(--teal-soft)] hover:text-[var(--teal-dark)] transition-colors flex items-center gap-2 cursor-pointer"
			role="menuitem"
			onClick={() => { onClose(); void printBlankMedicalConsent(patient); }}
			data-testid="row-print-blank-consent"
		>
			<ShieldCheck size={14} className="text-teal-600 dark:text-teal-400 shrink-0" />
			<span>Печать бланка ИДС (____)</span>
		</button>

		{patient.phone && (
			<button
				type="button"
				className="w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-medium text-[var(--ink)] hover:bg-[var(--teal-soft)] hover:text-[var(--teal-dark)] transition-colors flex items-center gap-2 cursor-pointer"
				role="menuitem"
				onClick={() => {
					onClose();
					void initiateOutboundCall({ phone: patient.phone!, patientId: patient.id, patientName: patient.fullName });
				}}
				data-testid="row-call-patient-btn"
			>
				<Phone size={14} className="text-teal-600 dark:text-teal-400 shrink-0" />
				<span>Позвонить ({patient.phone})</span>
			</button>
		)}
	</div>
);
