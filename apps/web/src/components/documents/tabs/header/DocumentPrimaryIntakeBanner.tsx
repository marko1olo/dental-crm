import React from "react";
import type { Patient, StaffMember } from "@dental/shared";
import type { ClinicProfileDraft } from "../../../../AppHelpers";
import { FileText, Printer } from "lucide-react";
import { printBlankMedicalContract } from "../../../patients/blankContractPrint";

export interface DocumentPrimaryIntakeBannerProps {
	activePatient?: Patient | null | undefined;
	activeDoctor?: StaffMember | null | undefined;
	clinicProfileDraft?: ClinicProfileDraft | undefined;
	handleDirectPrintPrimaryIntake: () => void;
	setIsPrimaryIntakeOpen: (open: boolean) => void;
	setIsA4PrintPreviewOpen?: ((open: boolean) => void) | undefined;
}

export const DocumentPrimaryIntakeBanner: React.FC<DocumentPrimaryIntakeBannerProps> = React.memo(
	function DocumentPrimaryIntakeBanner({
		activePatient,
		activeDoctor,
		clinicProfileDraft,
		handleDirectPrintPrimaryIntake,
		setIsPrimaryIntakeOpen,
		setIsA4PrintPreviewOpen,
	}) {
		const handlePrintBlank = () => {
			void printBlankMedicalContract(
				activePatient
					? {
							id: activePatient.id,
							fullName: activePatient.fullName,
							phone: activePatient.phone,
							birthDate: activePatient.birthDate,
							administrativeProfile: (activePatient as any)?.administrativeProfile,
						}
					: null,
				{
					doctorName: activeDoctor?.fullName || "",
					clinicName: clinicProfileDraft?.clinicName || clinicProfileDraft?.legalName,
					clinicAddress: clinicProfileDraft?.address,
					clinicInn: clinicProfileDraft?.inn,
					clinicOgrn: clinicProfileDraft?.ogrn,
				},
			);
		};

		return (
			<div className="document-primary-intake-banner" data-testid="document-primary-intake-banner">
				<div className="document-primary-intake-heading">
					<div className="document-primary-intake-badge-title">
						<span className="document-primary-intake-pill">
							Первичный приём (Договор + ИДС + Персданные)
						</span>
						<span className="document-primary-intake-hint hidden sm:inline">
							Комплект бланков для оформления нового пациента на стойке регистрации
						</span>
					</div>
				</div>

				<div className="document-primary-intake-btn-group document-intake-quick-action-bar" data-testid="document-intake-quick-action-bar">
					<button
						type="button"
						className="primary-button document-intake-quick-print-btn h-9 min-h-[36px] rounded-xl bg-[var(--primary,#0d9488)] hover:bg-[var(--primary-dark,#0f766e)] text-white shadow-xs px-3.5 font-semibold text-[13px] flex items-center gap-1.5 cursor-pointer transition-all"
						data-tour="print-contract-btn"
						onClick={handleDirectPrintPrimaryIntake}
						data-testid="btn-quick-print-primary-intake-package"
						title="Сформировать и напечатать полный пакет первичного приёма"
					>
						<Printer size={15} aria-hidden="true" />
						<span>Печать первичного пакета</span>
					</button>
					<button
						type="button"
						className="secondary-button document-intake-blank-contract-btn h-9 min-h-[36px] rounded-xl border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)] hover:bg-[var(--paper-soft)] px-3 text-[12.5px] font-medium flex items-center gap-1.5 cursor-pointer transition-colors"
						data-tour="print-blank-contract-btn"
						onClick={handlePrintBlank}
						data-testid="btn-documents-print-blank-contract"
						title="Распечатать чистый бланк договора для ручного заполнения пациентом до приёма"
					>
						<FileText size={15} aria-hidden="true" />
						<span>Пустой бланк</span>
					</button>
					<button
						type="button"
						className="secondary-button document-intake-open-modal-btn h-9 min-h-[36px] rounded-xl border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)] hover:bg-[var(--paper-soft)] px-3 text-[12.5px] font-medium flex items-center gap-1.5 cursor-pointer transition-colors"
						onClick={() => setIsPrimaryIntakeOpen(true)}
						data-testid="scenario-primary-intake-btn"
						title="Открыть модальное окно пакетного формирования и предварительного просмотра"
					>
						<span>Состав пакета (4 док.)</span>
					</button>
					{setIsA4PrintPreviewOpen && (
						<button
							type="button"
							className="secondary-button document-intake-a4-preview-btn h-9 min-h-[36px] rounded-xl border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)] hover:bg-[var(--paper-soft)] px-3 text-[12.5px] font-medium flex items-center gap-1.5 cursor-pointer transition-colors"
							onClick={() => setIsA4PrintPreviewOpen(true)}
							data-testid="btn-open-pro-a4-modal"
							title="Открыть официальный печатный бланк А4"
						>
							<Printer size={14} className="text-[var(--primary,#0d9488)]" aria-hidden="true" />
							<span>Бланки А4 (Договор / Акт / Карта)</span>
						</button>
					)}
				</div>
			</div>
		);
	},
);

DocumentPrimaryIntakeBanner.displayName = "DocumentPrimaryIntakeBanner";
