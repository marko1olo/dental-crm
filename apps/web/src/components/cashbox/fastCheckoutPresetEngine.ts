/**
 * fastCheckoutPresetEngine.ts — Layer 4: Fast POS Checkout Presets, Split Validation & Cash Change Math.
 *
 * Compliant with Mandate 8b and 54-FZ multi-tender split calculations.
 */

import { formatKopecksToRubles } from "@dental/shared";
import { rubToKopecks, kopecksToRub } from "./cashRegisterCatalogData.js";
import type {
	MultiTenderStateRub,
	TenderAllocationTarget,
	FastTenderPreset,
} from "./cashRegisterSplitsData.js";

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

export function createExactCashTenders(totalDueRub: number): MultiTenderStateRub {
	return { cardRub: 0, cashRub: totalDueRub, sbpRub: 0, depositRub: 0, familyRub: 0 };
}

export function createFullCardTenders(totalDueRub: number): MultiTenderStateRub {
	return { cardRub: totalDueRub, cashRub: 0, sbpRub: 0, depositRub: 0, familyRub: 0 };
}

export function createDepositAndCardComboTenders(totalDueRub: number, patientDepositRub: number): MultiTenderStateRub {
	const totalKop = Number(rubToKopecks(Math.max(0, totalDueRub)));
	const depKop = Math.min(totalKop, Number(rubToKopecks(Math.max(0, patientDepositRub))));
	const cardKop = Math.max(0, totalKop - depKop);
	return { cardRub: kopecksToRub(cardKop), cashRub: 0, sbpRub: 0, depositRub: kopecksToRub(depKop), familyRub: 0 };
}

export function createCertificateAndCardComboTenders(totalDueRub: number, certificateRub: number): MultiTenderStateRub {
	const totalKop = Number(rubToKopecks(Math.max(0, totalDueRub)));
	const certKop = Math.min(totalKop, Number(rubToKopecks(Math.max(0, certificateRub))));
	const cardKop = Math.max(0, totalKop - certKop);
	return { cardRub: kopecksToRub(cardKop), cashRub: 0, sbpRub: 0, depositRub: 0, familyRub: 0, certificateRub: kopecksToRub(certKop), bonusRub: 0 };
}

export function createBonusAndCardComboTenders(totalDueRub: number, bonusRub: number): MultiTenderStateRub {
	const totalKop = Number(rubToKopecks(Math.max(0, totalDueRub)));
	const bonusKop = Math.min(totalKop, Number(rubToKopecks(Math.max(0, bonusRub))));
	const cardKop = Math.max(0, totalKop - bonusKop);
	return { cardRub: kopecksToRub(cardKop), cashRub: 0, sbpRub: 0, depositRub: 0, familyRub: 0, certificateRub: 0, bonusRub: kopecksToRub(bonusKop) };
}

export interface CombinedSplitCalculationParams {
	readonly totalDueRub: number;
	readonly patientDepositRub?: number | undefined;
	readonly patientFamilyBalanceRub?: number | undefined;
	readonly availableBonusRub?: number | undefined;
	readonly preferFamilyAccount?: boolean | undefined;
	readonly customAdvanceDeductionRub?: number | undefined;
}

export interface CombinedSplitCalculationResult {
	readonly totalDueRub: number;
	readonly totalDueKop: number;
	readonly advanceDeductedRub: number;
	readonly advanceDeductedKop: number;
	readonly advanceSource: "deposit" | "family" | "bonus" | "none";
	readonly remainderToPayRub: number;
	readonly remainderToPayKop: number;
	readonly cardRub: number;
	readonly cardKop: number;
	readonly cashRub: number;
	readonly cashKop: number;
	readonly tenders: MultiTenderStateRub;
	readonly isPennyExact: boolean;
	readonly descriptionRu: string;
}

