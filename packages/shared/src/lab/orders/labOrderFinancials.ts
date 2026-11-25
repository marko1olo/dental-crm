import {
	calculatePercentDiscountKopecks,
	kopecksToRubles,
	percentageOfKopecks,
	toExactKopecks,
} from "../../money.js";


export interface LabFinancialSplitKopecksResult {
	clinicKopecks: number;
	doctorKopecks: number;
	totalKopecks: number;
	clinicAmountRub: number;
	doctorAmountRub: number;
	isBalanced: boolean;
}

/**
 * Strict kopeck-exact calculation of clinic vs doctor split.
 * Invariant: clinicKopecks + doctorKopecks === totalKopecks (Zero penny-drift).
 */
export function calculateLabFinancialSplitKopecks(
	totalKopecks: number,
	doctorSharePct: number,
): LabFinancialSplitKopecksResult {
	const safeTotalKopecks = Math.max(0, Math.round(Number.isFinite(totalKopecks) ? totalKopecks : 0));
	const safeDoctorPct = Math.min(100, Math.max(0, Number.isFinite(doctorSharePct) ? doctorSharePct : 50));

	// Расчет доли врача через канонический money.ts с защитой от потери нечетной копейки
	const doctorKopecks = calculatePercentDiscountKopecks(safeTotalKopecks, safeDoctorPct);
	const clinicKopecks = safeTotalKopecks - doctorKopecks;

	return {
		clinicKopecks,
		doctorKopecks,
		totalKopecks: safeTotalKopecks,
		clinicAmountRub: kopecksToRubles(clinicKopecks),
		doctorAmountRub: kopecksToRubles(doctorKopecks),
		isBalanced: clinicKopecks + doctorKopecks === safeTotalKopecks,
	};
}

export interface LabOrderFinancialClearingResult {
	patientPriceTotalKopecks: number;
	labCostTotalKopecks: number;
	grossMarginKopecks: number;
	grossMarginPercent: number;
	doctorCommissionKopecks: number;
	doctorPercent: number;
	clinicNetProfitKopecks: number;
	unitsCount: number;
	pricePerUnitKopecks: number;
	costPerUnitKopecks: number;
	isBalanced: boolean;
	isWarrantyRework?: boolean;
	warrantyLiabilityType?: "clinic_warranty" | "lab_defect" | "patient_fault";
	warrantyLiabilityKopecks?: number;
	warrantyLiabilityLabelRu?: string;
}

/**
 * Calculates complete order financial clearing in integer kopecks.
 * Includes warranty rework protocol: patient strictly 0 ₽, costs tracked as clinic liability or lab defect.
 */
export function calculateLabOrderFinancialsKopecks(params: {
	unitsCount: number;
	pricePerUnitKopecks: number;
	costPerUnitKopecks: number;
	doctorPercent?: number;
	isWarrantyRework?: boolean;
	warrantyLiabilityType?: "clinic_warranty" | "lab_defect" | "patient_fault";
}): LabOrderFinancialClearingResult {
	const count = Math.max(1, Math.round(params.unitsCount || 1));
	const pricePerUnit = Math.max(0, Math.round(params.pricePerUnitKopecks || 0));
	const costPerUnit = Math.max(0, Math.round(params.costPerUnitKopecks || 0));
	const doctorPct = Math.max(0, Math.min(100, params.doctorPercent ?? 20));

	const isWarranty = Boolean(params.isWarrantyRework);
	const liabilityType = params.warrantyLiabilityType || "clinic_warranty";

	if (isWarranty) {
		let effectiveLabCostKop = costPerUnit * count;
		let warrantyLiabilityKopecks = effectiveLabCostKop;
		let liabilityLabelRu = "Гарантийные обязательства клиники";

		if (liabilityType === "lab_defect") {
			effectiveLabCostKop = 0;
			warrantyLiabilityKopecks = 0;
			liabilityLabelRu = "Брак ЗТЛ (переделка за счет лаборатории 0 ₽)";
		}

		return {
			patientPriceTotalKopecks: 0,
			labCostTotalKopecks: effectiveLabCostKop,
			grossMarginKopecks: 0,
			grossMarginPercent: 0,
			doctorCommissionKopecks: 0,
			doctorPercent: doctorPct,
			clinicNetProfitKopecks: -effectiveLabCostKop,
			unitsCount: count,
			pricePerUnitKopecks: 0,
			costPerUnitKopecks: costPerUnit,
			isBalanced: true,
			isWarrantyRework: true,
			warrantyLiabilityType: liabilityType,
			warrantyLiabilityKopecks,
			warrantyLiabilityLabelRu: liabilityLabelRu,
		};
	}

	const patientPriceTotalKopecks = pricePerUnit * count;
	const labCostTotalKopecks = costPerUnit * count;
	const grossMarginKopecks = Math.max(0, patientPriceTotalKopecks - labCostTotalKopecks);

	const grossMarginPercent = patientPriceTotalKopecks > 0
		? Math.round((grossMarginKopecks * 1000) / patientPriceTotalKopecks) / 10
		: 0;

	const doctorCommissionKopecks = grossMarginKopecks > 0
		? percentageOfKopecks(toExactKopecks(grossMarginKopecks), Math.round(doctorPct * 100))
		: 0;

	const clinicNetProfitKopecks = grossMarginKopecks - doctorCommissionKopecks;

	return {
		patientPriceTotalKopecks,
		labCostTotalKopecks,
		grossMarginKopecks,
		grossMarginPercent,
		doctorCommissionKopecks,
		doctorPercent: doctorPct,
		clinicNetProfitKopecks,
		unitsCount: count,
		pricePerUnitKopecks: pricePerUnit,
		costPerUnitKopecks: costPerUnit,
		isBalanced: (doctorCommissionKopecks + clinicNetProfitKopecks) === grossMarginKopecks,
		isWarrantyRework: false,
	};
}

