/**
 * DENTE Dental CRM — Doctor & Staff Piece-Rate Payroll Calculation Engine
 * Kopeck-Exact Math, Lab & Material Deductions, KPI Tier Bonuses, Personal Income Tax (НДФЛ 13%)
 */

import {
	DOCTOR_SPECIALTY_PAYROLL_PRESETS,
	KPI_BONUS_TIERS,
	ASSISTANT_SHIFT_RULE,
	type DoctorSpecialtyCommissionRule,
	type AssistantShiftRateRule,
} from "./payrollPresets";

export interface DoctorCompletedServiceItem {
	readonly id: string;
	readonly dateIso: string;
	readonly patientName: string;
	readonly medicalCardNumber: string;
	readonly serviceNameRu: string;
	readonly order804nCode?: string | undefined;
	readonly toothCode?: string | undefined;
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
	input: DoctorPayrollCalculationInput
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

	// External explicit refund deductions (e.g. from refund service / audit)
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

	// Total payout before guarantee: includes earned commissions minus explicit clawbacks plus adjustments
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
	rules: AssistantShiftRateRule = ASSISTANT_SHIFT_RULE
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
 * Generates Russian T-51 compatible payroll summary CSV string with UTF-8 BOM
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
