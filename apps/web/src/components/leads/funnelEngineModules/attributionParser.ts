/**
 * DENTE Dental CRM — Lead Attribution Parser & UTM Extraction
 * Mandate 8b (<= 120 lines)
 */

import {
	type FunnelLead,
	getMarketingChannelLabel,
	type Lead,
	type LeadAttributionDetails,
	type LeadUtmParameters,
	normalizeMarketingChannel,
} from "./types.js";

export function parseUtmParameters(text?: string | null): LeadUtmParameters {
	const defaultResult: LeadUtmParameters = {
		utm_source: null,
		utm_medium: null,
		utm_campaign: null,
		utm_content: null,
		utm_term: null,
	};
	if (!text || typeof text !== "string") return defaultResult;
	const result: Record<string, string> = {};
	const utmKeys = [
		"utm_source",
		"utm_medium",
		"utm_campaign",
		"utm_content",
		"utm_term",
	] as const;

	try {
		const queryString = text.includes("?")
			? text.split("?")[1]
			: text.includes("&") || text.includes("=")
				? text
				: "";
		if (queryString) {
			for (const pair of queryString.split("&")) {
				const [k, v] = pair.split("=");
				if (k && v) {
					const cleanKey = decodeURIComponent(
						k.trim().replace(/\+/g, " "),
					).toLowerCase();
					if (cleanKey.startsWith("utm_")) {
						result[cleanKey] = decodeURIComponent(v.trim().replace(/\+/g, " "));
					}
				}
			}
		}
	} catch {
		// ignore
	}

	for (const key of utmKeys) {
		if (!result[key]) {
			const regex = new RegExp(`(?:^|[?&\\s])${key}=([^&\\s]+)`, "i");
			const match = text.match(regex);
			if (match?.[1]) {
				const raw = match[1].replace(/\+/g, " ");
				try {
					result[key] = decodeURIComponent(raw);
				} catch {
					result[key] = raw;
				}
			}
		}
	}

	return {
		utm_source: result.utm_source || null,
		utm_medium: result.utm_medium || null,
		utm_campaign: result.utm_campaign || null,
		utm_content: result.utm_content || null,
		utm_term: result.utm_term || null,
	};
}

export function extractLeadAttribution(
	lead: Partial<FunnelLead> | Partial<Lead>,
): LeadAttributionDetails {
	const sourceRaw = (lead.source || "").trim();
	const channelKey = normalizeMarketingChannel(sourceRaw);
	const channelLabel = getMarketingChannelLabel(channelKey);

	// Мандат 8ap (Реляционная истина): читаем реляционные поля и метаданные лида, а не клинические заметки
	const meta = lead.metadata;
	const metaUtm =
		meta && typeof meta === "object" && "utm" in meta && typeof meta.utm === "object" && meta.utm !== null
			? (meta.utm as Record<string, unknown>)
			: null;

	const relSource =
		lead.utmSource ??
		lead.utm_source ??
		(typeof metaUtm?.utm_source === "string" ? metaUtm.utm_source : typeof metaUtm?.source === "string" ? metaUtm.source : null);
	const relMedium =
		lead.utmMedium ??
		lead.utm_medium ??
		(typeof metaUtm?.utm_medium === "string" ? metaUtm.utm_medium : typeof metaUtm?.medium === "string" ? metaUtm.medium : null);
	const relCampaign =
		lead.utmCampaign ??
		lead.utm_campaign ??
		(typeof metaUtm?.utm_campaign === "string" ? metaUtm.utm_campaign : typeof metaUtm?.campaign === "string" ? metaUtm.campaign : null);
	const relContent =
		lead.utmContent ??
		lead.utm_content ??
		(typeof metaUtm?.utm_content === "string" ? metaUtm.utm_content : typeof metaUtm?.content === "string" ? metaUtm.content : null);
	const relTerm =
		lead.utmTerm ??
		lead.utm_term ??
		(typeof metaUtm?.utm_term === "string" ? metaUtm.utm_term : typeof metaUtm?.term === "string" ? metaUtm.term : null);

	const utmFromSource = parseUtmParameters(sourceRaw);
	const utm: LeadUtmParameters = {
		utm_source: relSource || utmFromSource.utm_source || null,
		utm_medium: relMedium || utmFromSource.utm_medium || null,
		utm_campaign: relCampaign || utmFromSource.utm_campaign || null,
		utm_content: relContent || utmFromSource.utm_content || null,
		utm_term: relTerm || utmFromSource.utm_term || null,
	};
	const hasUtmTags = Boolean(
		utm.utm_source ||
			utm.utm_medium ||
			utm.utm_campaign ||
			utm.utm_content ||
			utm.utm_term,
	);
	const primaryInquiry = lead.notes ? lead.notes.trim() : null;
	return {
		channelKey,
		channelLabel,
		sourceRaw,
		utm,
		primaryInquiry,
		hasUtmTags,
	};
}
