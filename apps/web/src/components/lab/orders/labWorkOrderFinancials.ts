import type { LabWorkOrderFinancials } from "./labWorkOrderTypes";

export function calculateLabFinancials(params: {
	unitsCount: number;
	pricePerUnitRub: number;
	costPerUnitRub: number;
	doctorPercent?: number | undefined;
	isWarrantyRework?: boolean | undefined;
}): LabWorkOrderFinancials {
	const count = Math.max(1, Math.round(params.unitsCount || 1));
	const isWarranty = Boolean(params.isWarrantyRework);
	const unitPrice = isWarranty ? 0 : Math.max(0, params.pricePerUnitRub || 0);
	const unitCost = Math.max(0, params.costPerUnitRub || 0);
	const doctorPct = Math.max(0, Math.min(100, params.doctorPercent ?? 20));

	const pricePerUnitKopecks = Math.round(unitPrice * 100);
	const costPerUnitKopecks = Math.round(unitCost * 100);

	const patientPriceTotalKopecks = pricePerUnitKopecks * count;
	const labCostTotalKopecks = costPerUnitKopecks * count;
	const grossMarginKopecks = Math.max(0, patientPriceTotalKopecks - labCostTotalKopecks);

	const doctorWageKopecks = isWarranty
		? 0
		: grossMarginKopecks > 0
		? Math.round((grossMarginKopecks * doctorPct) / 100)
		: 0;

	const clinicNetProfitKopecks = grossMarginKopecks - doctorWageKopecks;
	const patientPriceTotalRub = patientPriceTotalKopecks / 100;
	const labCostTotalRub = labCostTotalKopecks / 100;
	const grossMarginRub = (patientPriceTotalKopecks - labCostTotalKopecks) / 100;

	const grossMarginPercent = patientPriceTotalKopecks > 0
		? Number(((grossMarginKopecks / patientPriceTotalKopecks) * 100).toFixed(1))
		: 0;

	const doctorCommissionRub = doctorWageKopecks / 100;
	const clinicNetProfitRub = isWarranty ? -(labCostTotalKopecks / 100) : clinicNetProfitKopecks / 100;

	return {
		patientPriceTotalRub,
		labCostTotalRub,
		grossMarginRub,
		grossMarginPercent,
		doctorCommissionRub,
		doctorPercent: doctorPct,
		clinicNetProfitRub,
		unitsCount: count,
		pricePerUnitRub: unitPrice,
		costPerUnitRub: unitCost,
		patientPriceTotalKopecks,
		labCostTotalKopecks,
		grossMarginKopecks,
		doctorWageKopecks,
		clinicNetProfitKopecks,
		isBalanced: isWarranty || doctorWageKopecks + clinicNetProfitKopecks === grossMarginKopecks,
	};
}
