import React from "react";
import { FileText, PenTool, Printer } from "lucide-react";
import type { DocumentHeaderSectionProps } from "./header/documentHeaderTypes";
import { DocumentHeadingBar } from "./header/DocumentHeadingBar";
import { DocumentPatientBanner } from "./header/DocumentPatientBanner";
import { DocumentScenariosAccordion } from "./header/DocumentScenariosAccordion";
import { handlePrintBlankContract } from "./header/printBlankHelper";

export type { DocumentHeaderSectionProps };

export const DocumentHeaderSection: React.FC<DocumentHeaderSectionProps> = React.memo(
	function DocumentHeaderSection(props) {
		const {
			activePatient, activeDoctor, clinicProfileDraft, typedActiveDocuments,
			patientIssuedDocsCount, patientDraftDocsCount, activeUsableDocuments,
			latestDocumentOpenGuidanceId, handleOpenLatestDocument, handleDirectPrintPrimaryIntake,
			setIsPrimaryIntakeOpen, setIsSurgicalPackageOpen, setIsClinicalVisitOpen,
			setIsTaxAccountingOpen, setIsSanpinRegistryOpen, setIsSickLeaveElnOpen,
			setIsA4PrintPreviewOpen, setIsPatientConsentSignDrawerOpen, onSelectDocumentKind,
		} = props;

		return (
			<>
				<DocumentHeadingBar
					setIsSickLeaveElnOpen={setIsSickLeaveElnOpen}
					activeUsableDocuments={activeUsableDocuments}
					latestDocumentOpenGuidanceId={latestDocumentOpenGuidanceId}
					handleOpenLatestDocument={handleOpenLatestDocument}
				/>

				<DocumentPatientBanner
					activePatient={activePatient}
					patientIssuedDocsCount={patientIssuedDocsCount}
					patientDraftDocsCount={patientDraftDocsCount}
					typedActiveDocuments={typedActiveDocuments}
				/>

				<div className="document-primary-intake-banner" data-testid="document-primary-intake-banner">
					<div className="document-primary-intake-heading">
						<div className="document-primary-intake-badge-title">
							<span className="document-primary-intake-pill">Первичный приём (Договор + ИДС + Персданные)</span>
							<span className="document-primary-intake-hint hidden sm:inline">Комплект бланков для оформления нового пациента</span>
						</div>
					</div>
					<div className="document-primary-intake-btn-group document-intake-quick-action-bar" data-testid="document-intake-quick-action-bar">
						<button
							type="button"
							className="primary-button document-intake-quick-print-btn h-9 min-h-[36px] rounded-xl bg-[var(--primary,#0d9488)] text-white px-3.5 font-semibold text-[13px] flex items-center gap-1.5 cursor-pointer"
							data-tour="print-contract-btn"
							onClick={handleDirectPrintPrimaryIntake}
							data-testid="btn-quick-print-primary-intake-package"
						>
							<Printer size={15} aria-hidden="true" />
							<span>Печать первичного пакета</span>
						</button>
						<button
							type="button"
							className="secondary-button document-intake-blank-contract-btn h-9 min-h-[36px] rounded-xl border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)] px-3 text-[12.5px] font-medium flex items-center gap-1.5 cursor-pointer"
							data-tour="print-blank-contract-btn"
							onClick={() => handlePrintBlankContract(activePatient, activeDoctor, clinicProfileDraft)}
							data-testid="btn-documents-print-blank-contract"
						>
							<FileText size={15} aria-hidden="true" />
							<span>Пустой бланк</span>
						</button>
						<button
							type="button"
							className="secondary-button document-intake-open-modal-btn h-9 min-h-[36px] rounded-xl border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)] px-3 text-[12.5px] font-medium flex items-center gap-1.5 cursor-pointer"
							onClick={() => setIsPrimaryIntakeOpen(true)}
							data-testid="scenario-primary-intake-btn"
						>
							<span>Состав пакета (4 док.)</span>
						</button>
						{setIsPatientConsentSignDrawerOpen && (
							<button
								type="button"
								className="secondary-button h-9 min-h-[36px] rounded-xl border border-[var(--teal,#0d9488)]/40 bg-[var(--paper)] text-[var(--teal,#0d9488)] px-3 text-[12.5px] font-semibold flex items-center gap-1.5 cursor-pointer"
								onClick={() => setIsPatientConsentSignDrawerOpen(true)}
								data-testid="btn-open-patient-consent-drawer"
							>
								<PenTool size={14} aria-hidden="true" />
								<span>Подпись на планшете</span>
							</button>
						)}
						{setIsA4PrintPreviewOpen && (
							<button
								type="button"
								className="secondary-button document-intake-a4-preview-btn h-9 min-h-[36px] rounded-xl border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)] px-3 text-[12.5px] font-medium flex items-center gap-1.5 cursor-pointer"
								onClick={() => setIsA4PrintPreviewOpen(true)}
								data-testid="btn-open-pro-a4-modal"
							>
								<Printer size={14} className="text-[var(--primary,#0d9488)]" aria-hidden="true" />
								<span>Бланки А4 (Договор / Акт / Карта)</span>
							</button>
						)}
					</div>
				</div>

				<DocumentScenariosAccordion
					setIsPrimaryIntakeOpen={setIsPrimaryIntakeOpen}
					handleDirectPrintPrimaryIntake={handleDirectPrintPrimaryIntake}
					setIsSurgicalPackageOpen={setIsSurgicalPackageOpen}
					setIsClinicalVisitOpen={setIsClinicalVisitOpen}
					setIsTaxAccountingOpen={setIsTaxAccountingOpen}
					setIsSanpinRegistryOpen={setIsSanpinRegistryOpen}
					setIsSickLeaveElnOpen={setIsSickLeaveElnOpen}
					onSelectDocumentKind={onSelectDocumentKind}
				/>
			</>
		);
	},
);

DocumentHeaderSection.displayName = "DocumentHeaderSection";
