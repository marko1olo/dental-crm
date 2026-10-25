import React from "react";
import type { Patient } from "@dental/shared";
import { FileText, Printer, ShieldCheck } from "lucide-react";
import { printBlankMedicalConsent, printBlankMedicalContract } from "../../blankContractPrint";
import type { FastPrintDocType } from "../../../documents/FastClinicalPrintEngine";

interface PatientDocumentsBlanksMenuProps {
	patient: Patient;
	onClose: () => void;
	onPrintOutpatientCard?: (() => void) | undefined;
	onOpenFastPrint: (docType: FastPrintDocType) => void;
}

export const PatientDocumentsBlanksMenu: React.FC<PatientDocumentsBlanksMenuProps> = ({
	patient, onClose, onPrintOutpatientCard, onOpenFastPrint,
}) => {
	return (
		<div
			className="absolute right-0 top-full mt-1.5 z-50 min-w-[230px] p-1.5 rounded-xl bg-[var(--paper)] border border-[var(--line)] shadow-xl animate-in fade-in zoom-in-95"
			data-testid="menu-print-blanks-dropdown"
		>
			<button
				type="button"
				onClick={() => { onClose(); void printBlankMedicalContract(patient); }}
				className="w-full h-8 px-2.5 rounded-lg text-left text-xs font-medium text-[var(--ink)] hover:bg-[var(--paper-soft)] hover:text-[var(--teal,#0d9488)] flex items-center gap-2 cursor-pointer transition-colors"
				data-testid="btn-print-blank-contract"
			>
				<FileText size={13} className="text-[var(--teal,#0d9488)] shrink-0" />
				<span className="truncate">Бланк договора</span>
			</button>
			<button
				type="button"
				onClick={() => { onClose(); void printBlankMedicalConsent(patient); }}
				className="w-full h-8 px-2.5 rounded-lg text-left text-xs font-medium text-[var(--ink)] hover:bg-[var(--paper-soft)] hover:text-[var(--teal,#0d9488)] flex items-center gap-2 cursor-pointer transition-colors"
				data-testid="btn-print-blank-consent"
			>
				<ShieldCheck size={13} className="text-[var(--teal,#0d9488)] shrink-0" />
				<span className="truncate">Бланк ИДС</span>
			</button>
			<button
				type="button"
				onClick={() => { onClose(); onOpenFastPrint("partisan_insert_043u"); }}
				className="w-full h-8 px-2.5 rounded-lg text-left text-xs font-medium text-[var(--ink)] hover:bg-[var(--paper-soft)] hover:text-[var(--teal,#0d9488)] flex items-center gap-2 cursor-pointer transition-colors"
				data-testid="btn-patient-print-insert"
			>
				<Printer size={13} className="text-[var(--teal,#0d9488)] shrink-0" />
				<span className="truncate">Вкладыш в амбулаторную карту</span>
			</button>
			<button
				type="button"
				onClick={() => {
					onClose();
					if (onPrintOutpatientCard) onPrintOutpatientCard();
					else onOpenFastPrint("form043u");
				}}
				className="w-full h-8 px-2.5 rounded-lg text-left text-xs font-medium text-[var(--ink)] hover:bg-[var(--paper-soft)] hover:text-[var(--teal,#0d9488)] flex items-center gap-2 cursor-pointer transition-colors"
				data-testid="btn-print-outpatient-card"
			>
				<FileText size={13} className="text-[var(--teal,#0d9488)] shrink-0" />
				<span className="truncate">Выписка из карты</span>
			</button>
		</div>
	);
};
