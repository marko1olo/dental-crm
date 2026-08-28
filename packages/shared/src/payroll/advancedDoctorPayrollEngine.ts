/**
 * ═══════════════════════════════════════════════════════════════════════════
 * DENTE Dental CRM — Advanced Doctor & Staff Payroll Engine (Wave 14)
 *
 * Core Principles:
 * 1. Kopeck-Exact Integer Arithmetic (Zero Floating-Point Drift).
 * 2. Differentiated Doctor Piece-Rate Commission by Medical Specialty:
 *    - Therapy / Endodontics: 25%
 *    - Orthopedics (CAD/CAM, prosthetics): 15%
 *    - Surgery / Implantology: 20%
 *    - Orthodontics (braces / aligners): 20%
 *    - Professional Hygiene & Prevention: 30%
 *    - Retail Hygiene Products: 10%
 * 3. Dynamic Deduction of Dental Laboratory (ЗТЛ) & Direct Material Costs:
 *    Deal Base = Gross Revenue - Direct Materials - ZTL Lab Costs
 *    Doctor Accrual = Deal Base * (Commission % / 100)
 *    (ZTL and materials are strictly deducted BEFORE applying commission %).
 * 4. Assistant Piece-Rate & Shift Payroll:
 *    Assistant Total = (Shift Rate * Shift Count) + (Imaging Revenue * Imaging %) + Shot Bonuses
 * 5. Statutory 1C:ZUP 3.1 Integration:
 *    Export of clean "dirty" (gross) accruals in XML and CSV formats
 *    (taxes like NDFL and social funds are calculated inside 1C:ZUP).
 * ═══════════════════════════════════════════════════════════════════════════
 */

import { z } from "zod";
import type { Kopecks } from "../utils/money.js";

/** Medical specialties with differentiated piece-rate commission */
export type DoctorSpecialtyCategory =
	| "therapy"
	| "orthopedics"
	| "surgery"
	| "orthodontics"
	| "hygiene"
	| "retail_hygiene";

/** Statutory commission configuration preset for doctor specialties */
export interface DoctorSpecialtyCommissionPreset {
	readonly specialtyId: DoctorSpecialtyCategory;
	readonly code1C: string;
	readonly titleRu: string;
	readonly defaultPercentage: number; // e.g. 25 = 25%
	readonly retailProductsPercentage: number; // e.g. 10 = 10%
	readonly deductsLabCosts: boolean;
	readonly deductsMaterialCosts: boolean;
	readonly minGuaranteeMonthlyKop: Kopecks; // Minimum monthly guaranteed wage in kopecks
	readonly descriptionRu: string;
}

/** Standard statutory presets for clinical specialties */
export const ADVANCED_DOCTOR_SPECIALTY_PRESETS: readonly DoctorSpecialtyCommissionPreset[] = [
	{
		specialtyId: "therapy",
		code1C: "THERAPY_DOC",
		titleRu: "Врач-стоматолог терапевт / эндодонтист",
		defaultPercentage: 25,
		retailProductsPercentage: 10,
		deductsLabCosts: false,
		deductsMaterialCosts: true,
		minGuaranteeMonthlyKop: 6000000, // 60,000.00 RUB
		descriptionRu: "25% от выручки за вычетом прямых материалов (пломбировочные, эндомоторы) + 10% за средства домашней гигиены.",
	},
	{
		specialtyId: "orthopedics",
		code1C: "ORTHO_DOC",
		titleRu: "Врач-стоматолог ортопед (CAD/CAM)",
		defaultPercentage: 15,
		retailProductsPercentage: 5,
		deductsLabCosts: true,
		deductsMaterialCosts: false,
		minGuaranteeMonthlyKop: 8000000, // 80,000.00 RUB
		descriptionRu: "15% от выручки за вычетом счетов зуботехнической лаборатории ЗТЛ (цирконий, керамика, виниры, E.max).",
	},
	{
		specialtyId: "surgery",
		code1C: "SURG_DOC",
		titleRu: "Врач-стоматолог хирург-имплантолог",
		defaultPercentage: 20,
		retailProductsPercentage: 5,
		deductsLabCosts: false,
		deductsMaterialCosts: true,
		minGuaranteeMonthlyKop: 10000000, // 100,000.00 RUB
		descriptionRu: "20% от хирургических операций и имплантации за вычетом стоимости имплантатов и костнопластических мембран.",
	},
	{
		specialtyId: "orthodontics",
		code1C: "ORTHODONT_DOC",
		titleRu: "Врач-ортодонт (брекеты / элайнеры)",
		defaultPercentage: 20,
		retailProductsPercentage: 5,
		deductsLabCosts: true,
		deductsMaterialCosts: false,
		minGuaranteeMonthlyKop: 7500000, // 75,000.00 RUB
		descriptionRu: "20% от активаций брекет-систем и оплат за элайнеры за вычетом стоимости фабричного сетапа лаборатории.",
	},
	{
		specialtyId: "hygiene",
		code1C: "HYGIENE_DOC",
		titleRu: "Гигиенист стоматологический / Пародонтолог",
		defaultPercentage: 30,
		retailProductsPercentage: 15,
		deductsLabCosts: false,
		deductsMaterialCosts: false,
		minGuaranteeMonthlyKop: 4500000, // 45,000.00 RUB
		descriptionRu: "30% от профессиональной гигиены и отбеливания + 15% за проданные средства ухода Curaprox/Oral-B.",
	},
	{
		specialtyId: "retail_hygiene",
		code1C: "RETAIL_HYGIENE",
		titleRu: "Реализация средств гигиены (Curaprox / Oral-B)",
		defaultPercentage: 10,
		retailProductsPercentage: 10,
		deductsLabCosts: false,
		deductsMaterialCosts: false,
		minGuaranteeMonthlyKop: 0,
		descriptionRu: "10% от розничной реализации средств домашней гигиены и ухода.",
	},
];

