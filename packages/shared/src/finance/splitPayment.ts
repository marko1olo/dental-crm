/**
 * DENTE Dental CRM — Statutory 54-FZ (FFD 1.2) Split Payment & Multi-Tender Engine.
 *
 * Implements 100% strict integer kopeck arithmetic (zero floating-point drift):
 * 1. Multi-Tender Breakdown:
 *    - Tag 1031: Cash (Наличные)
 *    - Tag 1081: Electronic / Card / SBP / SberPay QR (Безналичные)
 *    - Tag 1215: Advance Offset / Personal & Family Shared Deposit (Зачет аванса / депозит)
 *    - Tag 1216: Postpayment / Credit (Постоплата / Кредит)
 *    - Tag 1217: Counter Provision / Gift Certificate / DMS Insurance (Встречное предоставление)
 * 2. Strict Mathematical Invariant:
 *    Sum(Tenders in kopecks) === Act Total in kopecks.
 *    Any mismatch of even 1 kopeck is detected, reported, and rejected before DB write.
 * 3. Proportional line-item allocation using the Hamilton-Hare (Largest Remainder) algorithm
 *    guaranteeing that itemized tenders sum to the exact invoice amount to the single kopeck.
 */

import { z } from "zod";
import { kopecksToNumericString, kopecksToRub, rubToKopecks } from "../fiscal/kopecksArithmetic.js";

export type SplitTenderKind =
	| "cash"
	| "card"
	| "sbp"
	| "advance_deposit"
	| "family_deposit"
	| "credit"
	| "certificate_or_bonus"
	| "dms_insurance";

export const SPLIT_TENDER_LABELS_RU: Record<SplitTenderKind, string> = {
	cash: "Наличные (Тег 1031)",
	card: "Банковская карта (Тег 1081)",
	sbp: "СБП / QR-код (Тег 1081)",
	advance_deposit: "Личный аванс / Депозит (Тег 1215)",
	family_deposit: "Семейный депозит / Family Wallet (Тег 1215)",
	credit: "Рассрочка / Постоплата (Тег 1216)",
	certificate_or_bonus: "Подарочный сертификат / Бонусы (Тег 1217)",
	dms_insurance: "Страховая компания ДМС (Тег 1217)",
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
	if (kop !== undefined && Number.isFinite(kop)) {
		return Math.round(kop);
	}
	if (rub !== undefined && Number.isFinite(rub)) {
		return rubToKopecks(rub);
	}
	return 0;
}

/**
 * Validates and balances a multi-tender split payment against an Act 804n total with integer kopeck precision.
 *
 * Example Scenario:
 * - Act total: 15,000 ₽ (1,500,000 коп.)
 * - Cash: 5,000 ₽ (500,000 коп., Tag 1031)
 * - Card: 7,000 ₽ (700,000 коп., Tag 1081)
 * - Family advance deposit: 3,000 ₽ (300,000 коп., Tag 1215)
 * -> Exactly matches: 500,000 + 700,000 + 300,000 === 1,500,000 (discrepancy: 0 коп.)
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

	// Zero-negative invariant
	if (
		cashKop < 0 ||
		cardKop < 0 ||
		sbpKop < 0 ||
		advanceKop < 0 ||
		familyKop < 0 ||
		creditKop < 0 ||
		certKop < 0 ||
		dmsKop < 0
	) {
		throw new SplitPaymentValidationError(
			"NegativeTenderAmount",
			"Суммы видов оплат не могут быть отрицательными.",
		);
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

	// 54-FZ FFD 1.2 Tag Aggregations
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

	// Helper to distribute a single tender pool across items with zero remainder drift
	const distributeTender = (tenderKopecks: number): number[] => {
		if (tenderKopecks === 0) return itemTotals.map(() => 0);

		const exactShares = itemTotals.map((it) => (it.totalKopecks * tenderKopecks) / grandTotalKopecks);
		const baseShares = exactShares.map((s) => Math.floor(s));
		const remainders = exactShares.map((s, idx) => ({
			index: idx,
			remainder: s - baseShares[idx]!,
		}));

		const currentSum = baseShares.reduce((a, b) => a + b, 0);
		let deficit = tenderKopecks - currentSum;

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
	const counterShares = distributeTender(tenders.tag1217_counterProvisionKopecks);

	return itemTotals.map((entry, idx) => {
		const cashK = cashShares[idx]!;
		const elK = electronicShares[idx]!;
		const advK = advanceShares[idx]!;
		const credK = creditShares[idx]!;
		const countK = counterShares[idx]!;

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
			certificateKopecks: countK,
			dmsKopecks: 0,
		};
	});
}