export function calculateCombinedFamilyCashCardSplit(
	params: CombinedSplitCalculationParams,
): CombinedSplitCalculationResult {
	const totalKop = Number(rubToKopecks(Math.max(0, params.totalDueRub)));
	const depKop = Number(rubToKopecks(Math.max(0, params.patientDepositRub || 0)));
	const famKop = Number(rubToKopecks(Math.max(0, params.patientFamilyBalanceRub || 0)));
	const bonusKop = Number(rubToKopecks(Math.max(0, params.availableBonusRub || 0)));

	let advanceKop = 0;
	let advanceSource: "deposit" | "family" | "bonus" | "none" = "none";

	if (params.customAdvanceDeductionRub !== undefined && params.customAdvanceDeductionRub > 0) {
		const customKop = Number(rubToKopecks(params.customAdvanceDeductionRub));
		const maxPossible = Math.max(depKop, famKop, bonusKop);
		advanceKop = Math.min(totalKop, Math.min(customKop, maxPossible));
		advanceSource = params.preferFamilyAccount && famKop > 0 ? "family" : depKop > 0 ? "deposit" : famKop > 0 ? "family" : "bonus";
	} else if (params.preferFamilyAccount && famKop > 0) {
		advanceKop = Math.min(totalKop, famKop);
		advanceSource = "family";
	} else if (depKop > 0) {
		advanceKop = Math.min(totalKop, depKop);
		advanceSource = "deposit";
	} else if (famKop > 0) {
		advanceKop = Math.min(totalKop, famKop);
		advanceSource = "family";
	} else if (bonusKop > 0) {
		advanceKop = Math.min(totalKop, bonusKop);
		advanceSource = "bonus";
	}

	const remKop = Math.max(0, totalKop - advanceKop);
	const cardKop = Math.floor(remKop / 2);
	const cashKop = remKop - cardKop;

	const tenders: MultiTenderStateRub = {
		cardRub: kopecksToRub(cardKop),
		cashRub: kopecksToRub(cashKop),
		sbpRub: 0,
		depositRub: advanceSource === "deposit" ? kopecksToRub(advanceKop) : 0,
		familyRub: advanceSource === "family" ? kopecksToRub(advanceKop) : 0,
		bonusRub: advanceSource === "bonus" ? kopecksToRub(advanceKop) : 0,
	};

	return {
		totalDueRub: kopecksToRub(totalKop),
		totalDueKop: totalKop,
		advanceDeductedRub: kopecksToRub(advanceKop),
		advanceDeductedKop: advanceKop,
		advanceSource,
		remainderToPayRub: kopecksToRub(remKop),
		remainderToPayKop: remKop,
		cardRub: kopecksToRub(cardKop),
		cardKop,
		cashRub: kopecksToRub(cashKop),
		cashKop,
		tenders,
		isPennyExact: cardKop + cashKop + advanceKop === totalKop,
		descriptionRu: `Аванс ${kopecksToRub(advanceKop)} ₽ + Карта ${kopecksToRub(cardKop)} ₽ + Наличные ${kopecksToRub(cashKop)} ₽`,
	};
}