/** Assistant shift and piece-rate payment configuration */
export interface AssistantPayrollRules {
	readonly baseShiftRateKop: Kopecks; // e.g. 3500.00 RUB = 350000 kop per standard shift
	readonly imagingCommissionPercent: number; // e.g. 10 = 10% of diagnostic imaging revenue
	readonly perShotBonusKop: Kopecks; // e.g. 150.00 RUB = 15000 kop per radiograph
	readonly surgeryAssistanceBonusKop: Kopecks; // e.g. 200.00 RUB = 20000 kop per surgery
	readonly overtimeHourlyRateKop: Kopecks; // e.g. 500.00 RUB/hr = 50000 kop
}

export const DEFAULT_ASSISTANT_PAYROLL_RULES: AssistantPayrollRules = {
	baseShiftRateKop: 350000, // 3,500.00 RUB per 6-hour shift
	imagingCommissionPercent: 10, // 10% from CBCT / OPTG revenue
	perShotBonusKop: 15000, // 150.00 RUB per shot
	surgeryAssistanceBonusKop: 20000, // 200.00 RUB per surgical operation
	overtimeHourlyRateKop: 50000, // 500.00 RUB/hr
};

/** KPI Revenue Bonus Tier */
export interface DoctorKpiTier {
	readonly minRevenueKop: Kopecks;
	readonly bonusPercentage: number;
	readonly badgeRu: string;
}

export const DEFAULT_DOCTOR_KPI_TIERS: readonly DoctorKpiTier[] = [
	{
		minRevenueKop: 100000000, // 1,000,000.00 RUB
		bonusPercentage: 5,
		badgeRu: "🌟 Топ-выручка (+5% KPI премия)",
	},
	{
		minRevenueKop: 50000000, // 500,000.00 RUB
		bonusPercentage: 2,
		badgeRu: "🚀 План перевыполнен (+2% KPI премия)",
	},
	{
		minRevenueKop: 0,
		bonusPercentage: 0,
		badgeRu: "Базовая ставка",
	},
];

/** Individual completed clinical service record */
export interface AdvancedDoctorServiceItem {
	readonly id: string;
	readonly dateIso: string;
	readonly patientId: string;
	readonly patientName: string;
	readonly medicalCardNumber: string;
	readonly serviceCode804n?: string | undefined;
	readonly serviceNameRu: string;
	readonly category: DoctorSpecialtyCategory;
	readonly grossRevenueKop: Kopecks;
	readonly labCostKop: Kopecks; // ЗТЛ себестоимость
	readonly materialCostKop: Kopecks; // Прямые материалы
	readonly customCommissionPercent?: number | undefined;
}

/** Calculation input for doctor piece-rate payroll */
export interface AdvancedDoctorPayrollInput {
	readonly doctorId: string;
	readonly tabNumber: string;
	readonly doctorName: string;
	readonly specialtyId: DoctorSpecialtyCategory;
	readonly periodStartIso: string;
	readonly periodEndIso: string;
	readonly departmentRu?: string | undefined;
	readonly services: readonly AdvancedDoctorServiceItem[];
	readonly customBasePercentage?: number | undefined;
	readonly kpiTiers?: readonly DoctorKpiTier[] | undefined;
	readonly manualAdjustmentKop?: Kopecks | undefined; // e.g. penalty or advance
	readonly manualAdjustmentReasonRu?: string | undefined;
}

/** Specialty breakdown aggregate */
export interface SpecialtyBreakdownAggregate {
	readonly category: DoctorSpecialtyCategory;
	readonly titleRu: string;
	readonly grossRevenueKop: Kopecks;
	readonly labDeductionsKop: Kopecks;
	readonly materialDeductionsKop: Kopecks;
	readonly netDealBaseKop: Kopecks;
	readonly commissionPercent: number;
	readonly earnedCommissionKop: Kopecks;
	readonly serviceCount: number;
}

