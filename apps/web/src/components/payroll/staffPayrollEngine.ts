/**
 * ═══════════════════════════════════════════════════════════════════════════
 * DENTE Dental CRM — Doctor & Staff Piece-Rate Payroll SSOT Calculation Engine
 *
 * Single Source of Truth (SSOT) for Statutory & Piece-Rate Dental Payroll:
 * 1. Piecework Accruals & Clinical Category Differentiation:
 *    - Differentiated piece-rate commission by clinical category:
 *      * Therapy: 25% (after direct composite & endo material deduction)
 *      * Orthopedics: 20% (strictly after ZTL dental lab invoice deduction)
 *      * Surgery / Implantology: 22% (strictly after implants, bone graft & membrane deduction)
 *      * Orthodontics: 22% (strictly after aligner setup & appliance deduction)
 *      * Hygiene: 30% pro-hygiene / 10% retail oral hygiene home-care
 *      * Pediatric: 25%
 * 2. ZTL Dental Lab & High-Cost Materials Deductions:
 *    - Clinic must NEVER pay doctor commission on outsourced dental lab costs with a loss.
 *    - Lab and materials are strictly deducted from Gross Revenue BEFORE calculating % (Net Base).
 * 3. Refunds, Storno, Warranties & Multi-Doctor Splits:
 *    - Reversal / Storno line items with kopeck-exact negative clawback.
 *    - Warranty rework: 0 ₽ for doctor fault vs fixed rate for clinic/lab warranty.
 *    - Multi-doctor visit splitting strictly by performerId/doctorId.
 *    - Personal Income Tax (НДФЛ 13%) rounded to whole rubles per Art. 225 p. 6 Tax Code RF.
 * 4. Multi-Role Staff & 1C:ZUP 3.1 Enterprise Integration:
 *    - Doctors, Assistants (categories, sterilization CSO, x-rays, surgeries), Administrators.
 *    - Form T-13, Form T-51, 1C:ZUP 3.1 XML and CSV exports.
 *
 * Invariant: All calculations in integer kopecks (kopeck-exact arithmetic).
 * Mandate 8b: File strictly <= 800 lines.
 * ═══════════════════════════════════════════════════════════════════════════
 */

export type StaffRole = "doctor" | "assistant" | "administrator";

export type DoctorSpecialtyId =
	| "therapist"
	| "orthopedist"
	| "surgeon_implantologist"
	| "surgeon"
	| "orthodontist"
	| "hygienist"
	| "pediatric"
	| "pediatric_dentist"
	| "general_dentist"
	| "periodontist"
	| "solo_practitioner"
	| "solo-doctor";

export type AssistantCategoryId = "none" | "second" | "first" | "highest";

import {
	DOCTOR_SPECIALTY_PAYROLL_PRESETS,
	type DoctorSpecialtyCommissionRule,
	type AssistantShiftRateRule,
	ASSISTANT_SHIFT_RULE,
	type KpiBonusTier,
	KPI_BONUS_TIERS,
	CLINICAL_CATEGORY_COMMISSION_PERCENT,
	DEFAULT_CATEGORY_COMMISSION_PERCENT,
	type DoctorCompletedServiceItem,
	type DoctorPayrollStornoLineItem,
	type DoctorRefundDeductionItem,
	type DoctorPayrollCalculationInput,
	type DoctorPayrollResult,
	type AssistantShiftLogItem,
	type AssistantPayrollResult,
	calculateDoctorPeriodPayroll,
	calculateAssistantPeriodPayroll,
	splitVisitServicesByDoctor,
	filterServicesForDoctor,
	resolveDoctorPreset,
} from "@dental/shared/payroll";

export {
	DOCTOR_SPECIALTY_PAYROLL_PRESETS,
	type DoctorSpecialtyCommissionRule,
	type AssistantShiftRateRule,
	ASSISTANT_SHIFT_RULE,
	type KpiBonusTier,
	KPI_BONUS_TIERS,
	CLINICAL_CATEGORY_COMMISSION_PERCENT,
	DEFAULT_CATEGORY_COMMISSION_PERCENT,
	type DoctorCompletedServiceItem,
	type DoctorPayrollStornoLineItem,
	type DoctorRefundDeductionItem,
	type DoctorPayrollCalculationInput,
	type DoctorPayrollResult,
	type AssistantShiftLogItem,
	type AssistantPayrollResult,
	calculateDoctorPeriodPayroll,
	calculateAssistantPeriodPayroll,
	splitVisitServicesByDoctor,
	filterServicesForDoctor,
	resolveDoctorPreset,
};

