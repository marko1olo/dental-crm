import type { OneCDocumentType } from "@dental/shared";
import type React from "react";
import { showToast } from "../../../GlobalToast.js";
import type { OneCExportItem } from "../../OneCExportButton.js";
import type { FiscalReceipt54FzResult } from "../../fiscalReceiptEngine.js";
import { FiscalFooterAuxActions } from "./FiscalFooterAuxActions.js";
import { FiscalFooterPaymentActions } from "./FiscalFooterPaymentActions.js";
import type { FiscalModalTab } from "./fiscalModalTypes.js";

export interface FiscalReceiptFooterProps {
	activeTab: FiscalModalTab;
	totalSumRub: number;
	remainingRub: number;
	allocation: { isFullyAllocated: boolean };
	isFiscalizing: boolean;
	onClose: () => void;
	handlePrintSalesSlip: () => void;
	handleExecuteFiscalization: () => void;
	oneCXmlPreview: string;
	showToast?: (
		msg: string,
		type: "success" | "error" | "info",
		duration?: number,
	) => void;
	oneCDocType: OneCDocumentType;
	actNumber: string;
	oneCDocDate: string;
	clinicName: string;
	oneCClinicInn: string;
	oneCClinicKpp: string;
	patientName: string;
	contractNumber: string;
	activeItems: readonly OneCExportItem[];
	patientId?: string | undefined;
	customerContact?: string | undefined;
	patientPhone?: string | undefined;
	oneCPatientAddress: string;
	cashierFullName: string;
	handleCopyActData: () => void;
	handleCopyCertData?: (() => void) | undefined;
	refundFiscalData: { totalRub: number };
	fiscalReceipt: FiscalReceipt54FzResult;
	handlePrintAct?: () => void;
	handlePrintCertificate?: () => void;
}

/**
 * Footer orchestrator for FiscalReceiptModal.
 * Mandate 8b: <= 120 lines.
 */
export const FiscalReceiptFooter: React.FC<FiscalReceiptFooterProps> = (
	props,
) => {
	const notify = props.showToast || showToast;

	return (
		<div className="shrink-0 border-t border-[var(--line)] bg-[var(--paper-soft,#f8fafc)] px-4 sm:px-6 py-3 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
			{props.activeTab === "payment" ? (
				<FiscalFooterPaymentActions {...props} />
			) : (
				<FiscalFooterAuxActions {...props} notify={notify} />
			)}
		</div>
	);
};
