import React from "react";
import { createPortal } from "react-dom";
import { AlertTriangle } from "lucide-react";
import {
	useTaxDeductionCertificate, TaxDeductionHeader, TaxDeductionPayerForm,
	TaxDeductionPaymentsTable, TaxDeductionFooterActions, TaxDeductionChecksTab,
	TaxDeductionFamilyTab, TaxDeductionXmlTab, TaxDeductionRegistryView,
	TaxDeductionModalFooter, TaxDeductionRequisitesForm,
	type TaxDeductionCertificateModalProps,
} from "./taxDeduction";

export {
	TaxDeductionFamilyTab, TaxDeductionChecksTab, TaxDeductionXmlTab,
	TaxDeductionModalFooter, TaxDeductionRequisitesForm, TaxDeductionHeader,
	TaxDeductionPayerForm, TaxDeductionPaymentsTable, TaxDeductionFooterActions,
	TaxDeductionRegistryView, useTaxDeductionCertificate,
};
export type { TaxDeductionCertificateModalProps };

export const TaxDeductionCertificateModal: React.FC<TaxDeductionCertificateModalProps> = (props) => {
	const { isOpen, onClose } = props;
	const s = useTaxDeductionCertificate(props);

	if (!isOpen) return null;

	const modalContent = (
		<div className="fixed inset-0 z-[1000] flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs">
			<div
				className="w-full max-w-5xl max-h-[92vh] rounded-3xl bg-[var(--paper)] border border-[var(--line)] shadow-2xl flex flex-col overflow-hidden text-[var(--ink)]"
				style={{ backgroundColor: "var(--paper)", borderColor: "var(--line)", color: "var(--ink)" }}
			>
				<TaxDeductionHeader activeTab={s.activeTab} onTabChange={s.setActiveTab} onClose={onClose} yearPaymentsCount={s.yearPayments.length} />

				<div className="p-4 sm:p-6 overflow-y-auto flex-1 space-y-6">
					{(!s.clinicInn || !s.clinicLicenseNumber) && (
						<div role="status" className="p-3.5 bg-amber-500/10 border border-amber-500/30 rounded-2xl flex items-center gap-3 text-amber-800 dark:text-amber-300 text-sm">
							<AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />
							<div>
								<span className="font-semibold">Заполните реквизиты клиники в настройках:</span>{" "}
								<span>ИНН и номер медицинской лицензии необходимы для корректного формирования справки об оплате медицинских услуг (КНД 1151156).</span>
							</div>
						</div>
					)}

					{s.activeTab === "form" && (
						<>
							<TaxDeductionPayerForm {...s} onFillFromPatient={s.handleFillFromPatient} />
							<TaxDeductionPaymentsTable
								selectedYear={s.selectedYear} yearPayments={s.yearPayments}
								allPaymentsCount={s.effectivePayments.length} targetYearSummary={s.targetYearSummary}
								clinicLicenseNumber={s.clinicLicenseNumber} clinicLicenseDate={s.clinicLicenseDate}
								qrSvgString={s.qrSvgString} onClose={onClose}
							/>
						</>
					)}

					{s.activeTab === "checks" && (
						<TaxDeductionChecksTab selectedYear={s.selectedYear} yearPayments={s.yearPayments} />
					)}

					{s.activeTab === "family" && (
						<TaxDeductionFamilyTab
							selectedYear={s.selectedYear} paymentsCount={s.effectivePayments.length}
							familyBatchResult={s.familyBatchResult} onClose={onClose}
							onDownloadBatchNoMedoplXml={s.handleDownloadBatchNoMedoplXml}
							onDownloadBatchXml={s.handleDownloadBatchXml} onPrintBatch={s.handlePrintBatch}
						/>
					)}

					{s.activeTab === "xml" && (
						<TaxDeductionXmlTab
							selectedYear={s.selectedYear} yearPaymentsCount={s.yearPayments.length}
							fileName={s.xmlRepresentation.fileName} xmlContent={s.xmlRepresentation.xmlContent}
							isCopiedXml={s.isCopiedXml} onCopyXml={s.handleCopyXml} onClose={onClose}
						/>
					)}

					{s.activeTab === "registry" && (
						<TaxDeductionRegistryView clinicName={s.clinicName} clinicInn={s.clinicInn} onOpenNewCertificate={() => s.setActiveTab("form")} />
					)}
				</div>

				<TaxDeductionFooterActions
					activeTab={s.activeTab} clinicName={s.clinicName} clinicInn={s.clinicInn} clinicKpp={s.clinicKpp}
					onClose={onClose} onDownloadBatchNoMedoplXml={s.handleDownloadBatchNoMedoplXml}
					onDownloadBatchXml={s.handleDownloadBatchXml} onPrintBatch={s.handlePrintBatch}
					onDownloadNoMedoplXml={s.handleDownloadNoMedoplXml} onDownloadXml={s.handleDownloadXml}
					onPrintBlank={s.handlePrintBlank} onPrint={s.handlePrint}
				/>
			</div>
		</div>
	);

	if (typeof document !== "undefined" && document.body) {
		return createPortal(modalContent, document.body);
	}
	return modalContent;
};