/** Detailed result of doctor payroll calculation */
export interface AdvancedDoctorPayrollResult {
	readonly doctorId: string;
	readonly tabNumber: string;
	readonly doctorName: string;
	readonly specialtyId: DoctorSpecialtyCategory;
	readonly specialtyTitleRu: string;
	readonly periodLabelRu: string;
	readonly departmentRu: string;
	readonly totalGrossRevenueKop: Kopecks;
	readonly totalLabDeductionsKop: Kopecks;
	readonly totalMaterialDeductionsKop: Kopecks;
	readonly totalNetDealBaseKop: Kopecks;
	readonly baseCommissionPercent: number;
	readonly earnedBaseCommissionKop: Kopecks;
	readonly earnedRetailCommissionKop: Kopecks;
	readonly kpiBonusPercent: number;
	readonly kpiBonusEarnedKop: Kopecks;
	readonly kpiTierBadgeRu: string;
	readonly manualAdjustmentKop: Kopecks;
	readonly manualAdjustmentReasonRu: string;
	readonly preGuaranteeGrossPayoutKop: Kopecks;
	readonly minimumGuaranteeKop: Kopecks;
	readonly minimumGuaranteeApplied: boolean;
	readonly grossPayoutBeforeTaxKop: Kopecks; // Clean gross base for 1C:ZUP
	readonly totalServicesCount: number;
	readonly specialtyBreakdowns: readonly SpecialtyBreakdownAggregate[];
}

/** Assistant shift log item */
export interface AssistantWorkShiftItem {
	readonly id: string;
	readonly dateIso: string;
	readonly shiftType: "standard_6h" | "full_12h" | "overtime_custom";
	readonly hoursWorked: number;
	readonly radiographsTakenCount: number;
	readonly imagingRevenueKop: Kopecks; // Total revenue from taken radiographs/CBCT
	readonly surgeriesAssistedCount: number;
	readonly noteRu?: string | undefined;
}

/** Assistant payroll input */
export interface AdvancedAssistantPayrollInput {
	readonly assistantId: string;
	readonly tabNumber: string;
	readonly assistantName: string;
	readonly periodStartIso: string;
	readonly periodEndIso: string;
	readonly departmentRu?: string | undefined;
	readonly shifts: readonly AssistantWorkShiftItem[];
	readonly customRules?: Partial<AssistantPayrollRules> | undefined;
	readonly manualAdjustmentKop?: Kopecks | undefined;
	readonly manualAdjustmentReasonRu?: string | undefined;
}
export type AssistantPayrollInput = AdvancedAssistantPayrollInput;

/** Assistant payroll calculation result */
export interface AdvancedAssistantPayrollResult {
	readonly assistantId: string;
	readonly tabNumber: string;
	readonly assistantName: string;
	readonly periodLabelRu: string;
	readonly departmentRu: string;
	readonly totalShiftsCount: number;
	readonly totalHoursWorked: number;
	readonly totalRadiographsCount: number;
	readonly totalSurgeriesCount: number;
	readonly totalImagingRevenueKop: Kopecks;
	readonly baseShiftPayoutKop: Kopecks;
	readonly imagingPercentagePayoutKop: Kopecks;
	readonly radiographBonusPayoutKop: Kopecks;
	readonly surgeryAssistancePayoutKop: Kopecks;
	readonly manualAdjustmentKop: Kopecks;
	readonly grossPayoutBeforeTaxKop: Kopecks; // Clean gross for 1C:ZUP
}
export type AssistantPayrollResult = AdvancedAssistantPayrollResult;

/**
 * Validates integer kopecks
 */
function assertIntegerKopecks(value: number, label: string): void {
	if (!Number.isInteger(value)) {
		throw new Error(`${label} должно быть целым числом копеек, получено: ${value}`);
	}
	if (!Number.isSafeInteger(value)) {
		throw new Error(`${label} выходит за пределы допустимого диапазона целых чисел`);
	}
}

/**
 * Calculates doctor piece-rate payroll with exact integer kopecks,
 * dynamic lab/material deductions before commission, and KPI bonus tiers.
 */