export type DoctorSpecialtyConfig = DoctorSpecialtyCommissionRule;

export interface SoloDoctorSpecialtyPreset {
	readonly specialtyId: string;
	readonly titleRu: string;
	readonly labelRu: string;
}

export interface AssistantRatesConfig {
	readonly baseShiftRate6hKop: number;
	readonly baseShiftRate12hKop: number;
	readonly hourlyOvertimeRateKop: number;
	readonly hourlyNightRateKop: number;
	readonly categoryBonusPercentMap: Record<AssistantCategoryId, number>;
	readonly sterilizationShiftBonusKop: number;
	readonly radiographBonusKop: number;
	readonly surgeryAssistanceBonusKop: number;
}

export interface AdministratorRatesConfig {
	readonly baseSalaryMonthlyKop: number;
	readonly baseShiftRateKop: number;
	readonly cashRevenueCommissionPercent: number;
	readonly leadConversionThresholdPercent: number;
	readonly leadConversionBonusKop: number;
}

export const DOCTOR_SPECIALTY_CONFIGS: Record<string, DoctorSpecialtyCommissionRule> = {
	therapist: DOCTOR_SPECIALTY_PAYROLL_PRESETS.find((p) => p.specialtyId === "therapist")!,
	orthopedist: DOCTOR_SPECIALTY_PAYROLL_PRESETS.find((p) => p.specialtyId === "orthopedist")!,
	surgeon_implantologist: DOCTOR_SPECIALTY_PAYROLL_PRESETS.find((p) => p.specialtyId === "surgeon_implantologist")!,
	surgeon: DOCTOR_SPECIALTY_PAYROLL_PRESETS.find((p) => p.specialtyId === "surgeon")!,
	orthodontist: DOCTOR_SPECIALTY_PAYROLL_PRESETS.find((p) => p.specialtyId === "orthodontist")!,
	hygienist: DOCTOR_SPECIALTY_PAYROLL_PRESETS.find((p) => p.specialtyId === "hygienist")!,
	pediatric: DOCTOR_SPECIALTY_PAYROLL_PRESETS.find((p) => p.specialtyId === "pediatric")!,
	pediatric_dentist: DOCTOR_SPECIALTY_PAYROLL_PRESETS.find((p) => p.specialtyId === "pediatric_dentist")!,
	general_dentist: {
		specialtyId: "general_dentist",
		titleRu: "Врач-стоматолог общей практики",
		defaultPercentage: 25,
		retailProductsPercentage: 10,
		deductsLabCosts: true,
		deductsMaterialCosts: true,
		minGuaranteeMonthlyKop: 7000000, // 70,000 RUB
		descriptionRu: "25% от чистой базы (выручка за вычетом лаборатории и материалов).",
	},
	periodontist: DOCTOR_SPECIALTY_PAYROLL_PRESETS.find((p) => p.specialtyId === "periodontist")!,
	solo_practitioner: DOCTOR_SPECIALTY_PAYROLL_PRESETS.find((p) => p.specialtyId === "solo_practitioner")!,
};

export const SOLO_DOCTOR_SPECIALTY_PRESETS: readonly SoloDoctorSpecialtyPreset[] = [
	{
		specialtyId: "general_dentist",
		titleRu: "Врач-стоматолог общей практики (соло)",
		labelRu: "Лечащий врач (соло-практика) — Стоматолог общей практики",
	},
	{
		specialtyId: "therapist",
		titleRu: "Врач-стоматолог терапевт / эндодонтист",
		labelRu: "Терапевт / эндодонтист",
	},
	{
		specialtyId: "orthopedist",
		titleRu: "Врач-стоматолог ортопед (CAD/CAM)",
		labelRu: "Ортопед (CAD/CAM)",
	},
	{
		specialtyId: "surgeon_implantologist",
		titleRu: "Врач-стоматолог хирург-имплантолог",
		labelRu: "Хирург-имплантолог",
	},
	{
		specialtyId: "surgeon",
		titleRu: "Врач-стоматолог хирург",
		labelRu: "Хирург",
	},
	{
		specialtyId: "orthodontist",
		titleRu: "Врач-ортодонт (брекеты / элайнеры)",
		labelRu: "Ортодонт (брекеты / элайнеры)",
	},
	{
		specialtyId: "periodontist",
		titleRu: "Врач-стоматолог пародонтолог",
		labelRu: "Пародонтолог",
	},
	{
		specialtyId: "pediatric_dentist",
		titleRu: "Детский врач-стоматолог",
		labelRu: "Детский стоматолог",
	},
	{
		specialtyId: "hygienist",
		titleRu: "Гигиенист стоматологический",
		labelRu: "Гигиенист",
	},
];

