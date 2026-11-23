import {
	rublesToKopecks,
	kopecksToRubles,
	calculatePercentDiscountKopecks,
	kopecksSub,
	toExactKopecks,
} from "@dental/shared";

export interface LabFinancialSplitResult {
	clinicAmountRub: number;
	doctorAmountRub: number;
	clinicKopecks: number;
	doctorKopecks: number;
	totalKopecks: number;
	isBalanced: boolean;
}

/**
 * Calculates kopeck-exact split between clinic and doctor with strict penny-drift protection.
 */
export function calculateLabFinancialSplit(
	totalPriceRub: number,
	doctorSharePct: number,
): LabFinancialSplitResult {
	const safeTotalRub = Number.isFinite(totalPriceRub) && totalPriceRub >= 0 ? totalPriceRub : 0;
	const safeDoctorPct = Math.min(100, Math.max(0, Number.isFinite(doctorSharePct) ? doctorSharePct : 50));

	const totalKopecks = rublesToKopecks(safeTotalRub);
	const doctorKopecks = toExactKopecks(calculatePercentDiscountKopecks(totalKopecks, safeDoctorPct));
	const clinicKopecks = kopecksSub(totalKopecks, doctorKopecks);

	const clinicAmountRub = kopecksToRubles(clinicKopecks);
	const doctorAmountRub = kopecksToRubles(doctorKopecks);

	return {
		clinicAmountRub,
		doctorAmountRub,
		clinicKopecks,
		doctorKopecks,
		totalKopecks,
		isBalanced: toExactKopecks(clinicKopecks + doctorKopecks) === totalKopecks,
	};
}
