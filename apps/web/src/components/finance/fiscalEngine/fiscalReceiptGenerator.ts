import {
	type Ffd12CorrectionType,
	type Ffd12OperationType,
	type Ffd12TaxationSystem,
	computeFpd54Fz,
	kopecksToNumericString,
} from "@dental/shared";
import type { TreatmentPlanItem } from "../../treatment-plans/types";
import {
	FFD12_CORRECTION_LABELS,
	FFD12_OPERATION_LABELS,
	type FiscalReceiptResult,
	type Order804nFiscalReceiptItem,
	type SplitPaymentInput,
} from "./types";
import { calculateSplitPaymentAllocation, calculateTaxDeductionBreakdown, generateSbpPaymentQr } from "./taxAndMathHelpers";
import { mapTreatmentItemsToFiscalReceipt } from "./receiptItemMapper";

export interface GenerateFiscalReceiptParams {
	readonly items: readonly (TreatmentPlanItem | Order804nFiscalReceiptItem)[];
	readonly splitPayment: SplitPaymentInput;
	readonly patientId: string;
	readonly patientName: string;
	readonly customerContact: string;
	readonly cashierFullName?: string | undefined;
	readonly cashierInn?: string | undefined;
	readonly clinicLegalName?: string | undefined;
	readonly clinicInn?: string | undefined;
	readonly clinicAddress?: string | undefined;
	readonly taxationSystem?: Ffd12TaxationSystem | undefined;
	readonly customReceiptNumber?: string | undefined;
	readonly shiftNumber?: number | undefined;
	readonly operationType?: Ffd12OperationType | undefined;
	readonly isCorrection?: boolean | undefined;
	readonly correctionType?: Ffd12CorrectionType | undefined;
	readonly correctionDocDate?: string | undefined;
	readonly correctionDocNumber?: string | undefined;
	readonly correctionReason?: string | undefined;
	readonly originalReceiptNumber?: string | undefined;
	readonly originalFiscalDocumentNumber?: string | undefined;
	readonly originalFiscalSign?: string | undefined;
	readonly refundReason?: string | undefined;
	readonly payerType?: "individual" | "legal_entity" | undefined;
	readonly buyerInn?: string | undefined;
	readonly buyerName?: string | undefined;
}

const TAXATION_NAMES: Record<Ffd12TaxationSystem, string> = {
	osn: "ОСН", usn_income: "УСН Доходы", usn_income_expense: "УСН Доходы-Расходы", esxn: "ЕСХН", psn: "ПСН",
};