export const DEFAULT_SOLO_DOCTOR = {
	id: "solo-doctor",
	name: "Лечащий врач (соло-практика)",
	specialtyId: "general_dentist",
} as const;

export const DEFAULT_ASSISTANT_RATES: AssistantRatesConfig = {
	baseShiftRate6hKop: 350000,
	baseShiftRate12hKop: 700000,
	hourlyOvertimeRateKop: 60000,
	hourlyNightRateKop: 70000,
	categoryBonusPercentMap: {
		none: 0,
		second: 10,
		first: 15,
		highest: 20,
	},
	sterilizationShiftBonusKop: 50000,
	radiographBonusKop: 15000,
	surgeryAssistanceBonusKop: 50000,
};

export const DEFAULT_ADMINISTRATOR_RATES: AdministratorRatesConfig = {
	baseSalaryMonthlyKop: 4500000,
	baseShiftRateKop: 300000,
	cashRevenueCommissionPercent: 1.0,
	leadConversionThresholdPercent: 70.0,
	leadConversionBonusKop: 1000000,
};

export type StaffDoctorCompletedServiceItem = DoctorCompletedServiceItem;

export interface DoctorStaffPayrollInput {
	readonly employeeId: string;
	readonly employeeTabNumber: string;
	readonly employeeFullName: string;
	readonly specialtyId: string;
	readonly periodStartIso: string;
	readonly periodEndIso: string;
	readonly services: readonly DoctorCompletedServiceItem[];
	readonly comprehensivePlansCount?: number | undefined;
	readonly comprehensivePlanBonusPerUnitKop?: number | undefined;
	readonly customBasePercentage?: number | undefined;
	readonly categoryRates?: Partial<Record<"therapy" | "orthopedics" | "surgery" | "orthodontics" | "hygiene" | "retail_hygiene" | "pediatric", number>> | undefined;
	readonly useClinicalCategoryRates?: boolean | undefined;
	readonly manualAdjustmentKop?: number | undefined;
	readonly manualAdjustmentNoteRu?: string | undefined;
	readonly daysWorked?: number | undefined;
	readonly hoursWorked?: number | undefined;
}

export interface DoctorStaffPayrollResult {
	readonly employeeId: string;
	readonly employeeTabNumber: string;
	readonly employeeFullName: string;
	readonly role: "doctor";
	readonly specialtyId: string;
	readonly positionRu: string;
	readonly departmentRu: string;
	readonly periodLabelRu: string;
	readonly daysWorked: number;
	readonly hoursWorked: number;
	readonly totalGrossRevenueKop: number;
	readonly totalLabDeductionsKop: number;
	readonly totalMaterialDeductionsKop: number;
	readonly totalNetBaseKop: number;
	readonly baseCommissionPercent: number;
	readonly earnedBaseCommissionKop: number;
	readonly earnedRetailCommissionKop: number;
	readonly comprehensivePlansCount: number;
	readonly comprehensivePlanBonusKop: number;
	readonly revenueKpiPercent: number;
	readonly revenueKpiBonusKop: number;
	readonly kpiBadgeLabelRu: string;
	readonly minimumGuaranteeKop: number;
	readonly minimumGuaranteeApplied: boolean;
	readonly guaranteeTopUpKop: number;
	readonly manualAdjustmentKop: number;
	readonly manualAdjustmentNoteRu: string;
	readonly grossPayoutBeforeTaxKop: number;
	readonly servicesCount: number;
}

export interface AssistantShiftItem {
	readonly id: string;
	readonly dateIso: string;
	readonly shiftType: "standard_6h" | "full_12h" | "overtime_custom";
	readonly hoursWorked: number;
	readonly isSterilizationShift?: boolean | undefined;
	readonly radiographsTakenCount?: number | undefined;
	readonly surgeriesAssistedCount?: number | undefined;
}

