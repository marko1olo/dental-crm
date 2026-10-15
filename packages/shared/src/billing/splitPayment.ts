/**
 * packages/shared/src/billing/splitPayment.ts
 *
 * DENTE Dental CRM — Statutory 54-FZ Split Payment & Multi-Tender Engine.
 * Single Source of Truth (SSOT) for all multi-tender financial math.
 *
 * Invariants:
 * 1. Strict integer kopecks arithmetic (zero floating-point drift, Mandates 8b, 8i).
 * 2. Multi-tender distribution: Cash (1031), Card/SBP (1081), Advance/Deposit (1215), Credit (1216), Counter (1217).
 * 3. Proportional line-item allocation using Hamilton-Hare (Largest Remainder) method with 0 kopeck loss.
 * 4. Human-first terminology: zero dev-slang / raw tag leakage into user interfaces.
 */

import { kopecksToNumericString, kopecksToRub, rubToKopecks } from "../fiscal/kopecksArithmetic.js";
import { kopecksToRubStrict, rubToKopecksStrict } from "./billingMath.js";

export type SplitTenderKind =
	| "cash"
	| "card"
	| "sbp"
	| "advance_deposit"
	| "family_deposit"
	| "credit"
	| "certificate_or_bonus"
	| "dms_insurance";

/**
 * Human-readable Russian labels for payment tenders.
 * Free from raw bureaucratic codes or developer tags.
 */
export const SPLIT_TENDER_LABELS_RU: Record<SplitTenderKind, string> = {
	cash: "Наличные",
	card: "Банковская карта",
	sbp: "СБП / QR-код",
	advance_deposit: "Личный аванс / Депозит",
	family_deposit: "Семейный депозит",
	credit: "Рассрочка / Постоплата",
	certificate_or_bonus: "Подарочный сертификат / Бонусы",
	dms_insurance: "Страховая компания ДМС",
};

export interface SplitPaymentTenderInput {
	readonly cashKopecks?: number | undefined;
	readonly cashRub?: number | undefined;
	readonly cardKopecks?: number | undefined;
	readonly cardRub?: number | undefined;
	readonly sbpKopecks?: number | undefined;
	readonly sbpRub?: number | undefined;
	readonly advanceDepositKopecks?: number | undefined;
	readonly advanceDepositRub?: number | undefined;
	readonly familyDepositKopecks?: number | undefined;
	readonly familyDepositRub?: number | undefined;
	readonly creditKopecks?: number | undefined;
	readonly creditRub?: number | undefined;
	readonly certificateOrBonusKopecks?: number | undefined;
	readonly certificateOrBonusRub?: number | undefined;
	readonly dmsInsuranceKopecks?: number | undefined;
	readonly dmsInsuranceRub?: number | undefined;
	/** Optional family sponsor/wallet metadata */
	readonly familyGroupId?: string | undefined;
	readonly sponsorPatientId?: string | undefined;
	readonly sponsorFullName?: string | undefined;
	/** Optional external transaction identifiers */
	readonly cardTransactionId?: string | undefined;
	readonly sbpPaymentId?: string | undefined;
	readonly certificateNumber?: string | undefined;
	readonly dmsPolicyNumber?: string | undefined;
}

export interface NormalizedSplitTender {
	readonly kind: SplitTenderKind;
	readonly nameRu: string;
	readonly ffd12Tag: 1031 | 1081 | 1215 | 1216 | 1217;
	readonly amountKopecks: number;
	readonly amountRub: number;
	readonly amountRubString: string;
	readonly metadata?: Record<string, string | undefined> | undefined;
}

