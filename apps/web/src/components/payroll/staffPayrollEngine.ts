/**
 * DENTE Dental CRM — Doctor & Staff Piece-Rate Payroll Calculation Engine Facade
 * Compliance: Mandate 8b, Mandate 8e, Mandate 8n (Net Revenue = Gross − Lab − Materials).
 * Self-contained SSOT consolidating multi-role staff calculations.
 */

import {
	DOCTOR_SPECIALTY_PAYROLL_PRESETS,
	DEFAULT_CATEGORY_COMMISSION_PERCENT,
	CLINICAL_CATEGORY_COMMISSION_PERCENT,
	resolveDoctorPreset,
	type DoctorSpecialtyCommissionRule,
} from "@dental/shared/payroll";

import type {
	StaffRole,
	DoctorSpecialtyId,
	AssistantCategoryId,
	DoctorSpecialtyConfig,
	SoloDoctorSpecialtyPreset,
	AssistantRatesConfig,
	AdministratorRatesConfig,
	StaffDoctorCompletedServiceItem,
	DoctorStaffPayrollInput,
	DoctorStaffPayrollResult,
	AssistantShiftItem,
	AssistantShiftLogItem,
	AssistantStaffPayrollInput,
	AssistantStaffPayrollResult,
	AdministratorStaffPayrollInput,
	AdministratorStaffPayrollResult,
	StaffPayrollRecord,
	RoleSummary,
	ConsolidatedStaffPayrollSummary,
	ConsolidatedPayrollCalculationParams,
} from "./payrollStaffTypes.js";

export type {
	StaffRole,
	DoctorSpecialtyId,
	AssistantCategoryId,
	DoctorSpecialtyConfig,
	SoloDoctorSpecialtyPreset,
	AssistantRatesConfig,
	AdministratorRatesConfig,
	StaffDoctorCompletedServiceItem,
	DoctorStaffPayrollInput,
	DoctorStaffPayrollResult,
	AssistantShiftItem,
	AssistantShiftLogItem,
	AssistantStaffPayrollInput,
	AssistantStaffPayrollResult,
	AdministratorStaffPayrollInput,
	AdministratorStaffPayrollResult,
	StaffPayrollRecord,
	RoleSummary,
	ConsolidatedStaffPayrollSummary,
	ConsolidatedPayrollCalculationParams,
};

function findSpecialtyRule(specialtyId: string): DoctorSpecialtyCommissionRule {
	const found = DOCTOR_SPECIALTY_PAYROLL_PRESETS.find((p) => p.specialtyId === specialtyId);
	if (found) return found;
	const fallback = DOCTOR_SPECIALTY_PAYROLL_PRESETS.find((p) => p.specialtyId === "general_dentist") || DOCTOR_SPECIALTY_PAYROLL_PRESETS[0];
	if (!fallback) {
		return {
			specialtyId,
			titleRu: "Врач-стоматолог общей практики (соло)",
			defaultPercentage: 25,
			retailProductsPercentage: 10,
			deductsLabCosts: true,
			deductsMaterialCosts: true,
			minGuaranteeMonthlyKop: 6000000,
			descriptionRu: "25% от чистой базы (выручка за вычетом лаборатории и материалов).",
		};
	}
	return fallback;
}

export const DOCTOR_SPECIALTY_CONFIGS: Record<string, DoctorSpecialtyCommissionRule> = {
	therapist: findSpecialtyRule("therapist"),
	orthopedist: findSpecialtyRule("orthopedist"),
	surgeon_implantologist: findSpecialtyRule("surgeon_implantologist"),
	surgeon: findSpecialtyRule("surgeon"),
	orthodontist: findSpecialtyRule("orthodontist"),
	hygienist: findSpecialtyRule("hygienist"),
	pediatric: findSpecialtyRule("pediatric"),
	pediatric_dentist: findSpecialtyRule("pediatric_dentist"),
	general_dentist: {
		specialtyId: "general_dentist",
		titleRu: "Врач-стоматолог общей практики",
		defaultPercentage: 25,
		retailProductsPercentage: 10,
		deductsLabCosts: true,
		deductsMaterialCosts: true,
		minGuaranteeMonthlyKop: 7000000,
		descriptionRu: "25% от чистой базы (выручка за вычетом лаборатории и материалов).",
	},
	periodontist: findSpecialtyRule("periodontist"),
	solo_practitioner: findSpecialtyRule("solo_practitioner"),
};