export function allocateRemainderToTender(params: {
	readonly totalDueRub: number;
	readonly currentTenders: MultiTenderStateRub;
	readonly targetTender: TenderAllocationTarget;
	readonly patientDepositRub?: number | undefined;
	readonly patientFamilyBalanceRub?: number | undefined;
	readonly availableCertificateRub?: number | undefined;
	readonly availableBonusRub?: number | undefined;
	readonly availableDmsCoverageRub?: number | undefined;
}): MultiTenderStateRub {
	const totalKop = Number(rubToKopecks(params.totalDueRub));

	if (params.targetTender === "card_and_cash_5050") {
		let nonCardCashKop = 0;
		if (params.currentTenders.sbpRub) nonCardCashKop += Number(rubToKopecks(params.currentTenders.sbpRub));
		if (params.currentTenders.depositRub) nonCardCashKop += Number(rubToKopecks(params.currentTenders.depositRub));
		if (params.currentTenders.familyRub) nonCardCashKop += Number(rubToKopecks(params.currentTenders.familyRub));
		if (params.currentTenders.certificateRub) nonCardCashKop += Number(rubToKopecks(params.currentTenders.certificateRub));
		if (params.currentTenders.bonusRub) nonCardCashKop += Number(rubToKopecks(params.currentTenders.bonusRub));
		if (params.currentTenders.dmsRub) nonCardCashKop += Number(rubToKopecks(params.currentTenders.dmsRub));

		const remKop = Math.max(0, totalKop - nonCardCashKop);
		const halfCardKop = Math.floor(remKop / 2);
		const halfCashKop = remKop - halfCardKop;

		return {
			cardRub: kopecksToRub(halfCardKop),
			cashRub: kopecksToRub(halfCashKop),
			sbpRub: params.currentTenders.sbpRub,
			depositRub: params.currentTenders.depositRub,
			familyRub: params.currentTenders.familyRub,
			certificateRub: params.currentTenders.certificateRub,
			bonusRub: params.currentTenders.bonusRub,
			dmsRub: params.currentTenders.dmsRub,
		};
	}

	let otherKop = 0;
	if (params.targetTender !== "card" && params.currentTenders.cardRub) otherKop += Number(rubToKopecks(params.currentTenders.cardRub));
	if (params.targetTender !== "cash" && params.currentTenders.cashRub) otherKop += Number(rubToKopecks(params.currentTenders.cashRub));
	if (params.targetTender !== "sbp" && params.currentTenders.sbpRub) otherKop += Number(rubToKopecks(params.currentTenders.sbpRub));
	if (params.targetTender !== "deposit" && params.currentTenders.depositRub) otherKop += Number(rubToKopecks(params.currentTenders.depositRub));
	if (params.targetTender !== "family" && params.currentTenders.familyRub) otherKop += Number(rubToKopecks(params.currentTenders.familyRub));
	if (params.targetTender !== "certificate" && params.currentTenders.certificateRub) otherKop += Number(rubToKopecks(params.currentTenders.certificateRub));
	if (params.targetTender !== "bonus" && params.currentTenders.bonusRub) otherKop += Number(rubToKopecks(params.currentTenders.bonusRub));
	if (params.targetTender !== "dms" && params.currentTenders.dmsRub) otherKop += Number(rubToKopecks(params.currentTenders.dmsRub));

	let remKop = Math.max(0, totalKop - otherKop);

	if (params.targetTender === "deposit" && params.patientDepositRub !== undefined) {
		remKop = Math.min(remKop, Number(rubToKopecks(params.patientDepositRub)));
	} else if (params.targetTender === "family" && params.patientFamilyBalanceRub !== undefined) {
		remKop = Math.min(remKop, Number(rubToKopecks(params.patientFamilyBalanceRub)));
	} else if (params.targetTender === "certificate" && params.availableCertificateRub !== undefined) {
		remKop = Math.min(remKop, Number(rubToKopecks(params.availableCertificateRub)));
	} else if (params.targetTender === "bonus" && params.availableBonusRub !== undefined) {
		remKop = Math.min(remKop, Number(rubToKopecks(params.availableBonusRub)));
	} else if (params.targetTender === "dms" && params.availableDmsCoverageRub !== undefined) {
		remKop = Math.min(remKop, Number(rubToKopecks(params.availableDmsCoverageRub)));
	}

	const allocatedRub = kopecksToRub(remKop);

	return {
		cardRub: params.targetTender === "card" ? allocatedRub : params.currentTenders.cardRub,
		cashRub: params.targetTender === "cash" ? allocatedRub : params.currentTenders.cashRub,
		sbpRub: params.targetTender === "sbp" ? allocatedRub : params.currentTenders.sbpRub,
		depositRub: params.targetTender === "deposit" ? allocatedRub : params.currentTenders.depositRub,
		familyRub: params.targetTender === "family" ? allocatedRub : params.currentTenders.familyRub,
		certificateRub: params.targetTender === "certificate" ? allocatedRub : params.currentTenders.certificateRub,
		bonusRub: params.targetTender === "bonus" ? allocatedRub : params.currentTenders.bonusRub,
		dmsRub: params.targetTender === "dms" ? allocatedRub : params.currentTenders.dmsRub,
	};
}

