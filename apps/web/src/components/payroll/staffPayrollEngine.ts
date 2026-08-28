/**
 * ═══════════════════════════════════════════════════════════════════════════
 * DENTE Dental CRM — Multi-Role Staff Payroll & 1C:ZUP 3.1 Calculation Engine
 *
 * Operational Russian Dental Practice Payroll Accounting:
 * 1. Multi-Role Accruals:
 *    - Doctors: Piecework % from net base (Gross - Dental Lab - Materials) + KPI for comprehensive plans + Retail hygiene % + Minimum guarantee floor.
 *    - Assistants: Shift/hourly rate + Qualification category bonus (10%/15%/20%) + Sterilization/CSO bonus + Radiography & Surgery assistance.
 *    - Administrators: Base salary/shifts + % of cash collection + Lead conversion bonus.
 * 2. 1C:ZUP 3.1 Clean Enterprise Integration:
 *    - CRM calculates operational accruals and timesheets (T-13 / T-51).
 *    - Statutory taxes (NDFL 13%/15%, SFR unified social contributions, standard deductions)
 *      are strictly handled by the accountant in 1C:ZUP 3.1.
 * 3. Statutory Forms & Export:
 *    - Form T-51 Consolidated Payroll Statement (Постановление Госкомстата № 1).
 *    - 1C:ZUP 3.1 (1С:Зарплата и управление персоналом 3.1) XML & CSV Enterprise Export.
 *
 * Invariant: All monetary calculations in integer kopecks (kopeck-exact arithmetic).
 * ═══════════════════════════════════════════════════════════════════════════
 */

export type StaffRole = "doctor" | "assistant" | "administrator";

export type DoctorSpecialtyId =
	| "therapist"
	| "orthopedist"
	| "surgeon_implantologist"
	| "orthodontist"
	| "hygienist"
	| "pediatric";

export type AssistantCategoryId = "none" | "second" | "first" | "highest";

export interface DoctorSpecialtyConfig {
	readonly specialtyId: DoctorSpecialtyId;
	readonly titleRu: string;
	readonly defaultPercentage: number;
	readonly retailProductsPercentage: number;
	readonly deductsLabCosts: boolean;
	readonly deductsMaterialCosts: boolean;
	readonly minGuaranteeMonthlyKop: number;
	readonly descriptionRu: string;
}

export const DOCTOR_SPECIALTY_CONFIGS: Record<DoctorSpecialtyId, DoctorSpecialtyConfig> = {
	therapist: {
		specialtyId: "therapist",
		titleRu: "Врач-стоматолог терапевт / эндодонтист",
		defaultPercentage: 25,
		retailProductsPercentage: 10,
		deductsLabCosts: false,
		deductsMaterialCosts: true,
		minGuaranteeMonthlyKop: 6000000, // 60,000 RUB
		descriptionRu: "25% от чистой базы (выручка минус материалы) + 10% за средства домашней гигиены.",
	},
	orthopedist: {
		specialtyId: "orthopedist",
		titleRu: "Врач-стоматолог ортопед (CAD/CAM)",
		defaultPercentage: 25,
		retailProductsPercentage: 5,
		deductsLabCosts: true,
		deductsMaterialCosts: false,
		minGuaranteeMonthlyKop: 8000000, // 80,000 RUB
		descriptionRu: "25% от выручки за вычетом счетов зуботехнической лаборатории (цирконий, E.max, виниры).",
	},
	surgeon_implantologist: {
		specialtyId: "surgeon_implantologist",
		titleRu: "Врач-стоматолог хирург-имплантолог",
		defaultPercentage: 20,
		retailProductsPercentage: 5,
		deductsLabCosts: false,
		deductsMaterialCosts: true,
		minGuaranteeMonthlyKop: 10000000, // 100,000 RUB
		descriptionRu: "20% от имплантации (за вычетом стоимости имплантатов и мембран) + 30% от удалений.",
	},
	orthodontist: {
		specialtyId: "orthodontist",
		titleRu: "Врач-ортодонт (брекеты / элайнеры)",
		defaultPercentage: 25,
		retailProductsPercentage: 5,
		deductsLabCosts: true,
		deductsMaterialCosts: false,
		minGuaranteeMonthlyKop: 7500000, // 75,000 RUB
		descriptionRu: "25% от регулярных приемов и активаций, за вычетом стоимости сетапа элайнеров.",
	},
	hygienist: {
		specialtyId: "hygienist",
		titleRu: "Гигиенист стоматологический",
		defaultPercentage: 30,
		retailProductsPercentage: 15,
		deductsLabCosts: false,
		deductsMaterialCosts: false,
		minGuaranteeMonthlyKop: 4500000, // 45,000 RUB
		descriptionRu: "30% от профессиональной гигиены и отбеливания + 15% за проданные средства гигиены.",
	},
	pediatric: {
		specialtyId: "pediatric",
		titleRu: "Детский врач-стоматолог",
		defaultPercentage: 25,
		retailProductsPercentage: 10,
		deductsLabCosts: false,
		deductsMaterialCosts: true,
		minGuaranteeMonthlyKop: 6000000, // 60,000 RUB
		descriptionRu: "25% от детского терапевтического приема (минус материалы) + адаптационный прием.",
	},
};

