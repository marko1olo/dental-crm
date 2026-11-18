/**
 * fastCheckoutPresetEngine.ts — Layer 4: Fast POS Checkout Presets, Split Validation & Cash Change Math.
 *
 * Compliant with Mandate 8b and 54-FZ multi-tender split calculations.
 */

import { formatKopecksToRubles } from "@dental/shared";
import { rubToKopecks, kopecksToRub } from "./cashRegisterCatalogData.js";

export type CheckoutPaymentMethodType =
	| "sbp_qr"
	| "bank_card"
	| "cash"
	| "patient_deposit"
	| "dms_insurance"
	| "loyalty_points";

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

export type QuickCheckoutPresetType =
	| "100_card"
	| "100_cash"
	| "100_sbp"
	| "use_deposit"
	| "deposit_cash"
	| "deposit_sbp"
	| "split_50_50"
	| "split_three_way"
	| "warranty_100";

export interface QuickCheckoutPresetResult {
	readonly payments: readonly CheckoutSplitItem[];
	readonly cashTenderedKop: number;
	readonly activeMethod: CheckoutPaymentMethodType;
}

export type ClientLegalType = "physical_person" | "legal_entity" | "individual_entrepreneur";

export interface FastCheckoutInput {
	readonly orderId: string;
	readonly totalBillKop: number;
	readonly payments: readonly CheckoutSplitItem[];
	readonly cashTenderedKop?: number | undefined;
	readonly patientEmail?: string | undefined;
	readonly patientPhone?: string | undefined;
	readonly taxSystem?: "usn_income_outcome" | "patent" | "osno" | undefined;
	readonly idempotencyKey?: string | undefined;
	readonly clientType?: ClientLegalType | undefined;
	readonly buyerInn?: string | undefined;
	readonly buyerName?: string | undefined;
	readonly isElectronicReceiptOnly?: boolean | undefined;
}

export interface FastCheckoutValidationResult {
	readonly isValid: boolean;
	readonly totalPaidKop: number;
	readonly totalBillKop: number;
	readonly remainingDueKop: number;
	readonly cashChangeDueKop: number;
	readonly errorMessageRu?: string | undefined;
}

export function applyQuickCheckoutPreset(params: {
	readonly totalBillKop: number;
	readonly preset: QuickCheckoutPresetType;
	readonly availableDepositKop?: number | undefined;
}): QuickCheckoutPresetResult {
	const total = Math.max(0, params.totalBillKop);
	const dep = Math.max(0, params.availableDepositKop ?? 0);

	switch (params.preset) {
		case "100_card":
			return { payments: total > 0 ? [{ method: "bank_card", amountKop: total }] : [], cashTenderedKop: 0, activeMethod: "bank_card" };
		case "100_cash":
			return { payments: total > 0 ? [{ method: "cash", amountKop: total }] : [], cashTenderedKop: total, activeMethod: "cash" };
		case "100_sbp":
			return { payments: total > 0 ? [{ method: "sbp_qr", amountKop: total }] : [], cashTenderedKop: 0, activeMethod: "sbp_qr" };
		case "use_deposit": {
			if (dep >= total && total > 0) return { payments: [{ method: "patient_deposit", amountKop: total }], cashTenderedKop: 0, activeMethod: "patient_deposit" };
			if (dep > 0 && total > dep) return { payments: [{ method: "patient_deposit", amountKop: dep }, { method: "bank_card", amountKop: total - dep }], cashTenderedKop: 0, activeMethod: "patient_deposit" };
			return { payments: total > 0 ? [{ method: "bank_card", amountKop: total }] : [], cashTenderedKop: 0, activeMethod: "bank_card" };
		}
		case "deposit_cash": {
			if (dep >= total && total > 0) return { payments: [{ method: "patient_deposit", amountKop: total }], cashTenderedKop: 0, activeMethod: "patient_deposit" };
			if (dep > 0 && total > dep) {
				const rem = total - dep;
				return { payments: [{ method: "patient_deposit", amountKop: dep }, { method: "cash", amountKop: rem }], cashTenderedKop: rem, activeMethod: "cash" };
			}
			return { payments: total > 0 ? [{ method: "cash", amountKop: total }] : [], cashTenderedKop: total, activeMethod: "cash" };
		}
		case "deposit_sbp": {
			if (dep >= total && total > 0) return { payments: [{ method: "patient_deposit", amountKop: total }], cashTenderedKop: 0, activeMethod: "patient_deposit" };
			if (dep > 0 && total > dep) return { payments: [{ method: "patient_deposit", amountKop: dep }, { method: "sbp_qr", amountKop: total - dep }], cashTenderedKop: 0, activeMethod: "sbp_qr" };
			return { payments: total > 0 ? [{ method: "sbp_qr", amountKop: total }] : [], cashTenderedKop: 0, activeMethod: "sbp_qr" };
		}
		case "split_50_50": {
			const halfCardKop = Math.floor(total / 2);
			const halfCashKop = total - halfCardKop;
			const payments: CheckoutSplitItem[] = [];
			if (halfCardKop > 0) payments.push({ method: "bank_card", amountKop: halfCardKop });
			if (halfCashKop > 0) payments.push({ method: "cash", amountKop: halfCashKop });
			return { payments, cashTenderedKop: halfCashKop, activeMethod: "bank_card" };
		}
		case "split_three_way": {
			const usedDepKop = Math.min(dep, total);
			const remKop = Math.max(0, total - usedDepKop);
			const halfCardKop = Math.floor(remKop / 2);
			const halfCashKop = remKop - halfCardKop;
			const payments: CheckoutSplitItem[] = [];
			if (usedDepKop > 0) payments.push({ method: "patient_deposit", amountKop: usedDepKop });
			if (halfCardKop > 0) payments.push({ method: "bank_card", amountKop: halfCardKop });
			if (halfCashKop > 0) payments.push({ method: "cash", amountKop: halfCashKop });
			return { payments, cashTenderedKop: halfCashKop, activeMethod: usedDepKop > 0 ? "patient_deposit" : "bank_card" };
		}
		case "warranty_100":
			return { payments: [], cashTenderedKop: 0, activeMethod: "bank_card" };
	}
}

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
		const rub = kopecksToRub(p.amountKop);
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

	return { cardRub, cashRub, sbpRub, depositRub, loyaltyRub, dmsRub };
}

