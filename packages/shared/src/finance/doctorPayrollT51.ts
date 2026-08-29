/**
 * DENTE Dental CRM — Statutory Doctor & Staff Piece-Rate Payroll Engine (Form T-51)
 * Kopeck-Exact Math, Lab & Material Deductions, KPI Tier Bonuses, Personal Income Tax (НДФЛ 13%)
 */

export interface DoctorSpecialtyCommissionRule {
	readonly specialtyId: string;
	readonly titleRu: string;
	readonly defaultPercentage: number; // e.g. 25 = 25%
	readonly retailProductsPercentage: number; // e.g. 10 = 10%
	readonly deductsLabCosts: boolean;
	readonly deductsMaterialCosts: boolean;
	readonly minGuaranteeMonthlyKop: number; // Minimum monthly guaranteed wage
	readonly descriptionRu: string;
}

export interface AssistantShiftRateRule {
	readonly baseShiftRateKop: number; // 3500 RUB = 350000 kop
	readonly radiographBonusKop: number; // 150 RUB = 15000 kop
	readonly surgeryAssistanceBonusKop: number; // 200 RUB = 20000 kop
	readonly overtimeHourlyRateKop: number; // 500 RUB/hr = 50000 kop
}

export interface KpiBonusTier {
	readonly minRevenueKop: number;
	readonly bonusPercentage: number;
	readonly badgeLabelRu: string;
}

export const DOCTOR_SPECIALTY_PAYROLL_PRESETS: readonly DoctorSpecialtyCommissionRule[] = [
	{
		specialtyId: "therapist",
		titleRu: "Врач-стоматолог терапевт / эндодонтист",
		defaultPercentage: 25,
		retailProductsPercentage: 10,
		deductsLabCosts: false,
		deductsMaterialCosts: true,
		minGuaranteeMonthlyKop: 6000000, // 60,000 RUB
		descriptionRu: "25% от выручки за вычетом прямых материалов (пломбировочные, эндомоторы) + 10% за средства домашней гигиены.",
	},
	{
		specialtyId: "orthopedist",
		titleRu: "Врач-стоматолог ортопед (CAD/CAM)",
		defaultPercentage: 25,
		retailProductsPercentage: 5,
		deductsLabCosts: true,
		deductsMaterialCosts: false,
		minGuaranteeMonthlyKop: 8000000, // 80,000 RUB
		descriptionRu: "25% от выручки за вычетом счетов зуботехнической лаборатории (цирконий, керамика, виниры, E.max).",
	},
	{
		specialtyId: "surgeon_implantologist",
		titleRu: "Врач-стоматолог хирург-имплантолог",
		defaultPercentage: 20,
		retailProductsPercentage: 5,
		deductsLabCosts: false,
		deductsMaterialCosts: true,
		minGuaranteeMonthlyKop: 10000000, // 100,000 RUB
		descriptionRu: "20% от имплантации (за вычетом стоимости имплантата и мембран) + 30% от амбулаторных удалений зубов.",
	},
	{
		specialtyId: "orthodontist",
		titleRu: "Врач-ортодонт (брекеты / элайнеры)",
		defaultPercentage: 25,
		retailProductsPercentage: 5,
		deductsLabCosts: true,
		deductsMaterialCosts: false,
		minGuaranteeMonthlyKop: 7500000, // 75,000 RUB
		descriptionRu: "25% от активаций брекет-систем и регулярных приемов, за вычетом стоимости сетапа элайнеров.",
	},
	{
		specialtyId: "hygienist",
		titleRu: "Гигиенист стоматологический",
		defaultPercentage: 30,
		retailProductsPercentage: 15,
		deductsLabCosts: false,
		deductsMaterialCosts: false,
		minGuaranteeMonthlyKop: 4500000, // 45,000 RUB
		descriptionRu: "30% от профессиональной гигиены и отбеливания + 15% за проданные пасты/щетки Curaprox/Oral-B.",
	},
];

export const ASSISTANT_SHIFT_RULE: AssistantShiftRateRule = {
	baseShiftRateKop: 350000, // 3,500 RUB per 6-hour shift
	radiographBonusKop: 15000, // 150 RUB per x-ray
	surgeryAssistanceBonusKop: 20000, // 200 RUB per surgery
	overtimeHourlyRateKop: 50000, // 500 RUB/hr
};