export interface Ffd12PaymentTagsSummary {
	readonly tag1031_cashKopecks: number;
	readonly tag1031_cashRub: number;
	readonly tag1031_cashRubString: string;
	readonly tag1081_electronicKopecks: number;
	readonly tag1081_electronicRub: number;
	readonly tag1081_electronicRubString: string;
	readonly tag1215_advanceOffsetKopecks: number;
	readonly tag1215_advanceOffsetRub: number;
	readonly tag1215_advanceOffsetRubString: string;
	readonly tag1216_creditKopecks: number;
	readonly tag1216_creditRub: number;
	readonly tag1216_creditRubString: string;
	readonly tag1217_counterProvisionKopecks: number;
	readonly tag1217_counterProvisionRub: number;
	readonly tag1217_counterProvisionRubString: string;
	readonly totalKopecks: number;
	readonly totalRub: number;
	readonly totalRubString: string;
}

export interface SplitPaymentValidationResult {
	readonly isBalanced: boolean;
	readonly status: "exact" | "underpaid" | "overpaid";
	readonly actTotalKopecks: number;
	readonly actTotalRub: number;
	readonly actTotalRubString: string;
	readonly totalTendersKopecks: number;
	readonly totalTendersRub: number;
	readonly totalTendersRubString: string;
	readonly totalRub?: number | undefined;
	readonly totalRubString?: string | undefined;
	readonly discrepancyKopecks: number; // positive = overpaid, negative = underpaid, 0 = exact
	readonly discrepancyRub: number;
	readonly tenders: readonly NormalizedSplitTender[];
	readonly ffd12Tags: Ffd12PaymentTagsSummary;
	readonly errorMessage?: string | undefined;
}

export interface SplitPaymentPositionItem {
	readonly id: string;
	readonly name: string;
	readonly code804n?: string | null | undefined;
	readonly quantity: number;
	readonly priceRub: number;
	readonly priceKopecks?: number | undefined;
	readonly discountRub?: number | undefined;
}

export interface AllocatedItemSplitPayment {
	readonly itemId: string;
	readonly itemName: string;
	readonly itemTotalKopecks: number;
	readonly itemTotalRub: number;
	readonly cashKopecks: number;
	readonly cardKopecks: number;
	readonly sbpKopecks: number;
	readonly advanceDepositKopecks: number;
	readonly familyDepositKopecks: number;
	readonly creditKopecks: number;
	readonly certificateKopecks: number;
	readonly dmsKopecks: number;
}

export class SplitPaymentValidationError extends Error {
	constructor(
		readonly code: string,
		message: string,
		readonly details?: Record<string, unknown>,
	) {
		super(message);
		this.name = "SplitPaymentValidationError";
	}
}

/**
 * Resolves a tender amount safely into integer kopecks.
 */
function resolveKopecks(kop?: number, rub?: number): number {
	if (kop !== undefined) {
		if (typeof kop !== "number" || !Number.isFinite(kop) || Number.isNaN(kop)) {
			throw new SplitPaymentValidationError("InvalidTenderAmount", `Некорректная сумма в копейках: ${kop}`);
		}
		return Math.round(kop);
	}
	if (rub !== undefined) {
		if (typeof rub !== "number" || !Number.isFinite(rub) || Number.isNaN(rub)) {
			throw new SplitPaymentValidationError("InvalidTenderAmount", `Некорректная сумма в рублях: ${rub}`);
		}
		return rubToKopecks(rub);
	}
	return 0;
}

/**
 * Validates and balances a multi-tender split payment against an Act total with integer kopeck precision.
 */