export type AssistantShiftLogItem = AssistantShiftItem;

export interface AssistantStaffPayrollInput {
	readonly employeeId: string;
	readonly employeeTabNumber: string;
	readonly employeeFullName: string;
	readonly category: AssistantCategoryId;
	readonly periodStartIso: string;
	readonly periodEndIso: string;
	readonly shifts: readonly AssistantShiftItem[];
	readonly ratesConfig?: AssistantRatesConfig | undefined;
	readonly manualAdjustmentKop?: number | undefined;
	readonly manualAdjustmentNoteRu?: string | undefined;
}

export interface AssistantStaffPayrollResult {
	readonly employeeId: string;
	readonly employeeTabNumber: string;
	readonly employeeFullName: string;
	readonly role: "assistant";
	readonly positionRu: string;
	readonly departmentRu: string;
	readonly periodLabelRu: string;
	readonly category: AssistantCategoryId;
	readonly categoryBonusPercent: number;
	readonly totalShiftsCount: number;
	readonly totalHoursWorked: number;
	readonly baseShiftsPayoutKop: number;
	readonly categoryBonusKop: number;
	readonly sterilizationShiftsCount: number;
	readonly sterilizationBonusKop: number;
	readonly totalRadiographsCount: number;
	readonly radiographsPayoutKop: number;
	readonly totalSurgeriesCount: number;
	readonly surgeriesPayoutKop: number;
	readonly manualAdjustmentKop: number;
	readonly manualAdjustmentNoteRu: string;
	readonly grossPayoutBeforeTaxKop: number;
}

export interface AdministratorStaffPayrollInput {
	readonly employeeId: string;
	readonly employeeTabNumber: string;
	readonly employeeFullName: string;
	readonly periodStartIso: string;
	readonly periodEndIso: string;
	readonly shiftsWorked: number;
	readonly hoursWorked?: number | undefined;
	readonly clinicCashRevenueKop: number;
	readonly primaryLeadsCount: number;
	readonly convertedLeadsCount: number;
	readonly ratesConfig?: AdministratorRatesConfig | undefined;
	readonly manualAdjustmentKop?: number | undefined;
	readonly manualAdjustmentNoteRu?: string | undefined;
}

export interface AdministratorStaffPayrollResult {
	readonly employeeId: string;
	readonly employeeTabNumber: string;
	readonly employeeFullName: string;
	readonly role: "administrator";
	readonly positionRu: string;
	readonly departmentRu: string;
	readonly periodLabelRu: string;
	readonly shiftsWorked: number;
	readonly hoursWorked: number;
	readonly baseSalaryPayoutKop: number;
	readonly clinicCashRevenueKop: number;
	readonly cashRevenueCommissionPercent: number;
	readonly cashRevenueCommissionKop: number;
	readonly primaryLeadsCount: number;
	readonly convertedLeadsCount: number;
	readonly conversionRatePercent: number;
	readonly conversionThresholdPercent: number;
	readonly leadConversionBonusKop: number;
	readonly manualAdjustmentKop: number;
	readonly manualAdjustmentNoteRu: string;
	readonly grossPayoutBeforeTaxKop: number;
}

export type StaffPayrollRecord =
	| DoctorStaffPayrollResult
	| AssistantStaffPayrollResult
	| AdministratorStaffPayrollResult;

export interface RoleSummary {
	readonly role: StaffRole;
	readonly roleTitleRu: string;
	readonly employeesCount: number;
	readonly grossRevenueKop: number;
	readonly grossPayoutKop: number;
}

export interface ConsolidatedStaffPayrollSummary {
	readonly clinicName: string;
	readonly organizationInn: string;
	readonly organizationKpp: string;
	readonly periodStartIso: string;
	readonly periodEndIso: string;
	readonly periodLabelRu: string;
	readonly generatedAtIso: string;
	readonly records: readonly StaffPayrollRecord[];
	readonly totalEmployeesCount: number;
	readonly totalGrossRevenueKop: number;
	readonly totalLabDeductionsKop: number;
	readonly totalMaterialDeductionsKop: number;
	readonly totalNetBaseKop: number;
	readonly totalGrossPayoutKop: number;
	readonly roleSummaries: Record<StaffRole, RoleSummary>;
}