export const KPI_BONUS_TIERS: readonly KpiBonusTier[] = [
	{
		minRevenueKop: 100000000, // 1,000,000 RUB
		bonusPercentage: 5,
		badgeLabelRu: "🌟 Топ-выручка (+5% премия)",
	},
	{
		minRevenueKop: 50000000, // 500,000 RUB
		bonusPercentage: 2,
		badgeLabelRu: "🚀 Личный план выполнен (+2% премия)",
	},
	{
		minRevenueKop: 0,
		bonusPercentage: 0,
		badgeLabelRu: "Базовая ставка",
	},
];

export interface DoctorCompletedServiceItem {
	readonly id: string;
	readonly dateIso: string;
	readonly patientName: string;
	readonly medicalCardNumber: string;
	readonly serviceNameRu: string;
	readonly category: "therapy" | "orthopedics" | "surgery" | "orthodontics" | "hygiene" | "retail_hygiene";
	readonly grossRevenueKop: number;
	readonly labCostKop: number;
	readonly materialCostKop: number;
	readonly customCommissionPercent?: number | undefined;
	readonly isRefunded?: boolean | undefined;
	readonly refundedAmountKop?: number | undefined;
}

export interface DoctorPayrollCalculationInput {
	readonly doctorId: string;
	readonly doctorName: string;
	readonly specialtyId: string;
	readonly periodStartIso: string;
	readonly periodEndIso: string;
	readonly services: readonly DoctorCompletedServiceItem[];
	readonly customBasePercentage?: number | undefined;
	readonly manualAdjustmentKop?: number | undefined; // e.g. advance payment deduction or bonus
	readonly manualAdjustmentNoteRu?: string | undefined;
	readonly refundDeductions?: readonly {
		readonly serviceId?: string | undefined;
		readonly toothCode?: string | undefined;
		readonly serviceNameRu?: string | undefined;
		readonly refundedGrossKop: number;
		readonly reasonRu?: string | undefined;
	}[] | undefined;
}

export interface DoctorPayrollResult {
	readonly doctorId: string;
	readonly doctorName: string;
	readonly specialtyTitleRu: string;
	readonly periodLabelRu: string;
	readonly totalGrossRevenueKop: number;
	readonly totalLabDeductionsKop: number;
	readonly totalMaterialDeductionsKop: number;
	readonly totalNetBaseKop: number;
	readonly totalRefundDeductionsKop: number;
	readonly totalRefundClawbackKop: number;
	readonly refundedServicesCount: number;
	readonly baseCommissionPercent: number;
	readonly earnedBaseCommissionKop: number;
	readonly kpiBonusPercent: number;
	readonly kpiBonusEarnedKop: number;
	readonly kpiTierBadgeRu: string;
	readonly earnedRetailCommissionKop: number;
	readonly grossPayoutBeforeTaxKop: number;
	readonly ndfl13TaxKop: number;
	readonly netPayoutToDoctorKop: number; // "На руки"
	readonly minimumGuaranteeApplied: boolean;
	readonly manualAdjustmentKop: number;
	readonly serviceCount: number;
}

export interface AssistantShiftLogItem {
	readonly id: string;
	readonly dateIso: string;
	readonly shiftType: "standard_6h" | "full_12h" | "overtime_custom";
	readonly hoursWorked: number;
	readonly radiographsTakenCount: number;
	readonly surgeriesAssistedCount: number;
}

export interface AssistantPayrollResult {
	readonly assistantId: string;
	readonly assistantName: string;
	readonly periodLabelRu: string;
	readonly totalShifts: number;
	readonly totalRadiographs: number;
	readonly totalSurgeries: number;
	readonly baseShiftPayoutKop: number;
	readonly radiographPayoutKop: number;
	readonly surgeryPayoutKop: number;
	readonly totalGrossPayoutKop: number;
	readonly ndfl13TaxKop: number;
	readonly netPayoutToAssistantKop: number;
}

/**
 * Calculates kopeck-exact doctor piece-rate payroll with lab/material deductions and KPI tiers
 */
