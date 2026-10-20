import type React from "react";
import { FiscalActTab } from "./FiscalActTab.js";
import type { FiscalBodyTabsProps } from "./FiscalBodyTabs.js";
import { FiscalCertificateTab } from "./FiscalCertificateTab.js";
import { FiscalCorrectionTab } from "./FiscalCorrectionTab.js";
import { FiscalOneCTab } from "./FiscalOneCTab.js";
import { FiscalPreviewTab } from "./FiscalPreviewTab.js";

/**
 * Auxiliary tabs renderer for FiscalReceiptModal (1C, Act, Certificate, Preview, Correction).
 * Mandate 8b: <= 120 lines.
 */
export const FiscalAuxTabs: React.FC<FiscalBodyTabsProps> = ({
	logic,
	props,
	patientName,
}) => {
	const { itemsHook, tenderHook, auxHook } = logic;

	if (logic.activeTab === "correction") {
		return (
			<FiscalCorrectionTab
				correctionType={auxHook.correctionType}
				setCorrectionType={auxHook.setCorrectionType}
				correctionDocDate={auxHook.correctionDocDate}
				setCorrectionDocDate={auxHook.setCorrectionDocDate}
				correctionDocNumber={auxHook.correctionDocNumber}
				setCorrectionDocNumber={auxHook.setCorrectionDocNumber}
				correctionReason={auxHook.correctionReason}
				setCorrectionReason={auxHook.setCorrectionReason}
				handleExecuteFiscalization={logic.handleExecuteFiscalization}
				isFiscalizing={logic.isFiscalizing}
				totalSumRub={itemsHook.totalSumRub}
			/>
		);
	}

	if (logic.activeTab === "oneC") {
		return (
			<FiscalOneCTab
				oneCDocType={auxHook.oneCDocType}
				setOneCDocType={auxHook.setOneCDocType}
				actNumber={auxHook.actNumber}
				setActNumber={auxHook.setActNumber}
				oneCDocDate={auxHook.oneCDocDate}
				setOneCDocDate={auxHook.setOneCDocDate}
				contractNumber={auxHook.contractNumber}
				setContractNumber={auxHook.setContractNumber}
				oneCClinicInn={auxHook.oneCClinicInn}
				setOneCClinicInn={auxHook.setOneCClinicInn}
				oneCClinicKpp={auxHook.oneCClinicKpp}
				setOneCClinicKpp={auxHook.setOneCClinicKpp}
				oneCPatientInn={auxHook.oneCPatientInn}
				setOneCPatientInn={auxHook.setOneCPatientInn}
				oneCPatientAddress={auxHook.oneCPatientAddress}
				setOneCPatientAddress={auxHook.setOneCPatientAddress}
				cashierFullName={props.cashierFullName || "Кассир"}
				activeItems={itemsHook.activeItems}
				totalSumRub={itemsHook.totalSumRub}
				totalKopecks={itemsHook.totalKopecks}
				oneCXmlPreview={auxHook.oneCXmlPreview}
			/>
		);
	}

	if (logic.activeTab === "act") {
		return (
			<FiscalActTab
				actNumber={auxHook.actNumber}
				setActNumber={auxHook.setActNumber}
				contractNumber={auxHook.contractNumber}
				setContractNumber={auxHook.setContractNumber}
				cashierFullName={props.cashierFullName || "Кассир"}
				clinicName={props.clinicName || "ООО «ДЕНТЕ СТОМАТОЛОГИЯ»"}
				patientName={patientName}
				customerContact={
					tenderHook.customerContact.trim() || props.patientPhone || patientName
				}
				activeItems={itemsHook.activeItems}
				totalSumRub={itemsHook.totalSumRub}
				handleCopyActData={auxHook.handleCopyActData}
				handlePrintAct={auxHook.handlePrintAct}
			/>
		);
	}

	if (logic.activeTab === "certificate") {
		return (
			<FiscalCertificateTab
				taxDeductionBreakdown={auxHook.taxDeductionBreakdown}
				payerFullName={auxHook.payerFullName}
				setPayerFullName={auxHook.setPayerFullName}
				payerInn={auxHook.payerInn}
				setPayerInn={auxHook.setPayerInn}
				payerRelationship={auxHook.payerRelationship}
				setPayerRelationship={auxHook.setPayerRelationship}
				taxYear={auxHook.taxYear}
				setTaxYear={auxHook.setTaxYear}
				handleCopyCertData={auxHook.handleCopyCertData}
				handlePrintCertificate={auxHook.handlePrintTaxCertificate}
			/>
		);
	}

	if (logic.activeTab === "preview") {
		return <FiscalPreviewTab fiscalReceipt={auxHook.fiscalReceipt} />;
	}

	return null;
};
