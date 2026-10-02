/**
 * treatmentPlanMath.ts — Точная математика, финансовые расчёты и валидация планов лечения DENTE CRM.
 *
 * Мандаты 8b, 8e, 8n:
 * - Все расчёты ведутся в целых копейках (Kopecks) для исключения ошибок округления IEEE 754.
 * - Расчёт рассрочки 0% без переплат (3, 6, 12, 24 мес) с сохранением суммы до копейки.
 * - Расчёт социального налогового вычета 13% НДФЛ (Код 01 лимит базы 150 000 ₽, Код 02 без лимита).
 * - Расчёт скидки врача (0-100%) с автономией (Мандат 8e).
 * - Форматирование цен для кресельной презентации пациенту (читаемость с расстояния вытянутой руки).
 * - Валидация целостности структуры плана (parity check).
 */

import {
	type Kopecks,
	parseKopecks,
	percentageOfKopecks,
	sumKopecks,
	calculatePlanTaxDeductionBreakdown,
	calculateStaged304030Schedule,
	ANNUAL_TAX_DEDUCTION_LIMIT_RUB_2024,
} from "@dental/shared";
import { calculateNdflDeduction } from "./treatmentPlanPricingEngine";
import type {
	NdflDeductionResult,
	TierInstallmentPlan,
	TreatmentPlanItem,
	TreatmentPlanStage,
	TreatmentPlanTier,
} from "./types";

/**
 * Лимит налоговой базы для обычного лечения (Код 01) по ст. 219 НК РФ: 150 000 руб = 15 000 000 копеек.
 */
export const NDFL_STANDARD_ANNUAL_LIMIT_RUB = ANNUAL_TAX_DEDUCTION_LIMIT_RUB_2024;
export const NDFL_STANDARD_ANNUAL_LIMIT_KOPECKS = (ANNUAL_TAX_DEDUCTION_LIMIT_RUB_2024 * 100) as Kopecks;

/**
 * Форматирует сумму в рублях для отображения пациенту у кресла.
 * Пример: 154000 -> "154 000 ₽"
 */
export function formatChairsidePrice(amountRub: number | undefined | null): string {
	const safe = typeof amountRub === "number" && !Number.isNaN(amountRub) ? Math.round(amountRub) : 0;
	return `${safe.toLocaleString("ru-RU")} ₽`;
}

/**
 * Форматирует сумму в копейках в рублевую строку.
 */
export function formatKopecksToRubString(amountKopecks: Kopecks | number): string {
	const rub = Math.round(Number(amountKopecks) / 100);
	return formatChairsidePrice(rub);
}

/**
 * Рассчитывает общую сумму этапа в копейках и рублях на основе его процедур.
 */
export function calculateStageTotals(items: readonly TreatmentPlanItem[]): {
	totalKopecks: Kopecks;
	totalRub: number;
} {
	if (!items || items.length === 0) {
		return { totalKopecks: 0 as Kopecks, totalRub: 0 };
	}

	const totalKopecks = sumKopecks(
		items.map((it) => {
			const unitKop = parseKopecks(it.unitPriceRub || 0);
			const qty = Math.max(1, it.quantity || 1);
			const discountKop = parseKopecks(it.discountRub || 0);
			const lineTotalKop = Math.max(0, unitKop * qty - discountKop) as Kopecks;
			return lineTotalKop;
		}),
	);

	const totalRub = Math.round(totalKopecks / 100);
	return { totalKopecks, totalRub };
}

/**
 * Рассчитывает общие финансовые итоги для всех этапов плана.
 */
export function calculatePlanStagesTotals(stages: readonly TreatmentPlanStage[]): {
	totalKopecks: Kopecks;
	totalRub: number;
	itemsCount: number;
	estimatedWeeks: number;
	estimatedVisits: number;
} {
	if (!stages || stages.length === 0) {
		return {
			totalKopecks: 0 as Kopecks,
			totalRub: 0,
			itemsCount: 0,
			estimatedWeeks: 0,
			estimatedVisits: 0,
		};
	}

	const totalKopecks = sumKopecks(stages.map((s) => s.totalKopecks));
	const totalRub = Math.round(totalKopecks / 100);
	const itemsCount = stages.reduce((acc, s) => acc + s.items.length, 0);
	const estimatedWeeks = stages.reduce((acc, s) => acc + (s.estimatedWeeks || 0), 0);
	const estimatedVisits = stages.reduce((acc, s) => acc + (s.estimatedVisits || 0), 0);

	return {
		totalKopecks,
		totalRub,
		itemsCount,
		estimatedWeeks,
		estimatedVisits,
	};
}