export function calculateDoctorPeriodPayroll(
	input: DoctorPayrollCalculationInput,
): DoctorPayrollResult {
	const defaultPreset = DOCTOR_SPECIALTY_PAYROLL_PRESETS[0]!;
	const preset: DoctorSpecialtyCommissionRule =
		DOCTOR_SPECIALTY_PAYROLL_PRESETS.find((p) => p.specialtyId === input.specialtyId) ??
		defaultPreset;

	const basePercent = input.customBasePercentage ?? preset.defaultPercentage;

	let totalGross = 0;
	let totalLab = 0;
	let totalMaterial = 0;
	let earnedBase = 0;
	let earnedRetail = 0;
	let refundedServicesCount = 0;
	let totalItemRefundsKop = 0;

	for (const item of input.services) {
		const isFullyRefunded = item.isRefunded === true || (item.refundedAmountKop && item.refundedAmountKop >= item.grossRevenueKop);
		const refundKop = Math.min(item.grossRevenueKop, item.refundedAmountKop ?? (item.isRefunded ? item.grossRevenueKop : 0));

		if (isFullyRefunded) {
			refundedServicesCount += 1;
			totalItemRefundsKop += item.grossRevenueKop;
			continue;
		}

		const effectiveGrossKop = Math.max(0, item.grossRevenueKop - refundKop);
		if (refundKop > 0) {
			refundedServicesCount += 1;
			totalItemRefundsKop += refundKop;
		}

		totalGross += effectiveGrossKop;

		const labCost = preset.deductsLabCosts ? item.labCostKop : 0;
		const materialCost = preset.deductsMaterialCosts ? item.materialCostKop : 0;

		totalLab += labCost;
		totalMaterial += materialCost;

		if (item.category === "retail_hygiene") {
			const itemRetailPercent = item.customCommissionPercent ?? preset.retailProductsPercentage;
			const retailEarned = Math.round((effectiveGrossKop * itemRetailPercent) / 100);
			earnedRetail += retailEarned;
		} else {
			const netItemBase = Math.max(0, effectiveGrossKop - labCost - materialCost);
			const itemCommissionPercent = item.customCommissionPercent ?? basePercent;
			const itemEarned = Math.round((netItemBase * itemCommissionPercent) / 100);
			earnedBase += itemEarned;
		}
	}

	// External explicit refund deductions
	let explicitRefundKop = 0;
	let explicitRefundClawbackKop = 0;

	if (input.refundDeductions && input.refundDeductions.length > 0) {
		for (const ref of input.refundDeductions) {
			explicitRefundKop += ref.refundedGrossKop;
			explicitRefundClawbackKop += Math.round((ref.refundedGrossKop * basePercent) / 100);
			refundedServicesCount += 1;
		}
	}

	const totalRefundDeductionsKop = totalItemRefundsKop + explicitRefundKop;
	const totalRefundClawbackKop = explicitRefundClawbackKop;

	const totalNetBase = Math.max(0, totalGross - totalLab - totalMaterial);

	// KPI Bonus evaluation
	let kpiPercent = 0;
	let kpiBadge = "Базовая ставка";
	for (const tier of KPI_BONUS_TIERS) {
		if (totalGross >= tier.minRevenueKop) {
			kpiPercent = tier.bonusPercentage;
			kpiBadge = tier.badgeLabelRu;
			break;
		}
	}

	const kpiBonusEarned = Math.round((totalNetBase * kpiPercent) / 100);
	const manualAdj = input.manualAdjustmentKop ?? 0;

	let preGuaranteePayout = earnedBase + earnedRetail + kpiBonusEarned + manualAdj - totalRefundClawbackKop;
	let guaranteeApplied = false;

	if (preGuaranteePayout < preset.minGuaranteeMonthlyKop && input.services.length > 0) {
		preGuaranteePayout = preset.minGuaranteeMonthlyKop;
		guaranteeApplied = true;
	}

	const grossPayout = Math.max(0, preGuaranteePayout);
	const ndfl13 = Math.round(grossPayout * 0.13);
	const netToDoctor = Math.max(0, grossPayout - ndfl13);

	return {
		doctorId: input.doctorId,
		doctorName: input.doctorName,
		specialtyTitleRu: preset.titleRu,
		periodLabelRu: `${input.periodStartIso} — ${input.periodEndIso}`,
		totalGrossRevenueKop: totalGross,
		totalLabDeductionsKop: totalLab,
		totalMaterialDeductionsKop: totalMaterial,
		totalNetBaseKop: totalNetBase,
		totalRefundDeductionsKop,
		totalRefundClawbackKop,
		refundedServicesCount,
		baseCommissionPercent: basePercent,
		earnedBaseCommissionKop: earnedBase,
		kpiBonusPercent: kpiPercent,
		kpiBonusEarnedKop: kpiBonusEarned,
		kpiTierBadgeRu: kpiBadge,
		earnedRetailCommissionKop: earnedRetail,
		grossPayoutBeforeTaxKop: grossPayout,
		ndfl13TaxKop: ndfl13,
		netPayoutToDoctorKop: netToDoctor,
		minimumGuaranteeApplied: guaranteeApplied,
		manualAdjustmentKop: manualAdj,
		serviceCount: input.services.length,
	};
}