export function calculateCashChangeKop(cashTenderedKop: number, cashRequiredKop: number) {
	const tendered = Math.max(0, cashTenderedKop || 0);
	const required = Math.max(0, cashRequiredKop || 0);
	const changeDueKop = Math.max(0, tendered - required);
	const missingKop = Math.max(0, required - tendered);
	return {
		cashTenderedKop: tendered,
		cashRequiredKop: required,
		changeDueKop,
		missingKop,
		isExact: tendered === required,
		isInsufficient: tendered < required,
		isUnderpaid: tendered < required,
	};
}

export function validateCheckoutSplit(input: FastCheckoutInput): FastCheckoutValidationResult {
	const isLegal = input.clientType === "legal_entity";
	const isIp = input.clientType === "individual_entrepreneur";
	const cleanInn = (input.buyerInn ?? "").trim().replace(/\D/g, "");

	if (isLegal && cleanInn.length !== 10) {
		return {
			isValid: false,
			totalPaidKop: 0,
			totalBillKop: input.totalBillKop,
			remainingDueKop: input.totalBillKop,
			cashChangeDueKop: 0,
			errorMessageRu: "ИНН юридического лица должен содержать ровно 10 цифр",
		};
	}

	if (isIp && cleanInn.length !== 12) {
		return {
			isValid: false,
			totalPaidKop: 0,
			totalBillKop: input.totalBillKop,
			remainingDueKop: input.totalBillKop,
			cashChangeDueKop: 0,
			errorMessageRu: "ИНН индивидуального предпринимателя должен содержать ровно 12 цифр",
		};
	}

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
			errorMessageRu: "Недоплата: " + formatKopecksToRubles(remaining) + " ₽",
		};
	}

	if (remaining < 0) {
		return {
			isValid: false,
			totalPaidKop: totalPaid,
			totalBillKop: input.totalBillKop,
			remainingDueKop: remaining,
			cashChangeDueKop: 0,
			errorMessageRu: "Переплата без сдачи: " + formatKopecksToRubles(Math.abs(remaining)) + " ₽",
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

export function splitStateToCheckoutPayments(
	split: Partial<FastCheckoutSplitState>,
): CheckoutSplitItem[] {
	const items: CheckoutSplitItem[] = [];
	const cardKop = split.cardRub !== undefined ? Math.max(0, Number(rubToKopecks(split.cardRub))) : 0;
	const cashKop = split.cashRub !== undefined ? Math.max(0, Number(rubToKopecks(split.cashRub))) : 0;
	const sbpKop = split.sbpRub !== undefined ? Math.max(0, Number(rubToKopecks(split.sbpRub))) : 0;
	const depositKop = split.depositRub !== undefined ? Math.max(0, Number(rubToKopecks(split.depositRub))) : 0;
	const loyaltyKop = split.loyaltyRub !== undefined ? Math.max(0, Number(rubToKopecks(split.loyaltyRub))) : 0;
	const dmsKop = split.dmsRub !== undefined ? Math.max(0, Number(rubToKopecks(split.dmsRub))) : 0;

	if (cardKop > 0) items.push({ method: "bank_card", amountKop: cardKop });
	if (cashKop > 0) items.push({ method: "cash", amountKop: cashKop });
	if (sbpKop > 0) items.push({ method: "sbp_qr", amountKop: sbpKop });
	if (depositKop > 0) items.push({ method: "patient_deposit", amountKop: depositKop });
	if (loyaltyKop > 0) items.push({ method: "loyalty_points", amountKop: loyaltyKop });
	if (dmsKop > 0) items.push({ method: "dms_insurance", amountKop: dmsKop });

	return items;
}

export function calculateSplitRemainingKop(
	totalBillKop: number,
	payments: readonly CheckoutSplitItem[],
): number {
	const totalPaidKop = payments.reduce((acc, p) => acc + Math.max(0, p.amountKop), 0);
	return totalBillKop - totalPaidKop;
}

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