export const SOLO_DOCTOR_SPECIALTY_PRESETS: readonly SoloDoctorSpecialtyPreset[] = [
	{ specialtyId: "general_dentist", titleRu: "Врач-стоматолог общей практики (соло)", labelRu: "Стоматолог общей практики" },
	{ specialtyId: "therapist", titleRu: "Врач-стоматолог терапевт / эндодонтист", labelRu: "Терапевт / эндодонтист" },
	{ specialtyId: "orthopedist", titleRu: "Врач-стоматолог ортопед (CAD/CAM)", labelRu: "Ортопед (CAD/CAM)" },
	{ specialtyId: "surgeon_implantologist", titleRu: "Врач-стоматолог хирург-имплантолог", labelRu: "Хирург-имплантолог" },
	{ specialtyId: "surgeon", titleRu: "Врач-стоматолог хирург", labelRu: "Хирург" },
	{ specialtyId: "orthodontist", titleRu: "Врач-ортодонт (брекеты / элайнеры)", labelRu: "Ортодонт (брекеты / элайнеры)" },
	{ specialtyId: "periodontist", titleRu: "Врач-стоматолог пародонтолог", labelRu: "Пародонтолог" },
	{ specialtyId: "pediatric_dentist", titleRu: "Детский врач-стоматолог", labelRu: "Детский стоматолог" },
	{ specialtyId: "hygienist", titleRu: "Гигиенист стоматологический", labelRu: "Гигиенист" },
];

export const DEFAULT_SOLO_DOCTOR = {
	id: "solo-doc-default",
	name: "Кузнецов М.М.",
	specialtyId: "general_dentist",
	clinicName: "Стоматология «Денте»",
	shiftRateKop: 400000,
	defaultPercentage: 25,
};

export const DEFAULT_ASSISTANT_RATES: AssistantRatesConfig = {
	baseShiftRate6hKop: 350000,
	baseShiftRate12hKop: 700000,
	hourlyOvertimeRateKop: 50000,
	hourlyNightRateKop: 75000,
	categoryBonusPercentMap: { none: 0, second: 5, first: 10, highest: 20 },
	sterilizationShiftBonusKop: 50000,
	radiographBonusKop: 15000,
	surgeryAssistanceBonusKop: 50000,
};

export const DEFAULT_ADMINISTRATOR_RATES: AdministratorRatesConfig = {
	baseSalaryMonthlyKop: 4000000,
	baseShiftRateKop: 300000,
	cashRevenueCommissionPercent: 1.0,
	leadConversionThresholdPercent: 70,
	leadConversionBonusKop: 1000000,
};

export interface DoctorServicesCalculationOutput {
	readonly totalGross: number;
	readonly totalLab: number;
	readonly totalMaterial: number;
	readonly earnedBase: number;
	readonly earnedRetail: number;
}

