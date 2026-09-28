import { z } from "zod";
import type { LeadPriority, LeadStatus } from "./leadSchemas.js";

export const LEAD_SLA_THRESHOLDS_MINUTES = {
	fresh: 15,
	warning: 60,
} as const;

export type LeadSlaBadgeStatus = "fresh" | "warning" | "breached";

export interface LeadSlaEvaluation {
	status: LeadSlaBadgeStatus;
	elapsedMinutes: number;
	elapsedFormattedRu: string;
	isBreached: boolean;
}

export function formatMinutesRu(totalMinutes: number): string {
	if (totalMinutes < 1) return "< 1 мин";
	const hours = Math.floor(totalMinutes / 60);
	const mins = Math.floor(totalMinutes % 60);
	if (hours === 0) return `${mins} мин`;
	if (mins === 0) return `${hours} ч`;
	return `${hours} ч ${mins} мин`;
}

export function calculateLeadSlaStatus(
	stageEnteredAt: Date | string | null | undefined,
	currentStage: LeadStatus = "new",
	now: Date = new Date(),
): LeadSlaEvaluation {
	if (!stageEnteredAt) {
		return {
			status: "fresh",
			elapsedMinutes: 0,
			elapsedFormattedRu: "< 1 мин",
			isBreached: false,
		};
	}

	const entered = typeof stageEnteredAt === "string" ? new Date(stageEnteredAt) : stageEnteredAt;
	const diffMs = Math.max(0, now.getTime() - entered.getTime());
	const elapsedMinutes = Math.floor(diffMs / (1000 * 60));

	let status: LeadSlaBadgeStatus = "fresh";
	let isBreached = false;

	// In CRM, the strictest SLA applies to "new" and "contacted" stages
	if (currentStage === "new" || currentStage === "contacted") {
		if (elapsedMinutes >= LEAD_SLA_THRESHOLDS_MINUTES.warning) {
			status = "breached";
			isBreached = true;
		} else if (elapsedMinutes >= LEAD_SLA_THRESHOLDS_MINUTES.fresh) {
			status = "warning";
		}
	} else {
		// Completed or closed stages are not actively breached
		if (elapsedMinutes >= 1440) {
			status = "warning";
		}
	}

	return {
		status,
		elapsedMinutes,
		elapsedFormattedRu: formatMinutesRu(elapsedMinutes),
		isBreached,
	};
}

export const leadPipelineMetricsSchema = z.object({
	totalLeads: z.number().int().nonnegative(),
	stageCounts: z.record(z.string(), z.number().int().nonnegative()),
	averageDurationSecondsByStage: z.record(z.string(), z.number().nonnegative()),
	stageConversionRates: z.record(z.string(), z.number().min(0).max(100)),
	slaBreachedCount: z.number().int().nonnegative(),
	urgentCount: z.number().int().nonnegative(),
	pipelineExpectedRevenueRub: z.number().nonnegative(),
});

export type LeadPipelineMetrics = z.infer<typeof leadPipelineMetricsSchema>;
