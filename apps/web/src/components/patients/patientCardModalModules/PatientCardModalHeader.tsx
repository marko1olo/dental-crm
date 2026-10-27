import React from "react";
import { Award, ExternalLink, FileCheck, Printer, User, X } from "lucide-react";
import type { PatientGeneralInfo } from "../tabs/PatientGeneralInfoTab";
import { useAppStore } from "../../../store/appStore";
import { usePatientStore } from "../../../store/patientStore";

interface PatientCardModalHeaderProps {
	readonly patientData: PatientGeneralInfo;
	readonly isChildPatient: boolean;
	readonly onOpenDiploma: () => void;
	readonly onOpenTaxCertificate: () => void;
	readonly onPrint: () => void;
	readonly onClose: () => void;
}

export const PatientCardModalHeader: React.FC<PatientCardModalHeaderProps> = ({
	patientData,
	isChildPatient,
	onOpenDiploma,
	onOpenTaxCertificate,
	onPrint,
	onClose,
}) => (
	<div className="flex items-center justify-between px-3.5 py-2.5 sm:p-4 border-b border-[var(--glass-border)] bg-[var(--paper-strong)] gap-2 min-w-0 print:hidden">
		<div className="flex items-center gap-2.5 sm:gap-3 min-w-0 flex-1">
			<div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-[var(--teal,var(--brand-primary))] text-white flex items-center justify-center shrink-0">
				<User className="w-4 h-4 sm:w-5 sm:h-5" />
			</div>
			<div className="min-w-0 flex-1">
				<h2 id="patient-card-modal-title" className="text-sm sm:text-base font-black text-[var(--ink)] m-0 truncate">
					{patientData.fullName || "Медицинская карта пациента"}
				</h2>
				<p className="text-xs text-[var(--muted)] m-0 truncate">
					{patientData.phone ? `Тел: ${patientData.phone}` : "Паспортная карточка и клинический статус"}
					{patientData.birthDate ? ` • ${patientData.birthDate}` : ""}
					{patientData.medicalCardNumber || patientData.cardNumber
						? ` • Карта: №${patientData.medicalCardNumber || patientData.cardNumber}`
						: patientData.id && patientData.id.length <= 16
							? ` • ID: ${patientData.id}`
							: ""}
				</p>
			</div>
		</div>

		<div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
			{isChildPatient && (
				<button
					type="button"
					data-testid="btn-patient-card-diploma"
					onClick={onOpenDiploma}
					className="border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)] hover:bg-[var(--paper-soft)] hover:border-[var(--teal)] min-h-[44px] sm:min-h-[32px] h-8 px-3 text-xs font-semibold rounded-lg inline-flex items-center gap-1.5 cursor-pointer shrink-0 whitespace-nowrap select-none transition-all shadow-2xs"
					title="Распечатать «Диплом за храбрость» маленькому пациенту"
				>
					<Award className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
					<span className="hidden sm:inline">Диплом за храбрость</span>
					<span className="sm:hidden">Диплом</span>
				</button>
			)}

			<button
				type="button"
				data-testid="btn-patient-tax-deduction"
				onClick={onOpenTaxCertificate}
				className="border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)] hover:bg-[var(--paper-soft)] hover:border-[var(--teal)] min-h-[44px] sm:min-h-[32px] h-8 px-3 text-xs font-semibold rounded-lg inline-flex items-center gap-1.5 cursor-pointer shrink-0 whitespace-nowrap select-none transition-all shadow-2xs"
				title="Справка об оплате медицинских услуг для налогового вычета (13%)"
			>
				<FileCheck className="w-4 h-4 text-teal-600 dark:text-teal-400 shrink-0" />
				<span className="hidden sm:inline">Справка для вычета (13%)</span>
				<span className="sm:hidden">Вычет 13%</span>
			</button>

			<button
				type="button"
				data-testid="btn-print-patient-card"
				onClick={onPrint}
				className="border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)] font-bold rounded-lg px-2.5 py-1.5 shadow-2xs hover:border-[var(--teal)] transition-colors min-h-[44px] sm:min-h-[32px] h-8 text-xs inline-flex items-center gap-1.5 cursor-pointer shrink-0 whitespace-nowrap select-none"
				title="Печать карты пациента"
			>
				<Printer className="w-4 h-4 shrink-0" />
				<span>Печать</span>
			</button>

			{patientData.id && (
				<button
					type="button"
					data-testid="btn-open-patient-workspace"
					onClick={() => {
						usePatientStore.getState().setSelectedPatientId(patientData.id ?? null);
						useAppStore.getState().setCurrentView("patients");
						if (typeof window !== "undefined") {
							window.location.hash = "patients";
						}
						onClose();
					}}
					className="border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)] font-bold rounded-lg px-2.5 py-1.5 shadow-2xs hover:border-[var(--teal)] transition-colors min-h-[44px] sm:min-h-[32px] h-8 text-xs inline-flex items-center gap-1.5 cursor-pointer shrink-0 whitespace-nowrap select-none"
					title="Перейти в полную рабочую область пациента (PatientWorkspace)"
				>
					<ExternalLink className="w-4 h-4 shrink-0" />
					<span className="hidden sm:inline">Рабочая область</span>
				</button>
			)}

			<button
				type="button"
				data-testid="btn-close-patient-card-modal"
				onClick={onClose}
				className="border border-[var(--line)] bg-[var(--paper)] text-[var(--muted)] hover:text-[var(--ink)] hover:border-[var(--teal)] min-h-[44px] sm:min-h-[32px] h-8 w-8 rounded-lg flex items-center justify-center transition-all cursor-pointer shrink-0 shadow-2xs"
				aria-label="Закрыть окно"
			>
				<X className="w-4 h-4" />
			</button>
		</div>
	</div>
);