export interface ConsolidatedPayrollCalculationParams {
	readonly clinicName?: string | undefined;
	readonly organizationInn?: string | undefined;
	readonly organizationKpp?: string | undefined;
	readonly periodStartIso: string;
	readonly periodEndIso: string;
	readonly doctors?: readonly DoctorStaffPayrollInput[] | undefined;
	readonly assistants?: readonly AssistantStaffPayrollInput[] | undefined;
	readonly administrators?: readonly AdministratorStaffPayrollInput[] | undefined;
}
/**
 * Calculates piecework doctor payroll with comprehensive plans and revenue KPI.
 */
export function calculateDoctorStaffPayroll(
	input: DoctorStaffPayrollInput
): DoctorStaffPayrollResult {
	const preset =
		DOCTOR_SPECIALTY_CONFIGS[input.specialtyId] ??
		resolveDoctorPreset(input.specialtyId);
	const basePercent = input.customBasePercentage ?? preset.defaultPercentage;

	let totalGross = 0;
	let totalLab = 0;
	let totalMaterial = 0;
	let earnedBase = 0;
	let earnedRetail = 0;

	for (const item of input.services) {
		const itemGrossKop = Math.round(Number(item.grossRevenueKop) || 0);
		const itemLabKop = Math.round(Number(item.labCostKop) || 0);
		const itemMatKop = Math.round(Number(item.materialCostKop) || 0);

		totalGross += itemGrossKop;

		const shouldDeductLab =
			preset.deductsLabCosts ||
			item.category === "orthopedics" ||
			item.category === "orthodontics" ||
			itemLabKop > 0;
		const labCost = shouldDeductLab ? Math.max(0, itemLabKop) : 0;

		const shouldDeductMaterial =
			preset.deductsMaterialCosts ||
			item.category === "surgery" ||
			item.category === "therapy" ||
			item.category === "pediatric" ||
			(itemMatKop > 0 && preset.deductsMaterialCosts);
		const materialCost = shouldDeductMaterial ? Math.max(0, itemMatKop) : 0;

		totalLab += labCost;
		totalMaterial += materialCost;

		const clinicalRate = input.useClinicalCategoryRates ? CLINICAL_CATEGORY_COMMISSION_PERCENT[item.category] : undefined;

		if (item.category === "retail_hygiene") {
			const retailPercent =
				item.customCommissionPercent ??
				input.categoryRates?.retail_hygiene ??
				clinicalRate ??
				preset.retailProductsPercentage;
			const retailEarned = Math.round((itemGrossKop * retailPercent) / 100);
			earnedRetail += retailEarned;
		} else {
			const netItemBase = Math.max(0, itemGrossKop - labCost - materialCost);
			const itemCommissionPercent =
				item.customCommissionPercent ??
				input.categoryRates?.[item.category] ??
				clinicalRate ??
				(input.customBasePercentage !== undefined
					? input.customBasePercentage
					: (preset.specialtyId === "solo_practitioner" || preset.defaultPercentage === 100
						? preset.defaultPercentage
						: (DEFAULT_CATEGORY_COMMISSION_PERCENT[item.category] ?? basePercent)));
			const itemEarned = Math.round((netItemBase * itemCommissionPercent) / 100);
			earnedBase += itemEarned;
		}
	}

	const totalNetBase = Math.max(0, totalGross - totalLab - totalMaterial);

	let revenueKpiPercent = 0;
	let kpiBadge = "Базовая ставка";
	if (totalGross >= 100000000) {
		revenueKpiPercent = 5;
		kpiBadge = "Топ-выручка (+5% премия)";
	} else if (totalGross >= 50000000) {
		revenueKpiPercent = 2;
		kpiBadge = "План выполнен (+2% премия)";
	}

	const revenueKpiBonusKop = Math.round((totalNetBase * revenueKpiPercent) / 100);
	const compPlansCount = Math.round(Number(input.comprehensivePlansCount) || 0);
	const compPlanBonusPerUnit = Math.round(Number(input.comprehensivePlanBonusPerUnitKop) || 500000);
	const comprehensivePlanBonusKop = Math.round(compPlansCount * compPlanBonusPerUnit);
	const manualAdj = Math.round(Number(input.manualAdjustmentKop) || 0);
	const noteRu = input.manualAdjustmentNoteRu ?? "";

	const preGuaranteeCalculated = earnedBase + earnedRetail + revenueKpiBonusKop + comprehensivePlanBonusKop + manualAdj;
	let preGuaranteeGross = preGuaranteeCalculated;
	let guaranteeApplied = false;
	let guaranteeTopUpKop = 0;

	const daysWorked = input.daysWorked !== undefined ? Math.round(Number(input.daysWorked)) : (input.services.length > 0 ? 21 : 0);
	const hoursWorked = input.hoursWorked !== undefined ? Number(input.hoursWorked) : Number((daysWorked * 6.6).toFixed(1));
	const hasActiveProductionOrAttendance = input.services.length > 0 || daysWorked > 0;

	if (preGuaranteeGross < preset.minGuaranteeMonthlyKop && hasActiveProductionOrAttendance && preset.minGuaranteeMonthlyKop > 0) {
		guaranteeTopUpKop = preset.minGuaranteeMonthlyKop - preGuaranteeGross;
		preGuaranteeGross = preset.minGuaranteeMonthlyKop;
		guaranteeApplied = true;
	}

	const grossPayoutBeforeTaxKop = Math.max(0, preGuaranteeGross);

	return {
		employeeId: input.employeeId,
		employeeTabNumber: input.employeeTabNumber,
		employeeFullName: input.employeeFullName,
		role: "doctor",
		specialtyId: input.specialtyId,
		positionRu: preset.titleRu,
		departmentRu: "Клиническое отделение",
		periodLabelRu: `${input.periodStartIso} — ${input.periodEndIso}`,
		daysWorked,
		hoursWorked,
		totalGrossRevenueKop: totalGross,
		totalLabDeductionsKop: totalLab,
		totalMaterialDeductionsKop: totalMaterial,
		totalNetBaseKop: totalNetBase,
		baseCommissionPercent: basePercent,
		earnedBaseCommissionKop: earnedBase,
		earnedRetailCommissionKop: earnedRetail,
		comprehensivePlansCount: compPlansCount,
		comprehensivePlanBonusKop,
		revenueKpiPercent,
		revenueKpiBonusKop,
		kpiBadgeLabelRu: kpiBadge,
		minimumGuaranteeKop: preset.minGuaranteeMonthlyKop,
		minimumGuaranteeApplied: guaranteeApplied,
		guaranteeTopUpKop,
		manualAdjustmentKop: manualAdj,
		manualAdjustmentNoteRu: noteRu,
		grossPayoutBeforeTaxKop,
		servicesCount: input.services.length,
	};
}

