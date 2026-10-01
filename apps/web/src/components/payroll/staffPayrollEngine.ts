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
	| "pediatric"
	| "general_dentist"
	| "solo_practitioner";

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
	solo_practitioner: {
		specialtyId: "solo_practitioner",
		titleRu: "Врач-стоматолог (Индивидуальная практика / Соло)",
		defaultPercentage: 100,
		retailProductsPercentage: 100,
		deductsLabCosts: true,
		deductsMaterialCosts: true,
		minGuaranteeMonthlyKop: 0,
		descriptionRu: "Индивидуальная практика: 100% операционной выручки за вычетом лаборатории и материалов.",
	},
};

export const DEFAULT_CATEGORY_COMMISSION_PERCENT: Record<
	"therapy" | "orthopedics" | "surgery" | "orthodontics" | "hygiene" | "retail_hygiene" | "pediatric",
	number
> = {
	therapy: 25,
	orthopedics: 25,
	surgery: 20,
	orthodontics: 25,
	hygiene: 30,
	retail_hygiene: 10,
	pediatric: 25,
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
	readonly categoryRates?: Partial<Record<"therapy" | "orthopedics" | "surgery" | "orthodontics" | "hygiene" | "retail_hygiene" | "pediatric", number>> | undefined;
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
		const itemGrossKop = Math.round(Number(item.grossRevenueKop) || 0);
		const itemLabKop = Math.round(Number(item.labCostKop) || 0);
		const itemMatKop = Math.round(Number(item.materialCostKop) || 0);

		totalGross += itemGrossKop;

		// MANDATE 1: Orthopedic and Orthodontic services ALWAYS deduct ZTL dental lab costs,
		// and ANY service with a direct lab invoice (labCostKop > 0) or specialty preset deducts lab.
		const shouldDeductLab =
			preset.deductsLabCosts ||
			item.category === "orthopedics" ||
			item.category === "orthodontics" ||
			itemLabKop > 0;
		const labCost = shouldDeductLab ? Math.max(0, itemLabKop) : 0;

		// MANDATE 1: Surgery/Implantation (implants, bone blocks, titanium meshes, membranes)
		// and Therapy (restorative composites) and ANY service with direct materials (materialCostKop > 0)
		// deducts high-cost materials from the doctor's commission base when preset or category specifies.
		const shouldDeductMaterial =
			preset.deductsMaterialCosts ||
			item.category === "surgery" ||
			item.category === "therapy" ||
			item.category === "pediatric" ||
			(itemMatKop > 0 && preset.deductsMaterialCosts);
		const materialCost = shouldDeductMaterial ? Math.max(0, itemMatKop) : 0;

		totalLab += labCost;
		totalMaterial += materialCost;

		if (item.category === "retail_hygiene") {
			const retailPercent =
				item.customCommissionPercent ??
				input.categoryRates?.retail_hygiene ??
				preset.retailProductsPercentage;
			const retailEarned = Math.round((itemGrossKop * retailPercent) / 100);
			earnedRetail += retailEarned;
		} else {
			const netItemBase = Math.max(0, itemGrossKop - labCost - materialCost);
			const itemCommissionPercent =
				item.customCommissionPercent ??
				input.categoryRates?.[item.category] ??
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

	// Revenue tier KPI
	let revenueKpiPercent = 0;
	let kpiBadge = "Базовая ставка";
	if (totalGross >= 100000000) { // >= 1,000,000 RUB
		revenueKpiPercent = 5;
		kpiBadge = "Топ-выручка (+5% премия)";
	} else if (totalGross >= 50000000) { // >= 500,000 RUB
		revenueKpiPercent = 2;
		kpiBadge = "План выполнен (+2% премия)";
	}

	const revenueKpiBonusKop = Math.round((totalNetBase * revenueKpiPercent) / 100);

	// Comprehensive plans KPI (e.g. 5,000 RUB per plan)
	const compPlansCount = Math.round(Number(input.comprehensivePlansCount) || 0);
	const compPlanBonusPerUnit = Math.round(Number(input.comprehensivePlanBonusPerUnitKop) || 500000); // 5,000 RUB
	const comprehensivePlanBonusKop = Math.round(compPlansCount * compPlanBonusPerUnit);

	const manualAdj = Math.round(Number(input.manualAdjustmentKop) || 0);
	const noteRu = input.manualAdjustmentNoteRu ?? "";

	const preGuaranteeCalculated = earnedBase + earnedRetail + revenueKpiBonusKop + comprehensivePlanBonusKop + manualAdj;
	let preGuaranteeGross = preGuaranteeCalculated;
	let guaranteeApplied = false;
	let guaranteeTopUpKop = 0;

	// Mandate 8s: Solo Doctor & Small Clinic Sovereignty
	// Active production or shift attendance qualifies for minimum statutory guarantee floor
	const daysWorked = input.daysWorked !== undefined ? Math.round(Number(input.daysWorked)) : (input.services.length > 0 ? 21 : 0);
	// Art. 350 Labor Code RF: 33h week = 6.6h/day for dentists (outpatient reception)
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
			// Pro-rated hourly based on 6h base
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
	const shiftsWorked = Math.round(Number(input.shiftsWorked) || 0);
	const hoursWorked = input.hoursWorked !== undefined ? Number(input.hoursWorked) : (shiftsWorked * 12.0);

	// Salary calculated by shift count (e.g. 15 shifts * 3,000 RUB = 45,000 RUB)
	const baseSalaryPayoutKop = Math.round(shiftsWorked * rates.baseShiftRateKop);

	// Revenue commission
	const cashRevKop = Math.round(Number(input.clinicCashRevenueKop) || 0);
	const cashRevenueCommissionKop = Math.round(
		(cashRevKop * rates.cashRevenueCommissionPercent) / 100
	);

	// Lead conversion calculation
	const primLeads = Math.round(Number(input.primaryLeadsCount) || 0);
	const convLeads = Math.round(Number(input.convertedLeadsCount) || 0);
	const conversionRatePercent = primLeads > 0
		? Number(((convLeads / primLeads) * 100).toFixed(1))
		: 0;

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

// Re-export statutory Form T-51 and 1C:ZUP 3.1 exporters from modular staffPayrollExports (Mandate 8b <= 800 lines)
import {
	escapeXml,
	generateStaffPayrollT51Csv,
	generate1CZup31Xml,
	generate1CZup31Csv,
	generateFormT51Html,
} from "./staffPayrollExports.js";

export {
	escapeXml,
	generateStaffPayrollT51Csv,
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

