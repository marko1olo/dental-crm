/**
 * Treatment Plan Multi-Variant Differential Math & Payment Engine
 * (DOMAIN: PLAN COMPARATOR)
 *
 * Точный финансовый расчет разницы планов лечения, разбивка по клиническим категориям,
 * генератор графиков оплат (скидка 5%, этапы 30/40/30, рассрочка 6/12/24 мес) и расчет налогового вычета НДФЛ 13%.
 */

import type {
	ClinicalCategoryCode,
	ComprehensivePlanVariant,
	PlanTierCode,
} from "./planPresentationPresets";

export interface CategoryFinancialItem {
	readonly category: ClinicalCategoryCode;
	readonly categoryNameRu: string;
	readonly totalRub: number;
	readonly sharePercent: number;
	readonly proceduresCount: number;
}

export interface PlanCategoryBreakdown {
	readonly surgeryImplantRub: number;
	readonly orthopedicsProstheticsRub: number;
	readonly therapyEndoRub: number;
	readonly hygienePerioRub: number;
	readonly totalRub: number;
	readonly categories: readonly CategoryFinancialItem[];
}

export interface StagedPaymentSchedule {
	readonly stage1DiagnosticRub: number; // 30%
	readonly stage2SurgeryRub: number; // 40%
	readonly stage3OrthopedicsRub: number; // 30%
	readonly isBalanced: boolean;
}

export interface InstallmentScheduleOption {
	readonly months: 6 | 12 | 24;
	readonly monthlyPaymentRub: number;
	readonly totalPayableRub: number;
	readonly isZeroOverpayment: boolean;
	readonly provider: "clinic_internal" | "partner_bank";
}

export interface NdflTaxDeductionInfo {
	readonly code: "01" | "02";
	readonly codeNameRu: string;
	readonly maxEligibleBaseRub: number;
	readonly refundAmountRub: number;
	readonly effectiveNetCostRub: number;
}

export interface PaymentSchedulesSummary {
	readonly grossTotalRub: number;
	readonly singlePaymentWith5PctDiscount: {
		readonly discountRub: number;
		readonly finalPayableRub: number;
		readonly discountPct: 5;
	};
	readonly stagedPayment: StagedPaymentSchedule;
	readonly installments: readonly InstallmentScheduleOption[];
	readonly ndflRefund: NdflTaxDeductionInfo;
}

export interface PlanPairDifferential {
	readonly baseTier: PlanTierCode;
	readonly targetTier: PlanTierCode;
	readonly costDeltaRub: number; // target - base
	readonly costDeltaPercent: number;
	readonly visitsDelta: number;
	readonly durationWeeksDelta: number;
	readonly warrantyYearsDelta: number;
	readonly serviceLifeYearsDelta: number;
	readonly aestheticScoreDelta: number;
	readonly costPerYearServiceBaseRub: number;
	readonly costPerYearServiceTargetRub: number;
}

export interface MultiVariantComparatorSummary {
	readonly recommendedTier: PlanTierCode;
	readonly lowestInitialCostTier: PlanTierCode;
	readonly longestServiceLifeTier: PlanTierCode;
	readonly highestAestheticTier: PlanTierCode;
	readonly bestValueCostPerYearTier: PlanTierCode;
	readonly tierSummaries: Readonly<
		Record<
			PlanTierCode,
			{
				readonly variant: ComprehensivePlanVariant;
				readonly breakdown: PlanCategoryBreakdown;
				readonly payments: PaymentSchedulesSummary;
				readonly costPerServiceYearRub: number;
			}
		>
	>;
}

export const CATEGORY_NAMES_RU: Readonly<Record<ClinicalCategoryCode, string>> = {
	surgery_implant: "Хирургия & Имплантация",
	orthopedics_prosthetics: "Ортопедия & Протезирование",
	therapy_endo: "Терапия & Эндодонтия",
	hygiene_perio: "Гигиена & Пародонтология",
};

/**
 * Расчет структуры стоимости плана лечения по клиническим категориям.
 */