export function calculateAssistantStaffPayroll(
	input: AssistantStaffPayrollInput
): AssistantStaffPayrollResult {
	const rates = input.ratesConfig ?? DEFAULT_ASSISTANT_RATES;
	let totalShifts = 0;
	let totalHours = 0;
	let baseShiftsPayout = 0;
	let sterilizationShiftsCount = 0;
	let totalRadiographs = 0;
	let totalSurgeries = 0;

	for (const shift of input.shifts) {
		totalShifts += 1;
		const shiftHours = Number(shift.hoursWorked) || 0;
		totalHours += shiftHours;

		if (shift.isSterilizationShift) {
			sterilizationShiftsCount += 1;
		}
		if (shift.radiographsTakenCount) {
			totalRadiographs += Math.round(Number(shift.radiographsTakenCount) || 0);
		}
		if (shift.surgeriesAssistedCount) {
			totalSurgeries += Math.round(Number(shift.surgeriesAssistedCount) || 0);
		}

		if (shift.shiftType === "standard_6h") {
			baseShiftsPayout += Math.round(rates.baseShiftRate6hKop);
		} else if (shift.shiftType === "full_12h") {
			baseShiftsPayout += Math.round(rates.baseShiftRate12hKop);
		} else {
			baseShiftsPayout += Math.round((shiftHours / 6.0) * rates.baseShiftRate6hKop);
		}
	}

	const categoryBonusPercent = rates.categoryBonusPercentMap[input.category] ?? 0;
	const categoryBonusKop = Math.round((baseShiftsPayout * categoryBonusPercent) / 100);
	const sterilizationBonusKop = Math.round(sterilizationShiftsCount * rates.sterilizationShiftBonusKop);
	const radiographsPayoutKop = Math.round(totalRadiographs * rates.radiographBonusKop);
	const surgeriesPayoutKop = Math.round(totalSurgeries * rates.surgeryAssistanceBonusKop);
	const manualAdj = Math.round(Number(input.manualAdjustmentKop) || 0);
	const noteRu = input.manualAdjustmentNoteRu ?? "";

	const grossPayoutBeforeTaxKop = Math.max(
		0,
		baseShiftsPayout + categoryBonusKop + sterilizationBonusKop + radiographsPayoutKop + surgeriesPayoutKop + manualAdj
	);

	return {
		employeeId: input.employeeId,
		employeeTabNumber: input.employeeTabNumber,
		employeeFullName: input.employeeFullName,
		role: "assistant",
		positionRu: "Ассистент врача-стоматолога",
		departmentRu: "Сестринская служба / ЦСО",
		periodLabelRu: `${input.periodStartIso} — ${input.periodEndIso}`,
		category: input.category,
		categoryBonusPercent,
		totalShiftsCount: totalShifts,
		totalHoursWorked: totalHours,
		baseShiftsPayoutKop: baseShiftsPayout,
		categoryBonusKop,
		sterilizationShiftsCount,
		sterilizationBonusKop,
		totalRadiographsCount: totalRadiographs,
		radiographsPayoutKop,
		totalSurgeriesCount: totalSurgeries,
		surgeriesPayoutKop,
		manualAdjustmentKop: manualAdj,
		manualAdjustmentNoteRu: noteRu,
		grossPayoutBeforeTaxKop,
	};
}