export interface AssistantRatesConfig {
	readonly baseShiftRate6hKop: number; // e.g. 3,500 RUB = 350,000 kop
	readonly baseShiftRate12hKop: number; // e.g. 7,000 RUB = 700,000 kop
	readonly hourlyOvertimeRateKop: number; // e.g. 600 RUB = 60,000 kop
	readonly hourlyNightRateKop: number; // e.g. 700 RUB = 70,000 kop
	readonly categoryBonusPercentMap: Record<AssistantCategoryId, number>;
	readonly sterilizationShiftBonusKop: number; // e.g. 500 RUB = 50,000 kop
	readonly radiographBonusKop: number; // e.g. 150 RUB = 15,000 kop
	readonly surgeryAssistanceBonusKop: number; // e.g. 500 RUB = 50,000 kop
}

export const DEFAULT_ASSISTANT_RATES: AssistantRatesConfig = {
	baseShiftRate6hKop: 350000, // 3,500 RUB
	baseShiftRate12hKop: 700000, // 7,000 RUB
	hourlyOvertimeRateKop: 60000, // 600 RUB/h
	hourlyNightRateKop: 70000, // 700 RUB/h
	categoryBonusPercentMap: {
		none: 0,
		second: 10, // +10%
		first: 15, // +15%
		highest: 20, // +20% (Высшая категория)
	},
	sterilizationShiftBonusKop: 50000, // 500 RUB / смена в ЦСО
	radiographBonusKop: 15000, // 150 RUB / снимок
	surgeryAssistanceBonusKop: 50000, // 500 RUB / операция
};

export interface AdministratorRatesConfig {
	readonly baseSalaryMonthlyKop: number; // e.g. 45,000 RUB = 4,500,000 kop
	readonly baseShiftRateKop: number; // e.g. 3,000 RUB = 300,000 kop
	readonly cashRevenueCommissionPercent: number; // e.g. 1.0%
	readonly leadConversionThresholdPercent: number; // e.g. 70%
	readonly leadConversionBonusKop: number; // e.g. 10,000 RUB = 1,000,000 kop
}

export const DEFAULT_ADMINISTRATOR_RATES: AdministratorRatesConfig = {
	baseSalaryMonthlyKop: 4500000, // 45,000 RUB
	baseShiftRateKop: 300000, // 3,000 RUB / смена
	cashRevenueCommissionPercent: 1.0, // 1.0% от кассового сбора
	leadConversionThresholdPercent: 70.0, // 70% конверсия
	leadConversionBonusKop: 1000000, // 10,000 RUB премия за конверсию
};

export interface StaffDoctorCompletedServiceItem {
	readonly id: string;
	readonly dateIso: string;
	readonly patientName: string;
	readonly medicalCardNumber: string;
	readonly serviceNameRu: string;
	readonly order804nCode?: string | undefined;
	readonly toothCode?: string | undefined;
	readonly category: "therapy" | "orthopedics" | "surgery" | "orthodontics" | "hygiene" | "retail_hygiene" | "pediatric";
	readonly grossRevenueKop: number;
	readonly labCostKop: number;
	readonly materialCostKop: number;
	readonly customCommissionPercent?: number | undefined;
}

