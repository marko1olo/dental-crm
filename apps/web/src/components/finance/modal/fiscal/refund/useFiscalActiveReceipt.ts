import { useMemo } from "react";
import {
	generateFiscalCorrectionReceipt54Fz,
	generateFiscalReceipt54Fz,
	generateFiscalRefundReceipt54Fz,
	type FiscalReceipt54Fz,
} from "../../../fiscalReceiptEngine";
import type { UseFiscalActiveReceiptParams } from "./useFiscalActiveReceiptTypes";

export type { UseFiscalActiveReceiptParams } from "./useFiscalActiveReceiptTypes";

export function useFiscalActiveReceipt({
	activeTab,
	activeItems,
	refundActiveItems,
	splitInput,
	patientId = "00000000-0000-0000-0000-000000000001",
	patientName = "Пациент",
	patientPhone = "+7 (___) ___-__-__",
	cashierFullName = "Кассир-администратор",
	clinicName = "ООО «ДЕНТЕ СТОМАТОЛОГИЯ»",
	customerContact,
	payerType,
	buyerLegalName,
	buyerInn,
	originalReceiptNumberForRefund,
	refundReason,
	correctionType,
	correctionDocDate,
	correctionDocNumber,
	correctionReason,
	taxYear,
}: UseFiscalActiveReceiptParams): FiscalReceipt54Fz {
	return useMemo(() => {
		const contact = customerContact.trim() || patientPhone;
		if (activeTab === "refund") {
			return generateFiscalRefundReceipt54Fz({
				items: refundActiveItems,
				originalReceipt: {
					receiptNumber: originalReceiptNumberForRefund || `CHK-${taxYear}-0001`,
					patientId,
					patientName,
					customerContact: contact,
					cashierFullName,
					clinicLegalName: clinicName,
				},
				refundReason,
				cashierFullName,
			});
		}

		if (activeTab === "correction") {
			return generateFiscalCorrectionReceipt54Fz({
				items: activeItems,
				splitPayment: splitInput,
				correctionType,
				correctionDocDate,
				correctionDocNumber,
				correctionReason,
				patientId,
				patientName,
				customerContact: contact,
				cashierFullName,
				clinicLegalName: clinicName,
			});
		}

		return generateFiscalReceipt54Fz({
			items: activeItems,
			splitPayment: splitInput,
			patientId,
			patientName,
			customerContact: contact,
			cashierFullName,
			clinicLegalName: clinicName,
			payerType,
			buyerInn: payerType === "legal_entity" ? buyerInn : undefined,
			buyerName: payerType === "legal_entity" ? buyerLegalName : undefined,
		});
	}, [
		activeTab,
		activeItems,
		refundActiveItems,
		originalReceiptNumberForRefund,
		refundReason,
		correctionType,
		correctionDocDate,
		correctionDocNumber,
		correctionReason,
		splitInput,
		patientId,
		patientName,
		customerContact,
		patientPhone,
		cashierFullName,
		clinicName,
		taxYear,
		payerType,
		buyerInn,
		buyerLegalName,
	]);
}
