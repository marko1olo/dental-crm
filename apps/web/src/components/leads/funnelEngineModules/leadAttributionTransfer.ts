/**
 * DENTE Dental CRM — Lead Attribution and Transfer to Patient EHR
 * Zero Attribution Loss across Marketing Channels (152-FZ & 38-FZ)
 */

import { extractLeadRevenueRub } from "./funnelConversionCalculator.js";
import {
	type FunnelLead, type Lead, type LeadUtmParameters, type LeadAttributionDetails,
	type PatientAttributionRecord, getMarketingChannelLabel, normalizeMarketingChannel,
} from "./types.js";

export function parseUtmParameters(text?: string | null): LeadUtmParameters {
	const defaultResult: LeadUtmParameters = {
		utm_source: null, utm_medium: null, utm_campaign: null, utm_content: null, utm_term: null,
	};
	if (!text || typeof text !== "string") return defaultResult;
	const result: Record<string, string> = {};
	const utmKeys = ["utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term"] as const;

	try {
		const queryString = text.includes("?") ? text.split("?")[1] : (text.includes("&") || text.includes("=") ? text : "");
		if (queryString) {
			for (const pair of queryString.split("&")) {
				const [k, v] = pair.split("=");
				if (k && v) {
					const cleanKey = decodeURIComponent(k.trim().replace(/\+/g, " ")).toLowerCase();
					if (cleanKey.startsWith("utm_")) result[cleanKey] = decodeURIComponent(v.trim().replace(/\+/g, " "));
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
				try { result[key] = decodeURIComponent(raw); } catch { result[key] = raw; }
			}
		}
	}

	return {
		utm_source: result.utm_source || null, utm_medium: result.utm_medium || null,
		utm_campaign: result.utm_campaign || null, utm_content: result.utm_content || null, utm_term: result.utm_term || null,
	};
}

export function extractLeadAttribution(lead: Partial<FunnelLead> | Partial<Lead>): LeadAttributionDetails {
	const sourceRaw = (lead.source || "").trim();
	const channelKey = normalizeMarketingChannel(sourceRaw);
	const channelLabel = getMarketingChannelLabel(channelKey);
	const utmFromSource = parseUtmParameters(sourceRaw);
	const utmFromNotes = parseUtmParameters(lead.notes || "");
	const utm: LeadUtmParameters = {
		utm_source: utmFromSource.utm_source || utmFromNotes.utm_source || null,
		utm_medium: utmFromSource.utm_medium || utmFromNotes.utm_medium || null,
		utm_campaign: utmFromSource.utm_campaign || utmFromNotes.utm_campaign || null,
		utm_content: utmFromSource.utm_content || utmFromNotes.utm_content || null,
		utm_term: utmFromSource.utm_term || utmFromNotes.utm_term || null,
	};
	const hasUtmTags = Boolean(utm.utm_source || utm.utm_medium || utm.utm_campaign || utm.utm_content || utm.utm_term);
	const primaryInquiry = lead.notes ? lead.notes.trim() : null;
	return { channelKey, channelLabel, sourceRaw, utm, primaryInquiry, hasUtmTags };
}

export function createPatientAttributionRecord(
	lead: FunnelLead | Lead,
	options: { consentMarketing?: boolean; consentMedical?: boolean } = {},
): PatientAttributionRecord {
	const attr = extractLeadAttribution(lead);
	const patientName = lead.name || (lead as Lead).patientName || "Пациент";
	const phone = lead.phone ? lead.phone.trim() : null;
	const medicalCareProcessing = options.consentMedical ?? true;
	const marketingPromotions = options.consentMarketing ?? false;

	const utmSuffix = attr.hasUtmTags
		? ` [UTM: ${[attr.utm.utm_source && `src=${attr.utm.utm_source}`, attr.utm.utm_campaign && `cmp=${attr.utm.utm_campaign}`, attr.utm.utm_medium && `med=${attr.utm.utm_medium}`].filter(Boolean).join(", ")}]`
		: "";
	const inquirySuffix = attr.primaryInquiry ? ` | Запрос: ${attr.primaryInquiry}` : "";
	const preferredAppointmentNote = `src:${attr.channelLabel}${utmSuffix}${inquirySuffix}`;
	const medConsentStr = medicalCareProcessing ? "согласие получено" : "согласие не получено";
	const mktConsentStr = marketingPromotions ? "согласие получено" : "отказ / исключён из рассылок";
	const dataProcessingBasisNote = `152-ФЗ: Обработка персданных для медпомощи — ${medConsentStr}. Рекламные рассылки и SMS (ФЗ-38) — ${mktConsentStr}. Источник: ${attr.channelLabel}.`;

	return {
		patientName, phone, advertisingSource: attr.channelLabel, sourceChannelKey: attr.channelKey,
		primaryInquiry: attr.primaryInquiry, utm: attr.utm,
		administrativeProfile: { advertisingSource: attr.channelLabel, preferredAppointmentNote, dataProcessingBasisNote, utmSource: attr.utm.utm_source, utmMedium: attr.utm.utm_medium, utmCampaign: attr.utm.utm_campaign },
		consents: { medicalCareProcessing, marketingPromotions },
	};
}

export function linkPatientRevenueToLeadAttribution(
	leads: readonly FunnelLead[],
	payments: readonly { leadId?: string; patientId?: string; phone?: string; paidAmountRub: number }[],
): FunnelLead[] {
	return leads.map((lead) => {
		const cleanPhone = (raw?: string | null) => (raw ? raw.replace(/\D/g, "").slice(-10) : "");
		const leadPhone = cleanPhone(lead.phone);
		const matches = payments.filter((p) => (p.leadId && p.leadId === lead.id) || (p.phone && leadPhone && cleanPhone(p.phone) === leadPhone));
		if (matches.length === 0) return lead;

		const total = matches.reduce((sum, p) => sum + (Number.isFinite(p.paidAmountRub) ? p.paidAmountRub : 0), 0);
		const newRevenueRub = Math.max(extractLeadRevenueRub(lead), Math.round(total));
		return {
			...lead,
			actualRevenueRub: newRevenueRub,
			paidAmountRub: newRevenueRub,
			paidAmountKopecks: newRevenueRub * 100,
			...(newRevenueRub > 0 ? { isPaid: true, stageReached: "paid" } : {}),
		};
	});
}