/**
 * Рассчитывает рассрочку 0% на 3, 6, 12, 24 месяца равными долями в копейках.
 * Сумма долей строго равна исходной сумме до последней копейки (Мандат 8e / 8n).
 */
export function calculateChairsideInstallments(
	totalKopecks: Kopecks,
): Record<3 | 6 | 12 | 24, TierInstallmentPlan> {
	const monthsList: readonly (3 | 6 | 12 | 24)[] = [3, 6, 12, 24];
	const result = {} as Record<3 | 6 | 12 | 24, TierInstallmentPlan>;

	for (const months of monthsList) {
		if (totalKopecks <= 0) {
			result[months] = {
				months,
				monthlyPaymentKopecks: 0 as Kopecks,
				monthlyPaymentRub: 0,
				partsKopecks: Array(months).fill(0 as Kopecks),
				remainderKopecks: 0 as Kopecks,
			};
			continue;
		}

		const basePart = Math.floor(totalKopecks / months) as Kopecks;
		const remainder = (totalKopecks - basePart * months) as Kopecks;

		const parts: Kopecks[] = [];
		for (let i = 0; i < months; i++) {
			// Добавляем копеечный остаток к первому платежу
			const part = (i === 0 ? basePart + remainder : basePart) as Kopecks;
			parts.push(part);
		}

		const monthlyPaymentRub = Math.round(basePart / 100);

		result[months] = {
			months,
			monthlyPaymentKopecks: basePart,
			monthlyPaymentRub,
			partsKopecks: parts,
			remainderKopecks: remainder,
		};
	}

	return result;
}

/**
 * Рассчитывает социальный налоговый вычет 13% НДФЛ по ст. 219 НК РФ.
 * Делегирует в канонический расчет calculateNdflDeduction (Мандат 8s SSOT).
 * - Код 01 (Обычное лечение): лимит базы 150 000 ₽ в год, максимум возврата 19 500 ₽.
 * - Код 02 (Дорогостоящее лечение: имплантация, костная пластика, синус-лифтинг): без лимита базы!
 */
export function calculateChairsideTaxDeduction(
	totalKopecks: Kopecks,
	isHighCostTreatment: boolean,
): NdflDeductionResult {
	return calculateNdflDeduction(totalKopecks, isHighCostTreatment);
}

/**
 * Применяет свободную скидку врача (0-100%) к процедурам этапа (Мандат 8e).
 * При 100% скидке цена становится 0 ₽ (гарантия клиники).
 */
export function applyDoctorDiscountToStages(
	stages: readonly TreatmentPlanStage[],
	discountPercent: number,
): readonly TreatmentPlanStage[] {
	const validPct = Math.max(0, Math.min(100, discountPercent));

	return stages.map((stage) => {
		const updatedItems = stage.items.map((it) => {
			const baseUnitPriceRub =
				typeof it.unitPriceRub === "number" && it.unitPriceRub > 0
					? it.unitPriceRub
					: it.priceRub && it.quantity
						? Math.round(it.priceRub / it.quantity)
						: 0;

			const baseUnitPriceKop = parseKopecks(baseUnitPriceRub);
			const discountKopPerUnit =
				validPct > 0 ? percentageOfKopecks(baseUnitPriceKop, validPct * 100) : (0 as Kopecks);
			const finalUnitPriceKop = Math.max(0, baseUnitPriceKop - discountKopPerUnit) as Kopecks;

			const qty = Math.max(1, it.quantity || 1);
			const lineTotalKop = (finalUnitPriceKop * qty) as Kopecks;
			const lineDiscountKop = (discountKopPerUnit * qty) as Kopecks;

			return {
				...it,
				unitPriceRub: Math.round(baseUnitPriceKop / 100),
				priceRub: Math.round(lineTotalKop / 100),
				discountRub: Math.round(lineDiscountKop / 100),
			};
		});

		const stageTotals = calculateStageTotals(updatedItems);
		return {
			...stage,
			items: updatedItems,
			totalRub: stageTotals.totalRub,
			totalKopecks: stageTotals.totalKopecks,
		};
	});
}

