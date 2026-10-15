/**
 * FUNNEL ENGINE MODULES: COHORT CALCULATOR
 *
 * Layer 1/2: Чистый расчет когортной доходимости пациентов до визитов,
 * определение максимального этапа воронки и прогнозирование show-up по источникам.
 *
 * ИНВАРИАНТЫ:
 * - Чистые функции без мутаций входных массивов.
 * - Полная поддержка этапов: new -> contacted -> consult_booked -> showed_up -> treatment_plan_accepted -> paid.
 */

import {
	type FunnelLead,
	type FunnelTimePeriod,
	type LeadFunnelStageKey,
	MARKETING_CHANNELS,
	normalizeMarketingChannel,
	type SourceShowUpPrediction,
} from "./types.js";
import { safePercent } from "./funnelRoiEngine.js";
import type { FunnelCohortSlice, FunnelCohortWindow } from "./funnelConversionTypes.js";

/**
 * Порядок следования этапов воронки от первого контакта до оплаты
 */
export const FUNNEL_STAGE_ORDER: Record<LeadFunnelStageKey, number> = {
	new: 0,
	contacted: 1,
	consult_booked: 2,
	showed_up: 3,
	treatment_plan_accepted: 4,
	paid: 5,
};

/**
 * Определяет максимальный достигнутый этап воронки для лида.
 */
export function detectLeadStage(lead: FunnelLead): LeadFunnelStageKey {
	if (lead.stageReached) {
		return lead.stageReached;
	}

	const paidVal =
		lead.paidAmountRub ??
		(lead.paidAmountKopecks ? lead.paidAmountKopecks / 100 : 0);
	const actualVal =
		typeof lead.actualRevenueRub === "number" && lead.actualRevenueRub > 0
			? lead.actualRevenueRub
			: 0;

	// Только РЕАЛЬНЫЕ поступления денежных средств переводят лида в статус paid.
	// Ожидаемая выручка (expectedRevenue) не является оплатой (Mandate 8e/8n/8f zero potemkin).
	if (lead.isPaid || paidVal > 0 || (actualVal > 0 && lead.status !== "new" && lead.status !== "contacted")) {
		return "paid";
	}

	if (lead.treatmentPlanAgreed) {
		return "treatment_plan_accepted";
	}

	if (lead.showedUp || lead.status === "showed_up") {
		return "showed_up";
	}

	if (lead.status === "consult_booked") {
		return "consult_booked";
	}

	if (lead.status === "contacted" || lead.status === "no_answer") {
		return "contacted";
	}

	return "new";
}

/**
 * Проверяет, прошел ли лид указанный этап воронки.
 * Сквозная логика: если лид на этапе 5 (paid), он гарантированно прошел этапы 0, 1, 2, 3, 4, 5.
 */
export function hasLeadPassedStage(
	leadStage: LeadFunnelStageKey,
	targetStage: LeadFunnelStageKey,
): boolean {
	return FUNNEL_STAGE_ORDER[leadStage] >= FUNNEL_STAGE_ORDER[targetStage];
}

/**
 * Фильтрация массива лидов по выбранному периоду.
 */
export function filterLeadsByPeriod(
	leads: readonly FunnelLead[],
	period: FunnelTimePeriod,
	referenceDate: Date = new Date(),
): FunnelLead[] {
	if (period === "all") {
		return [...leads];
	}

	const refTime = referenceDate.getTime();
	let startThresholdMs: number;

	if (period === "today") {
		const startOfToday = new Date(
			referenceDate.getFullYear(),
			referenceDate.getMonth(),
			referenceDate.getDate(),
		);
		startThresholdMs = startOfToday.getTime();
	} else if (period === "week") {
		startThresholdMs = refTime - 7 * 24 * 60 * 60 * 1000;
	} else if (period === "month") {
		startThresholdMs = refTime - 30 * 24 * 60 * 60 * 1000;
	} else if (period === "quarter") {
		startThresholdMs = refTime - 90 * 24 * 60 * 60 * 1000;
	} else if (period === "year") {
		startThresholdMs = refTime - 365 * 24 * 60 * 60 * 1000;
	} else {
		return [...leads];
	}

	return leads.filter((lead) => {
		if (!lead.createdAt) {
			return true;
		}
		const createdTime = new Date(lead.createdAt).getTime();
		if (Number.isNaN(createdTime)) {
			return true;
		}
		return createdTime >= startThresholdMs && createdTime <= refTime + 60000;
	});
}

/**
 * Прогнозирование доходимости по рекламным источникам на основе исторических конверсий.
 */