export function calculateAdvancedDoctorPayroll(
	input: AdvancedDoctorPayrollInput,
): AdvancedDoctorPayrollResult {
	assertIntegerKopecks(input.manualAdjustmentKop ?? 0, "manualAdjustmentKop");

	const defaultPreset = ADVANCED_DOCTOR_SPECIALTY_PRESETS.find(
		(p) => p.specialtyId === input.specialtyId,
	) ?? ADVANCED_DOCTOR_SPECIALTY_PRESETS[0]!;

	const effectiveBasePercent = input.customBasePercentage ?? defaultPreset.defaultPercentage;
	const kpiTiers = input.kpiTiers ?? DEFAULT_DOCTOR_KPI_TIERS;

	let totalGross = 0;
	let totalLab = 0;
	let totalMaterial = 0;
	let totalNetBase = 0;
	let earnedBase = 0;
	let earnedRetail = 0;

	// Group services by category for detailed breakdown
	const categoryMap = new Map<DoctorSpecialtyCategory, {
		gross: number;
		lab: number;
		mat: number;
		net: number;
		earned: number;
		count: number;
	}>();

	for (const item of input.services) {
		assertIntegerKopecks(item.grossRevenueKop, "grossRevenueKop");
		assertIntegerKopecks(item.labCostKop, "labCostKop");
		assertIntegerKopecks(item.materialCostKop, "materialCostKop");

		const itemPreset = ADVANCED_DOCTOR_SPECIALTY_PRESETS.find(
			(p) => p.specialtyId === item.category,
		) ?? defaultPreset;

		const labCost = itemPreset.deductsLabCosts ? item.labCostKop : 0;
		const materialCost = itemPreset.deductsMaterialCosts ? item.materialCostKop : 0;

		totalGross += item.grossRevenueKop;
		totalLab += labCost;
		totalMaterial += materialCost;

		let itemEarned = 0;
		let itemNetBase = 0;

		if (item.category === "retail_hygiene") {
			const retailPercent = item.customCommissionPercent ?? itemPreset.retailProductsPercentage;
			itemNetBase = Math.max(0, item.grossRevenueKop);
			// Whole integer kopeck rounding for retail
			itemEarned = Math.round((itemNetBase * retailPercent) / 100);
			earnedRetail += itemEarned;
		} else {
			// STATUTORY RULE: Lab (ЗТЛ) and Materials are deducted BEFORE multiplying by doctor percentage
			itemNetBase = Math.max(0, item.grossRevenueKop - labCost - materialCost);
			const commissionPercent = item.customCommissionPercent ?? (
				item.category === input.specialtyId ? effectiveBasePercent : itemPreset.defaultPercentage
			);
			// Whole integer kopeck rounding for piece-rate commission
			itemEarned = Math.round((itemNetBase * commissionPercent) / 100);
			earnedBase += itemEarned;
		}

		totalNetBase += itemNetBase;

		const catStat = categoryMap.get(item.category) ?? {
			gross: 0,
			lab: 0,
			mat: 0,
			net: 0,
			earned: 0,
			count: 0,
		};
		catStat.gross += item.grossRevenueKop;
		catStat.lab += labCost;
		catStat.mat += materialCost;
		catStat.net += itemNetBase;
		catStat.earned += itemEarned;
		catStat.count += 1;
		categoryMap.set(item.category, catStat);
	}

	// KPI Bonus evaluation based on total gross revenue
	let kpiPercent = 0;
	let kpiBadge = "Базовая ставка";
	for (const tier of kpiTiers) {
		if (totalGross >= tier.minRevenueKop) {
			kpiPercent = tier.bonusPercentage;
			kpiBadge = tier.badgeRu;
			break;
		}
	}

	// KPI bonus is calculated from total net deal base
	const kpiBonusEarned = Math.round((totalNetBase * kpiPercent) / 100);
	const manualAdj = input.manualAdjustmentKop ?? 0;

	const preGuarantee = earnedBase + earnedRetail + kpiBonusEarned + manualAdj;
	let finalGross = preGuarantee;
	let guaranteeApplied = false;

	if (preGuarantee < defaultPreset.minGuaranteeMonthlyKop && input.services.length > 0) {
		finalGross = defaultPreset.minGuaranteeMonthlyKop;
		guaranteeApplied = true;
	}

	finalGross = Math.max(0, finalGross);

	// Build breakdowns list
	const breakdowns: SpecialtyBreakdownAggregate[] = [];
	for (const preset of ADVANCED_DOCTOR_SPECIALTY_PRESETS) {
		const stat = categoryMap.get(preset.specialtyId);
		if (stat && stat.count > 0) {
			const percent = preset.specialtyId === input.specialtyId ? effectiveBasePercent : preset.defaultPercentage;
			breakdowns.push({
				category: preset.specialtyId,
				titleRu: preset.titleRu,
				grossRevenueKop: stat.gross,
				labDeductionsKop: stat.lab,
				materialDeductionsKop: stat.mat,
				netDealBaseKop: stat.net,
				commissionPercent: percent,
				earnedCommissionKop: stat.earned,
				serviceCount: stat.count,
			});
		}
	}

	return {
		doctorId: input.doctorId,
		tabNumber: input.tabNumber,
		doctorName: input.doctorName,
		specialtyId: input.specialtyId,
		specialtyTitleRu: defaultPreset.titleRu,
		periodLabelRu: `${input.periodStartIso} — ${input.periodEndIso}`,
		departmentRu: input.departmentRu ?? "Лечебное отделение",
		totalGrossRevenueKop: totalGross,
		totalLabDeductionsKop: totalLab,
		totalMaterialDeductionsKop: totalMaterial,
		totalNetDealBaseKop: totalNetBase,
		baseCommissionPercent: effectiveBasePercent,
		earnedBaseCommissionKop: earnedBase,
		earnedRetailCommissionKop: earnedRetail,
		kpiBonusPercent: kpiPercent,
		kpiBonusEarnedKop: kpiBonusEarned,
		kpiTierBadgeRu: kpiBadge,
		manualAdjustmentKop: manualAdj,
		manualAdjustmentReasonRu: input.manualAdjustmentReasonRu ?? "",
		preGuaranteeGrossPayoutKop: Math.max(0, preGuarantee),
		minimumGuaranteeKop: defaultPreset.minGuaranteeMonthlyKop,
		minimumGuaranteeApplied: guaranteeApplied,
		grossPayoutBeforeTaxKop: finalGross,
		totalServicesCount: input.services.length,
		specialtyBreakdowns: breakdowns,
	};
}