export function generateFiscalReceipt(params: GenerateFiscalReceiptParams): FiscalReceiptResult {
	const {
		items, splitPayment, patientId, patientName, customerContact,
		cashierFullName = "Кассир-администратор", cashierInn, clinicLegalName = "ООО «ДЕНТЕ СТОМАТОЛОГИЯ»",
		clinicInn = "7707083893", clinicAddress = "г. Москва, ул. Профсоюзная, д. 42", taxationSystem = "usn_income",
		customReceiptNumber, shiftNumber = 42, operationType = "income", isCorrection = false,
		correctionType, correctionDocDate, correctionDocNumber, correctionReason, originalReceiptNumber,
		originalFiscalDocumentNumber, originalFiscalSign, refundReason, payerType = "individual", buyerInn, buyerName,
	} = params;

	const fiscalData = mapTreatmentItemsToFiscalReceipt(items);
	const payments = calculateSplitPaymentAllocation(fiscalData.totalKopecks, splitPayment);
	const now = new Date();
	const isWarrantyZeroAct = payments.totalKopecks === 0;
	const prefix = isWarrantyZeroAct ? "АКТ-ГАР" : operationType === "income_return" ? "CHK-RET" : isCorrection ? "CHK-COR" : "CHK";
	const receiptNumber = customReceiptNumber || `${prefix}-${now.getFullYear()}-0001`;
	const fnSerial = isWarrantyZeroAct ? "0000000000000000" : "9960440301234567";
	const fiscalDocumentNumber = isWarrantyZeroAct ? "0" : "1001";
	const fiscalSign = isWarrantyZeroAct ? "0000000000" : computeFpd54Fz({ fnSerial, fiscalDocumentNumber, issuedAt: now, totalKopecks: payments.totalKopecks, operationType });
	const ofdUrl = isWarrantyZeroAct ? "" : `https://ofd.ru/check?fn=${fnSerial}&fd=${fiscalDocumentNumber}&fpd=${fiscalSign}&s=${kopecksToNumericString(payments.totalKopecks)}&n=${operationType === "income_return" ? "2" : "1"}`;

	let sbpPayloadUrl: string | undefined;
	let sbpCrc16: string | undefined;
	if (payments.sbpKopecks > 0 && operationType === "income") {
		const sbp = generateSbpPaymentQr({ amountKopecks: payments.sbpKopecks, orderNumber: receiptNumber });
		sbpPayloadUrl = sbp.payloadUrl;
		sbpCrc16 = sbp.crc16;
	}

	return {
		receiptNumber, receiptDateIso: now.toISOString(),
		receiptDateRu: now.toLocaleString("ru-RU", { year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit" }),
		fnSerial, fiscalDocumentNumber, fiscalSign, shiftNumber, cashierFullName, ...(cashierInn ? { cashierInn } : {}),
		clinicLegalName, clinicInn, clinicAddress, taxationSystem, taxationSystemName: TAXATION_NAMES[taxationSystem] || "УСН Доходы",
		customerContact, patientName, patientId, items: fiscalData.items, payments, totalRub: payments.totalRub, totalKopecks: payments.totalKopecks,
		grossRub: fiscalData.grossRub, grossKopecks: fiscalData.grossKopecks, taxRateKopecks: fiscalData.taxRateKopecks, vat20Kopecks: fiscalData.vat20Kopecks,
		vat20Rub: fiscalData.vat20Rub, vatNoneKopecks: fiscalData.vatNoneKopecks, vatNoneRub: fiscalData.vatNoneRub, hasMixedItems: fiscalData.hasMixedItems,
		retailTotalKopecks: fiscalData.retailTotalKopecks, medicalTotalKopecks: fiscalData.medicalTotalKopecks, insuranceCoveredRub: payments.insuranceRub,
		...(splitPayment.guaranteeLetterNumber ? { guaranteeLetterNumber: splitPayment.guaranteeLetterNumber } : {}),
		patientCoPayRub: payments.patientCoPayRub, taxDeductionCategory: fiscalData.taxDeductionSummaryCode,
		taxDeductionBreakdown: calculateTaxDeductionBreakdown(fiscalData.items), ofdUrl,
		...(sbpPayloadUrl ? { sbpPayloadUrl } : {}), ...(sbpCrc16 ? { sbpCrc16 } : {}),
		operationType, operationTypeName: FFD12_OPERATION_LABELS[operationType] || "Приход",
		...(isCorrection ? { isCorrection: true } : {}), ...(correctionType ? { correctionType, correctionTypeName: FFD12_CORRECTION_LABELS[correctionType] } : {}),
		...(correctionDocDate ? { correctionDocDate } : {}), ...(correctionDocNumber ? { correctionDocNumber } : {}),
		...(correctionReason ? { correctionReason } : {}), ...(originalReceiptNumber ? { originalReceiptNumber } : {}),
		...(originalFiscalDocumentNumber ? { originalFiscalDocumentNumber } : {}), ...(originalFiscalSign ? { originalFiscalSign } : {}),
		...(refundReason ? { refundReason } : {}), payerType, ...(buyerInn?.trim() ? { buyerInn: buyerInn.trim() } : {}),
		...(buyerName?.trim() ? { buyerName: buyerName.trim() } : {}), ...(isWarrantyZeroAct ? { isWarrantyZeroAct: true } : {}),
	};
}

export const generateFiscalReceipt54Fz = generateFiscalReceipt;
