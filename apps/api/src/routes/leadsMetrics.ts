import { desc, eq } from "drizzle-orm";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import { crmLeads, crmLeadStageHistory } from "../db/schema.js";

export interface PipelineMetricsResult {
	totalLeads: number;
	stageCounts: Record<string, number>;
	averageDurationSecondsByStage: Record<string, number>;
	stageConversionRates: Record<string, number>;
	slaBreachedCount: number;
	urgentCount: number;
	pipelineExpectedRevenueRub: number;
}

/**
 * Computes consolidated speed-to-lead SLA, stage conversions and duration metrics for CRM pipeline.
 */
export async function calculateLeadPipelineMetrics(
	// biome-ignore lint/suspicious/noExplicitAny: Drizzle ORM client
	db: NodePgDatabase<any>,
	organizationId: string,
): Promise<PipelineMetricsResult> {
	const leads = await db
		.select()
		.from(crmLeads)
		.where(eq(crmLeads.organizationId, organizationId));

	const totalLeads = leads.length;
	const stageCounts: Record<string, number> = {
		new: 0,
		contacted: 0,
		consult_booked: 0,
		showed_up: 0,
		no_answer: 0,
		trash: 0,
	};

	let slaBreachedCount = 0;
	let urgentCount = 0;
	let pipelineExpectedRevenueRub = 0;
	const now = new Date();

	for (const lead of leads) {
		const st = (lead.status || "new") as string;
		stageCounts[st] = (stageCounts[st] || 0) + 1;

		if (lead.priority === "urgent") {
			urgentCount++;
		}

		if (st === "new" || st === "contacted") {
			const enteredAt = lead.stageEnteredAt || lead.createdAt;
			const elapsedMin = Math.floor(
				(now.getTime() - enteredAt.getTime()) / (60 * 1000),
			);
			if (elapsedMin >= 60) {
				slaBreachedCount++;
			}
		}

		if (lead.expectedRevenue) {
			const val = Number.parseFloat(lead.expectedRevenue);
			if (!Number.isNaN(val) && val > 0) {
				pipelineExpectedRevenueRub += val;
			}
		}
	}

	// Stage duration averages from audit history and active leads
	const historyRecords = await db
		.select({
			fromStage: crmLeadStageHistory.fromStage,
			durationSeconds: crmLeadStageHistory.durationSeconds,
		})
		.from(crmLeadStageHistory)
		.where(eq(crmLeadStageHistory.organizationId, organizationId));

	const stageDurations: Record<string, number[]> = {
		new: [],
		contacted: [],
		consult_booked: [],
		showed_up: [],
		no_answer: [],
		trash: [],
	};

	for (const h of historyRecords) {
		if (
			h.fromStage &&
			typeof h.durationSeconds === "number" &&
			h.durationSeconds >= 0
		) {
			const arr =
				stageDurations[h.fromStage] ?? (stageDurations[h.fromStage] = []);
			arr.push(h.durationSeconds);
		}
	}

	for (const lead of leads) {
		const st = lead.status || "new";
		const entered = lead.stageEnteredAt || lead.createdAt;
		const elapsedSec = Math.max(
			0,
			Math.floor((now.getTime() - entered.getTime()) / 1000),
		);
		const arr = stageDurations[st] ?? (stageDurations[st] = []);
		arr.push(elapsedSec);
	}

	const averageDurationSecondsByStage: Record<string, number> = {};
	for (const [st, arr] of Object.entries(stageDurations)) {
		if (arr.length > 0) {
			const sum = arr.reduce((acc, v) => acc + v, 0);
			averageDurationSecondsByStage[st] = Math.round(sum / arr.length);
		} else {
			averageDurationSecondsByStage[st] = 0;
		}
	}

	const countContacted = stageCounts.contacted || 0;
	const countBooked = stageCounts.consult_booked || 0;
	const countShowed = stageCounts.showed_up || 0;

	const reachedContactedOrBeyond = countContacted + countBooked + countShowed;
	const reachedBookedOrBeyond = countBooked + countShowed;
	const reachedShowedOrBeyond = countShowed;
	const basePool = Math.max(1, totalLeads);

	const stageConversionRates: Record<string, number> = {
		new_to_contacted:
			totalLeads > 0
				? Math.round((reachedContactedOrBeyond / basePool) * 1000) / 10
				: 0,
		contacted_to_consult_booked:
			reachedContactedOrBeyond > 0
				? Math.round((reachedBookedOrBeyond / reachedContactedOrBeyond) * 1000) /
					10
				: 0,
		consult_booked_to_showed_up:
			reachedBookedOrBeyond > 0
				? Math.round((reachedShowedOrBeyond / reachedBookedOrBeyond) * 1000) / 10
				: 0,
		overall_conversion:
			totalLeads > 0
				? Math.round((reachedShowedOrBeyond / basePool) * 1000) / 10
				: 0,
	};

	return {
		totalLeads,
		stageCounts,
		averageDurationSecondsByStage,
		stageConversionRates,
		slaBreachedCount,
		urgentCount,
		pipelineExpectedRevenueRub:
			Math.round(pipelineExpectedRevenueRub * 100) / 100,
	};
}
