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
import { type Kopecks, assertIntegerKopecks, toExactKopecks, kopecksAdd } from "../money.js";
import { kopecksToRubStrict, rubToKopecksStrict } from "./billingMath.js";
import { calculateItemDmsSplit } from "../insurance/dmsFranchiseEngine.js";

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
	readonly dmsGuaranteeLetterNumber?: string | undefined;
	readonly dmsInsurerName?: string | undefined;
}

export interface NormalizedSplitTender {
	readonly kind: SplitTenderKind;
	readonly nameRu: string;
	readonly ffd12Tag: 1031 | 1081 | 1215 | 1216 | 1217;
	readonly amountKopecks: Kopecks;
	readonly amountRub: number;
	readonly amountRubString: string;
	readonly metadata?: Record<string, string | undefined> | undefined;
}

export interface Ffd12PaymentTagsSummary {
	readonly tag1031_cashKopecks: Kopecks;
	readonly tag1031_cashRub: number;
	readonly tag1031_cashRubString: string;
	readonly tag1081_electronicKopecks: Kopecks;
	readonly tag1081_electronicRub: number;
	readonly tag1081_electronicRubString: string;
	readonly tag1215_advanceOffsetKopecks: Kopecks;
	readonly tag1215_advanceOffsetRub: number;
	readonly tag1215_advanceOffsetRubString: string;
	readonly tag1216_creditKopecks: Kopecks;
	readonly tag1216_creditRub: number;
	readonly tag1216_creditRubString: string;
	readonly tag1217_counterProvisionKopecks: Kopecks;
	readonly tag1217_counterProvisionRub: number;
	readonly tag1217_counterProvisionRubString: string;
	readonly totalKopecks: Kopecks;
	readonly totalRub: number;
	readonly totalRubString: string;
}

