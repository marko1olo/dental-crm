/**
 * CRM END-TO-END FUNNEL & MARKETING INTELLIGENCE ENGINE (DENTE CRM)
 *
 * Каноническое ядро сквозной воронки лидов клиники.
 * Mandate 8x (Живой клинический язык), Mandate 8e (Автономия врача),
 * Mandate 8n (Суверенитет масштаба соло-врача и небольшой клиники), Mandate 8b (<= 120 строк).
 */

import type { Lead } from "../../store/leadsStore";
import { getLeadSlaStatus } from "./leadsKanbanSla";

export * from "./funnelEngineModules/index.js";
export * from "./leadsFunnelHelpers.js";

export interface ClinicalFunnelMetrics {
	totalCount: number;
	newCount: number;
	bookedCount: number;
	showedUpCount: number;
	trashCount: number;
	bookingRatePct: number;
	showUpRatePct: number;
	overallConversionRatePct: number;
	pipelineRevenue: number;
	realizedRevenue: number;
	lostRevenue: number;
	slaBreachedCount: number;
}

/**
 * Рассчитывает сквозные клинические метрики воронки DENTE
 */
export function calculateClinicalFunnelMetrics(
	leads: Lead[],
): ClinicalFunnelMetrics {
	let newCount = 0;
	let bookedCount = 0;
	let showedUpCount = 0;
	let trashCount = 0;
	let pipelineRevenue = 0;
	let realizedRevenue = 0;
	let lostRevenue = 0;
	let slaBreachedCount = 0;

	for (const lead of leads) {
		const revenue = Number(lead.expectedRevenue) || 0;
		const sla = getLeadSlaStatus(lead);
		if (sla.isBreached) slaBreachedCount++;

		switch (lead.status) {
			case "new":
			case "contacted":
				newCount++;
				pipelineRevenue += revenue;
				break;
			case "consult_booked":
				bookedCount++;
				pipelineRevenue += revenue;
				break;
			case "showed_up":
			case "converted":
				showedUpCount++;
				realizedRevenue += revenue;
				break;
			default:
				trashCount++;
				lostRevenue += revenue;
				break;
		}
	}

	const totalCount = leads.length;
	const activeOrDoneCount = bookedCount + showedUpCount;
	const targetableCount = totalCount - trashCount;

	const bookingRatePct =
		targetableCount > 0
			? Math.round((activeOrDoneCount / targetableCount) * 1000) / 10
			: 0;

	const showUpRatePct =
		activeOrDoneCount > 0
			? Math.round((showedUpCount / activeOrDoneCount) * 1000) / 10
			: 0;

	const overallConversionRatePct =
		totalCount > 0 ? Math.round((showedUpCount / totalCount) * 1000) / 10 : 0;

	return {
		totalCount,
		newCount,
		bookedCount,
		showedUpCount,
		trashCount,
		bookingRatePct,
		showUpRatePct,
		overallConversionRatePct,
		pipelineRevenue,
		realizedRevenue,
		lostRevenue,
		slaBreachedCount,
	};
}
