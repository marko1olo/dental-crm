/**
 * FUNNEL ENGINE MODULES: LEAD STAGE DETECTOR & PERIOD FILTER
 * Mandate 8b (<= 120 lines), Mandate 8s (Modular Architecture)
 */

import type {
	FunnelLead,
	FunnelTimePeriod,
	LeadFunnelStageKey,
} from "./types.js";

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

	if (
		lead.isPaid ||
		paidVal > 0 ||
		(actualVal > 0 && lead.status !== "new" && lead.status !== "contacted")
	) {
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
	if (period === "all") return [...leads];

	const refTime = referenceDate.getTime();
	let startThresholdMs: number;

	if (period === "today") {
		startThresholdMs = new Date(
			referenceDate.getFullYear(),
			referenceDate.getMonth(),
			referenceDate.getDate(),
		).getTime();
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
		if (!lead.createdAt) return true;
		const createdTime = new Date(lead.createdAt).getTime();
		if (Number.isNaN(createdTime)) return true;
		return createdTime >= startThresholdMs && createdTime <= refTime + 60000;
	});
}
