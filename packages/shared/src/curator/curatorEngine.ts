/**
 * packages/shared/src/curator/curatorEngine.ts
 *
 * Чистый математический и бизнес-движок для роли «Куратор пациентов» (Фича #27) DENTE CRM.
 * Полная точность: расчет денег ведется до копейки без плавающей точки.
 */

import { parseKopecks } from "../money.js";
import {
	type CuratorAttentionFlag,
	type CuratorCommissionRule,
	type CuratorConversionMetrics,
	type CuratorFunnelStage,
	type CuratorPatientQueueItem,
	type CuratorQueueFilterOptions,
	type CuratorStageStats,
	CURATOR_STAGE_DEFINITIONS,
	DEFAULT_CURATOR_COMMISSION_RULES,
} from "./types.js";

/**
 * Расчет сдельной комиссии куратора на основе собранной выручки и процента конверсии.
 * Поддерживает кастомную фиксированную ставку или ступенчатую шкалу эффективности.
 */
export function calculateCuratorCommission(
	collectedRevenueKopecks: number,
	conversionPercent: number,
	customRatePercent?: number | null,
	rules: readonly CuratorCommissionRule[] = DEFAULT_CURATOR_COMMISSION_RULES,
): {
	effectiveRatePercent: number;
	commissionKopecks: number;
	commissionRub: number;
	tierLabel: string;
} {
	const sanitizedKopecks = Math.max(0, Math.round(collectedRevenueKopecks));
	const sanitizedConversion = Math.max(0, Math.min(100, conversionPercent));

	let ratePercent = 3.0;
	let label = "Стандартная ставка (3.0%)";

	if (typeof customRatePercent === "number" && customRatePercent >= 0 && customRatePercent <= 100) {
		ratePercent = customRatePercent;
		label = `Индивидуальная ставка (${customRatePercent.toFixed(1)}%)`;
	} else {
		for (const rule of rules) {
			if (sanitizedConversion >= rule.minConversionPercent && sanitizedConversion <= rule.maxConversionPercent) {
				ratePercent = rule.commissionRatePercent;
				label = `${rule.tierLabel} (${ratePercent.toFixed(1)}%)`;
				break;
			}
		}
	}

	// Точный расчет в копейках: (копейки * процент) / 100
	const commissionKopecks = Math.round((sanitizedKopecks * ratePercent) / 100);
	const commissionRub = commissionKopecks / 100;

	return {
		effectiveRatePercent: ratePercent,
		commissionKopecks,
		commissionRub,
		tierLabel: label,
	};
}

/**
 * Оценка приоритета и флагов внимания для пациента в очереди куратора
 */
export function evaluatePatientUrgency(
	daysInStage: number,
	stage: CuratorFunnelStage,
	planTotalPriceRub: number,
	paidAmountRub: number,
	hasVipStatus: boolean = false,
): {
	priorityScore: number;
	attentionFlags: CuratorAttentionFlag[];
} {
	const flags: CuratorAttentionFlag[] = [];
	let score = 50;

	const stageDef = CURATOR_STAGE_DEFINITIONS.find((s) => s.stage === stage);
	const standardDays = stageDef?.standardCycleDays ?? 5;

	// 1. Проверка на превышение нормативного срока этапа
	if (daysInStage > standardDays && stage !== "completed") {
		flags.push("stagnant_plan");
		score += Math.min(25, (daysInStage - standardDays) * 5);
	}

	// 2. Высокий чек плана (> 150 000 руб.)
	if (planTotalPriceRub >= 150_000) {
		flags.push("high_value_plan");
		score += 15;
	}

	// 3. Согласован, но без предоплаты > 3 дней
	if (stage === "plan_negotiation" && daysInStage >= 3 && paidAmountRub === 0) {
		flags.push("pending_prepayment");
		score += 15;
	}

	// 4. Предоплата внесена, но старт лечения задерживается
	if (stage === "prepayment" && paidAmountRub > 0 && daysInStage >= 2) {
		flags.push("ready_for_first_visit");
		score += 10;
	}

	// 5. Контрольный звонок при длительном согласовании
	if ((stage === "consultation" || stage === "plan_negotiation") && daysInStage >= 2) {
		flags.push("requires_followup_call");
	}

	// 6. VIP-статус
	if (hasVipStatus) {
		flags.push("vip_patient");
		score += 10;
	}

	if (stage === "completed") {
		score = 10;
	}

	return {
		priorityScore: Math.min(100, Math.max(1, Math.round(score))),
		attentionFlags: flags,
	};
}