export function calculateDoctorServicesMetrics(
	input: DoctorStaffPayrollInput,
	preset: DoctorSpecialtyCommissionRule,
	basePercent: number
): DoctorServicesCalculationOutput {
	let totalGross = 0;
	let totalLab = 0;
	let totalMaterial = 0;
	let earnedBase = 0;
	let earnedRetail = 0;

	for (const item of input.services) {
		if (item.isDepositAdvanceOnly) continue;
		if (item.isPaid === false || item.isDebt === true || item.invoiceStatus === "unpaid") continue;

		const rawGrossKop = Math.round(Number((item as any).amountKopecks ?? item.grossRevenueKop) || 0);
		const actualPaidKop = item.actuallyPaidGrossKop !== undefined
			? Math.max(0, Math.round(Number(item.actuallyPaidGrossKop) || 0))
			: (item.paidAmountKop !== undefined
				? Math.max(0, Math.min(rawGrossKop, Math.round(Number(item.paidAmountKop) || 0)))
				: rawGrossKop);

		if (actualPaidKop <= 0 && rawGrossKop > 0) continue;

		const itemGrossKop = actualPaidKop;
		const itemLabKop = Math.round(Number((item as any).labCostKopecks ?? item.labCostKop) || 0);
		const rawMatKop = Number((item as any).materialCostKopecks ?? (item as any).implantCostKopecks ?? item.materialCostKop) || 0;
		const itemMatKop = Math.round(rawMatKop);

		totalGross += itemGrossKop;

		const shouldDeductLab = preset.deductsLabCosts || item.category === "orthopedics" || item.category === "orthodontics" || itemLabKop > 0;
		const labCost = shouldDeductLab ? Math.max(0, itemLabKop) : 0;

		const shouldDeductMaterial = preset.deductsMaterialCosts || item.category === "surgery" || item.category === "therapy" || item.category === "pediatric" || (itemMatKop > 0 && preset.deductsMaterialCosts);
		const materialCost = shouldDeductMaterial ? Math.max(0, itemMatKop) : 0;

		totalLab += labCost;
		totalMaterial += materialCost;

		const clinicalRate = input.useClinicalCategoryRates ? CLINICAL_CATEGORY_COMMISSION_PERCENT[item.category] : undefined;

		if (item.category === "retail_hygiene") {
			const retailPercent = item.customCommissionPercent ?? input.categoryRates?.retail_hygiene ?? clinicalRate ?? preset.retailProductsPercentage;
			earnedRetail += Math.round((itemGrossKop * retailPercent) / 100);
		} else {
			const netItemBase = Math.max(0, itemGrossKop - labCost - materialCost);
			const itemCommissionPercent = item.customCommissionPercent ?? input.categoryRates?.[item.category] ?? clinicalRate ?? (input.customBasePercentage !== undefined ? input.customBasePercentage : (preset.specialtyId === "solo_practitioner" || preset.defaultPercentage === 100 ? preset.defaultPercentage : (DEFAULT_CATEGORY_COMMISSION_PERCENT[item.category] ?? basePercent)));
			earnedBase += Math.round((netItemBase * itemCommissionPercent) / 100);
		}
	}

	return { totalGross, totalLab, totalMaterial, earnedBase, earnedRetail };
}

export function calculateDoctorStaffPayroll(input: DoctorStaffPayrollInput): DoctorStaffPayrollResult {
	const preset = DOCTOR_SPECIALTY_CONFIGS[input.specialtyId] ?? resolveDoctorPreset(input.specialtyId);
	const basePercent = input.customBasePercentage ?? preset.defaultPercentage;

	const { totalGross, totalLab, totalMaterial, earnedBase, earnedRetail } =
		calculateDoctorServicesMetrics(input, preset, basePercent);

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

	const preGuaranteeGross = earnedBase + earnedRetail + revenueKpiBonusKop + comprehensivePlanBonusKop + manualAdj;
	let finalGross = preGuaranteeGross;
	let guaranteeApplied = false;
	let guaranteeTopUpKop = 0;

	const daysWorked = input.daysWorked !== undefined ? Math.round(Number(input.daysWorked)) : (input.services.length > 0 ? 21 : 0);
	const hoursWorked = input.hoursWorked !== undefined ? Number(input.hoursWorked) : Number((daysWorked * 6.6).toFixed(1));
	const hasActiveProductionOrAttendance = input.services.length > 0 || daysWorked > 0;

	if (finalGross < preset.minGuaranteeMonthlyKop && hasActiveProductionOrAttendance && preset.minGuaranteeMonthlyKop > 0) {
		guaranteeTopUpKop = preset.minGuaranteeMonthlyKop - finalGross;
		finalGross = preset.minGuaranteeMonthlyKop;
		guaranteeApplied = true;
	}

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
		grossPayoutBeforeTaxKop: Math.max(0, finalGross),
	};
}