export function getPlanCategoryBreakdown(plan: ComprehensivePlanVariant): PlanCategoryBreakdown {
	let surgery = 0;
	let orthopedics = 0;
	let therapy = 0;
	let hygiene = 0;

	let countSurgery = 0;
	let countOrtho = 0;
	let countTherapy = 0;
	let countHygiene = 0;

	for (const proc of plan.procedures) {
		if (proc.category === "surgery_implant") {
			surgery += proc.totalCostRub;
			countSurgery += proc.quantity;
		} else if (proc.category === "orthopedics_prosthetics") {
			orthopedics += proc.totalCostRub;
			countOrtho += proc.quantity;
		} else if (proc.category === "therapy_endo") {
			therapy += proc.totalCostRub;
			countTherapy += proc.quantity;
		} else if (proc.category === "hygiene_perio") {
			hygiene += proc.totalCostRub;
			countHygiene += proc.quantity;
		}
	}

	const total = surgery + orthopedics + therapy + hygiene || plan.totalCostRub || 1;

	const categories: CategoryFinancialItem[] = [
		{
			category: "surgery_implant",
			categoryNameRu: CATEGORY_NAMES_RU.surgery_implant,
			totalRub: surgery,
			sharePercent: Number(((surgery / total) * 100).toFixed(1)),
			proceduresCount: countSurgery,
		},
		{
			category: "orthopedics_prosthetics",
			categoryNameRu: CATEGORY_NAMES_RU.orthopedics_prosthetics,
			totalRub: orthopedics,
			sharePercent: Number(((orthopedics / total) * 100).toFixed(1)),
			proceduresCount: countOrtho,
		},
		{
			category: "therapy_endo",
			categoryNameRu: CATEGORY_NAMES_RU.therapy_endo,
			totalRub: therapy,
			sharePercent: Number(((therapy / total) * 100).toFixed(1)),
			proceduresCount: countTherapy,
		},
		{
			category: "hygiene_perio",
			categoryNameRu: CATEGORY_NAMES_RU.hygiene_perio,
			totalRub: hygiene,
			sharePercent: Number(((hygiene / total) * 100).toFixed(1)),
			proceduresCount: countHygiene,
		},
	];

	return {
		surgeryImplantRub: surgery,
		orthopedicsProstheticsRub: orthopedics,
		therapyEndoRub: therapy,
		hygienePerioRub: hygiene,
		totalRub: plan.totalCostRub,
		categories,
	};
}

/**
 * Расчет социального налогового вычета НДФЛ 13% (Код 01 обычный с лимитом 150 тыс. руб. или Код 02 дорогостоящий без лимита).
 */
export function calculateNdflTaxRefund(
	totalCostRub: number,
	isCode02HighCostSurgery: boolean,
): NdflTaxDeductionInfo {
	if (isCode02HighCostSurgery) {
		// Код 02: Дорогостоящее лечение (имплантация, костная пластика) — вычет со всей суммы без ограничений
		const refund = Math.round(totalCostRub * 0.13);
		return {
			code: "02",
			codeNameRu: "Код 02: Дорогостоящее лечение (без лимита вычета)",
			maxEligibleBaseRub: totalCostRub,
			refundAmountRub: refund,
			effectiveNetCostRub: totalCostRub - refund,
		};
	}

	// Код 01: Обычное лечение (лимит налоговой базы 150 000 руб. с 2024 года, возврат макс. 19 500 руб.)
	const maxBase = Math.min(totalCostRub, 150000);
	const refund = Math.round(maxBase * 0.13);
	return {
		code: "01",
		codeNameRu: "Код 01: Стандартное лечение (лимит 150 000 руб.)",
		maxEligibleBaseRub: maxBase,
		refundAmountRub: refund,
		effectiveNetCostRub: totalCostRub - refund,
	};
}

/**
 * Генерация вариантов графика платежей (разовый -5%, поэтапный 30/40/30, рассрочка 6/12/24 мес).
 */
export function generatePaymentSchedules(
	totalCostRub: number,
	isCode02HighCostSurgery = true,
): PaymentSchedulesSummary {
	const safeTotal = Math.max(0, totalCostRub);
	const totalKopecks = Math.round(safeTotal * 100);

	// 1. Единовременная оплата со скидкой 5%
	const discountKopecks = Math.round(totalKopecks * 0.05);
	const netPayableKopecks = totalKopecks - discountKopecks;
	const discountRub = Number((discountKopecks / 100).toFixed(2));
	const finalPayableRub = Number((netPayableKopecks / 100).toFixed(2));

	// 2. Поэтапная оплата (30% аванс/санация, 40% хирургия, 30% ортопедия)
	const s1Kopecks = Math.round(totalKopecks * 0.3);
	const s2Kopecks = Math.round(totalKopecks * 0.4);
	const s3Kopecks = totalKopecks - s1Kopecks - s2Kopecks; // Точная копеечная балансировка

	const stagedPayment: StagedPaymentSchedule = {
		stage1DiagnosticRub: Number((s1Kopecks / 100).toFixed(2)),
		stage2SurgeryRub: Number((s2Kopecks / 100).toFixed(2)),
		stage3OrthopedicsRub: Number((s3Kopecks / 100).toFixed(2)),
		isBalanced: s1Kopecks + s2Kopecks + s3Kopecks === totalKopecks,
	};

	// 3. Рассрочка (6, 12, 24 мес)
	const monthly6Kopecks = Math.round(totalKopecks / 6);
	const monthly12Kopecks = Math.round(totalKopecks / 12);
	const monthly24Kopecks = Math.round(totalKopecks / 24);

	const installments: InstallmentScheduleOption[] = [
		{
			months: 6,
			monthlyPaymentRub: Number((monthly6Kopecks / 100).toFixed(2)),
			totalPayableRub: safeTotal,
			isZeroOverpayment: true,
			provider: "clinic_internal",
		},
		{
			months: 12,
			monthlyPaymentRub: Number((monthly12Kopecks / 100).toFixed(2)),
			totalPayableRub: safeTotal,
			isZeroOverpayment: true,
			provider: "clinic_internal",
		},
		{
			months: 24,
			monthlyPaymentRub: Number((monthly24Kopecks / 100).toFixed(2)),
			totalPayableRub: safeTotal,
			isZeroOverpayment: true,
			provider: "partner_bank",
		},
	];

	// 4. Налоговый вычет
	const ndflRefund = calculateNdflTaxRefund(safeTotal, isCode02HighCostSurgery);

	return {
		grossTotalRub: safeTotal,
		singlePaymentWith5PctDiscount: {
			discountRub,
			finalPayableRub,
			discountPct: 5,
		},
		stagedPayment,
		installments,
		ndflRefund,
	};
}