export function validateAndBalanceSplitPayment(params: {
	actTotalRub?: number | undefined;
	actTotalKopecks?: number | undefined;
	tenders: SplitPaymentTenderInput;
	throwOnMismatch?: boolean | undefined;
}): SplitPaymentValidationResult {
	const actKopecks = resolveKopecks(params.actTotalKopecks, params.actTotalRub);

	if (actKopecks <= 0) {
		throw new SplitPaymentValidationError(
			"InvalidActTotal",
			"Итоговая сумма акта должна быть строго больше 0 копеек.",
			{ actTotalKopecks: actKopecks },
		);
	}

	const cashKop = resolveKopecks(params.tenders.cashKopecks, params.tenders.cashRub);
	const cardKop = resolveKopecks(params.tenders.cardKopecks, params.tenders.cardRub);
	const sbpKop = resolveKopecks(params.tenders.sbpKopecks, params.tenders.sbpRub);
	const advanceKop = resolveKopecks(params.tenders.advanceDepositKopecks, params.tenders.advanceDepositRub);
	const familyKop = resolveKopecks(params.tenders.familyDepositKopecks, params.tenders.familyDepositRub);
	const creditKop = resolveKopecks(params.tenders.creditKopecks, params.tenders.creditRub);
	const certKop = resolveKopecks(params.tenders.certificateOrBonusKopecks, params.tenders.certificateOrBonusRub);
	const dmsKop = resolveKopecks(params.tenders.dmsInsuranceKopecks, params.tenders.dmsInsuranceRub);

	if (cashKop < 0 || cardKop < 0 || sbpKop < 0 || advanceKop < 0 || familyKop < 0 || creditKop < 0 || certKop < 0 || dmsKop < 0) {
		throw new SplitPaymentValidationError("NegativeTenderAmount", "Суммы видов оплат не могут быть отрицательными.");
	}

	const normalizedTenders: NormalizedSplitTender[] = [];

	if (cashKop > 0) {
		normalizedTenders.push({
			kind: "cash",
			nameRu: SPLIT_TENDER_LABELS_RU.cash,
			ffd12Tag: 1031,
			amountKopecks: cashKop,
			amountRub: kopecksToRub(cashKop),
			amountRubString: kopecksToNumericString(cashKop),
		});
	}

	if (cardKop > 0) {
		normalizedTenders.push({
			kind: "card",
			nameRu: SPLIT_TENDER_LABELS_RU.card,
			ffd12Tag: 1081,
			amountKopecks: cardKop,
			amountRub: kopecksToRub(cardKop),
			amountRubString: kopecksToNumericString(cardKop),
			metadata: params.tenders.cardTransactionId
				? { transactionId: params.tenders.cardTransactionId }
				: undefined,
		});
	}

	if (sbpKop > 0) {
		normalizedTenders.push({
			kind: "sbp",
			nameRu: SPLIT_TENDER_LABELS_RU.sbp,
			ffd12Tag: 1081,
			amountKopecks: sbpKop,
			amountRub: kopecksToRub(sbpKop),
			amountRubString: kopecksToNumericString(sbpKop),
			metadata: params.tenders.sbpPaymentId
				? { paymentId: params.tenders.sbpPaymentId }
				: undefined,
		});
	}

	if (advanceKop > 0) {
		normalizedTenders.push({
			kind: "advance_deposit",
			nameRu: SPLIT_TENDER_LABELS_RU.advance_deposit,
			ffd12Tag: 1215,
			amountKopecks: advanceKop,
			amountRub: kopecksToRub(advanceKop),
			amountRubString: kopecksToNumericString(advanceKop),
		});
	}

	if (familyKop > 0) {
		normalizedTenders.push({
			kind: "family_deposit",
			nameRu: SPLIT_TENDER_LABELS_RU.family_deposit,
			ffd12Tag: 1215,
			amountKopecks: familyKop,
			amountRub: kopecksToRub(familyKop),
			amountRubString: kopecksToNumericString(familyKop),
			metadata: {
				familyGroupId: params.tenders.familyGroupId,
				sponsorPatientId: params.tenders.sponsorPatientId,
				sponsorFullName: params.tenders.sponsorFullName,
			},
		});
	}

	if (creditKop > 0) {
		normalizedTenders.push({
			kind: "credit",
			nameRu: SPLIT_TENDER_LABELS_RU.credit,
			ffd12Tag: 1216,
			amountKopecks: creditKop,
			amountRub: kopecksToRub(creditKop),
			amountRubString: kopecksToNumericString(creditKop),
		});
	}

	if (certKop > 0) {
		normalizedTenders.push({
			kind: "certificate_or_bonus",
			nameRu: SPLIT_TENDER_LABELS_RU.certificate_or_bonus,
			ffd12Tag: 1217,
			amountKopecks: certKop,
			amountRub: kopecksToRub(certKop),
			amountRubString: kopecksToNumericString(certKop),
			metadata: params.tenders.certificateNumber
				? { certificateNumber: params.tenders.certificateNumber }
				: undefined,
		});
	}

	if (dmsKop > 0) {
		normalizedTenders.push({
			kind: "dms_insurance",
			nameRu: SPLIT_TENDER_LABELS_RU.dms_insurance,
			ffd12Tag: 1217,
			amountKopecks: dmsKop,
			amountRub: kopecksToRub(dmsKop),
			amountRubString: kopecksToNumericString(dmsKop),
			metadata: params.tenders.dmsPolicyNumber
				? { dmsPolicyNumber: params.tenders.dmsPolicyNumber }
				: undefined,
		});
	}

	// 54-FZ Tag Aggregations
	const tag1031Kop = cashKop;
	const tag1081Kop = cardKop + sbpKop;
	const tag1215Kop = advanceKop + familyKop;
	const tag1216Kop = creditKop;
	const tag1217Kop = certKop + dmsKop;

	const totalTendersKopecks = tag1031Kop + tag1081Kop + tag1215Kop + tag1216Kop + tag1217Kop;
	const discrepancyKopecks = totalTendersKopecks - actKopecks;

	const isBalanced = discrepancyKopecks === 0;
	const status: "exact" | "underpaid" | "overpaid" =
		discrepancyKopecks === 0 ? "exact" : discrepancyKopecks < 0 ? "underpaid" : "overpaid";

	let errorMessage: string | undefined = undefined;
	if (!isBalanced) {
		if (discrepancyKopecks < 0) {
			const missingKop = Math.abs(discrepancyKopecks);
			errorMessage = `Недостаточно средств для закрытия счета: не хватает ${kopecksToRub(missingKop)} ₽ (${missingKop} коп.). ` +
				`Сумма оплат: ${kopecksToRub(totalTendersKopecks)} ₽, сумма счета: ${kopecksToRub(actKopecks)} ₽.`;
		} else {
			errorMessage = `Сумма способов оплат превышает сумму счета на ${kopecksToRub(discrepancyKopecks)} ₽ (${discrepancyKopecks} коп.). ` +
				`Сумма оплат: ${kopecksToRub(totalTendersKopecks)} ₽, сумма счета: ${kopecksToRub(actKopecks)} ₽.`;
		}

		if (params.throwOnMismatch) {
			throw new SplitPaymentValidationError("SplitMismatch", errorMessage, {
				actTotalKopecks: actKopecks,
				totalTendersKopecks,
				discrepancyKopecks,
			});
		}
	}

	const ffd12Tags: Ffd12PaymentTagsSummary = {
		tag1031_cashKopecks: tag1031Kop,
		tag1031_cashRub: kopecksToRub(tag1031Kop),
		tag1031_cashRubString: kopecksToNumericString(tag1031Kop),
		tag1081_electronicKopecks: tag1081Kop,
		tag1081_electronicRub: kopecksToRub(tag1081Kop),
		tag1081_electronicRubString: kopecksToNumericString(tag1081Kop),
		tag1215_advanceOffsetKopecks: tag1215Kop,
		tag1215_advanceOffsetRub: kopecksToRub(tag1215Kop),
		tag1215_advanceOffsetRubString: kopecksToNumericString(tag1215Kop),
		tag1216_creditKopecks: tag1216Kop,
		tag1216_creditRub: kopecksToRub(tag1216Kop),
		tag1216_creditRubString: kopecksToNumericString(tag1216Kop),
		tag1217_counterProvisionKopecks: tag1217Kop,
		tag1217_counterProvisionRub: kopecksToRub(tag1217Kop),
		tag1217_counterProvisionRubString: kopecksToNumericString(tag1217Kop),
		totalKopecks: totalTendersKopecks,
		totalRub: kopecksToRub(totalTendersKopecks),
		totalRubString: kopecksToNumericString(totalTendersKopecks),
	};

	return {
		isBalanced,
		status,
		actTotalKopecks: actKopecks,
		actTotalRub: kopecksToRub(actKopecks),
		actTotalRubString: kopecksToNumericString(actKopecks),
		totalTendersKopecks,
		totalTendersRub: kopecksToRub(totalTendersKopecks),
		totalTendersRubString: kopecksToNumericString(totalTendersKopecks),
		discrepancyKopecks,
		discrepancyRub: kopecksToRub(discrepancyKopecks),
		tenders: normalizedTenders,
		ffd12Tags,
		errorMessage,
	};
}