/**
 * Calculates assistant piece-rate and shift payroll
 * Formula: Assistant = (Shift Rate * Shift Count) + (Imaging Revenue * Imaging %) + Bonuses
 */
export function calculateAssistantPayroll(
	input: AssistantPayrollInput,
): AssistantPayrollResult {
	const rules: AssistantPayrollRules = {
		...DEFAULT_ASSISTANT_PAYROLL_RULES,
		...input.customRules,
	};

	let totalShifts = 0;
	let totalHours = 0;
	let totalRadiographs = 0;
	let totalSurgeries = 0;
	let totalImagingRevenue = 0;
	let baseShiftPayout = 0;

	for (const shift of input.shifts) {
		assertIntegerKopecks(shift.imagingRevenueKop, "imagingRevenueKop");
		totalShifts += 1;
		totalHours += shift.hoursWorked;
		totalRadiographs += shift.radiographsTakenCount;
		totalSurgeries += shift.surgeriesAssistedCount;
		totalImagingRevenue += shift.imagingRevenueKop;

		if (shift.shiftType === "standard_6h") {
			baseShiftPayout += rules.baseShiftRateKop;
		} else if (shift.shiftType === "full_12h") {
			baseShiftPayout += rules.baseShiftRateKop * 2;
		} else {
			// Pro-rated shift rate based on 6-hour standard shift
			const proportionalShiftPay = Math.round((shift.hoursWorked / 6) * rules.baseShiftRateKop);
			baseShiftPayout += proportionalShiftPay;
		}
	}

	// 1. Imaging commission (% from imaging revenue)
	const imagingPercentagePayout = Math.round((totalImagingRevenue * rules.imagingCommissionPercent) / 100);

	// 2. Fixed per-shot bonus
	const radiographBonusPayout = totalRadiographs * rules.perShotBonusKop;

	// 3. Surgical assistance bonus
	const surgeryAssistancePayout = totalSurgeries * rules.surgeryAssistanceBonusKop;

	const manualAdj = input.manualAdjustmentKop ?? 0;
	assertIntegerKopecks(manualAdj, "manualAdjustmentKop");

	const totalGross = baseShiftPayout + imagingPercentagePayout + radiographBonusPayout + surgeryAssistancePayout + manualAdj;

	return {
		assistantId: input.assistantId,
		tabNumber: input.tabNumber,
		assistantName: input.assistantName,
		periodLabelRu: `${input.periodStartIso} — ${input.periodEndIso}`,
		departmentRu: input.departmentRu ?? "Ассистентский состав",
		totalShiftsCount: totalShifts,
		totalHoursWorked: Number(totalHours.toFixed(1)),
		totalRadiographsCount: totalRadiographs,
		totalSurgeriesCount: totalSurgeries,
		totalImagingRevenueKop: totalImagingRevenue,
		baseShiftPayoutKop: baseShiftPayout,
		imagingPercentagePayoutKop: imagingPercentagePayout,
		radiographBonusPayoutKop: radiographBonusPayout,
		surgeryAssistancePayoutKop: surgeryAssistancePayout,
		manualAdjustmentKop: manualAdj,
		grossPayoutBeforeTaxKop: Math.max(0, totalGross),
	};
}

/**
 * ═══════════════════════════════════════════════════════════════════════════
 * 1C:ZUP 3.1 STATUTORY EXPORT GENERATORS
 * ═══════════════════════════════════════════════════════════════════════════
 */

/** Single 1C:ZUP Accrual Item */
export interface OneCZupAccrualEntry {
	readonly tabNumber: string;
	readonly employeeFullName: string;
	readonly positionTitleRu: string;
	readonly departmentNameRu: string;
	readonly accrualCode1C: string;
	readonly accrualNameRu: string;
	readonly grossBaseKop: Kopecks;
	readonly calculationPercent?: number | undefined;
	readonly grossAmountKop: Kopecks;
	readonly periodMonthIso: string; // e.g. "2026-08"
	readonly commentRu: string;
}

