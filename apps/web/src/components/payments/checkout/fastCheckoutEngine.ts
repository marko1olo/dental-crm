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

export interface FastCheckoutSplitState {
	readonly cardRub: number;
	readonly cashRub: number;
	readonly sbpRub: number;
	readonly depositRub: number;
	readonly loyaltyRub: number;
	readonly dmsRub?: number | undefined;
}

export interface FastCheckoutInput {
	readonly orderId: string;
	readonly totalBillKop: number;
	readonly payments: readonly CheckoutSplitItem[];
	readonly cashTenderedKop?: number | undefined;
	readonly patientEmail?: string | undefined;
	readonly patientPhone?: string | undefined;
	readonly taxSystem?: "usn_income_outcome" | "patent" | "osno" | undefined;
	readonly idempotencyKey?: string | undefined;
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
	readonly idempotencyKey?: string | undefined;
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

/**
 * Converts rubles split state to strongly-typed kopeck payments list.
 */
export function splitStateToCheckoutPayments(
	split: Partial<FastCheckoutSplitState>,
): CheckoutSplitItem[] {
	const items: CheckoutSplitItem[] = [];
	const cardKop = Math.round(Math.max(0, split.cardRub ?? 0) * 100);
	const cashKop = Math.round(Math.max(0, split.cashRub ?? 0) * 100);
	const sbpKop = Math.round(Math.max(0, split.sbpRub ?? 0) * 100);
	const depositKop = Math.round(Math.max(0, split.depositRub ?? 0) * 100);
	const loyaltyKop = Math.round(Math.max(0, split.loyaltyRub ?? 0) * 100);
	const dmsKop = Math.round(Math.max(0, split.dmsRub ?? 0) * 100);

	if (cardKop > 0) items.push({ method: "bank_card", amountKop: cardKop });
	if (cashKop > 0) items.push({ method: "cash", amountKop: cashKop });
	if (sbpKop > 0) items.push({ method: "sbp_qr", amountKop: sbpKop });
	if (depositKop > 0) items.push({ method: "patient_deposit", amountKop: depositKop });
	if (loyaltyKop > 0) items.push({ method: "loyalty_points", amountKop: loyaltyKop });
	if (dmsKop > 0) items.push({ method: "dms_insurance", amountKop: dmsKop });

	return items;
}

/**
 * Converts payments list back to split state in rubles with 2-decimal rounding.
 */
export function paymentsToSplitState(
	payments: readonly CheckoutSplitItem[],
): FastCheckoutSplitState {
	let cardRub = 0;
	let cashRub = 0;
	let sbpRub = 0;
	let depositRub = 0;
	let loyaltyRub = 0;
	let dmsRub = 0;

	for (const p of payments) {
		const rub = p.amountKop / 100;
		switch (p.method) {
			case "bank_card":
				cardRub += rub;
				break;
			case "cash":
				cashRub += rub;
				break;
			case "sbp_qr":
				sbpRub += rub;
				break;
			case "patient_deposit":
				depositRub += rub;
				break;
			case "loyalty_points":
				loyaltyRub += rub;
				break;
			case "dms_insurance":
				dmsRub += rub;
				break;
		}
	}

	return {
		cardRub: +cardRub.toFixed(2),
		cashRub: +cashRub.toFixed(2),
		sbpRub: +sbpRub.toFixed(2),
		depositRub: +depositRub.toFixed(2),
		loyaltyRub: +loyaltyRub.toFixed(2),
		dmsRub: +dmsRub.toFixed(2),
	};
}

/**
 * Calculates remaining unallocated kopecks between total bill and current payments.
 */
export function calculateSplitRemainingKop(
	totalBillKop: number,
	payments: readonly CheckoutSplitItem[],
): number {
	const totalPaidKop = payments.reduce((acc, p) => acc + Math.max(0, p.amountKop), 0);
	return totalBillKop - totalPaidKop;
}

/**
 * 1-Click Remainder Balancer: allocates whatever is left directly to targetMethod.
 */
export function balanceRemainderToSplitMethod(params: {
	readonly totalBillKop: number;
	readonly currentPayments: readonly CheckoutSplitItem[];
	readonly targetMethod: CheckoutPaymentMethodType;
}): readonly CheckoutSplitItem[] {
	const sanitizedTotal = Math.max(0, params.totalBillKop);
	const otherPayments = params.currentPayments.filter((p) => p.method !== params.targetMethod);
	const otherSumKop = otherPayments.reduce((acc, p) => acc + Math.max(0, p.amountKop), 0);
	const remainingForTargetKop = Math.max(0, sanitizedTotal - otherSumKop);

	const result: CheckoutSplitItem[] = [...otherPayments];
	if (remainingForTargetKop > 0) {
		result.push({
			method: params.targetMethod,
			amountKop: remainingForTargetKop,
		});
	}
	return result;
}

export interface CashChangeCalculation {
	readonly cashTenderedKop: number;
	readonly cashRequiredKop: number;
	readonly changeDueKop: number;
	readonly isUnderpaid: boolean;
	readonly missingKop: number;
}

/**
 * Exact cash change calculation down to kopecks.
 */
export function calculateCashChangeKop(
	cashTenderedKop: number,
	cashRequiredKop: number,
): CashChangeCalculation {
	const sanitizedTendered = Math.max(0, cashTenderedKop);
	const sanitizedRequired = Math.max(0, cashRequiredKop);

	if (sanitizedRequired === 0) {
		return {
			cashTenderedKop: sanitizedTendered,
			cashRequiredKop: 0,
			changeDueKop: sanitizedTendered,
			isUnderpaid: false,
			missingKop: 0,
		};
	}

	if (sanitizedTendered >= sanitizedRequired) {
		return {
			cashTenderedKop: sanitizedTendered,
			cashRequiredKop: sanitizedRequired,
			changeDueKop: sanitizedTendered - sanitizedRequired,
			isUnderpaid: false,
			missingKop: 0,
		};
	}

	return {
		cashTenderedKop: sanitizedTendered,
		cashRequiredKop: sanitizedRequired,
		changeDueKop: 0,
		isUnderpaid: true,
		missingKop: sanitizedRequired - sanitizedTendered,
	};
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
		idempotencyKey?: string | undefined;
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
		idempotencyKey: options?.idempotencyKey ?? input.idempotencyKey ?? undefined,
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
