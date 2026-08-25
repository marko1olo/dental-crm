/**
 * DENTE Dental CRM — 1-Click Fast Checkout Math & 54-FZ FFD 1.2 Payload Engine
 */

export {
	CHECKOUT_PAYMENT_METHODS,
	type CheckoutPaymentMethodType,
	type CheckoutPaymentMethodInfo,
} from "./fastCheckoutPresets";

import { type CheckoutPaymentMethodType } from "./fastCheckoutPresets";

export interface CheckoutSplitItem {
	readonly method: CheckoutPaymentMethodType;
	readonly amountKop: number;
}

export interface FastCheckoutInput {
	readonly orderId: string;
	readonly totalBillKop: number;
	readonly payments: readonly CheckoutSplitItem[];
	readonly cashTenderedKop?: number | undefined;
	readonly patientEmail?: string | undefined;
	readonly patientPhone?: string | undefined;
	readonly taxSystem?: "usn_income_outcome" | "patent" | "osno" | undefined;
}

export interface TreatmentPlanStageOption {
	readonly id: string;
	readonly titleRu: string;
	readonly stageKind: string;
	readonly amountKop: number;
	readonly itemsCount: number;
}

export const DEFAULT_TREATMENT_STAGES: readonly TreatmentPlanStageOption[] = [
	{
		id: "full_plan",
		titleRu: "Весь план лечения (100%)",
		stageKind: "full",
		amountKop: 9400000,
		itemsCount: 3,
	},
	{
		id: "stage_1_therapy",
		titleRu: "Этап 1: Терапия (санация)",
		stageKind: "stage_1_therapy",
		amountKop: 400000,
		itemsCount: 1,
	},
	{
		id: "stage_2_surgery",
		titleRu: "Этап 2: Хирургия (имплантация)",
		stageKind: "stage_2_surgery",
		amountKop: 4500000,
		itemsCount: 1,
	},
	{
		id: "stage_3_orthopedics",
		titleRu: "Этап 3: Ортопедия (протезирование)",
		stageKind: "stage_3_orthopedics",
		amountKop: 4500000,
		itemsCount: 1,
	},
];

export type StagePaymentMode =
	| "full"
	| "advance_30"
	| "advance_50"
	| "advance_offset_tag1215";

export interface StageAdvanceCalculation {
	readonly mode: StagePaymentMode;
	readonly totalStageAmountKop: number;
	readonly requiredAmountKop: number;
	readonly advanceOffsetTag1215Kop: number;
	readonly remainingDueKop: number;
	readonly ffdTag1214: number; // Признак способа расчета (1 = предоплата 100%, 2 = частичная предоплата, 3 = аванс, 4 = полный расчет с зачетом аванса)
	readonly ffdTag1214NameRu: string;
	readonly ffdTag1212: number; // Признак предмета расчета (4 = услуга, 10 = платеж/аванс)
	readonly ffdTag1212NameRu: string;
	readonly isAdvanceReceipt: boolean;
	readonly isAdvanceOffsetReceipt: boolean;
}

export function calculateStageAdvanceAmount(
	stageAmountKop: number,
	mode: StagePaymentMode = "full",
	advanceAlreadyPaidKop = 0,
): StageAdvanceCalculation {
	const sanitizedStageKop = Math.max(0, stageAmountKop);
	const sanitizedPrevPaidKop = Math.max(0, advanceAlreadyPaidKop);

	switch (mode) {
		case "advance_30": {
			const requiredAmountKop = Math.round(sanitizedStageKop * 0.30);
			return {
				mode: "advance_30",
				totalStageAmountKop: sanitizedStageKop,
				requiredAmountKop,
				advanceOffsetTag1215Kop: 0,
				remainingDueKop: Math.max(0, sanitizedStageKop - requiredAmountKop),
				ffdTag1214: 2, // Частичная предоплата
				ffdTag1214NameRu: "Частичная предоплата (30%)",
				ffdTag1212: 4, // Услуга
				ffdTag1212NameRu: "Медицинская услуга (этап лечения)",
				isAdvanceReceipt: true,
				isAdvanceOffsetReceipt: false,
			};
		}
		case "advance_50": {
			const requiredAmountKop = Math.round(sanitizedStageKop * 0.50);
			return {
				mode: "advance_50",
				totalStageAmountKop: sanitizedStageKop,
				requiredAmountKop,
				advanceOffsetTag1215Kop: 0,
				remainingDueKop: Math.max(0, sanitizedStageKop - requiredAmountKop),
				ffdTag1214: 2, // Частичная предоплата
				ffdTag1214NameRu: "Частичная предоплата (50%)",
				ffdTag1212: 4,
				ffdTag1212NameRu: "Медицинская услуга (этап лечения)",
				isAdvanceReceipt: true,
				isAdvanceOffsetReceipt: false,
			};
		}
		case "advance_offset_tag1215": {
			const advanceOffsetTag1215Kop = Math.min(sanitizedPrevPaidKop, sanitizedStageKop);
			const requiredAmountKop = Math.max(0, sanitizedStageKop - advanceOffsetTag1215Kop);
			return {
				mode: "advance_offset_tag1215",
				totalStageAmountKop: sanitizedStageKop,
				requiredAmountKop,
				advanceOffsetTag1215Kop,
				remainingDueKop: 0,
				ffdTag1214: 4, // Полный расчет с зачетом аванса
				ffdTag1214NameRu: "Полный расчет с зачетом ранее внесенного аванса (Тег 1215)",
				ffdTag1212: 4,
				ffdTag1212NameRu: "Медицинская услуга (этап лечения)",
				isAdvanceReceipt: false,
				isAdvanceOffsetReceipt: true,
			};
		}
		case "full":
		default: {
			return {
				mode: "full",
				totalStageAmountKop: sanitizedStageKop,
				requiredAmountKop: sanitizedStageKop,
				advanceOffsetTag1215Kop: 0,
				remainingDueKop: 0,
				ffdTag1214: 4, // Полный расчет
				ffdTag1214NameRu: "Полный расчет (100%)",
				ffdTag1212: 4,
				ffdTag1212NameRu: "Медицинская услуга",
				isAdvanceReceipt: false,
				isAdvanceOffsetReceipt: false,
			};
		}
	}
}