export function predictShowUpBySource(
	historicalLeads: readonly FunnelLead[],
	currentBookedLeads: readonly FunnelLead[],
): SourceShowUpPrediction[] {
	return MARKETING_CHANNELS.map((ch) => {
		const histChannelLeads = historicalLeads.filter(
			(l) => normalizeMarketingChannel(l.source) === ch.key,
		);

		let histBooked = 0;
		let histShowUp = 0;

		for (const l of histChannelLeads) {
			const stage = detectLeadStage(l);
			if (hasLeadPassedStage(stage, "consult_booked")) {
				histBooked += 1;
			}
			if (hasLeadPassedStage(stage, "showed_up")) {
				histShowUp += 1;
			}
		}

		const currentBookedForChannel = currentBookedLeads.filter(
			(l) => normalizeMarketingChannel(l.source) === ch.key,
		).length;

		// Фактическая историческая конверсия доходимости (0% при отсутствии истории, без выдуманных дефолтов)
		const historicalRate =
			histBooked > 0 ? safePercent(histShowUp, histBooked) : 0;

		const predictedShowUpCount = Math.round(
			(currentBookedForChannel * historicalRate) / 100,
		);

		let confidence: "high" | "medium" | "low" = "low";
		if (histBooked >= 20) {
			confidence = "high";
		} else if (histBooked >= 5) {
			confidence = "medium";
		}

		return {
			channelKey: ch.key,
			channelLabel: ch.label,
			bookedCount: currentBookedForChannel,
			predictedShowUpCount,
			predictedShowUpRatePercent: historicalRate,
			confidence,
		};
	});
}

/**
 * Чистый когортный расчет доходимости пациентов и повторных визитов
 */
export function calculateCohortRetention(
	leads: readonly FunnelLead[],
	window: FunnelCohortWindow = "month",
): FunnelCohortSlice[] {
	if (leads.length === 0) {
		return [];
	}

	const cohortsMap = new Map<string, FunnelLead[]>();

	for (const lead of leads) {
		const date = lead.createdAt ? new Date(lead.createdAt) : new Date();
		const year = date.getFullYear();
		let cohortKey: string;

		if (window === "day") {
			const month = String(date.getMonth() + 1).padStart(2, "0");
			const day = String(date.getDate()).padStart(2, "0");
			cohortKey = `${year}-${month}-${day}`;
		} else if (window === "week") {
			const weekNumber = Math.ceil(
				((date.getTime() - new Date(year, 0, 1).getTime()) / 86400000 + 1) / 7,
			);
			cohortKey = `${year}-W${String(weekNumber).padStart(2, "0")}`;
		} else if (window === "quarter") {
			const q = Math.floor(date.getMonth() / 3) + 1;
			cohortKey = `${year}-Q${q}`;
		} else {
			// month default
			const month = String(date.getMonth() + 1).padStart(2, "0");
			cohortKey = `${year}-${month}`;
		}

		const list = cohortsMap.get(cohortKey) ?? [];
		list.push(lead);
		cohortsMap.set(cohortKey, list);
	}

	const result: FunnelCohortSlice[] = [];

	for (const [cohortId, cohortLeads] of cohortsMap.entries()) {
		let bookedCount = 0;
		let showUpCount = 0;
		let treatedCount = 0;
		let paidCount = 0;
		let totalRevenueRub = 0;
		let repeatVisitsCount = 0;

		for (const lead of cohortLeads) {
			const stage = detectLeadStage(lead);
			if (hasLeadPassedStage(stage, "consult_booked")) bookedCount += 1;
			if (hasLeadPassedStage(stage, "showed_up")) showUpCount += 1;
			if (hasLeadPassedStage(stage, "treatment_plan_accepted")) treatedCount += 1;
			if (hasLeadPassedStage(stage, "paid")) {
				paidCount += 1;
				const rev =
					typeof lead.actualRevenueRub === "number" && lead.actualRevenueRub > 0
						? lead.actualRevenueRub
						: (lead.paidAmountRub ?? 0);
				totalRevenueRub += rev;
			}
			// Учет повторных визитов если они есть в свойствах лида/пациента
			if ((lead as any).followUpStatus === "closed_won" || ((lead as any).visitsCount && (lead as any).visitsCount > 1)) {
				repeatVisitsCount += 1;
			}
		}

		const showUpRatePercent = safePercent(showUpCount, bookedCount);
		const repeatRetentionRatePercent = safePercent(repeatVisitsCount, showUpCount);

		result.push({
			cohortId,
			periodLabel: `Когорта ${cohortId}`,
			startDate: cohortId,
			endDate: cohortId,
			totalLeads: cohortLeads.length,
			bookedCount,
			showUpCount,
			treatedCount,
			paidCount,
			totalRevenueRub,
			showUpRatePercent,
			repeatVisitsCount,
			repeatRetentionRatePercent,
		});
	}

	return result.sort((a, b) => a.cohortId.localeCompare(b.cohortId));
}
