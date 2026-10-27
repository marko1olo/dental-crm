import { useMemo } from "react";
import type { TreatmentPlanItem } from "../../../treatment-plans/types";
import {
	generateFiscalCorrectionReceipt54Fz,
	generateFiscalReceipt54Fz,
	generateFiscalRefundReceipt54Fz,
	type SplitPaymentInput,
} from "../../fiscalReceiptEngine";
import type { FiscalModalTab } from "./fiscalModalTypes";

export interface UseFiscalReceiptStateParams {
	readonly activeTab: FiscalModalTab;
	readonly activeItems: readonly TreatmentPlanItem[];
	readonly refundActiveItems: readonly TreatmentPlanItem[];
	readonly splitInput: SplitPaymentInput;
	readonly originalReceiptNumberForRefund: string;
	readonly refundReason: string;
	readonly correctionType: "self_initiated" | "by_instruction";
	readonly correctionDocDate: string;
	readonly correctionDocNumber: string;
	readonly correctionReason: string;
	readonly patientId: string;
	readonly patientName: string;
	readonly patientPhone: string;
	readonly customerContact: string;
	readonly cashierFullName: string;
	readonly clinicName: string;
	readonly taxYear: number;
	readonly payerType: "individual" | "legal_entity";
	readonly buyerInn: string;
	readonly buyerLegalName: string;
}

export function useFiscalReceiptState(p: UseFiscalReceiptStateParams) {
	return useMemo(() => {
		if (p.activeTab === "refund") {
			return generateFiscalRefundReceipt54Fz({
				items: p.refundActiveItems,
				originalReceipt: {
					receiptNumber: p.originalReceiptNumberForRefund || `CHK-${p.taxYear}-0001`,
					patientId: p.patientId,
					patientName: p.patientName,
					customerContact: p.customerContact.trim() || p.patientPhone,
					cashierFullName: p.cashierFullName,
					clinicLegalName: p.clinicName,
				},
				refundReason: p.refundReason,
				cashierFullName: p.cashierFullName,
			});
		}

		if (p.activeTab === "correction") {
			return generateFiscalCorrectionReceipt54Fz({
				items: p.activeItems,
				splitPayment: p.splitInput,
				correctionType: p.correctionType,
				correctionDocDate: p.correctionDocDate,
				correctionDocNumber: p.correctionDocNumber,
				correctionReason: p.correctionReason,
				patientId: p.patientId,
				patientName: p.patientName,
				customerContact: p.customerContact.trim() || p.patientPhone,
				cashierFullName: p.cashierFullName,
				clinicLegalName: p.clinicName,
			});
		}

		return generateFiscalReceipt54Fz({
			items: p.activeItems,
			splitPayment: p.splitInput,
			patientId: p.patientId,
			patientName: p.patientName,
			customerContact: p.customerContact.trim() || p.patientPhone,
			cashierFullName: p.cashierFullName,
			clinicLegalName: p.clinicName,
			payerType: p.payerType,
			buyerInn: p.payerType === "legal_entity" ? p.buyerInn : undefined,
			buyerName: p.payerType === "legal_entity" ? p.buyerLegalName : undefined,
		});
	}, [
		p.activeTab,
		p.activeItems,
		p.refundActiveItems,
		p.originalReceiptNumberForRefund,
		p.refundReason,
		p.correctionType,
		p.correctionDocDate,
		p.correctionDocNumber,
		p.correctionReason,
		p.splitInput,
		p.patientId,
		p.patientName,
		p.customerContact,
		p.patientPhone,
		p.cashierFullName,
		p.clinicName,
		p.taxYear,
		p.payerType,
		p.buyerInn,
		p.buyerLegalName,
	]);
}