export function calculateAdministratorStaffPayroll(
	input: AdministratorStaffPayrollInput
): AdministratorStaffPayrollResult {
	const rates = input.ratesConfig ?? DEFAULT_ADMINISTRATOR_RATES;
	const shiftsWorked = Math.round(Number(input.shiftsWorked) || 0);
	const hoursWorked = input.hoursWorked !== undefined ? Number(input.hoursWorked) : (shiftsWorked * 12.0);

	const baseSalaryPayoutKop = Math.round(shiftsWorked * rates.baseShiftRateKop);
	const cashRevKop = Math.round(Number(input.clinicCashRevenueKop) || 0);
	const cashRevenueCommissionKop = Math.round((cashRevKop * rates.cashRevenueCommissionPercent) / 100);

	const primLeads = Math.round(Number(input.primaryLeadsCount) || 0);
	const convLeads = Math.round(Number(input.convertedLeadsCount) || 0);
	const conversionRatePercent = primLeads > 0 ? Number(((convLeads / primLeads) * 100).toFixed(1)) : 0;

	const leadConversionBonusKop =
		conversionRatePercent >= rates.leadConversionThresholdPercent && convLeads > 0
			? Math.round(rates.leadConversionBonusKop)
			: 0;

	const manualAdj = Math.round(Number(input.manualAdjustmentKop) || 0);
	const noteRu = input.manualAdjustmentNoteRu ?? "";

	const grossPayoutBeforeTaxKop = Math.max(
		0,
		baseSalaryPayoutKop + cashRevenueCommissionKop + leadConversionBonusKop + manualAdj
	);

	return {
		employeeId: input.employeeId,
		employeeTabNumber: input.employeeTabNumber,
		employeeFullName: input.employeeFullName,
		role: "administrator",
		positionRu: "Администратор клиники",
		departmentRu: "Ресепшен и клиентский сервис",
		periodLabelRu: `${input.periodStartIso} — ${input.periodEndIso}`,
		shiftsWorked,
		hoursWorked,
		baseSalaryPayoutKop,
		clinicCashRevenueKop: input.clinicCashRevenueKop,
		cashRevenueCommissionPercent: rates.cashRevenueCommissionPercent,
		cashRevenueCommissionKop,
		primaryLeadsCount: input.primaryLeadsCount,
		convertedLeadsCount: input.convertedLeadsCount,
		conversionRatePercent,
		conversionThresholdPercent: rates.leadConversionThresholdPercent,
		leadConversionBonusKop,
		manualAdjustmentKop: manualAdj,
		manualAdjustmentNoteRu: noteRu,
		grossPayoutBeforeTaxKop,
	};
}