/**
 * Transforms doctor and assistant payroll results into unified 1C:ZUP accruals list.
 */
export function buildOneCZupAccrualsList(
	doctors: readonly AdvancedDoctorPayrollResult[],
	assistants: readonly AssistantPayrollResult[],
	periodMonthIso: string,
): readonly OneCZupAccrualEntry[] {
	const entries: OneCZupAccrualEntry[] = [];

	for (const doc of doctors) {
		// Piece-rate medical commission
		if (doc.earnedBaseCommissionKop > 0) {
			entries.push({
				tabNumber: doc.tabNumber,
				employeeFullName: doc.doctorName,
				positionTitleRu: doc.specialtyTitleRu,
				departmentNameRu: doc.departmentRu,
				accrualCode1C: "DOCTOR_PIECE_RATE",
				accrualNameRu: "Сдельная оплата труда врача",
				grossBaseKop: doc.totalNetDealBaseKop,
				calculationPercent: doc.baseCommissionPercent,
				grossAmountKop: doc.earnedBaseCommissionKop,
				periodMonthIso,
				commentRu: `Сделка за вычетом ЗТЛ ${doc.periodLabelRu}`,
			});
		}

		// Retail commission
		if (doc.earnedRetailCommissionKop > 0) {
			entries.push({
				tabNumber: doc.tabNumber,
				employeeFullName: doc.doctorName,
				positionTitleRu: doc.specialtyTitleRu,
				departmentNameRu: doc.departmentRu,
				accrualCode1C: "RETAIL_COMMISSION",
				accrualNameRu: "Процент от реализации средств гигиены",
				grossBaseKop: doc.earnedRetailCommissionKop,
				grossAmountKop: doc.earnedRetailCommissionKop,
				periodMonthIso,
				commentRu: `Продажи домашней гигиены ${doc.periodLabelRu}`,
			});
		}

		// KPI Bonus
		if (doc.kpiBonusEarnedKop > 0) {
			entries.push({
				tabNumber: doc.tabNumber,
				employeeFullName: doc.doctorName,
				positionTitleRu: doc.specialtyTitleRu,
				departmentNameRu: doc.departmentRu,
				accrualCode1C: "KPI_BONUS",
				accrualNameRu: "Премия за выполнение KPI выручки",
				grossBaseKop: doc.totalNetDealBaseKop,
				calculationPercent: doc.kpiBonusPercent,
				grossAmountKop: doc.kpiBonusEarnedKop,
				periodMonthIso,
				commentRu: `${doc.kpiTierBadgeRu} ${doc.periodLabelRu}`,
			});
		}

		// Minimum Guarantee Top-Up
		if (doc.minimumGuaranteeApplied) {
			const topUp = Math.max(0, doc.grossPayoutBeforeTaxKop - doc.preGuaranteeGrossPayoutKop);
			if (topUp > 0) {
				entries.push({
					tabNumber: doc.tabNumber,
					employeeFullName: doc.doctorName,
					positionTitleRu: doc.specialtyTitleRu,
					departmentNameRu: doc.departmentRu,
					accrualCode1C: "MIN_GUARANTEE_TOPUP",
					accrualNameRu: "Доплата до минимального гарантированного оклада",
					grossBaseKop: topUp,
					grossAmountKop: topUp,
					periodMonthIso,
					commentRu: `МРОТ/Фикс гарантия ${doc.periodLabelRu}`,
				});
			}
		}

		// Manual Adjustment
		if (doc.manualAdjustmentKop !== 0) {
			entries.push({
				tabNumber: doc.tabNumber,
				employeeFullName: doc.doctorName,
				positionTitleRu: doc.specialtyTitleRu,
				departmentNameRu: doc.departmentRu,
				accrualCode1C: doc.manualAdjustmentKop > 0 ? "MANUAL_BONUS" : "MANUAL_DEDUCTION",
				accrualNameRu: doc.manualAdjustmentKop > 0 ? "Разовая премия / Корректировка" : "Удержание / Корректировка",
				grossBaseKop: Math.abs(doc.manualAdjustmentKop),
				grossAmountKop: doc.manualAdjustmentKop,
				periodMonthIso,
				commentRu: doc.manualAdjustmentReasonRu || `Ручная корректировка ${doc.periodLabelRu}`,
			});
		}
	}

	for (const ast of assistants) {
		// Base shift payout
		if (ast.baseShiftPayoutKop > 0) {
			entries.push({
				tabNumber: ast.tabNumber,
				employeeFullName: ast.assistantName,
				positionTitleRu: "Ассистент врача-стоматолога",
				departmentNameRu: ast.departmentRu,
				accrualCode1C: "ASSISTANT_SHIFTS",
				accrualNameRu: "Оплата смен ассистента",
				grossBaseKop: ast.baseShiftPayoutKop,
				grossAmountKop: ast.baseShiftPayoutKop,
				periodMonthIso,
				commentRu: `Смены (${ast.totalShiftsCount} смен, ${ast.totalHoursWorked}ч) ${ast.periodLabelRu}`,
			});
		}

		// Imaging commission (% from imaging revenue)
		if (ast.imagingPercentagePayoutKop > 0) {
			entries.push({
				tabNumber: ast.tabNumber,
				employeeFullName: ast.assistantName,
				positionTitleRu: "Ассистент врача-стоматолога",
				departmentNameRu: ast.departmentRu,
				accrualCode1C: "IMAGING_PERCENTAGE",
				accrualNameRu: "Процент от выручки снимков КЛКТ/ОПТГ",
				grossBaseKop: ast.totalImagingRevenueKop,
				grossAmountKop: ast.imagingPercentagePayoutKop,
				periodMonthIso,
				commentRu: `Выручка от снимков ${ast.periodLabelRu}`,
			});
		}

		// Radiograph fixed bonus
		if (ast.radiographBonusPayoutKop > 0) {
			entries.push({
				tabNumber: ast.tabNumber,
				employeeFullName: ast.assistantName,
				positionTitleRu: "Ассистент врача-стоматолога",
				departmentNameRu: ast.departmentRu,
				accrualCode1C: "RADIOGRAPH_SHOT_BONUS",
				accrualNameRu: "Доплата за выполненные снимки",
				grossBaseKop: ast.radiographBonusPayoutKop,
				grossAmountKop: ast.radiographBonusPayoutKop,
				periodMonthIso,
				commentRu: `Снимков: ${ast.totalRadiographsCount} шт. ${ast.periodLabelRu}`,
			});
		}

		// Surgery assistance bonus
		if (ast.surgeryAssistancePayoutKop > 0) {
			entries.push({
				tabNumber: ast.tabNumber,
				employeeFullName: ast.assistantName,
				positionTitleRu: "Ассистент врача-стоматолога",
				departmentNameRu: ast.departmentRu,
				accrualCode1C: "SURGERY_ASSIST_BONUS",
				accrualNameRu: "Доплата за ассистирование на операциях",
				grossBaseKop: ast.surgeryAssistancePayoutKop,
				grossAmountKop: ast.surgeryAssistancePayoutKop,
				periodMonthIso,
				commentRu: `Операций: ${ast.totalSurgeriesCount} ${ast.periodLabelRu}`,
			});
		}

		// Assistant manual adjustment
		if (ast.manualAdjustmentKop !== 0) {
			entries.push({
				tabNumber: ast.tabNumber,
				employeeFullName: ast.assistantName,
				positionTitleRu: "Ассистент врача-стоматолога",
				departmentNameRu: ast.departmentRu,
				accrualCode1C: ast.manualAdjustmentKop > 0 ? "MANUAL_BONUS" : "MANUAL_DEDUCTION",
				accrualNameRu: ast.manualAdjustmentKop > 0 ? "Разовая премия" : "Удержание",
				grossBaseKop: Math.abs(ast.manualAdjustmentKop),
				grossAmountKop: ast.manualAdjustmentKop,
				periodMonthIso,
				commentRu: `Ручная корректировка ${ast.periodLabelRu}`,
			});
		}
	}

	return entries;
}