/**
 * Calculates assistant shift pay + piece rate bonuses
 */
export function calculateAssistantPeriodPayroll(
	assistantId: string,
	assistantName: string,
	periodLabel: string,
	shifts: readonly AssistantShiftLogItem[],
	rules: AssistantShiftRateRule = ASSISTANT_SHIFT_RULE,
): AssistantPayrollResult {
	let totalShifts = 0;
	let totalRadiographs = 0;
	let totalSurgeries = 0;
	let baseShiftPayout = 0;

	for (const shift of shifts) {
		totalShifts += 1;
		totalRadiographs += shift.radiographsTakenCount;
		totalSurgeries += shift.surgeriesAssistedCount;

		if (shift.shiftType === "standard_6h") {
			baseShiftPayout += rules.baseShiftRateKop;
		} else if (shift.shiftType === "full_12h") {
			baseShiftPayout += rules.baseShiftRateKop * 2;
		} else {
			baseShiftPayout += Math.round((shift.hoursWorked / 6) * rules.baseShiftRateKop);
		}
	}

	const radiographPayout = totalRadiographs * rules.radiographBonusKop;
	const surgeryPayout = totalSurgeries * rules.surgeryAssistanceBonusKop;
	const grossTotal = baseShiftPayout + radiographPayout + surgeryPayout;
	const ndfl13 = Math.round(grossTotal * 0.13);
	const netToAssistant = Math.max(0, grossTotal - ndfl13);

	return {
		assistantId,
		assistantName,
		periodLabelRu: periodLabel,
		totalShifts,
		totalRadiographs,
		totalSurgeries,
		baseShiftPayoutKop: baseShiftPayout,
		radiographPayoutKop: radiographPayout,
		surgeryPayoutKop: surgeryPayout,
		totalGrossPayoutKop: grossTotal,
		ndfl13TaxKop: ndfl13,
		netPayoutToAssistantKop: netToAssistant,
	};
}

/**
 * Generates Russian Form T-51 compatible payroll summary CSV string with UTF-8 BOM
 */
export function generatePayrollT51Csv(results: readonly DoctorPayrollResult[]): string {
	const header = "Табельный ID;Врач;Специальность;Период;Выручка (руб);Вычет Лаб (руб);Вычет Мат (руб);Базовый %;Начислено (руб);KPI %;KPI Премия (руб);НДФЛ 13% (руб);К выплате на руки (руб)\n";
	const rows = results.map((r) => {
		const grossRub = (r.totalGrossRevenueKop / 100).toFixed(2);
		const labRub = (r.totalLabDeductionsKop / 100).toFixed(2);
		const matRub = (r.totalMaterialDeductionsKop / 100).toFixed(2);
		const baseEarnedRub = (r.earnedBaseCommissionKop / 100).toFixed(2);
		const kpiEarnedRub = (r.kpiBonusEarnedKop / 100).toFixed(2);
		const taxRub = (r.ndfl13TaxKop / 100).toFixed(2);
		const netRub = (r.netPayoutToDoctorKop / 100).toFixed(2);

		return `${r.doctorId};"${r.doctorName}";"${r.specialtyTitleRu}";"${r.periodLabelRu}";${grossRub};${labRub};${matRub};${r.baseCommissionPercent}%;${baseEarnedRub};${r.kpiBonusPercent}%;${kpiEarnedRub};${taxRub};${netRub}`;
	});

	return "\uFEFF" + header + rows.join("\n");
}
