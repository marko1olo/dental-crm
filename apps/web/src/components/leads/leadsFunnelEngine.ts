/**
 * CRM END-TO-END FUNNEL & MARKETING INTELLIGENCE ENGINE (DENTE CRM)
 *
 * Каноническое ядро сквозной воронки лидов клиники.
 * Mandate 8x (Живой клинический язык), Mandate 8e (Автономия врача),
 * Mandate 8n (Суверенитет масштаба соло-врача и небольшой клиники).
 *
 * 4 канонических этапа воронки:
 * [ Новые обращения ] -> [ Записаны на приём ] -> [ Дошли до клиники ] -> [ Архив / Спам ]
 */

import type { Lead } from "../../store/leadsStore";
import { getLeadSlaStatus } from "./leadsKanbanSla";
import { normalizeMarketingChannel } from "./leadsFunnelTypes";

export * from "./funnelEngineModules/index.js";

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

export interface ChannelPerformanceMetric {
	channelKey: string;
	channelLabel: string;
	leadCount: number;
	bookedCount: number;
	showedUpCount: number;
	conversionRatePct: number;
	pipelineRevenue: number;
	realizedRevenue: number;
}

export interface FunnelLeakWarning {
	leadId: string;
	leadName: string;
	leadPhone?: string | undefined;
	leakType: "stale_new" | "unconfirmed_appointment" | "unrecorded_drop_reason";
	severity: "high" | "medium" | "low";
	message: string;
	detectedAtIso: string;
}

/**
 * Рассчитывает сквозные клинические метрики воронки DENTE
 */
export function calculateClinicalFunnelMetrics(leads: Lead[]): ClinicalFunnelMetrics {
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
			case "trash":
			case "no_answer":
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
		totalCount > 0
			? Math.round((showedUpCount / totalCount) * 1000) / 10
			: 0;

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

/**
 * Расчет эффективности рекламных каналов привлечения (Яндекс, 2ГИС, ПроДокторов, Сайт)
 */
export function calculateChannelPerformance(leads: Lead[]): ChannelPerformanceMetric[] {
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
				? Math.round(((item.bookedCount + item.showedUpCount) / item.leadCount) * 1000) / 10
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
		const createdTime = lead.createdAt ? new Date(lead.createdAt).getTime() : now;
		const ageMs = now - createdTime;

		// 1. Новое обращение зависло более 24ч без контакта
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

		// 2. Лид отправлен в архив/спам без указания причины срыва
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