/**
 * Generates statutory 1C:ZUP 3.1 XML exchange document string with UTF-8 encoding.
 * Schema: EnterpriseData / НачислениеЗарплатыИВзносов / ЗагрузкаРазовыхНачислений.
 */
export function exportOneCZup31Xml(
	accruals: readonly OneCZupAccrualEntry[],
	organizationNameRu: string = "ООО «Денте Стоматология»",
	organizationInn: string = "7701234567",
	documentNumber: string = "CRM-PAY-001",
	exportDateIso: string = new Date().toISOString().split("T")[0]!,
): string {
	let xml = `<?xml version="1.0" encoding="UTF-8"?>\n`;
	xml += `<ДанныеОбмена_1СЗУП31 xmlns="http://v8.1c.ru/edi/edi_stnd/EnterpriseData/1.8" ВерсияФормата="1.8">\n`;
	xml += `  <Заголовок>\n`;
	xml += `    <Идентификатор>${documentNumber}</Идентификатор>\n`;
	xml += `    <ДатаФормирования>${exportDateIso}</ДатаФормирования>\n`;
	xml += `    <Организация>\n`;
	xml += `      <Наименование>${escapeXml(organizationNameRu)}</Наименование>\n`;
	xml += `      <ИНН>${escapeXml(organizationInn)}</ИНН>\n`;
	xml += `    </Организация>\n`;
	xml += `    <Источник>DENTE Dental CRM</Источник>\n`;
	xml += `  </Заголовок>\n`;
	xml += `  <Документ_РегистрацияРазовыхНачислений>\n`;
	xml += `    <Номер>${documentNumber}</Номер>\n`;
	xml += `    <Дата>${exportDateIso}</Дата>\n`;
	xml += `    <Начисления>\n`;

	for (const item of accruals) {
		const amountRub = (item.grossAmountKop / 100).toFixed(2);
		const baseRub = (item.grossBaseKop / 100).toFixed(2);
		xml += `      <СтрокаНачисления>\n`;
		xml += `        <ТабельныйНомер>${escapeXml(item.tabNumber)}</ТабельныйНомер>\n`;
		xml += `        <ФИО>${escapeXml(item.employeeFullName)}</ФИО>\n`;
		xml += `        <Должность>${escapeXml(item.positionTitleRu)}</Должность>\n`;
		xml += `        <Подразделение>${escapeXml(item.departmentNameRu)}</Подразделение>\n`;
		xml += `        <КодНачисления1С>${escapeXml(item.accrualCode1C)}</КодНачисления1С>\n`;
		xml += `        <ВидРасчета>${escapeXml(item.accrualNameRu)}</ВидРасчета>\n`;
		xml += `        <ПериодРегистрации>${escapeXml(item.periodMonthIso)}</ПериодРегистрации>\n`;
		xml += `        <БазаРасчетаРуб>${baseRub}</БазаРасчетаРуб>\n`;
		if (item.calculationPercent !== undefined) {
			xml += `        <Процент>${item.calculationPercent}</Процент>\n`;
		}
		xml += `        <СуммаНачисленияРуб>${amountRub}</СуммаНачисленияРуб>\n`;
		xml += `        <СуммаНачисленияКоп>${item.grossAmountKop}</СуммаНачисленияКоп>\n`;
		xml += `        <Комментарий>${escapeXml(item.commentRu)}</Комментарий>\n`;
		xml += `      </СтрокаНачисления>\n`;
	}

	xml += `    </Начисления>\n`;
	xml += `  </Документ_РегистрацияРазовыхНачислений>\n`;
	xml += `</ДанныеОбмена_1СЗУП31>\n`;

	return xml;
}

