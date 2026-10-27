/**
 * familySplitCalculations.ts — Layer 1: Family & Deposit 3-Way Splits Math.
 *
 * DENTE Dental CRM — Cash Register 54-FZ, Discounts & Staff Autonomy Operations.
 * Compliant with:
 * - Mandate 8e, п. 9 (1-click split 50/50 card & cash, family balance, deposit)
 * - Mandate 8b (penny-exact integer kopeck calculations)
 */

import { kopecksToRub, rubToKopecks } from "@dental/shared";
import type {
	CombinedSplitCalculationParams,
	CombinedSplitCalculationResult,
	MultiTenderStateRub,
} from "../cashboxTypes.js";

function resolveAdvanceSource(
	params: CombinedSplitCalculationParams,
	depKop: number,
	famKop: number,
	bonusKop: number,
	totalKop: number,
): { advanceKop: number; advanceSource: "deposit" | "family" | "bonus" | "none" } {
	if (params.customAdvanceDeductionRub !== undefined && params.customAdvanceDeductionRub > 0) {
		const customKop = rubToKopecks(params.customAdvanceDeductionRub);
		const maxPossible = Math.max(depKop, famKop, bonusKop);
		const advanceKop = Math.min(totalKop, Math.min(customKop, maxPossible));
		const advanceSource = params.preferFamilyAccount && famKop > 0 ? "family" : depKop > 0 ? "deposit" : famKop > 0 ? "family" : "bonus";
		return { advanceKop, advanceSource };
	}
	if (params.preferFamilyAccount && famKop > 0) return { advanceKop: Math.min(totalKop, famKop), advanceSource: "family" };
	if (depKop > 0) return { advanceKop: Math.min(totalKop, depKop), advanceSource: "deposit" };
	if (famKop > 0) return { advanceKop: Math.min(totalKop, famKop), advanceSource: "family" };
	if (bonusKop > 0) return { advanceKop: Math.min(totalKop, bonusKop), advanceSource: "bonus" };
	return { advanceKop: 0, advanceSource: "none" };
}

/**
 * Расчет сплит-чека (наличные + карта + аванс с семейного счета) с 50/50 распределением остатка.
 */
export function calculateCombinedFamilyCashCardSplit(
	params: CombinedSplitCalculationParams,
): CombinedSplitCalculationResult {
	const totalKop = rubToKopecks(Math.max(0, params.totalDueRub));
	const depKop = rubToKopecks(Math.max(0, params.patientDepositRub || 0));
	const famKop = rubToKopecks(Math.max(0, params.patientFamilyBalanceRub || 0));
	const bonusKop = rubToKopecks(Math.max(0, params.availableBonusRub || 0));

	const { advanceKop, advanceSource } = resolveAdvanceSource(params, depKop, famKop, bonusKop, totalKop);
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
		certificateRub: 0,
	};

	const isPennyExact = cardKop + cashKop + advanceKop === totalKop;
	const advanceDesc = advanceKop > 0
		? `${advanceSource === "family" ? "Семейный счет" : advanceSource === "bonus" ? "Бонусы" : "Аванс"}: ${kopecksToRub(advanceKop)} ₽`
		: "Без аванса";

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
		isPennyExact,
		descriptionRu: `${advanceDesc} + Карта ${kopecksToRub(cardKop)} ₽ + Нал ${kopecksToRub(cashKop)} ₽`,
	};
}
