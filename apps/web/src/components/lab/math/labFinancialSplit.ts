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

	const totalKopecks = Math.round(safeTotalRub * 100);
	const doctorKopecks = Math.round((totalKopecks * safeDoctorPct) / 100);
	const clinicKopecks = totalKopecks - doctorKopecks;

	const clinicAmountRub = Number((clinicKopecks / 100).toFixed(2));
	const doctorAmountRub = Number((doctorKopecks / 100).toFixed(2));

	return {
		clinicAmountRub,
		doctorAmountRub,
		clinicKopecks,
		doctorKopecks,
		totalKopecks,
		isBalanced: clinicKopecks + doctorKopecks === totalKopecks,
	};
}