/**
 * Proportional allocation of multi-tender split payment across line items
 * using the Largest Remainder (Hamilton-Hare) Method.
 * Guarantees ZERO penny drift across all positions.
 */
export function allocateSplitPaymentAcrossItems(
	items: readonly SplitPaymentPositionItem[],
	validationResult: SplitPaymentValidationResult,
): readonly AllocatedItemSplitPayment[] {
	if (!validationResult.isBalanced) {
		throw new SplitPaymentValidationError(
			"UnbalancedSplitAllocation",
			"Невозможно распределить несбалансированный сплит-платеж по позициям акта.",
			{ discrepancyKopecks: validationResult.discrepancyKopecks },
		);
	}

	const itemTotals = items.map((it) => {
		const unitKop = it.priceKopecks !== undefined ? it.priceKopecks : rubToKopecks(it.priceRub);
		const discKop = it.discountRub !== undefined ? rubToKopecks(it.discountRub) : 0;
		const netUnitKop = Math.max(0, unitKop - discKop);
		return {
			item: it,
			totalKopecks: Math.round(netUnitKop * it.quantity),
		};
	});

	const grandTotalKopecks = itemTotals.reduce((sum, it) => sum + it.totalKopecks, 0);
	if (grandTotalKopecks === 0) {
		return [];
	}

	const tenders = validationResult.ffd12Tags;

	// Distributes a single tender pool across items with zero remainder drift
	const distributeTender = (tenderKopecks: number): number[] => {
		if (tenderKopecks === 0) return itemTotals.map(() => 0);

		const exactShares = itemTotals.map((it) => (it.totalKopecks * tenderKopecks) / grandTotalKopecks);
		const baseShares = exactShares.map((s) => Math.floor(s));
		const remainders = exactShares.map((s, idx) => ({
			index: idx,
			remainder: s - baseShares[idx]!,
		}));

		const currentSum = baseShares.reduce((a, b) => a + b, 0);
		const deficit = tenderKopecks - currentSum;

		remainders.sort((a, b) => b.remainder - a.remainder);
		for (let i = 0; i < deficit; i++) {
			const target = remainders[i % remainders.length];
			if (target !== undefined) {
				const currentVal = baseShares[target.index] ?? 0;
				baseShares[target.index] = currentVal + 1;
			}
		}

		return baseShares;
	};

	const cashShares = distributeTender(tenders.tag1031_cashKopecks);
	const electronicShares = distributeTender(tenders.tag1081_electronicKopecks);
	const advanceShares = distributeTender(tenders.tag1215_advanceOffsetKopecks);
	const creditShares = distributeTender(tenders.tag1216_creditKopecks);
	const certTenderKop = validationResult.tenders.find((t) => t.kind === "certificate_or_bonus")?.amountKopecks ?? 0;
	const dmsTenderKop = validationResult.tenders.find((t) => t.kind === "dms_insurance")?.amountKopecks ?? 0;

	let certShares: number[];
	let dmsShares: number[];

	if (dmsTenderKop > 0 && certTenderKop === 0) {
		dmsShares = distributeTender(tenders.tag1217_counterProvisionKopecks);
		certShares = itemTotals.map(() => 0);
	} else if (certTenderKop > 0 && dmsTenderKop === 0) {
		certShares = distributeTender(tenders.tag1217_counterProvisionKopecks);
		dmsShares = itemTotals.map(() => 0);
	} else {
		certShares = distributeTender(certTenderKop);
		dmsShares = distributeTender(dmsTenderKop);
	}

	return itemTotals.map((entry, idx) => {
		const cashK = cashShares[idx]!;
		const elK = electronicShares[idx]!;
		const advK = advanceShares[idx]!;
		const credK = creditShares[idx]!;
		const certK = certShares[idx] ?? 0;
		const dmsK = dmsShares[idx] ?? 0;

		return {
			itemId: entry.item.id,
			itemName: entry.item.name,
			itemTotalKopecks: entry.totalKopecks,
			itemTotalRub: kopecksToRub(entry.totalKopecks),
			cashKopecks: cashK,
			cardKopecks: elK,
			sbpKopecks: 0,
			advanceDepositKopecks: advK,
			familyDepositKopecks: 0,
			creditKopecks: credK,
			certificateKopecks: certK,
			dmsKopecks: dmsK,
		};
	});
}