export interface DoctorStaffPayrollInput {
	readonly employeeId: string;
	readonly employeeTabNumber: string;
	readonly employeeFullName: string;
	readonly specialtyId: DoctorSpecialtyId;
	readonly periodStartIso: string;
	readonly periodEndIso: string;
	readonly services: readonly StaffDoctorCompletedServiceItem[];
	readonly comprehensivePlansCount?: number | undefined;
	readonly comprehensivePlanBonusPerUnitKop?: number | undefined; // e.g. 5,000 RUB
	readonly customBasePercentage?: number | undefined;
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
	readonly specialtyId: DoctorSpecialtyId;
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
 * Calculates piecework doctor payroll with lab/material deductions and comprehensive plan KPI.
 *
 * Formula:
 * Net Base = Gross Revenue - Lab Costs - Material Costs
 * Base Accrual = Net Base * Specialty Rate %
 * Total Gross Accrual = Max(MinGuarantee, Base Accrual + Retail Bonus + Plan KPI + Revenue KPI + Adjustment)
 */
export function calculateDoctorStaffPayroll(
	input: DoctorStaffPayrollInput
): DoctorStaffPayrollResult {
	const preset: DoctorSpecialtyConfig =
		DOCTOR_SPECIALTY_CONFIGS[input.specialtyId] ?? DOCTOR_SPECIALTY_CONFIGS.therapist;

	const basePercent = input.customBasePercentage ?? preset.defaultPercentage;

	let totalGross = 0;
	let totalLab = 0;
	let totalMaterial = 0;
	let earnedBase = 0;
	let earnedRetail = 0;

	for (const item of input.services) {
		totalGross += item.grossRevenueKop;

		const labCost = preset.deductsLabCosts ? item.labCostKop : 0;
		const materialCost = preset.deductsMaterialCosts ? item.materialCostKop : 0;

		totalLab += labCost;
		totalMaterial += materialCost;

		if (item.category === "retail_hygiene") {
			const retailPercent = item.customCommissionPercent ?? preset.retailProductsPercentage;
			const retailEarned = Math.round((item.grossRevenueKop * retailPercent) / 100);
			earnedRetail += retailEarned;
		} else {
			const netItemBase = Math.max(0, item.grossRevenueKop - labCost - materialCost);
			const itemCommissionPercent = item.customCommissionPercent ?? basePercent;
			const itemEarned = Math.round((netItemBase * itemCommissionPercent) / 100);
			earnedBase += itemEarned;
		}
	}

	const totalNetBase = Math.max(0, totalGross - totalLab - totalMaterial);

	// Revenue tier KPI
	let revenueKpiPercent = 0;
	let kpiBadge = "Базовая ставка";
	if (totalGross >= 100000000) { // >= 1,000,000 RUB
		revenueKpiPercent = 5;
		kpiBadge = "🌟 Топ-выручка (+5% премия)";
	} else if (totalGross >= 50000000) { // >= 500,000 RUB
		revenueKpiPercent = 2;
		kpiBadge = "🚀 План выполнен (+2% премия)";
	}

	const revenueKpiBonusKop = Math.round((totalNetBase * revenueKpiPercent) / 100);

	// Comprehensive plans KPI (e.g. 5,000 RUB per plan)
	const compPlansCount = input.comprehensivePlansCount ?? 0;
	const compPlanBonusPerUnit = input.comprehensivePlanBonusPerUnitKop ?? 500000; // 5,000 RUB
	const comprehensivePlanBonusKop = compPlansCount * compPlanBonusPerUnit;

	const manualAdj = input.manualAdjustmentKop ?? 0;
	const noteRu = input.manualAdjustmentNoteRu ?? "";

	let preGuaranteeGross = earnedBase + earnedRetail + revenueKpiBonusKop + comprehensivePlanBonusKop + manualAdj;
	let guaranteeApplied = false;

	if (preGuaranteeGross < preset.minGuaranteeMonthlyKop && input.services.length > 0) {
		preGuaranteeGross = preset.minGuaranteeMonthlyKop;
		guaranteeApplied = true;
	}

	const grossPayoutBeforeTaxKop = Math.max(0, preGuaranteeGross);

	const daysWorked = input.daysWorked ?? (input.services.length > 0 ? 21 : 0);
	const hoursWorked = input.hoursWorked ?? (daysWorked * 6.0);

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
		manualAdjustmentKop: manualAdj,
		manualAdjustmentNoteRu: noteRu,
		grossPayoutBeforeTaxKop,
		servicesCount: input.services.length,
	};
}

