/**
 * refundAndCorrectionEngine.ts — Layer 2: Расчет пропорционального распределения возврата при смешанной оплате
 * (Hamilton / Largest Remainder) и генерация фискальных чеков возврата прихода (Тег 1054) и коррекции (Тег 1173).
 */

import {
	calculateProportionalMultiTenderRefund,
	type Ffd12CorrectionType,
	type Ffd12OperationType,
	type Ffd12TaxationSystem,
	type Kopecks,
} from "@dental/shared";
import type { TreatmentPlanItem } from "../../treatment-plans/types";
import type {
	FiscalReceipt54FzResult,
	SplitPaymentAllocation,
	SplitPaymentInput,
} from "./types";
import {
	generateFiscalReceipt54Fz,
	mapTreatmentItemsToFiscalReceipt,
} from "./receiptBuilders";

/**
 * Пропорциональный расчет возврата средств по способам оплаты с гарантией нулевой потери копеек (Hamilton / Largest Remainder).
 */
export function calculateProportionalRefundAllocation(
	originalPayments: SplitPaymentAllocation,
	refundTotalKopecks: Kopecks,
): SplitPaymentAllocation {
	const refundCalc = calculateProportionalMultiTenderRefund(
		{
			cashKopecks: originalPayments.cashKopecks,
			cardKopecks: originalPayments.cardKopecks,
			sbpKopecks: originalPayments.sbpKopecks,
			advanceOffsetKopecks: originalPayments.advanceOffsetKopecks,
			totalPaidKopecks: originalPayments.allocatedKopecks,
		},
		refundTotalKopecks,
	);

	return {
		cashRub: refundCalc.refundCashRub,
		cashKopecks: refundCalc.refundCashKopecks as Kopecks,
		receivedCashRub: refundCalc.refundCashRub,
		receivedCashKopecks: refundCalc.refundCashKopecks as Kopecks,
		changeRub: 0,
		changeKopecks: 0 as Kopecks,
		isCashShortage: false,
		cashShortageRub: 0,
		cardRub: refundCalc.refundCardRub,
		cardKopecks: refundCalc.refundCardKopecks as Kopecks,
		sbpRub: refundCalc.refundSbpRub,
		sbpKopecks: refundCalc.refundSbpKopecks as Kopecks,
		depositRub: refundCalc.refundAdvanceOffsetRub,
		depositKopecks: refundCalc.refundAdvanceOffsetKopecks as Kopecks,
		advanceOffsetRub: refundCalc.refundAdvanceOffsetRub,
		advanceOffsetKopecks: refundCalc.refundAdvanceOffsetKopecks as Kopecks,
		familyWalletRub: 0,
		familyWalletKopecks: 0 as Kopecks,
		certificateRub: 0,
		certificateKopecks: 0 as Kopecks,
		insuranceRub: 0,
		insuranceKopecks: 0 as Kopecks,
		patientCoPayRub: refundCalc.totalRefundRub,
		patientCoPayKopecks: refundCalc.totalRefundKopecks as Kopecks,
		totalRub: refundCalc.totalRefundRub,
		totalKopecks: refundCalc.totalRefundKopecks as Kopecks,
		allocatedKopecks: refundCalc.totalRefundKopecks as Kopecks,
		remainingKopecks: 0 as Kopecks,
		isFullyAllocated: true,
		isOverallocated: false,
	};
}

/**
 * Генерация фискального кассового чека возврата прихода (54-ФЗ / ФФД 1.2 Тег 1054 = 2)
 * при отказе от части или всех услуг плана лечения с сохранением копеечной точности.
 */