/**
 * 1-Click Remainder Balancer to single tender kind down to the exact integer kopeck.
 * Zero floating point drift.
 */
export function balanceSplitTenderRemainder(params: {
	readonly actTotalKopecks: number;
	readonly currentTenders: SplitPaymentTenderInput;
	readonly targetKind: SplitTenderKind;
	readonly availableDepositKopecks?: number | undefined;
}): SplitPaymentTenderInput {
	const actKop = Math.max(0, Math.round(params.actTotalKopecks));
	const current = params.currentTenders;

	// Calculate sum of all tenders excluding the target kind
	let otherSumKop = 0;
	if (params.targetKind !== "cash") otherSumKop += resolveKopecks(current.cashKopecks, current.cashRub);
	if (params.targetKind !== "card") otherSumKop += resolveKopecks(current.cardKopecks, current.cardRub);
	if (params.targetKind !== "sbp") otherSumKop += resolveKopecks(current.sbpKopecks, current.sbpRub);
	if (params.targetKind !== "advance_deposit") otherSumKop += resolveKopecks(current.advanceDepositKopecks, current.advanceDepositRub);
	if (params.targetKind !== "family_deposit") otherSumKop += resolveKopecks(current.familyDepositKopecks, current.familyDepositRub);
	if (params.targetKind !== "credit") otherSumKop += resolveKopecks(current.creditKopecks, current.creditRub);
	if (params.targetKind !== "certificate_or_bonus") otherSumKop += resolveKopecks(current.certificateOrBonusKopecks, current.certificateOrBonusRub);
	if (params.targetKind !== "dms_insurance") otherSumKop += resolveKopecks(current.dmsInsuranceKopecks, current.dmsInsuranceRub);

	const remainderKop = Math.max(0, actKop - otherSumKop);

	const updated: SplitPaymentTenderInput = {
		...current,
		cashRub: undefined,
		cardRub: undefined,
		sbpRub: undefined,
		advanceDepositRub: undefined,
		familyDepositRub: undefined,
		creditRub: undefined,
		certificateOrBonusRub: undefined,
		dmsInsuranceRub: undefined,
		cashKopecks: resolveKopecks(current.cashKopecks, current.cashRub),
		cardKopecks: resolveKopecks(current.cardKopecks, current.cardRub),
		sbpKopecks: resolveKopecks(current.sbpKopecks, current.sbpRub),
		advanceDepositKopecks: resolveKopecks(current.advanceDepositKopecks, current.advanceDepositRub),
		familyDepositKopecks: resolveKopecks(current.familyDepositKopecks, current.familyDepositRub),
		creditKopecks: resolveKopecks(current.creditKopecks, current.creditRub),
		certificateOrBonusKopecks: resolveKopecks(current.certificateOrBonusKopecks, current.certificateOrBonusRub),
		dmsInsuranceKopecks: resolveKopecks(current.dmsInsuranceKopecks, current.dmsInsuranceRub),
	};

	let targetAmountKop = remainderKop;
	if (
		(params.targetKind === "advance_deposit" || params.targetKind === "family_deposit") &&
		params.availableDepositKopecks !== undefined
	) {
		targetAmountKop = Math.min(remainderKop, Math.max(0, params.availableDepositKopecks));
	}

	switch (params.targetKind) {
		case "cash":
			return { ...updated, cashKopecks: targetAmountKop };
		case "card":
			return { ...updated, cardKopecks: targetAmountKop };
		case "sbp":
			return { ...updated, sbpKopecks: targetAmountKop };
		case "advance_deposit":
			return { ...updated, advanceDepositKopecks: targetAmountKop };
		case "family_deposit":
			return { ...updated, familyDepositKopecks: targetAmountKop };
		case "credit":
			return { ...updated, creditKopecks: targetAmountKop };
		case "certificate_or_bonus":
			return { ...updated, certificateOrBonusKopecks: targetAmountKop };
		case "dms_insurance":
			return { ...updated, dmsInsuranceKopecks: targetAmountKop };
	}
}