/**
 * Дифференциальное сравнение двух вариантов планов лечения.
 */
export function calculatePlanDifferential(
	basePlan: ComprehensivePlanVariant,
	targetPlan: ComprehensivePlanVariant,
): PlanPairDifferential {
	const costDeltaRub = targetPlan.totalCostRub - basePlan.totalCostRub;
	const costDeltaPercent =
		basePlan.totalCostRub > 0
			? Number(((costDeltaRub / basePlan.totalCostRub) * 100).toFixed(1))
			: 0;

	const visitsDelta = targetPlan.totalVisitsCount - basePlan.totalVisitsCount;
	const durationWeeksDelta = targetPlan.totalDurationWeeks - basePlan.totalDurationWeeks;
	const warrantyYearsDelta = targetPlan.warrantyYears - basePlan.warrantyYears;
	const serviceLifeYearsDelta =
		targetPlan.estimatedServiceLifeYears - basePlan.estimatedServiceLifeYears;
	const aestheticScoreDelta = Number(
		(targetPlan.aestheticScore - basePlan.aestheticScore).toFixed(1),
	);

	const costPerYearServiceBaseRub =
		basePlan.estimatedServiceLifeYears > 0
			? Math.round(basePlan.totalCostRub / basePlan.estimatedServiceLifeYears)
			: basePlan.totalCostRub;

	const costPerYearServiceTargetRub =
		targetPlan.estimatedServiceLifeYears > 0
			? Math.round(targetPlan.totalCostRub / targetPlan.estimatedServiceLifeYears)
			: targetPlan.totalCostRub;

	return {
		baseTier: basePlan.tierCode,
		targetTier: targetPlan.tierCode,
		costDeltaRub,
		costDeltaPercent,
		visitsDelta,
		durationWeeksDelta,
		warrantyYearsDelta,
		serviceLifeYearsDelta,
		aestheticScoreDelta,
		costPerYearServiceBaseRub,
		costPerYearServiceTargetRub,
	};
}

/**
 * Полный многофакторный сводный анализ 3-х планов лечения.
 */
export function generate3TierComparisonSummary(
	variants: Readonly<Record<PlanTierCode, ComprehensivePlanVariant>>,
): MultiVariantComparatorSummary {
	const tierKeys: PlanTierCode[] = ["optimum_vip", "standard_recommended", "economy_basic"];

	let recommendedTier: PlanTierCode = "standard_recommended";
	let lowestCostTier: PlanTierCode = "economy_basic";
	let longestServiceLifeTier: PlanTierCode = "optimum_vip";
	let highestAestheticTier: PlanTierCode = "optimum_vip";
	let bestValueCostPerYearTier: PlanTierCode = "standard_recommended";

	let lowestCost = Infinity;
	let maxLife = -Infinity;
	let maxAesthetic = -Infinity;
	let minCostPerYear = Infinity;

	const tierSummaries: Record<
		PlanTierCode,
		{
			readonly variant: ComprehensivePlanVariant;
			readonly breakdown: PlanCategoryBreakdown;
			readonly payments: PaymentSchedulesSummary;
			readonly costPerServiceYearRub: number;
		}
	> = {} as any;

	for (const key of tierKeys) {
		const v = variants[key];
		const breakdown = getPlanCategoryBreakdown(v);
		const payments = generatePaymentSchedules(v.totalCostRub, v.isCode02HighCostSurgery);
		const costPerYear =
			v.estimatedServiceLifeYears > 0
				? Math.round(v.totalCostRub / v.estimatedServiceLifeYears)
				: v.totalCostRub;

		tierSummaries[key] = {
			variant: v,
			breakdown,
			payments,
			costPerServiceYearRub: costPerYear,
		};

		if (v.isRecommended) recommendedTier = key;
		if (v.totalCostRub < lowestCost) {
			lowestCost = v.totalCostRub;
			lowestCostTier = key;
		}
		if (v.estimatedServiceLifeYears > maxLife) {
			maxLife = v.estimatedServiceLifeYears;
			longestServiceLifeTier = key;
		}
		if (v.aestheticScore > maxAesthetic) {
			maxAesthetic = v.aestheticScore;
			highestAestheticTier = key;
		}
		if (costPerYear < minCostPerYear) {
			minCostPerYear = costPerYear;
			bestValueCostPerYearTier = key;
		}
	}

	return {
		recommendedTier,
		lowestInitialCostTier: lowestCostTier,
		longestServiceLifeTier,
		highestAestheticTier,
		bestValueCostPerYearTier,
		tierSummaries,
	};
}
