/**
 * DENTE Dental CRM — Leads Funnel Helper Calculations
 * Channel Performance & Funnel Leak Detection (Mandate 8b <= 120 lines)
 */

import type { Lead } from "../../store/leadsStore";
import type {
	ChannelPerformanceMetric,
	FunnelLeakWarning,
} from "./funnelEngineModules/types";
import { normalizeMarketingChannel } from "./leadsFunnelTypes";

export type { ChannelPerformanceMetric, FunnelLeakWarning };

/**
 * Расчет эффективности рекламных каналов привлечения (Яндекс, 2ГИС, ПроДокторов, Сайт)
 */
export function calculateChannelPerformance(
	leads: Lead[],
): ChannelPerformanceMetric[] {
	const map = new Map<string, ChannelPerformanceMetric>();

	for (const lead of leads) {
		const rawSource = lead.source?.trim() || "Прямое обращение";
		const channelKey = normalizeMarketingChannel(rawSource);
		const revenue = Number(lead.expectedRevenue) || 0;

		let record = map.get(channelKey);
		if (!record) {
			record = {
				channelKey,
				channelLabel: rawSource,
				leadCount: 0,
				bookedCount: 0,
				showedUpCount: 0,
				conversionRatePct: 0,
				pipelineRevenue: 0,
				realizedRevenue: 0,
			};
			map.set(channelKey, record);
		}

		record.leadCount++;
		if (lead.status === "consult_booked") {
			record.bookedCount++;
			record.pipelineRevenue += revenue;
		} else if (lead.status === "showed_up" || lead.status === "converted") {
			record.showedUpCount++;
			record.realizedRevenue += revenue;
		} else if (lead.status === "new" || lead.status === "contacted") {
			record.pipelineRevenue += revenue;
		}
	}

	const result = Array.from(map.values());
	for (const item of result) {
		item.conversionRatePct =
			item.leadCount > 0
				? Math.round(
						((item.bookedCount + item.showedUpCount) / item.leadCount) * 1000,
					) / 10
				: 0;
	}

	return result.sort((a, b) => b.leadCount - a.leadCount);
}

/**
 * Выявляет утечки в воронке (лиды без ответа > 24ч, отказы без причины)
 */
export function detectFunnelLeaks(leads: Lead[]): FunnelLeakWarning[] {
	const warnings: FunnelLeakWarning[] = [];
	const now = Date.now();
	const oneDayMs = 24 * 60 * 60 * 1000;

	for (const lead of leads) {
		const createdTime = lead.createdAt
			? new Date(lead.createdAt).getTime()
			: now;
		const ageMs = now - createdTime;

		if (lead.status === "new" && ageMs > oneDayMs) {
			warnings.push({
				leadId: lead.id,
				leadName: lead.name,
				leadPhone: lead.phone,
				leakType: "stale_new",
				severity: "high",
				message: `Обращение ожидает звонка более ${Math.floor(ageMs / 3600000)} ч. Риск потери пациента!`,
				detectedAtIso: new Date().toISOString(),
			});
		}

		if (lead.status === "trash" && !lead.dropReason) {
			warnings.push({
				leadId: lead.id,
				leadName: lead.name,
				leadPhone: lead.phone,
				leakType: "unrecorded_drop_reason",
				severity: "medium",
				message: "Лид отправлен в архив без фиксации причины отказа.",
				detectedAtIso: new Date().toISOString(),
			});
		}
	}

	return warnings;
}