/**
 * Расчет агрегированных метрик и воронки куратора
 */
export function calculateCuratorMetrics(
	items: readonly CuratorPatientQueueItem[],
	curatorId: string,
	curatorFullName: string,
	customRatePercent?: number | null,
	rules: readonly CuratorCommissionRule[] = DEFAULT_CURATOR_COMMISSION_RULES,
): CuratorConversionMetrics {
	const curatorItems = curatorId === "all" ? items : items.filter((it) => it.curatorId === curatorId);

	const totalPlansCount = curatorItems.length;
	const totalAssignedPatients = new Set(curatorItems.map((it) => it.patientId)).size;

	let totalPlansSumKopecks = 0;
	let totalCollectedRevenueKopecks = 0;
	let completedPlansCount = 0;
	let activePipelineCount = 0;

	// Группировка по этапам
	const stageMap = new Map<CuratorFunnelStage, { count: number; totalKopecks: number; totalDays: number }>();
	for (const def of CURATOR_STAGE_DEFINITIONS) {
		stageMap.set(def.stage, { count: 0, totalKopecks: 0, totalDays: 0 });
	}

	for (const item of curatorItems) {
		const planKop = item.planTotalPriceKopecks > 0 ? item.planTotalPriceKopecks : parseKopecks(item.planTotalPriceRub);
		const paidKop = item.paidAmountKopecks > 0 ? item.paidAmountKopecks : parseKopecks(item.paidAmountRub);

		totalPlansSumKopecks += planKop;
		totalCollectedRevenueKopecks += paidKop;

		const currentStage = item.funnelStage;
		const bucket = stageMap.get(currentStage);
		if (bucket) {
			bucket.count += 1;
			bucket.totalKopecks += planKop;
			bucket.totalDays += item.daysInStage;
		}

		if (currentStage === "completed") {
			completedPlansCount += 1;
		} else {
			activePipelineCount += 1;
		}
	}

	// Расчет конверсии: процент планов, дошедших до реального старта или завершения
	// Конверсия = (Старт лечения + Завершено) / Всего планов * 100
	const advancedCount = (stageMap.get("treatment_start")?.count ?? 0) + (stageMap.get("completed")?.count ?? 0);
	const overallConversionPercent =
		totalPlansCount > 0 ? Math.round((advancedCount / totalPlansCount) * 1000) / 10 : 0;

	// Расчет комиссии
	const commissionCalc = calculateCuratorCommission(
		totalCollectedRevenueKopecks,
		overallConversionPercent,
		customRatePercent,
		rules,
	);

	// Построение 5-этапного отчета
	let previousStageCount = totalPlansCount;
	const stagesBreakdown: CuratorStageStats[] = CURATOR_STAGE_DEFINITIONS.map((def) => {
		const bucket = stageMap.get(def.stage) ?? { count: 0, totalKopecks: 0, totalDays: 0 };
		const count = bucket.count;
		const totalRub = bucket.totalKopecks / 100;
		const avgDays = count > 0 ? Math.round((bucket.totalDays / count) * 10) / 10 : 0;

		const conversionFromTop =
			totalPlansCount > 0 ? Math.round((count / totalPlansCount) * 1000) / 10 : 0;
		const conversionFromPrev =
			previousStageCount > 0 ? Math.round((count / previousStageCount) * 1000) / 10 : 0;
		const dropOff = Math.max(0, previousStageCount - count);

		previousStageCount = count;

		return {
			stage: def.stage,
			title: def.title,
			count,
			totalRub,
			totalKopecks: bucket.totalKopecks,
			conversionFromPreviousPercent: conversionFromPrev,
			conversionFromTopPercent: conversionFromTop,
			dropOffCount: dropOff,
			avgDaysInStage: avgDays,
		};
	});

	return {
		curatorId,
		curatorFullName: curatorFullName || "Все кураторы",
		totalAssignedPatients,
		totalPlansCount,
		totalPlansSumRub: totalPlansSumKopecks / 100,
		totalPlansSumKopecks,
		totalCollectedRevenueRub: totalCollectedRevenueKopecks / 100,
		totalCollectedRevenueKopecks,
		overallConversionPercent,
		effectiveCommissionRatePercent: commissionCalc.effectiveRatePercent,
		commissionEarnedRub: commissionCalc.commissionRub,
		commissionEarnedKopecks: commissionCalc.commissionKopecks,
		commissionTierLabel: commissionCalc.tierLabel,
		activePipelinePatientsCount: activePipelineCount,
		completedPlansCount,
		rejectedPlansCount: 0,
		stagesBreakdown,
	};
}