/**
 * 1-Click Combo: Spends available personal/family advance deposit first,
 * and balances all remaining unallocated kopecks to Bank Card or SBP QR.
 */
export function balanceSplitDepositPlusCard(params: {
	readonly actTotalKopecks: number;
	readonly currentTenders: SplitPaymentTenderInput;
	readonly availableDepositKopecks: number;
	readonly secondaryTender?: "card" | "sbp" | "cash" | undefined;
}): SplitPaymentTenderInput {
	const actKop = Math.max(0, Math.round(params.actTotalKopecks));
	const current = params.currentTenders;
	const availDepositKop = Math.max(0, Math.round(params.availableDepositKopecks));
	const secondary = params.secondaryTender ?? "card";

	// Tenders other than deposit and secondary
	let baseSumKop = 0;
	if (secondary !== "cash") baseSumKop += resolveKopecks(current.cashKopecks, current.cashRub);
	if (secondary !== "card") baseSumKop += resolveKopecks(current.cardKopecks, current.cardRub);
	if (secondary !== "sbp") baseSumKop += resolveKopecks(current.sbpKopecks, current.sbpRub);
	baseSumKop += resolveKopecks(current.creditKopecks, current.creditRub);
	baseSumKop += resolveKopecks(current.certificateOrBonusKopecks, current.certificateOrBonusRub);
	baseSumKop += resolveKopecks(current.dmsInsuranceKopecks, current.dmsInsuranceRub);

	const remainderKop = Math.max(0, actKop - baseSumKop);
	const depositTakeKop = Math.min(remainderKop, availDepositKop);
	const secondaryTakeKop = remainderKop - depositTakeKop;

	const updated: SplitPaymentTenderInput = {
		...current,
		cashRub: undefined,
		cardRub: undefined,
		sbpRub: undefined,
		advanceDepositRub: undefined,
		familyDepositRub: undefined,
		creditRub: undefined,
		certificateOrBonusRub: undefined,
		dmsInsuranceRub: undefined,
		cashKopecks: secondary === "cash" ? secondaryTakeKop : resolveKopecks(current.cashKopecks, current.cashRub),
		cardKopecks: secondary === "card" ? secondaryTakeKop : resolveKopecks(current.cardKopecks, current.cardRub),
		sbpKopecks: secondary === "sbp" ? secondaryTakeKop : resolveKopecks(current.sbpKopecks, current.sbpRub),
		advanceDepositKopecks: depositTakeKop,
		familyDepositKopecks: 0,
		creditKopecks: resolveKopecks(current.creditKopecks, current.creditRub),
		certificateOrBonusKopecks: resolveKopecks(current.certificateOrBonusKopecks, current.certificateOrBonusRub),
		dmsInsuranceKopecks: resolveKopecks(current.dmsInsuranceKopecks, current.dmsInsuranceRub),
	};

	return updated;
}