/**
 * Calculates assistant payroll with category, sterilization, radiography, and surgery bonuses.
 */
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
		totalHours += shift.hoursWorked;

		if (shift.isSterilizationShift) {
			sterilizationShiftsCount += 1;
		}
		if (shift.radiographsTakenCount) {
			totalRadiographs += shift.radiographsTakenCount;
		}
		if (shift.surgeriesAssistedCount) {
			totalSurgeries += shift.surgeriesAssistedCount;
		}

		if (shift.shiftType === "standard_6h") {
			baseShiftsPayout += rates.baseShiftRate6hKop;
		} else if (shift.shiftType === "full_12h") {
			baseShiftsPayout += rates.baseShiftRate12hKop;
		} else {
			// Pro-rated hourly based on 6h base
			baseShiftsPayout += Math.round((shift.hoursWorked / 6.0) * rates.baseShiftRate6hKop);
		}
	}

	const categoryBonusPercent = rates.categoryBonusPercentMap[input.category] ?? 0;
	const categoryBonusKop = Math.round((baseShiftsPayout * categoryBonusPercent) / 100);

	const sterilizationBonusKop = sterilizationShiftsCount * rates.sterilizationShiftBonusKop;
	const radiographsPayoutKop = totalRadiographs * rates.radiographBonusKop;
	const surgeriesPayoutKop = totalSurgeries * rates.surgeryAssistanceBonusKop;
	const manualAdj = input.manualAdjustmentKop ?? 0;
	const noteRu = input.manualAdjustmentNoteRu ?? "";

	const grossPayoutBeforeTaxKop = Math.max(
		0,
		baseShiftsPayout +
			categoryBonusKop +
			sterilizationBonusKop +
			radiographsPayoutKop +
			surgeriesPayoutKop +
			manualAdj
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

/**
 * Calculates administrator payroll with base salary, cash revenue %, and lead conversion bonus.
 */
export function calculateAdministratorStaffPayroll(
	input: AdministratorStaffPayrollInput
): AdministratorStaffPayrollResult {
	const rates = input.ratesConfig ?? DEFAULT_ADMINISTRATOR_RATES;
	const shiftsWorked = input.shiftsWorked;
	const hoursWorked = input.hoursWorked ?? (shiftsWorked * 12.0);

	// Salary calculated by shift count (e.g. 15 shifts * 3,000 RUB = 45,000 RUB)
	const baseSalaryPayoutKop = shiftsWorked * rates.baseShiftRateKop;

	// Revenue commission
	const cashRevenueCommissionKop = Math.round(
		(input.clinicCashRevenueKop * rates.cashRevenueCommissionPercent) / 100
	);

	// Lead conversion calculation
	const conversionRatePercent = input.primaryLeadsCount > 0
		? Number(((input.convertedLeadsCount / input.primaryLeadsCount) * 100).toFixed(1))
		: 0;

	const leadConversionBonusKop =
		conversionRatePercent >= rates.leadConversionThresholdPercent && input.convertedLeadsCount > 0
			? rates.leadConversionBonusKop
			: 0;

	const manualAdj = input.manualAdjustmentKop ?? 0;
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

/**
 * Calculates complete multi-role consolidated staff payroll summary.
 */
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

/**
 * Generates Russian Unified Form T-51 (Расчетная ведомость Т-51) CSV with UTF-8 BOM.
 * Accruals and worked time only (clean CRM operational base for 1C:ZUP).
 */
export function generateStaffPayrollT51Csv(summary: ConsolidatedStaffPayrollSummary): string {
	const headerLines = [
		`\uFEFFУнифицированная форма № Т-51;Утверждена Постановлением Госкомстата России от 05.01.2004 № 1`,
		`Организация:;"${summary.clinicName}";ИНН/КПП:;"${summary.organizationInn} / ${summary.organizationKpp}"`,
		`Период:;"${summary.periodLabelRu}";Дата составления:;"${summary.generatedAtIso.slice(0, 10)}"`,
		``,
		`№ п/п;Табельный номер;ФИО работника;Должность;Подразделение;Отработано дней;Отработано часов;Базовое начисление (руб);Премии и надбавки (руб);Всего начислено (руб)`,
	];

	const rows = summary.records.map((r, index) => {
		const rowNum = index + 1;
		let days = 0;
		let hours = 0;
		let baseAccruedRub = "0.00";
		let bonusAccruedRub = "0.00";

		if (r.role === "doctor") {
			days = r.daysWorked;
			hours = r.hoursWorked;
			baseAccruedRub = (r.earnedBaseCommissionKop / 100).toFixed(2);
			const bonusesKop =
				r.earnedRetailCommissionKop +
				r.comprehensivePlanBonusKop +
				r.revenueKpiBonusKop +
				r.manualAdjustmentKop;
			bonusAccruedRub = (bonusesKop / 100).toFixed(2);
		} else if (r.role === "assistant") {
			days = r.totalShiftsCount;
			hours = r.totalHoursWorked;
			baseAccruedRub = (r.baseShiftsPayoutKop / 100).toFixed(2);
			const bonusesKop =
				r.categoryBonusKop +
				r.sterilizationBonusKop +
				r.radiographsPayoutKop +
				r.surgeriesPayoutKop +
				r.manualAdjustmentKop;
			bonusAccruedRub = (bonusesKop / 100).toFixed(2);
		} else if (r.role === "administrator") {
			days = r.shiftsWorked;
			hours = r.hoursWorked;
			baseAccruedRub = (r.baseSalaryPayoutKop / 100).toFixed(2);
			const bonusesKop =
				r.cashRevenueCommissionKop +
				r.leadConversionBonusKop +
				r.manualAdjustmentKop;
			bonusAccruedRub = (bonusesKop / 100).toFixed(2);
		}

		const grossRub = (r.grossPayoutBeforeTaxKop / 100).toFixed(2);

		return `${rowNum};${r.employeeTabNumber};"${r.employeeFullName}";"${r.positionRu}";"${r.departmentRu}";${days};${hours.toFixed(1)};${baseAccruedRub};${bonusAccruedRub};${grossRub}`;
	});

	// Summary total line
	const totalGrossRub = (summary.totalGrossPayoutKop / 100).toFixed(2);
	const totalLine = `ИТОГО ПО КЛИНИКЕ;;;;"${summary.totalEmployeesCount} сотр.";;;;${totalGrossRub}`;

	return headerLines.join("\n") + "\n" + rows.join("\n") + "\n" + totalLine;
}

/**
 * Escapes XML special characters safely for 1C:ZUP.
 */
function escapeXml(unsafe: string): string {
	return unsafe
		.replace(/&/g, "&amp;")
		.replace(/</g, "&lt;")
		.replace(/>/g, "&gt;")
		.replace(/"/g, "&quot;")
		.replace(/'/g, "&apos;");
}

/**
 * Generates official 1C:ZUP 3.1 (1С:Зарплата и управление персоналом 3.1) XML export document.
 * Contains operational accruals and work timesheet data for accountant import into 1C:ZUP.
 */
export function generate1CZup31Xml(
	summary: ConsolidatedStaffPayrollSummary,
	documentNumber: string = "ЗП-001",
	documentDate: string = new Date().toISOString().slice(0, 10)
): string {
	const docDateFormatted = documentDate;
	const totalGrossRub = (summary.totalGrossPayoutKop / 100).toFixed(2);

	// Accruals section
	const accrualsXml = summary.records
		.map((r) => {
			const items: string[] = [];
			if (r.role === "doctor") {
				if (r.earnedBaseCommissionKop > 0) {
					items.push(`\t\t\t<Начисление>
\t\t\t\t<Сотрудник ТабельныйНомер="${escapeXml(r.employeeTabNumber)}" ФИО="${escapeXml(r.employeeFullName)}"/>
\t\t\t\t<ВидРасчета>Сдельная оплата труда (стоматология)</ВидРасчета>
\t\t\t\t<Сумма>${(r.earnedBaseCommissionKop / 100).toFixed(2)}</Сумма>
\t\t\t\t<Дней>${r.daysWorked}</Дней>
\t\t\t\t<Часов>${r.hoursWorked.toFixed(1)}</Часов>
\t\t\t</Начисление>`);
				}
				if (r.comprehensivePlanBonusKop > 0) {
					items.push(`\t\t\t<Начисление>
\t\t\t\t<Сотрудник ТабельныйНомер="${escapeXml(r.employeeTabNumber)}" ФИО="${escapeXml(r.employeeFullName)}"/>
\t\t\t\t<ВидРасчета>Премия за выполнение KPI (комплексные планы)</ВидРасчета>
\t\t\t\t<Сумма>${(r.comprehensivePlanBonusKop / 100).toFixed(2)}</Сумма>
\t\t\t</Начисление>`);
				}
				if (r.revenueKpiBonusKop > 0) {
					items.push(`\t\t\t<Начисление>
\t\t\t\t<Сотрудник ТабельныйНомер="${escapeXml(r.employeeTabNumber)}" ФИО="${escapeXml(r.employeeFullName)}"/>
\t\t\t\t<ВидРасчета>Премия за превышение плана выручки</ВидРасчета>
\t\t\t\t<Сумма>${(r.revenueKpiBonusKop / 100).toFixed(2)}</Сумма>
\t\t\t</Начисление>`);
				}
				if (r.earnedRetailCommissionKop > 0) {
					items.push(`\t\t\t<Начисление>
\t\t\t\t<Сотрудник ТабельныйНомер="${escapeXml(r.employeeTabNumber)}" ФИО="${escapeXml(r.employeeFullName)}"/>
\t\t\t\t<ВидРасчета>Комиссия за реализацию средств гигиены</ВидРасчета>
\t\t\t\t<Сумма>${(r.earnedRetailCommissionKop / 100).toFixed(2)}</Сумма>
\t\t\t</Начисление>`);
				}
			} else if (r.role === "assistant") {
				if (r.baseShiftsPayoutKop > 0) {
					items.push(`\t\t\t<Начисление>
\t\t\t\t<Сотрудник ТабельныйНомер="${escapeXml(r.employeeTabNumber)}" ФИО="${escapeXml(r.employeeFullName)}"/>
\t\t\t\t<ВидРасчета>Оплата по сменному тарифу (ассистент)</ВидРасчета>
\t\t\t\t<Сумма>${(r.baseShiftsPayoutKop / 100).toFixed(2)}</Сумма>
\t\t\t\t<Смен>${r.totalShiftsCount}</Смен>
\t\t\t\t<Часов>${r.totalHoursWorked.toFixed(1)}</Часов>
\t\t\t</Начисление>`);
				}
				if (r.categoryBonusKop > 0) {
					items.push(`\t\t\t<Начисление>
\t\t\t\t<Сотрудник ТабельныйНомер="${escapeXml(r.employeeTabNumber)}" ФИО="${escapeXml(r.employeeFullName)}"/>
\t\t\t\t<ВидРасчета>Надбавка за квалификационную категорию</ВидРасчета>
\t\t\t\t<Сумма>${(r.categoryBonusKop / 100).toFixed(2)}</Сумма>
\t\t\t</Начисление>`);
				}
				if (r.sterilizationBonusKop > 0) {
					items.push(`\t\t\t<Начисление>
\t\t\t\t<Сотрудник ТабельныйНомер="${escapeXml(r.employeeTabNumber)}" ФИО="${escapeXml(r.employeeFullName)}"/>
\t\t\t\t<ВидРасчета>Доплата за работу в ЦСО и стерилизацию</ВидРасчета>
\t\t\t\t<Сумма>${(r.sterilizationBonusKop / 100).toFixed(2)}</Сумма>
\t\t\t</Начисление>`);
				}
				if (r.radiographsPayoutKop > 0 || r.surgeriesPayoutKop > 0) {
					items.push(`\t\t\t<Начисление>
\t\t\t\t<Сотрудник ТабельныйНомер="${escapeXml(r.employeeTabNumber)}" ФИО="${escapeXml(r.employeeFullName)}"/>
\t\t\t\t<ВидРасчета>Сдельная доплата (снимки / операции)</ВидРасчета>
\t\t\t\t<Сумма>${((r.radiographsPayoutKop + r.surgeriesPayoutKop) / 100).toFixed(2)}</Сумма>
\t\t\t</Начисление>`);
				}
			} else if (r.role === "administrator") {
				if (r.baseSalaryPayoutKop > 0) {
					items.push(`\t\t\t<Начисление>
\t\t\t\t<Сотрудник ТабельныйНомер="${escapeXml(r.employeeTabNumber)}" ФИО="${escapeXml(r.employeeFullName)}"/>
\t\t\t\t<ВидРасчета>Оклад по сменам (администратор)</ВидРасчета>
\t\t\t\t<Сумма>${(r.baseSalaryPayoutKop / 100).toFixed(2)}</Сумма>
\t\t\t\t<Смен>${r.shiftsWorked}</Смен>
\t\t\t\t<Часов>${r.hoursWorked.toFixed(1)}</Часов>
\t\t\t</Начисление>`);
				}
				if (r.cashRevenueCommissionKop > 0) {
					items.push(`\t\t\t<Начисление>
\t\t\t\t<Сотрудник ТабельныйНомер="${escapeXml(r.employeeTabNumber)}" ФИО="${escapeXml(r.employeeFullName)}"/>
\t\t\t\t<ВидРасчета>Премия от кассовой выручки</ВидРасчета>
\t\t\t\t<Сумма>${(r.cashRevenueCommissionKop / 100).toFixed(2)}</Сумма>
\t\t\t</Начисление>`);
				}
				if (r.leadConversionBonusKop > 0) {
					items.push(`\t\t\t<Начисление>
\t\t\t\t<Сотрудник ТабельныйНомер="${escapeXml(r.employeeTabNumber)}" ФИО="${escapeXml(r.employeeFullName)}"/>
\t\t\t\t<ВидРасчета>Премия за конверсию первичных пациентов</ВидРасчета>
\t\t\t\t<Сумма>${(r.leadConversionBonusKop / 100).toFixed(2)}</Сумма>
\t\t\t</Начисление>`);
				}
			}

			if (r.manualAdjustmentKop !== 0) {
				const isPositive = r.manualAdjustmentKop > 0;
				items.push(`\t\t\t<Начисление>
\t\t\t\t<Сотрудник ТабельныйНомер="${escapeXml(r.employeeTabNumber)}" ФИО="${escapeXml(r.employeeFullName)}"/>
\t\t\t\t<ВидРасчета>${isPositive ? "Разовая надбавка / премия" : "Удержание / корректировка"}</ВидРасчета>
\t\t\t\t<Сумма>${(r.manualAdjustmentKop / 100).toFixed(2)}</Сумма>
\t\t\t\t<Комментарий>${escapeXml(r.manualAdjustmentNoteRu || "Ручная корректировка")}</Комментарий>
\t\t\t</Начисление>`);
			}

			return items.join("\n");
		})
		.filter((str) => str.length > 0)
		.join("\n");

	return `<?xml version="1.0" encoding="UTF-8"?>
<ЗарплатаКадрыДокумент xmlns="http://v8.1c.ru/edi/edi_stnd/EnterpriseData/1.13" ВерсияФормата="1.13">
\t<Документ ОтражениеЗарплатыВБухучете Номер="${escapeXml(documentNumber)}" Дата="${escapeXml(docDateFormatted)}">
\t\t<Организация>
\t\t\t<Наименование>${escapeXml(summary.clinicName)}</Наименование>
\t\t\t<ИНН>${escapeXml(summary.organizationInn)}</ИНН>
\t\t\t<КПП>${escapeXml(summary.organizationKpp)}</КПП>
\t\t</Организация>
\t\t<ПериодРегистрации>${escapeXml(summary.periodStartIso.slice(0, 7))}-01</ПериодРегистрации>
\t\t<ИтогоНачислено>${totalGrossRub}</ИтогоНачислено>
\t\t<Начисления>
${accrualsXml}
\t\t</Начисления>
\t</Документ>
</ЗарплатаКадрыДокумент>`;
}

/**
 * Generates 1C:ZUP 3.1 compatible tabular CSV format with UTF-8 BOM.
 * Accrual rows only for statutory accountant reconciliation.
 */
export function generate1CZup31Csv(summary: ConsolidatedStaffPayrollSummary): string {
	const header = "ТабельныйНомер;ФИО;Должность;Подразделение;ВидОперации;Сумма;ПериодДействия;КодДоходаНДФЛ\n";

	const rows: string[] = [];

	summary.records.forEach((r) => {
		const grossRub = (r.grossPayoutBeforeTaxKop / 100).toFixed(2);
		const period = summary.periodStartIso.slice(0, 7);

		rows.push(
			`${r.employeeTabNumber};"${r.employeeFullName}";"${r.positionRu}";"${r.departmentRu}";"Начисление";${grossRub};${period};2000`
		);
	});

	return "\uFEFF" + header + rows.join("\n");
}

// Canonical Aliases & Interop
export type AnyStaffPayrollResult = StaffPayrollRecord;
export type UnifiedStaffPayrollLedger = ConsolidatedStaffPayrollSummary;
export const calculateUnifiedStaffPayrollLedger = calculateConsolidatedStaffPayroll;
export const exportStaffPayrollTo1CZupXml = generate1CZup31Xml;
export const exportStaffPayrollToCsv = generateStaffPayrollT51Csv;

/**
 * Validates staff payroll input structure before calculation.
 */
export function validateStaffPayrollInput(input: unknown): { valid: boolean; errors: string[] } {
	const errors: string[] = [];
	if (!input || typeof input !== "object") {
		errors.push("Входные данные расчета должны быть объектом");
		return { valid: false, errors };
	}
	return { valid: errors.length === 0, errors };
}

/**
 * Generates official Form T-51 HTML print view (Accrual & Timesheet summary).
 */
export function generateFormT51Html(summary: ConsolidatedStaffPayrollSummary): string {
	const totalGrossRub = (summary.totalGrossPayoutKop / 100).toFixed(2);

	const rowsHtml = summary.records
		.map((r, i) => {
			let days = 0;
			let hours = 0;
			let baseRub = "0.00";
			let bonusRub = "0.00";

			if (r.role === "doctor") {
				days = r.daysWorked;
				hours = r.hoursWorked;
				baseRub = (r.earnedBaseCommissionKop / 100).toFixed(2);
				const bonusesKop =
					r.earnedRetailCommissionKop +
					r.comprehensivePlanBonusKop +
					r.revenueKpiBonusKop +
					r.manualAdjustmentKop;
				bonusRub = (bonusesKop / 100).toFixed(2);
			} else if (r.role === "assistant") {
				days = r.totalShiftsCount;
				hours = r.totalHoursWorked;
				baseRub = (r.baseShiftsPayoutKop / 100).toFixed(2);
				const bonusesKop =
					r.categoryBonusKop +
					r.sterilizationBonusKop +
					r.radiographsPayoutKop +
					r.surgeriesPayoutKop +
					r.manualAdjustmentKop;
				bonusRub = (bonusesKop / 100).toFixed(2);
			} else if (r.role === "administrator") {
				days = r.shiftsWorked;
				hours = r.hoursWorked;
				baseRub = (r.baseSalaryPayoutKop / 100).toFixed(2);
				const bonusesKop =
					r.cashRevenueCommissionKop +
					r.leadConversionBonusKop +
					r.manualAdjustmentKop;
				bonusRub = (bonusesKop / 100).toFixed(2);
			}

			const gross = (r.grossPayoutBeforeTaxKop / 100).toFixed(2);
			return `<tr>
				<td>${i + 1}</td>
				<td>${escapeXml(r.employeeTabNumber)}</td>
				<td>${escapeXml(r.employeeFullName)}</td>
				<td>${escapeXml(r.positionRu)}</td>
				<td style="text-align:center">${days} дн (${hours.toFixed(1)} ч)</td>
				<td style="text-align:right">${baseRub}</td>
				<td style="text-align:right">${bonusRub}</td>
				<td style="text-align:right;font-weight:bold">${gross}</td>
			</tr>`;
		})
		.join("\n");

	return `<!DOCTYPE html>
<html lang="ru">
<head>
	<meta charset="utf-8">
	<title>Расчетная ведомость Т-51 — ${escapeXml(summary.clinicName)}</title>
	<style>
		body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; font-size: 11px; margin: 20px; color: #111827; }
		h1 { font-size: 14px; margin: 0 0 4px 0; text-align: center; }
		.sub { font-size: 11px; text-align: center; color: #6b7280; margin-bottom: 16px; }
		table { width: 100%; border-collapse: collapse; margin-top: 10px; }
		th, td { border: 1px solid #d1d5db; padding: 4px 6px; text-align: left; }
		th { background-color: #f3f4f6; font-weight: 600; }
		.total-row { font-weight: bold; background-color: #f9fafb; }
	</style>
</head>
<body>
	<h1>Унифицированная форма № Т-51 — Расчетная ведомость</h1>
	<div class="sub">${escapeXml(summary.clinicName)} • ИНН: ${escapeXml(summary.organizationInn)} • Период: ${escapeXml(summary.periodLabelRu)}</div>
	<table>
		<thead>
			<tr>
				<th>№</th>
				<th>Таб. №</th>
				<th>ФИО</th>
				<th>Должность</th>
				<th>Отработано</th>
				<th>Базовое начисление (руб)</th>
				<th>Премии и надбавки (руб)</th>
				<th>Всего начислено (руб)</th>
			</tr>
		</thead>
		<tbody>
			${rowsHtml}
			<tr class="total-row">
				<td colspan="4">ИТОГО ПО КЛИНИКЕ (${summary.totalEmployeesCount} сотр.)</td>
				<td style="text-align:center">—</td>
				<td style="text-align:right">—</td>
				<td style="text-align:right">—</td>
				<td style="text-align:right">${totalGrossRub}</td>
			</tr>
		</tbody>
	</table>
</body>
</html>`;
}