/**
 * Фильтрация и сортировка пациентов в очереди куратора
 */
export function filterAndSortCuratorQueue(
	items: readonly CuratorPatientQueueItem[],
	options: CuratorQueueFilterOptions,
): CuratorPatientQueueItem[] {
	const query = (options.searchQuery || "").trim().toLowerCase();

	const filtered = items.filter((item) => {
		// 1. Фильтр по куратору
		if (options.curatorId && options.curatorId !== "all" && item.curatorId !== options.curatorId) {
			return false;
		}

		// 2. Фильтр по этапу воронки
		if (options.stage && options.stage !== "all" && item.funnelStage !== options.stage) {
			return false;
		}

		// 3. Фильтр по ценовому диапазону сметы
		if (options.priceRange && options.priceRange !== "all") {
			const rub = item.planTotalPriceRub;
			if (options.priceRange === "low" && rub >= 50_000) return false;
			if (options.priceRange === "medium" && (rub < 50_000 || rub > 150_000)) return false;
			if (options.priceRange === "high" && rub <= 150_000) return false;
		}

		// 4. Фильтр по флагам внимания
		if (options.onlyWithAttentionFlags && item.attentionFlags.length === 0) {
			return false;
		}

		// 5. Текстовый поиск (ФИО, телефон, название плана, ФИО врача)
		if (query) {
			const name = item.patientFullName.toLowerCase();
			const phone = (item.patientPhone || "").toLowerCase();
			const plan = item.treatmentPlanTitle.toLowerCase();
			const doc = (item.doctorFullName || "").toLowerCase();
			const match = name.includes(query) || phone.includes(query) || plan.includes(query) || doc.includes(query);
			if (!match) return false;
		}

		return true;
	});

	// Сортировка
	const sorted = [...filtered];
	const sortBy = options.sortBy || "priority";

	sorted.sort((a, b) => {
		if (sortBy === "priority") {
			return b.priorityScore - a.priorityScore;
		}
		if (sortBy === "sum_desc") {
			return b.planTotalPriceRub - a.planTotalPriceRub;
		}
		if (sortBy === "days_in_stage_desc") {
			return b.daysInStage - a.daysInStage;
		}
		if (sortBy === "assigned_at_desc") {
			return new Date(b.assignedAt).getTime() - new Date(a.assignedAt).getTime();
		}
		return 0;
	});

	return sorted;
}

/**
 * Переход на следующий этап воронки с обновлением сумм и пересчетом приоритета
 */
export function advancePatientFunnelStage(
	item: CuratorPatientQueueItem,
	nextStage: CuratorFunnelStage,
	additionalPaidRub: number = 0,
): CuratorPatientQueueItem {
	const newPaidRub = item.paidAmountRub + Math.max(0, additionalPaidRub);
	const newPaidKopecks = parseKopecks(newPaidRub);
	const totalKopecks = item.planTotalPriceKopecks > 0 ? item.planTotalPriceKopecks : parseKopecks(item.planTotalPriceRub);
	const remainingKopecks = Math.max(0, totalKopecks - newPaidKopecks);
	const remainingRub = remainingKopecks / 100;

	const urgency = evaluatePatientUrgency(0, nextStage, item.planTotalPriceRub, newPaidRub);

	return {
		...item,
		funnelStage: nextStage,
		stageUpdatedAt: new Date().toISOString(),
		daysInStage: 0,
		paidAmountRub: newPaidRub,
		paidAmountKopecks: newPaidKopecks,
		remainingAmountRub: remainingRub,
		remainingAmountKopecks: remainingKopecks,
		priorityScore: urgency.priorityScore,
		attentionFlags: urgency.attentionFlags,
	};
}
