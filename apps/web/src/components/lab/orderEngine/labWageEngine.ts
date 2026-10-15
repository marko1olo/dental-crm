export interface ZtlWageFinancials {
	readonly unitsCount: number;
	readonly patientPriceKopecks: number;
	readonly ztlCostKopecks: number;
	readonly doctorWageBaseKopecks: number;
	readonly doctorSharePercent: number;
	readonly doctorWageKopecks: number;
	readonly clinicMarginKopecks: number;
	readonly patientPriceRub: number;
	readonly ztlCostRub: number;
	readonly doctorWageBaseRub: number;
	readonly doctorWageRub: number;
	readonly clinicMarginRub: number;
	readonly isBalanced: boolean;
	readonly isWarrantyRework?: boolean | undefined;
	readonly warrantyLiabilityType?: "clinic_warranty" | "lab_defect" | "patient_fault" | undefined;
	readonly warrantyLiabilityKopecks?: number | undefined;
	readonly warrantyLiabilityRub?: number | undefined;
	readonly warrantyLiabilityLabelRu?: string | undefined;
}

export interface CalculateZtlFinancialsParams {
	readonly unitsCount: number;
	readonly patientPriceRub?: number | undefined;
	readonly patientPriceKopecks?: number | undefined;
	readonly ztlCostRub?: number | undefined;
	readonly ztlCostKopecks?: number | undefined;
	readonly doctorSharePercent?: number | undefined;
	readonly isWarrantyRework?: boolean | undefined;
	readonly warrantyLiabilityType?: "clinic_warranty" | "lab_defect" | "patient_fault" | undefined;
}

export function calculateZtlWageFinancials(params: CalculateZtlFinancialsParams): ZtlWageFinancials {
	const count = Math.max(1, Math.round(params.unitsCount || 1));
	const unitPriceKop = Math.max(
		0,
		Math.round(params.patientPriceKopecks ?? (params.patientPriceRub != null ? params.patientPriceRub * 100 : 2400000)),
	);
	const unitCostKop = Math.max(
		0,
		Math.round(params.ztlCostKopecks ?? (params.ztlCostRub != null ? params.ztlCostRub * 100 : 750000)),
	);
	const docPct = Math.max(0, Math.min(100, params.doctorSharePercent ?? 20));
	const isWarranty = Boolean(params.isWarrantyRework);
	const liabilityType = params.warrantyLiabilityType || "clinic_warranty";

	if (isWarranty) {
		let effectiveZtlCostKop = unitCostKop * count;
		let warrantyLiabilityKopecks = effectiveZtlCostKop;
		let liabilityLabelRu = "Гарантийные обязательства клиники";

		if (liabilityType === "lab_defect") {
			effectiveZtlCostKop = 0;
			warrantyLiabilityKopecks = 0;
			liabilityLabelRu = "Брак ЗТЛ (переделка за счет лаборатории 0 ₽)";
		}

		const clinicMarginKopecks = effectiveZtlCostKop === 0 ? 0 : -effectiveZtlCostKop;

		return {
			unitsCount: count, patientPriceKopecks: 0, ztlCostKopecks: effectiveZtlCostKop,
			doctorWageBaseKopecks: 0, doctorSharePercent: docPct, doctorWageKopecks: 0,
			clinicMarginKopecks, patientPriceRub: 0, ztlCostRub: effectiveZtlCostKop / 100,
			doctorWageBaseRub: 0, doctorWageRub: 0,
			clinicMarginRub: clinicMarginKopecks === 0 ? 0 : clinicMarginKopecks / 100,
			isBalanced: true, isWarrantyRework: true, warrantyLiabilityType: liabilityType,
			warrantyLiabilityKopecks, warrantyLiabilityRub: warrantyLiabilityKopecks / 100,
			warrantyLiabilityLabelRu: liabilityLabelRu,
		};
	}

	const patientPriceKopecks = unitPriceKop * count;
	const ztlCostKopecks = unitCostKop * count;
	const doctorWageBaseKopecks = Math.max(0, patientPriceKopecks - ztlCostKopecks);
	const doctorWageKopecks = Math.round((doctorWageBaseKopecks * docPct) / 100);
	const clinicMarginKopecks = Math.max(0, doctorWageBaseKopecks - doctorWageKopecks);

	return {
		unitsCount: count, patientPriceKopecks, ztlCostKopecks, doctorWageBaseKopecks,
		doctorSharePercent: docPct, doctorWageKopecks, clinicMarginKopecks,
		patientPriceRub: patientPriceKopecks / 100, ztlCostRub: ztlCostKopecks / 100,
		doctorWageBaseRub: doctorWageBaseKopecks / 100, doctorWageRub: doctorWageKopecks / 100,
		clinicMarginRub: clinicMarginKopecks / 100,
		isBalanced: doctorWageKopecks + clinicMarginKopecks === doctorWageBaseKopecks,
		isWarrantyRework: false,
	};
}