/**
 * Полный пересчёт варианта плана лечения (Tier) после любых изменений в этапах.
 */
export function recalculateTierTotals(
	tier: TreatmentPlanTier,
	updatedStages: readonly TreatmentPlanStage[],
): TreatmentPlanTier {
	const stageStats = calculatePlanStagesTotals(updatedStages);
	const allItems = updatedStages.flatMap((s) => s.items);

	// Проверяем наличие дорогостоящих услуг (имплантация, костная пластика, синус-лифтинг)
	const isHighCost = allItems.some(
		(i) =>
			i.code804n === "A16.07.054.001" ||
			i.code804n === "A16.07.041" ||
			i.code804n === "A16.07.035" ||
			(i.name &&
				(i.name.toLowerCase().includes("имплантация") ||
					i.name.toLowerCase().includes("синус-лифтинг") ||
					i.name.toLowerCase().includes("костная пластика"))),
	);

	const ndflDetails = calculateChairsideTaxDeduction(stageStats.totalKopecks, isHighCost);
	const installments = calculateChairsideInstallments(stageStats.totalKopecks);
	const stagedSchedule = calculateStaged304030Schedule(stageStats.totalKopecks, true);

	return {
		...tier,
		stages: updatedStages,
		totalRub: stageStats.totalRub,
		totalKopecks: stageStats.totalKopecks,
		itemsCount: stageStats.itemsCount,
		durationWeeks: stageStats.estimatedWeeks,
		durationVisits: stageStats.estimatedVisits,
		installments,
		stagedSchedule,
		ndflDetails,
		ndflRefundRub: ndflDetails.refundRub,
		priceWithNdflRefundRub: ndflDetails.finalPriceWithRefundRub,
		monthlyInstallment12Rub: installments[12]?.monthlyPaymentRub ?? 0,
	};
}

/**
 * Валидатор целостности математических сумм плана лечения (Parity Check).
 */
export function validatePlanFinancialIntegrity(tier: TreatmentPlanTier): {
	readonly isValid: boolean;
	readonly sumItemsKopecks: Kopecks;
	readonly sumStagesKopecks: Kopecks;
	readonly tierTotalKopecks: Kopecks;
	readonly kopecksDrift: number;
	readonly errors: readonly string[];
} {
	const errors: string[] = [];

	// 1. Сумма всех процедур
	const allItems = tier.stages.flatMap((s) => s.items);
	const sumItemsKopecks = sumKopecks(
		allItems.map((it) => parseKopecks(it.priceRub || 0)),
	);

	// 2. Сумма этапов
	const sumStagesKopecks = sumKopecks(tier.stages.map((s) => s.totalKopecks));

	// 3. Общая сумма варианта
	const tierTotalKopecks = tier.totalKopecks;

	const kopecksDrift = Math.abs(sumStagesKopecks - tierTotalKopecks);

	if (kopecksDrift > 0) {
		errors.push(`Рассинхрон сумм этапов и общего итога варианта: ${kopecksDrift} коп.`);
	}

	// 4. Проверка рассрочки
	if (tier.installments && tier.installments[12]) {
		const inst12 = tier.installments[12];
		const sumParts = sumKopecks(inst12.partsKopecks);
		if (tierTotalKopecks > 0 && Math.abs(sumParts - tierTotalKopecks) > 0) {
			errors.push(
				`Рассрочка на 12 мес не сходится с итогом: сумма частей ${sumParts} != ${tierTotalKopecks}`,
			);
		}
	}

	return {
		isValid: errors.length === 0,
		sumItemsKopecks,
		sumStagesKopecks,
		tierTotalKopecks,
		kopecksDrift,
		errors,
	};
}