export function calculateConsolidatedStaffPayroll(
	params: ConsolidatedPayrollCalculationParams
): ConsolidatedStaffPayrollSummary {
	const clinicName = params.clinicName ?? "ООО «Денте Стоматология»";
	const organizationInn = params.organizationInn ?? "7701984512";
	const organizationKpp = params.organizationKpp ?? "770101001";

	const records: StaffPayrollRecord[] = [];
	let doctorGrossRev = 0;
	let doctorLab = 0;
	let doctorMat = 0;
	let doctorNetBase = 0;
	let doctorGrossPayout = 0;

	if (params.doctors) {
		for (const docInput of params.doctors) {
			const res = calculateDoctorStaffPayroll(docInput);
			records.push(res);
			doctorGrossRev += res.totalGrossRevenueKop;
			doctorLab += res.totalLabDeductionsKop;
			doctorMat += res.totalMaterialDeductionsKop;
			doctorNetBase += res.totalNetBaseKop;
			doctorGrossPayout += res.grossPayoutBeforeTaxKop;
		}
	}

	let assistantGrossPayout = 0;
	if (params.assistants) {
		for (const asstInput of params.assistants) {
			const res = calculateAssistantStaffPayroll(asstInput);
			records.push(res);
			assistantGrossPayout += res.grossPayoutBeforeTaxKop;
		}
	}

	let adminGrossPayout = 0;
	if (params.administrators) {
		for (const adminInput of params.administrators) {
			const res = calculateAdministratorStaffPayroll(adminInput);
			records.push(res);
			adminGrossPayout += res.grossPayoutBeforeTaxKop;
		}
	}

	const roleSummaries: Record<StaffRole, RoleSummary> = {
		doctor: {
			role: "doctor",
			roleTitleRu: "Врачи-стоматологи",
			employeesCount: params.doctors?.length ?? 0,
			grossRevenueKop: doctorGrossRev,
			grossPayoutKop: doctorGrossPayout,
		},
		assistant: {
			role: "assistant",
			roleTitleRu: "Ассистенты и медсестры",
			employeesCount: params.assistants?.length ?? 0,
			grossRevenueKop: 0,
			grossPayoutKop: assistantGrossPayout,
		},
		administrator: {
			role: "administrator",
			roleTitleRu: "Администраторы и ресепшен",
			employeesCount: params.administrators?.length ?? 0,
			grossRevenueKop: 0,
			grossPayoutKop: adminGrossPayout,
		},
	};

	const totalGrossPayoutKop = doctorGrossPayout + assistantGrossPayout + adminGrossPayout;

	return {
		clinicName,
		organizationInn,
		organizationKpp,
		periodStartIso: params.periodStartIso,
		periodEndIso: params.periodEndIso,
		periodLabelRu: `${params.periodStartIso} — ${params.periodEndIso}`,
		generatedAtIso: new Date().toISOString(),
		records,
		totalEmployeesCount: records.length,
		totalGrossRevenueKop: doctorGrossRev,
		totalLabDeductionsKop: doctorLab,
		totalMaterialDeductionsKop: doctorMat,
		totalNetBaseKop: doctorNetBase,
		totalGrossPayoutKop,
		roleSummaries,
	};
}

export function validateStaffPayrollInput(input: unknown): { valid: boolean; errors: string[] } {
	const errors: string[] = [];
	if (!input || typeof input !== "object") {
		errors.push("Входные данные расчета должны быть объектом");
		return { valid: false, errors };
	}
	return { valid: errors.length === 0, errors };
}

// Re-export statutory Form T-51, Doctor Payslip and 1C:ZUP 3.1 exporters
import {
	escapeXml,
	generateStaffPayrollT51Csv,
	generatePayrollT51Csv,
	generateDoctorPayslipHtml,
	generate1CZup31Xml,
	generate1CZup31Csv,
	generateFormT51Html,
} from "./staffPayrollExports";

export {
	escapeXml,
	generateStaffPayrollT51Csv,
	generatePayrollT51Csv,
	generateDoctorPayslipHtml,
	generate1CZup31Xml,
	generate1CZup31Csv,
	generateFormT51Html,
};

// Canonical Aliases & Interop
export type AnyStaffPayrollResult = StaffPayrollRecord;
export type UnifiedStaffPayrollLedger = ConsolidatedStaffPayrollSummary;
export const calculateUnifiedStaffPayrollLedger = calculateConsolidatedStaffPayroll;
export const exportStaffPayrollTo1CZupXml = generate1CZup31Xml;
export const exportStaffPayrollToCsv = generateStaffPayrollT51Csv;