export function generateFiscalRefundReceipt54Fz(params: {
	readonly items: readonly TreatmentPlanItem[];
	readonly originalReceipt: {
		readonly receiptNumber: string;
		readonly fiscalDocumentNumber?: string | undefined;
		readonly fiscalSign?: string | undefined;
		readonly payments?: SplitPaymentAllocation | undefined;
		readonly patientId?: string | undefined;
		readonly patientName?: string | undefined;
		readonly customerContact?: string | undefined;
		readonly cashierFullName?: string | undefined;
		readonly clinicLegalName?: string | undefined;
		readonly clinicInn?: string | undefined;
		readonly clinicAddress?: string | undefined;
		readonly taxationSystem?: Ffd12TaxationSystem | undefined;
	};
	readonly refundReason: string;
	readonly splitRefund?: SplitPaymentInput | undefined;
	readonly customReceiptNumber?: string | undefined;
	readonly cashierFullName?: string | undefined;
}): FiscalReceipt54FzResult {
	const {
		items,
		originalReceipt,
		refundReason,
		splitRefund,
		customReceiptNumber,
		cashierFullName = originalReceipt.cashierFullName || "Кассир-администратор",
	} = params;

	const fiscalItemsData = mapTreatmentItemsToFiscalReceipt(items);

	// Если splitRefund не передан явно, рассчитываем пропорционально способам оплаты исходного чека
	let splitPaymentInput: SplitPaymentInput;
	if (splitRefund) {
		splitPaymentInput = splitRefund;
	} else if (originalReceipt.payments) {
		const propAlloc = calculateProportionalRefundAllocation(
			originalReceipt.payments,
			fiscalItemsData.totalKopecks,
		);
		splitPaymentInput = {
			cashRub: propAlloc.cashRub,
			cardRub: propAlloc.cardRub,
			sbpRub: propAlloc.sbpRub,
			depositRub: propAlloc.depositRub,
		};
	} else {
		// По умолчанию возвращаем на банковскую карту
		splitPaymentInput = { cardRub: fiscalItemsData.totalRub };
	}

	return generateFiscalReceipt54Fz({
		items,
		splitPayment: splitPaymentInput,
		patientId: originalReceipt.patientId || "unknown-patient",
		patientName: originalReceipt.patientName || "Пациент",
		customerContact: originalReceipt.customerContact || "+7 000 000-00-00",
		cashierFullName,
		clinicLegalName: originalReceipt.clinicLegalName,
		clinicInn: originalReceipt.clinicInn,
		clinicAddress: originalReceipt.clinicAddress,
		taxationSystem: originalReceipt.taxationSystem || "usn_income",
		customReceiptNumber,
		operationType: "income_return",
		originalReceiptNumber: originalReceipt.receiptNumber,
		originalFiscalDocumentNumber: originalReceipt.fiscalDocumentNumber,
		originalFiscalSign: originalReceipt.fiscalSign,
		refundReason,
	});
}

/**
 * Генерация фискального чека коррекции (54-ФЗ / ФФД 1.2 Теги 1173, 1178, 1179).
 */
export function generateFiscalCorrectionReceipt54Fz(params: {
	readonly items: readonly TreatmentPlanItem[];
	readonly splitPayment: SplitPaymentInput;
	readonly operationType?: Ffd12OperationType | undefined;
	readonly correctionType: Ffd12CorrectionType; // "self_initiated" | "by_instruction"
	readonly correctionDocDate: string; // YYYY-MM-DD
	readonly correctionDocNumber: string;
	readonly correctionReason: string;
	readonly patientId: string;
	readonly patientName: string;
	readonly customerContact: string;
	readonly cashierFullName?: string | undefined;
	readonly clinicLegalName?: string | undefined;
	readonly clinicInn?: string | undefined;
	readonly clinicAddress?: string | undefined;
	readonly taxationSystem?: Ffd12TaxationSystem | undefined;
	readonly customReceiptNumber?: string | undefined;
	readonly originalReceiptNumber?: string | undefined;
}): FiscalReceipt54FzResult {
	const {
		items,
		splitPayment,
		operationType = "income",
		correctionType,
		correctionDocDate,
		correctionDocNumber,
		correctionReason,
		patientId,
		patientName,
		customerContact,
		cashierFullName,
		clinicLegalName,
		clinicInn,
		clinicAddress,
		taxationSystem,
		customReceiptNumber,
		originalReceiptNumber,
	} = params;

	return generateFiscalReceipt54Fz({
		items,
		splitPayment,
		patientId,
		patientName,
		customerContact,
		cashierFullName,
		clinicLegalName,
		clinicInn,
		clinicAddress,
		taxationSystem,
		customReceiptNumber,
		operationType,
		isCorrection: true,
		correctionType,
		correctionDocDate,
		correctionDocNumber,
		correctionReason,
		originalReceiptNumber,
	});
}