export interface FastCheckoutValidationResult {
	readonly isValid: boolean;
	readonly totalPaidKop: number;
	readonly totalBillKop: number;
	readonly remainingDueKop: number;
	readonly cashChangeDueKop: number;
	readonly errorMessageRu?: string | undefined;
}

export interface Ffd12FiscalPayload {
	readonly ffdVersion: "1.2";
	readonly orderId: string;
	readonly totalSumKop: number;
	readonly paymentMethodTag1214: number; // Тег 1214 (Признак способа расчета)
	readonly paymentSubjectTag1212: number; // Тег 1212 (Признак предмета расчета)
	readonly paymentsDistribution: {
		readonly cashKop: number; // Тег 1031
		readonly electronicKop: number; // Тег 1081
		readonly advancePrepaymentKop: number; // Тег 1215 (Зачет аванса / предоплаты)
		readonly creditKop: number; // Тег 1216
		readonly barterOtherKop: number; // Тег 1217
	};
	readonly clientContact?: string | undefined;
	readonly taxSystem: string;
	readonly calculationType: 1;
}

export function validateCheckoutSplit(input: FastCheckoutInput): FastCheckoutValidationResult {
	let totalPaid = 0;
	let cashAmount = 0;

	for (const p of input.payments) {
		totalPaid += p.amountKop;
		if (p.method === "cash") {
			cashAmount += p.amountKop;
		}
	}

	const remaining = input.totalBillKop - totalPaid;
	let cashChange = 0;

	if (cashAmount > 0 && input.cashTenderedKop !== undefined && input.cashTenderedKop > cashAmount) {
		cashChange = input.cashTenderedKop - cashAmount;
	}

	if (remaining > 0) {
		return {
			isValid: false,
			totalPaidKop: totalPaid,
			totalBillKop: input.totalBillKop,
			remainingDueKop: remaining,
			cashChangeDueKop: 0,
			errorMessageRu: "Недоплата: " + (remaining / 100).toFixed(2) + " ₽",
		};
	}

	if (remaining < 0) {
		return {
			isValid: false,
			totalPaidKop: totalPaid,
			totalBillKop: input.totalBillKop,
			remainingDueKop: remaining,
			cashChangeDueKop: 0,
			errorMessageRu: "Переплата по безналу/сертификатам: " + (Math.abs(remaining) / 100).toFixed(2) + " ₽",
		};
	}

	return {
		isValid: true,
		totalPaidKop: totalPaid,
		totalBillKop: input.totalBillKop,
		remainingDueKop: 0,
		cashChangeDueKop: cashChange,
	};
}

export function generate54FzFiscalPayload(
	input: FastCheckoutInput,
	options?: {
		paymentMethodTag1214?: number | undefined;
		paymentSubjectTag1212?: number | undefined;
	},
): Ffd12FiscalPayload {
	let cashKop = 0;
	let electronicKop = 0;
	let advancePrepaymentKop = 0;
	let creditKop = 0;
	let barterOtherKop = 0;

	for (const p of input.payments) {
		switch (p.method) {
			case "cash":
				cashKop += p.amountKop;
				break;
			case "bank_card":
			case "sbp_qr":
				electronicKop += p.amountKop;
				break;
			case "patient_deposit":
				advancePrepaymentKop += p.amountKop;
				break;
			case "dms_insurance":
				creditKop += p.amountKop;
				break;
			case "loyalty_points":
				barterOtherKop += p.amountKop;
				break;
		}
	}

	const contact = input.patientPhone || input.patientEmail || undefined;

	return {
		ffdVersion: "1.2",
		orderId: input.orderId,
		totalSumKop: input.totalBillKop,
		paymentMethodTag1214: options?.paymentMethodTag1214 ?? (advancePrepaymentKop > 0 ? 4 : 4),
		paymentSubjectTag1212: options?.paymentSubjectTag1212 ?? 4,
		paymentsDistribution: {
			cashKop,
			electronicKop,
			advancePrepaymentKop,
			creditKop,
			barterOtherKop,
		},
		clientContact: contact,
		taxSystem: input.taxSystem || "usn_income_outcome",
		calculationType: 1,
	};
}