// --- Front-end and Pos Remainder Alignment Methods (SSOT) ---

export interface AutoAlignRemainderInput {
	readonly totalDueRub: number;
	readonly totalAllocatedRub: number;
	readonly splitCardRub: number;
	readonly splitCashRub: number;
	readonly splitDepositRub?: number | undefined;
	readonly splitSbpRub?: number | undefined;
}

export interface AutoAlignRemainderResult {
	readonly nextCardRub: number;
	readonly nextCashRub: number;
}

/**
 * Automatically adjusts cash or card tender to eliminate rounding discrepancies
 * and ensure total allocated strictly equals total due down to integer kopecks.
 */
export function autoAlignSplitRemainder(input: AutoAlignRemainderInput): AutoAlignRemainderResult {
	const totalKop = rubToKopecks(input.totalDueRub);
	const allocatedKop = rubToKopecks(input.totalAllocatedRub);
	const diffKop = totalKop - allocatedKop;

	let cardRub = input.splitCardRub;
	let cashRub = input.splitCashRub;

	if (diffKop === 0) {
		return { nextCardRub: cardRub, nextCashRub: cashRub };
	}

	const depositRub = input.splitDepositRub ?? 0;
	const sbpRub = input.splitSbpRub ?? 0;

	if (diffKop > 0) {
		if (cardRub > 0 || (cashRub === 0 && depositRub === 0 && sbpRub === 0)) {
			cardRub = kopecksToRub(rubToKopecks(cardRub) + diffKop);
		} else if (cashRub > 0) {
			cashRub = kopecksToRub(rubToKopecks(cashRub) + diffKop);
		} else {
			cardRub = kopecksToRub(diffKop);
		}
	} else {
		const excessKop = -diffKop;
		const cardKop = rubToKopecks(cardRub);
		const cashKop = rubToKopecks(cashRub);
		if (cardKop >= excessKop) {
			cardRub = kopecksToRub(cardKop - excessKop);
		} else if (cashKop >= excessKop) {
			cashRub = kopecksToRub(cashKop - excessKop);
		} else if (cardKop > 0) {
			cardRub = 0;
			const remExcess = excessKop - cardKop;
			cashRub = Math.max(0, kopecksToRub(cashKop - remExcess));
		} else {
			cashRub = Math.max(0, kopecksToRub(cashKop - excessKop));
		}
	}

	return { nextCardRub: cardRub, nextCashRub: cashRub };
}

/**
 * Splits total bill 50/50 between cash and electronic payment without kopeck loss.
 */
export function calculate5050Split(totalDueRub: number): { cashRub: number; electronicRub: number } {
	const totalKop = rubToKopecks(totalDueRub);
	const halfKop = Math.floor(totalKop / 2);
	const restKop = totalKop - halfKop;
	return {
		cashRub: kopecksToRub(halfKop),
		electronicRub: kopecksToRub(restKop),
	};
}

/**
 * Checks whether the sum of split tenders strictly equals the total amount due in integer kopecks.
 */
export function isSplitBalanced(
	totalDueRub: number,
	allocatedTendersRub: readonly number[],
): boolean {
	const totalKop = rubToKopecks(totalDueRub);
	const allocatedKop = allocatedTendersRub.reduce((acc, rub) => acc + rubToKopecks(rub || 0), 0);
	return totalKop === allocatedKop;
}

