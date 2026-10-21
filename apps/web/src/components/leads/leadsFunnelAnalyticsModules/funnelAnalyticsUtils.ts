import {
	calculateFunnelAnalysis,
	exportFunnelReportCsv,
	exportFunnelReportSummaryText,
	filterLeadsByPeriod,
	getDefaultChannelSpendMap,
} from "../leadsFunnelEngine";
import type {
	ChannelSpendMap,
	FunnelTimePeriod,
	LiveMarketingAttributionPayload,
} from "./types";

export {
	calculateFunnelAnalysis,
	exportFunnelReportCsv,
	exportFunnelReportSummaryText,
	filterLeadsByPeriod,
	getDefaultChannelSpendMap,
};

/**
 * Pure mapper converting live `/api/marketing/attribution` response payload
 * into canonical channel spend overrides in rubles.
 */
export function mapLiveAttributionToChannelSpends(
	data: LiveMarketingAttributionPayload | null | undefined,
): Partial<ChannelSpendMap> {
	if (!data || typeof data !== "object") {
		return {};
	}

	const liveSpends: Partial<ChannelSpendMap> = {};
	if (Array.isArray(data.selfBookingChannels)) {
		for (const ch of data.selfBookingChannels) {
			const rub = Math.round((ch.spentKopecks || 0) / 100);
			if (ch.key === "gis_2") liveSpends.gis_2 = rub;
			else if (ch.key === "prodoctorov") liveSpends.prodoctorov = rub;
			else if (ch.key === "website_widget") liveSpends.site_seo = rub;
			else if (ch.key === "tg_bot" || ch.key === "wa_bot") {
				liveSpends.social_media = (liveSpends.social_media || 0) + rub;
			}
		}
	}
	if (data.telephonyAdminFunnel) {
		liveSpends.other = Math.round(
			(data.telephonyAdminFunnel.spentKopecks || 0) / 100,
		);
	}

	return liveSpends;
}

/**
 * Sanitizes a user budget string input into a non-negative integer ruble amount.
 */
export function parseSanitizedBudgetRub(valueStr: string): number {
	const num = Number(valueStr.replace(/[^0-9]/g, ""));
	return Number.isFinite(num) ? num : 0;
}

/**
 * Builds the standardized CSV export filename for a given period and date.
 */
export function buildFunnelCsvFilename(
	period: FunnelTimePeriod,
	isoDateStr?: string,
): string {
	const dateSlice = (isoDateStr ?? new Date().toISOString()).slice(0, 10);
	return `Dente_Leads_Funnel_Report_${period}_${dateSlice}.csv`;
}

/**
 * Resolves the semantic CSS color token for Show-up percentage.
 */
export function resolveShowUpToneColor(showUpRatePercent: number): string {
	return showUpRatePercent >= 75 ? "var(--ok-fg)" : "var(--warn-fg)";
}

/**
 * Resolves the semantic CSS color token for ROMI percentage.
 */
export function resolveRomiToneColor(romiPercent: number): string {
	if (romiPercent >= 100) return "var(--ok-fg)";
	if (romiPercent >= 0) return "var(--warn-fg)";
	return "var(--rust)";
}