export function calculateAssistantStaffPayroll(input: AssistantStaffPayrollInput): AssistantStaffPayrollResult {
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

		if (shift.isSterilizationShift) sterilizationShiftsCount += 1;
		if (shift.radiographsTakenCount) totalRadiographs += Math.round(Number(shift.radiographsTakenCount) || 0);
		if (shift.surgeriesAssistedCount) totalSurgeries += Math.round(Number(shift.surgeriesAssistedCount) || 0);

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

	const grossPayoutBeforeTaxKop = Math.max(
		0,
		baseShiftsPayout + categoryBonusKop + sterilizationBonusKop + radiographsPayoutKop + surgeriesPayoutKop + manualAdj,
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
		manualAdjustmentNoteRu: input.manualAdjustmentNoteRu ?? "",
		grossPayoutBeforeTaxKop,
	};
}

export function calculateAdministratorStaffPayroll(input: AdministratorStaffPayrollInput): AdministratorStaffPayrollResult {
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
	const grossPayoutBeforeTaxKop = Math.max(0, baseSalaryPayoutKop + cashRevenueCommissionKop + leadConversionBonusKop + manualAdj);

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
		manualAdjustmentNoteRu: input.manualAdjustmentNoteRu ?? "",
		grossPayoutBeforeTaxKop,
	};
}

export function calculateConsolidatedStaffPayroll(params: ConsolidatedPayrollCalculationParams): ConsolidatedStaffPayrollSummary {
	const clinicName = params.clinicName ?? "Стоматологическая клиника DENTE";
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
			roleTitleRu: "Ассистенты стоматолога",
			employeesCount: params.assistants?.length ?? 0,
			grossRevenueKop: 0,
			grossPayoutKop: assistantGrossPayout,
		},
		administrator: {
			role: "administrator",
			roleTitleRu: "Администраторы клиники",
			employeesCount: params.administrators?.length ?? 0,
			grossRevenueKop: 0,
			grossPayoutKop: adminGrossPayout,
		},
	};

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
		totalGrossPayoutKop: doctorGrossPayout + assistantGrossPayout + adminGrossPayout,
		roleSummaries,
	};
}

export function validateStaffPayrollInput(params: ConsolidatedPayrollCalculationParams): { isValid: boolean; errors: string[] } {
	const errors: string[] = [];
	if (!params.periodStartIso) errors.push("Не указана начальная дата расчетного периода");
	if (!params.periodEndIso) errors.push("Не указана конечная дата расчетного периода");
	return { isValid: errors.length === 0, errors };
}

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
	type AssistantPayrollResult,
	calculateDoctorPeriodPayroll,
	calculateAssistantPeriodPayroll,
	splitVisitServicesByDoctor,
	filterServicesForDoctor,
	resolveDoctorPreset,
} from "@dental/shared/payroll";

export {
	generateDoctorPayrollCsv,
	generateStaffPayrollCsv,
	generateStaffPayrollT51Csv,
	generatePayrollT51Csv,
	generateDoctorPayslipHtml,
	generateDoctorPayslipMessengerText,
	generateStaffPayrollAccountingCsv,
	generate1CZup31Csv,
	generateStaffPayrollLedgerHtml,
	generateFormT51Html,
} from "./staffPayrollExports.js";

import { generateStaffPayrollCsv } from "./exports/payrollCsvExporter.js";

// Canonical Aliases & Interop
export type AnyStaffPayrollResult = StaffPayrollRecord;
export type UnifiedStaffPayrollLedger = ConsolidatedStaffPayrollSummary;
export const calculateUnifiedStaffPayrollLedger = calculateConsolidatedStaffPayroll;
export const exportStaffPayrollToCsv = generateStaffPayrollCsv;