export interface SplitPaymentValidationResult {
	readonly isBalanced: boolean;
	readonly status: "exact" | "underpaid" | "overpaid";
	readonly actTotalKopecks: Kopecks;
	readonly actTotalRub: number;
	readonly actTotalRubString: string;
	readonly totalTendersKopecks: Kopecks;
	readonly totalTendersRub: number;
	readonly totalTendersRubString: string;
	readonly totalRub?: number | undefined;
	readonly totalRubString?: string | undefined;
	readonly discrepancyKopecks: Kopecks; // positive = overpaid, negative = underpaid, 0 = exact
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
	readonly itemTotalKopecks: Kopecks;
	readonly itemTotalRub: number;
	readonly cashKopecks: Kopecks;
	readonly cardKopecks: Kopecks;
	readonly sbpKopecks: Kopecks;
	readonly advanceDepositKopecks: Kopecks;
	readonly familyDepositKopecks: Kopecks;
	readonly creditKopecks: Kopecks;
	readonly certificateKopecks: Kopecks;
	readonly dmsKopecks: Kopecks;
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
function resolveKopecks(kop?: number, rub?: number): Kopecks {
	if (kop !== undefined) {
		if (typeof kop !== "number" || !Number.isFinite(kop) || Number.isNaN(kop)) {
			throw new SplitPaymentValidationError("InvalidTenderAmount", `Некорректная сумма в копейках: ${kop}`);
		}
		return toExactKopecks(Math.round(kop));
	}
	if (rub !== undefined) {
		if (typeof rub !== "number" || !Number.isFinite(rub) || Number.isNaN(rub)) {
			throw new SplitPaymentValidationError("InvalidTenderAmount", `Некорректная сумма в рублях: ${rub}`);
		}
		return rubToKopecks(rub);
	}
	return toExactKopecks(0);
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

	if (actKopecks < 0) {
		throw new SplitPaymentValidationError(
			"InvalidActTotal",
			"Итоговая сумма акта не может быть отрицательной.",
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
	const tag1081Kop = toExactKopecks(cardKop + sbpKop);
	const tag1215Kop = toExactKopecks(advanceKop + familyKop);
	const tag1216Kop = creditKop;
	const tag1217Kop = toExactKopecks(certKop + dmsKop);

	const totalTendersKopecks = toExactKopecks(tag1031Kop + tag1081Kop + tag1215Kop + tag1216Kop + tag1217Kop);
	const discrepancyKopecks = toExactKopecks(totalTendersKopecks - actKopecks);

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
 * Canonical 54-FZ Fiscal Priority Order for Sequential Multi-Tender Allocation.
 * Priority: Dedicated/Restricted Tenders (DMS, Certificate, Deposits) -> Credit -> Digital/Instant (SBP, Card) -> Cash.
 */
export const TENDER_PRIORITY_ORDER: readonly SplitTenderKind[] = [
	"dms_insurance",
	"certificate_or_bonus",
	"family_deposit",
	"advance_deposit",
	"credit",
	"sbp",
	"card",
	"cash",
] as const;

/**
 * 2D Sequential Exact Remainder Apportionment across line items.
 *
 * Guarantees TWO conservation laws without floating-point errors:
 * 1. Row Sum Invariant: For EVERY line item i, sum(tenders) === itemTotalKopecks.
 * 2. Column Sum Invariant: For EVERY tender kind j, sum(items) === totalTenderKopecks.
 * 3. Non-negativity: All matrix elements >= 0.
 * 4. Doctor Autonomy (Mandate 8e): 100% discount (0 ₽ act) preserves ALL items with 0 kopecks.
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
			totalKopecks: toExactKopecks(Math.round(netUnitKop * it.quantity)),
		};
	});

	const grandTotalKopecks = itemTotals.reduce((sum, it) => sum + it.totalKopecks, 0);

	// Mandate 8e: 100% discount does NOT purge items from the receipt/statement!
	if (grandTotalKopecks === 0) {
		return itemTotals.map((entry) => ({
			itemId: entry.item.id,
			itemName: entry.item.name,
			itemTotalKopecks: toExactKopecks(0),
			itemTotalRub: 0,
			cashKopecks: toExactKopecks(0),
			cardKopecks: toExactKopecks(0),
			sbpKopecks: toExactKopecks(0),
			advanceDepositKopecks: toExactKopecks(0),
			familyDepositKopecks: toExactKopecks(0),
			creditKopecks: toExactKopecks(0),
			certificateKopecks: toExactKopecks(0),
			dmsKopecks: toExactKopecks(0),
		}));
	}

	// Extract tender amounts from normalized tenders (or FFD 1.2 tags fallback)
	const tenderAmounts: Record<SplitTenderKind, number> = {
		dms_insurance: 0,
		certificate_or_bonus: 0,
		family_deposit: 0,
		advance_deposit: 0,
		credit: 0,
		sbp: 0,
		card: 0,
		cash: 0,
	};

	for (const t of validationResult.tenders) {
		if (t.amountKopecks > 0) {
			tenderAmounts[t.kind] = (tenderAmounts[t.kind] ?? 0) + t.amountKopecks;
		}
	}

	let totalExtractedTenders = 0;
	for (const kind of TENDER_PRIORITY_ORDER) {
		totalExtractedTenders += tenderAmounts[kind];
	}

	if (totalExtractedTenders === 0 && validationResult.ffd12Tags.totalKopecks > 0) {
		const tags = validationResult.ffd12Tags;
		tenderAmounts.cash = tags.tag1031_cashKopecks;
		tenderAmounts.card = tags.tag1081_electronicKopecks;
		tenderAmounts.advance_deposit = tags.tag1215_advanceOffsetKopecks;
		tenderAmounts.credit = tags.tag1216_creditKopecks;
		tenderAmounts.certificate_or_bonus = tags.tag1217_counterProvisionKopecks;
	}

	// Remaining unpaid kopecks for each item
	const remainingItemKopecks = itemTotals.map((it) => it.totalKopecks);

	// 2D Matrix of allocations: allocations[itemIndex][tenderKind]
	const allocations: Array<Record<SplitTenderKind, number>> = itemTotals.map(() => ({
		dms_insurance: 0,
		certificate_or_bonus: 0,
		family_deposit: 0,
		advance_deposit: 0,
		credit: 0,
		sbp: 0,
		card: 0,
		cash: 0,
	}));

	for (const kind of TENDER_PRIORITY_ORDER) {
		const tenderKopecks = tenderAmounts[kind];
		if (tenderKopecks <= 0) continue;

		const sumRemaining = remainingItemKopecks.reduce((sum, rem) => sum + rem, 0);
		if (sumRemaining <= 0) break;

		// If this tender exactly matches or covers all remaining debt across all items:
		if (tenderKopecks === sumRemaining) {
			for (let i = 0; i < itemTotals.length; i++) {
				const rem = remainingItemKopecks[i] ?? 0;
				const itemAlloc = allocations[i];
				if (itemAlloc !== undefined && rem > 0) {
					itemAlloc[kind] = (itemAlloc[kind] ?? 0) + rem;
					remainingItemKopecks[i] = 0;
				}
			}
			continue;
		}

		// Sequential Exact Remainder Apportionment on integers:
		const baseShares = new Array<number>(itemTotals.length).fill(0);
		const remainders: Array<{ index: number; remainderNumerator: number; remainingKop: number }> = [];

		let distributedSum = 0;
		for (let i = 0; i < itemTotals.length; i++) {
			const rem = remainingItemKopecks[i] ?? 0;
			if (rem <= 0) continue;

			const product = rem * tenderKopecks;
			const base = Math.floor(product / sumRemaining);
			const remainderNumerator = product % sumRemaining;

			baseShares[i] = base;
			distributedSum += base;
			remainders.push({
				index: i,
				remainderNumerator,
				remainingKop: rem,
			});
		}

		const deficit = tenderKopecks - distributedSum;

		// Deterministic sort: highest remainder numerator -> highest remaining debt -> original index
		remainders.sort((a, b) => {
			if (b.remainderNumerator !== a.remainderNumerator) {
				return b.remainderNumerator - a.remainderNumerator;
			}
			if (b.remainingKop !== a.remainingKop) {
				return b.remainingKop - a.remainingKop;
			}
			return a.index - b.index;
		});

		for (let r = 0; r < deficit; r++) {
			if (remainders.length === 0) break;
			const target = remainders[r % remainders.length];
			if (target !== undefined) {
				const idx = target.index;
				const currentBase = baseShares[idx] ?? 0;
				const maxAllowed = remainingItemKopecks[idx] ?? 0;
				if (currentBase + 1 <= maxAllowed) {
					baseShares[idx] = currentBase + 1;
				} else {
					for (let alt = 0; alt < remainders.length; alt++) {
						const altTarget = remainders[alt];
						if (altTarget !== undefined) {
							const altIdx = altTarget.index;
							if ((baseShares[altIdx] ?? 0) + 1 <= (remainingItemKopecks[altIdx] ?? 0)) {
								baseShares[altIdx] = (baseShares[altIdx] ?? 0) + 1;
								break;
							}
						}
					}
				}
			}
		}

		// Apply allocations and decrement remaining item balances
		for (let i = 0; i < itemTotals.length; i++) {
			const allocatedToItem = baseShares[i] ?? 0;
			const itemAlloc = allocations[i];
			if (itemAlloc !== undefined && allocatedToItem > 0) {
				itemAlloc[kind] = (itemAlloc[kind] ?? 0) + allocatedToItem;
				remainingItemKopecks[i] = Math.max(0, (remainingItemKopecks[i] ?? 0) - allocatedToItem);
			}
		}
	}

	return itemTotals.map((entry, idx) => {
		const row = allocations[idx] ?? {
			cash: 0,
			card: 0,
			sbp: 0,
			advance_deposit: 0,
			family_deposit: 0,
			credit: 0,
			certificate_or_bonus: 0,
			dms_insurance: 0,
		};

		return {
			itemId: entry.item.id,
			itemName: entry.item.name,
			itemTotalKopecks: toExactKopecks(entry.totalKopecks),
			itemTotalRub: kopecksToRub(entry.totalKopecks),
			cashKopecks: toExactKopecks(row.cash),
			cardKopecks: toExactKopecks(row.card),
			sbpKopecks: toExactKopecks(row.sbp),
			advanceDepositKopecks: toExactKopecks(row.advance_deposit),
			familyDepositKopecks: toExactKopecks(row.family_deposit),
			creditKopecks: toExactKopecks(row.credit),
			certificateKopecks: toExactKopecks(row.certificate_or_bonus),
			dmsKopecks: toExactKopecks(row.dms_insurance),
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

export interface DmsSplitBillInput {
	readonly totalBillKopecks?: number | undefined;
	readonly totalBillRub?: number | undefined;
	readonly availableCoverageKopecks?: number | undefined;
	readonly availableCoverageRub?: number | undefined;
	readonly franchisePercent?: number | undefined;
}

export interface DmsSplitBillResult {
	readonly dmsCoveredKopecks: number;
	readonly dmsCoveredRub: number;
	readonly patientCoPayKopecks: number;
	readonly patientCoPayRub: number;
	readonly isFullyCovered: boolean;
	readonly franchiseAppliedKopecks: number;
}

/**
 * Calculates statutory DMS split bill:
 * Divides total bill between Insurer (B2B non-fiscal) and Patient co-payment (54-FZ fiscal receipt)
 * with 0-drift integer kopecks guarantee.
 */
export function calculateDmsSplitBill(input: DmsSplitBillInput): DmsSplitBillResult {
	const totalKop = Math.max(0, resolveKopecks(input.totalBillKopecks, input.totalBillRub));
	const franchise = Math.max(0, Math.min(100, Math.round(input.franchisePercent ?? 0)));

	const { patientKopecks: franchiseKop, insurerKopecks: initialInsurerKop } = calculateItemDmsSplit(
		totalKop,
		franchise,
		true,
	);

	const hasLimit = input.availableCoverageKopecks !== undefined || input.availableCoverageRub !== undefined;
	const limitKop = hasLimit ? Math.max(0, resolveKopecks(input.availableCoverageKopecks, input.availableCoverageRub)) : Infinity;

	const dmsCoveredKop = Math.min(initialInsurerKop, limitKop);
	const patientCoPayKop = totalKop - dmsCoveredKop;

	return {
		dmsCoveredKopecks: dmsCoveredKop,
		dmsCoveredRub: kopecksToRub(dmsCoveredKop),
		patientCoPayKopecks: patientCoPayKop,
		patientCoPayRub: kopecksToRub(patientCoPayKop),
		isFullyCovered: patientCoPayKop === 0 && totalKop > 0,
		franchiseAppliedKopecks: franchiseKop,
	};
}