export interface BridgeCostCalculationParams {
	abutmentPriceKopecks: number;
	ponticPriceKopecks: number;
	abutmentsCount: number;
	ponticsCount: number;
	abutmentCostKopecks?: number | undefined;
	ponticCostKopecks?: number | undefined;
}

export interface BridgeCostCalculationResult {
	patientPriceKopecks: number;
	labCostKopecks: number;
	abutmentsTotalPatientKopecks: number;
	ponticsTotalPatientKopecks: number;
	abutmentsTotalLabKopecks: number;
	ponticsTotalLabKopecks: number;
}

/**
 * Расчет стоимости мостовидного протеза с дифференциацией опорных коронок и понтиков (Мандат 8bm).
 * Исключает плоское умножение единой цены.
 */
export function calculateBridgeRestorationCostKopecks(
	params: BridgeCostCalculationParams,
): BridgeCostCalculationResult {
	const abutments = Math.max(0, params.abutmentsCount);
	const pontics = Math.max(0, params.ponticsCount);
	const abutmentPrice = Math.max(0, Math.round(params.abutmentPriceKopecks));
	const ponticPrice = Math.max(0, Math.round(params.ponticPriceKopecks));
	const abutmentCost = Math.max(0, Math.round(params.abutmentCostKopecks ?? Math.round(abutmentPrice * 0.35)));
	const ponticCost = Math.max(0, Math.round(params.ponticCostKopecks ?? Math.round(ponticPrice * 0.35)));

	const abutmentsTotalPatientKopecks = abutmentPrice * abutments;
	const ponticsTotalPatientKopecks = ponticPrice * pontics;
	const patientPriceKopecks = abutmentsTotalPatientKopecks + ponticsTotalPatientKopecks;

	const abutmentsTotalLabKopecks = abutmentCost * abutments;
	const ponticsTotalLabKopecks = ponticCost * pontics;
	const labCostKopecks = abutmentsTotalLabKopecks + ponticsTotalLabKopecks;

	return {
		patientPriceKopecks,
		labCostKopecks,
		abutmentsTotalPatientKopecks,
		ponticsTotalPatientKopecks,
		abutmentsTotalLabKopecks,
		ponticsTotalLabKopecks,
	};
}

/**
 * Разделение зубов мостовидного протеза на опорные коронки (abutments) и промежуточные части (pontics).
 */
export function partitionBridgeTeethFdi(teethFdi: readonly number[]): {
	abutmentTeethFdi: number[];
	ponticTeethFdi: number[];
} {
	if (!teethFdi || teethFdi.length === 0) {
		return { abutmentTeethFdi: [], ponticTeethFdi: [] };
	}
	const sorted = [...teethFdi].sort((a, b) => a - b);
	if (sorted.length <= 2) {
		return { abutmentTeethFdi: sorted, ponticTeethFdi: [] };
	}
	const firstTooth = sorted[0];
	const lastTooth = sorted[sorted.length - 1];
	if (firstTooth === undefined || lastTooth === undefined) {
		return { abutmentTeethFdi: [], ponticTeethFdi: [] };
	}
	const abutments = [firstTooth, lastTooth];
	const pontics = sorted.slice(1, -1);
	return { abutmentTeethFdi: abutments, ponticTeethFdi: pontics };
}
