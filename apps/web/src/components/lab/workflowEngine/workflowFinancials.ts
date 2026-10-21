export type WarrantyLiabilityType = "clinic_warranty" | "lab_defect" | "patient_fault";

export interface DentalLabWorkflowFinancials {
	readonly unitsCount: number;
	readonly pricePerUnitKopecks: number;
	readonly costPerUnitKopecks: number;
	readonly patientPriceTotalKopecks: number;
	readonly labCostKopecks: number;
	readonly labCostTotalKopecks: number;
	readonly clinicGrossMarginKopecks: number;
	readonly grossMarginPercent: number;
	readonly doctorPercent: number;
	readonly doctorWageBaseKopecks: number;
	readonly doctorWageKopecks: number;
	readonly clinicNetProfitKopecks: number;
	readonly patientPriceTotalRub: number;
	readonly labCostTotalRub: number;
	readonly clinicGrossMarginRub: number;
	readonly doctorWageRub: number;
	readonly clinicNetProfitRub: number;
	readonly isBalanced: boolean;
	readonly isWarrantyRework?: boolean | undefined;
	readonly warrantyLiabilityType?: WarrantyLiabilityType | undefined;
	readonly warrantyLiabilityKopecks?: number | undefined;
	readonly warrantyLiabilityRub?: number | undefined;
	readonly warrantyLiabilityLabelRu?: string | undefined;
}

export interface CalculateLabFinancialsParams {
	readonly unitsCount: number;
	readonly pricePerUnitKopecks?: number | undefined;
	readonly costPerUnitKopecks?: number | undefined;
	readonly pricePerUnitRub?: number | undefined;
	readonly costPerUnitRub?: number | undefined;
	readonly doctorPercent?: number | undefined;
	readonly isWarrantyRework?: boolean | undefined;
	readonly warrantyLiabilityType?: WarrantyLiabilityType | undefined;
}

export function calculateLabWorkflowFinancials(
	params: CalculateLabFinancialsParams,
): DentalLabWorkflowFinancials {
	const count = Math.max(1, Math.round(params.unitsCount || 1));
	const pricePerUnit = Math.max(
		0,
		Math.round(params.pricePerUnitKopecks ?? (params.pricePerUnitRub ? params.pricePerUnitRub * 100 : 0)),
	);
	const costPerUnit = Math.max(
		0,
		Math.round(params.costPerUnitKopecks ?? (params.costPerUnitRub ? params.costPerUnitRub * 100 : 0)),
	);
	const doctorPct = Math.max(0, Math.min(100, params.doctorPercent ?? 20));

	if (params.isWarrantyRework) {
		const liabilityType: WarrantyLiabilityType = params.warrantyLiabilityType || "clinic_warranty";
		const isLabDefect = liabilityType === "lab_defect";
		const effectiveLabCostKopecks = isLabDefect ? 0 : costPerUnit * count;
		const labelRu = isLabDefect ? "Брак ЗТЛ (переделка за счет лаборатории 0 ₽)" : "Гарантийные обязательства клиники";

		return {
			unitsCount: count, pricePerUnitKopecks: 0, costPerUnitKopecks: costPerUnit, patientPriceTotalKopecks: 0,
			labCostKopecks: effectiveLabCostKopecks, labCostTotalKopecks: effectiveLabCostKopecks,
			clinicGrossMarginKopecks: 0, grossMarginPercent: 0, doctorPercent: doctorPct,
			doctorWageBaseKopecks: 0, doctorWageKopecks: 0,
			clinicNetProfitKopecks: effectiveLabCostKopecks === 0 ? 0 : -effectiveLabCostKopecks,
			patientPriceTotalRub: 0, labCostTotalRub: effectiveLabCostKopecks / 100,
			clinicGrossMarginRub: 0, doctorWageRub: 0,
			clinicNetProfitRub: effectiveLabCostKopecks === 0 ? 0 : -effectiveLabCostKopecks / 100,
			isBalanced: true, isWarrantyRework: true, warrantyLiabilityType: liabilityType,
			warrantyLiabilityKopecks: effectiveLabCostKopecks, warrantyLiabilityRub: effectiveLabCostKopecks / 100,
			warrantyLiabilityLabelRu: labelRu,
		};
	}

	const patientPriceTotalKopecks = pricePerUnit * count;
	const labCostKopecks = costPerUnit * count;
	const clinicGrossMarginKopecks = Math.max(0, patientPriceTotalKopecks - labCostKopecks);
	const grossMarginPercent = patientPriceTotalKopecks > 0
		? Number(((clinicGrossMarginKopecks / patientPriceTotalKopecks) * 100).toFixed(1))
		: 0;

	const doctorWageBaseKopecks = clinicGrossMarginKopecks;
	const doctorWageKopecks = Math.round((doctorWageBaseKopecks * doctorPct) / 100);
	const clinicNetProfitKopecks = doctorWageBaseKopecks - doctorWageKopecks;

	return {
		unitsCount: count, pricePerUnitKopecks: pricePerUnit, costPerUnitKopecks: costPerUnit,
		patientPriceTotalKopecks, labCostKopecks, labCostTotalKopecks: labCostKopecks,
		clinicGrossMarginKopecks, grossMarginPercent, doctorPercent: doctorPct,
		doctorWageBaseKopecks, doctorWageKopecks, clinicNetProfitKopecks,
		patientPriceTotalRub: patientPriceTotalKopecks / 100, labCostTotalRub: labCostKopecks / 100,
		clinicGrossMarginRub: clinicGrossMarginKopecks / 100, doctorWageRub: doctorWageKopecks / 100,
		clinicNetProfitRub: clinicNetProfitKopecks / 100,
		isBalanced: doctorWageKopecks + clinicNetProfitKopecks === doctorWageBaseKopecks,
		isWarrantyRework: false,
	};
}
