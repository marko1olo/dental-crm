import React from "react";
import { ArrowLeft, FileText, ShieldCheck, Stethoscope } from "lucide-react";
import { printBlankMedicalConsent, printBlankMedicalContract } from "../blankContractPrint";

export interface PatientMobileBackHeaderProps {
	readonly selectedPatient: any;
	readonly onBackToList: () => void;
	readonly onOpenVisit: () => void;
}

export function PatientMobileBackHeader({
	selectedPatient,
	onBackToList,
	onOpenVisit,
}: PatientMobileBackHeaderProps) {
	return (
		<div className="patient-mobile-back-header md:hidden flex items-center justify-between gap-2 flex-wrap w-full mb-3">
			<button
				type="button"
				className="mobile-back-to-list-btn min-h-[36px] h-9 px-3 py-1.5"
				onClick={onBackToList}
				aria-label="Вернуться к списку пациентов"
			>
				<ArrowLeft size={15} aria-hidden="true" />
				<span>← Назад</span>
			</button>
			{selectedPatient && (
				<div className="flex items-center gap-1.5 flex-wrap shrink-0">
					<button
						type="button"
						onClick={onOpenVisit}
						className="min-h-[44px] sm:min-h-[34px] h-9 sm:h-8 px-3 sm:px-2.5 py-1.5 sm:py-1 rounded-xl sm:rounded-lg bg-[var(--teal)] hover:opacity-95 text-[var(--on-teal,#ffffff)] text-xs font-bold inline-flex items-center gap-1.5 shadow-xs cursor-pointer shrink-0"
						title="Открыть приём"
						data-testid="patient-mobile-header-open-visit-btn"
					>
						<Stethoscope size={14} aria-hidden="true" />
						<span>Приём</span>
					</button>
					<button
						type="button"
						onClick={() => void printBlankMedicalContract(selectedPatient)}
						className="min-h-[44px] sm:min-h-[34px] h-9 sm:h-8 px-2.5 sm:px-2 py-1.5 sm:py-1 rounded-xl sm:rounded-lg bg-[var(--paper-soft)] text-[var(--ink)] border border-[var(--line)] text-xs font-semibold inline-flex items-center gap-1 shadow-xs cursor-pointer shrink-0"
						title="Распечатать бланк договора"
						data-testid="patient-mobile-header-print-contract-btn"
					>
						<FileText size={14} aria-hidden="true" />
						<span>Договор</span>
					</button>
					<button
						type="button"
						onClick={() => void printBlankMedicalConsent(selectedPatient)}
						className="min-h-[44px] sm:min-h-[34px] h-9 sm:h-8 px-2.5 sm:px-2 py-1.5 sm:py-1 rounded-xl sm:rounded-lg bg-[var(--paper-soft)] text-[var(--ink)] border border-[var(--line)] text-xs font-semibold inline-flex items-center gap-1 shadow-xs cursor-pointer shrink-0"
						title="Распечатать бланк согласия на лечение"
						data-testid="patient-mobile-header-print-consent-btn"
					>
						<ShieldCheck size={14} aria-hidden="true" />
						<span>Согласие</span>
					</button>
				</div>
			)}
		</div>
	);
}