/**
 * Generates statutory 1C:ZUP 3.1 CSV file string with UTF-8 BOM.
 */
export function exportOneCZup31Csv(accruals: readonly OneCZupAccrualEntry[]): string {
	const header = "ТабельныйНомер;ФИО;Должность;Подразделение;КодНачисления;ВидНачисления;Период;БазаРасчетаРуб;Процент;НачисленоРуб;НачисленоКоп;Комментарий\n";
	const rows = accruals.map((a) => {
		const baseRub = (a.grossBaseKop / 100).toFixed(2);
		const amountRub = (a.grossAmountKop / 100).toFixed(2);
		const percentStr = a.calculationPercent !== undefined ? `${a.calculationPercent}%` : "";
		return `${a.tabNumber};"${a.employeeFullName}";"${a.positionTitleRu}";"${a.departmentNameRu}";${a.accrualCode1C};"${a.accrualNameRu}";${a.periodMonthIso};${baseRub};${percentStr};${amountRub};${a.grossAmountKop};"${a.commentRu}"`;
	});

	return "\uFEFF" + header + rows.join("\n");
}

function escapeXml(unsafe: string): string {
	return unsafe
		.replace(/&/g, "&amp;")
		.replace(/</g, "&lt;")
		.replace(/>/g, "&gt;")
		.replace(/"/g, "&quot;")
		.replace(/'/g, "&apos;");
}

/** Zod schemas for validation and API boundaries */
export const advancedDoctorServiceItemSchema = z.object({
	id: z.string().min(1),
	dateIso: z.string().min(1),
	patientId: z.string().min(1),
	patientName: z.string().min(1),
	medicalCardNumber: z.string().min(1),
	serviceCode804n: z.string().optional(),
	serviceNameRu: z.string().min(1),
	category: z.enum(["therapy", "orthopedics", "surgery", "orthodontics", "hygiene", "retail_hygiene"]),
	grossRevenueKop: z.number().int().nonnegative(),
	labCostKop: z.number().int().nonnegative(),
	materialCostKop: z.number().int().nonnegative(),
	customCommissionPercent: z.number().min(0).max(100).optional(),
});

export const advancedDoctorPayrollInputSchema = z.object({
	doctorId: z.string().min(1),
	tabNumber: z.string().min(1),
	doctorName: z.string().min(1),
	specialtyId: z.enum(["therapy", "orthopedics", "surgery", "orthodontics", "hygiene", "retail_hygiene"]),
	periodStartIso: z.string().min(1),
	periodEndIso: z.string().min(1),
	departmentRu: z.string().optional(),
	services: z.array(advancedDoctorServiceItemSchema),
	customBasePercentage: z.number().min(0).max(100).optional(),
	manualAdjustmentKop: z.number().int().optional(),
	manualAdjustmentReasonRu: z.string().optional(),
});