export function getFastCombinedTenderPresets(params: {
	readonly totalDueRub: number;
	readonly patientDepositRub?: number | undefined;
	readonly patientFamilyBalanceRub?: number | undefined;
}): readonly FastTenderPreset[] {
	const totalDue = params.totalDueRub || 0;
	const dep = params.patientDepositRub || 0;
	const fam = params.patientFamilyBalanceRub || 0;

	const presets: FastTenderPreset[] = [
		{ id: "all_card", title: "100% Картой", description: "Вся сумма через POS-терминал", tenders: { cardRub: totalDue, cashRub: 0, sbpRub: 0, depositRub: 0, familyRub: 0 } },
		{ id: "all_cash", title: "100% Наличными", description: "Вся сумма в кассу наличными", tenders: { cardRub: 0, cashRub: totalDue, sbpRub: 0, depositRub: 0, familyRub: 0 } },
		{ id: "all_sbp", title: "100% СБП (QR)", description: "Вся сумма по QR-коду СБП", tenders: { cardRub: 0, cashRub: 0, sbpRub: totalDue, depositRub: 0, familyRub: 0 } },
	];

	if (dep > 0 && totalDue > 0) {
		const totalKop = Number(rubToKopecks(totalDue));
		const depKop = Math.min(totalKop, Number(rubToKopecks(dep)));
		const remKop = Math.max(0, totalKop - depKop);
		presets.push(
			{ id: "deposit_plus_card", title: `Аванс (${kopecksToRub(depKop)} ₽) + Карта`, description: `Списание аванса + остаток ${kopecksToRub(remKop)} ₽ картой`, tenders: { cardRub: kopecksToRub(remKop), cashRub: 0, sbpRub: 0, depositRub: kopecksToRub(depKop), familyRub: 0 } },
			{ id: "deposit_plus_cash", title: `Аванс (${kopecksToRub(depKop)} ₽) + Нал`, description: `Списание аванса + остаток ${kopecksToRub(remKop)} ₽ наличными`, tenders: { cardRub: 0, cashRub: kopecksToRub(remKop), sbpRub: 0, depositRub: kopecksToRub(depKop), familyRub: 0 } },
		);
	}

	if (fam > 0 && totalDue > 0) {
		const totalKop = Number(rubToKopecks(totalDue));
		const famKop = Math.min(totalKop, Number(rubToKopecks(fam)));
		const remKop = Math.max(0, totalKop - famKop);
		presets.push({ id: "family_plus_card", title: `Семья (${kopecksToRub(famKop)} ₽) + Карта`, description: `Списание с семейного баланса + остаток ${kopecksToRub(remKop)} ₽ картой`, tenders: { cardRub: kopecksToRub(remKop), cashRub: 0, sbpRub: 0, depositRub: 0, familyRub: kopecksToRub(famKop) } });
	}

	if (totalDue > 0) {
		const totalKop = Number(rubToKopecks(totalDue));
		const halfCardKop = Math.floor(totalKop / 2);
		const halfCashKop = totalKop - halfCardKop;
		presets.push({
			id: "half_card_half_cash",
			title: "50% Карта + 50% Нал",
			description: `${kopecksToRub(halfCardKop)} ₽ картой + ${kopecksToRub(halfCashKop)} ₽ наличными`,
			tenders: { cardRub: kopecksToRub(halfCardKop), cashRub: kopecksToRub(halfCashKop), sbpRub: 0, depositRub: 0, familyRub: 0 },
		});
	}

	return presets;
}
