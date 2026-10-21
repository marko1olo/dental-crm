/**
 * DENTE Dental CRM — Lead Attribution and Transfer to Patient EHR
 * Zero Attribution Loss across Marketing Channels (152-FZ & 38-FZ)
 * Mandate 8b (<= 120 lines)
 */

import { extractLeadRevenueRub } from "./funnelConversionCalculator.js";
import {
	type FunnelLead,
	type Lead,
	type PatientAttributionRecord,
} from "./types.js";
import {
	extractLeadAttribution,
	parseUtmParameters,
} from "./attributionParser.js";

export { extractLeadAttribution, parseUtmParameters };

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
		? ` [UTM: ${[
				attr.utm.utm_source && `src=${attr.utm.utm_source}`,
				attr.utm.utm_campaign && `cmp=${attr.utm.utm_campaign}`,
				attr.utm.utm_medium && `med=${attr.utm.utm_medium}`,
			]
				.filter(Boolean)
				.join(", ")}]`
		: "";
	const inquirySuffix = attr.primaryInquiry ? ` | Запрос: ${attr.primaryInquiry}` : "";
	const preferredAppointmentNote = `src:${attr.channelLabel}${utmSuffix}${inquirySuffix}`;
	const medConsentStr = medicalCareProcessing ? "согласие получено" : "согласие не получено";
	const mktConsentStr = marketingPromotions
		? "согласие получено"
		: "отказ / исключён из рассылок";
	const dataProcessingBasisNote = `152-ФЗ: Обработка персданных для медпомощи — ${medConsentStr}. Рекламные рассылки и SMS (ФЗ-38) — ${mktConsentStr}. Источник: ${attr.channelLabel}.`;

	return {
		patientName,
		phone,
		advertisingSource: attr.channelLabel,
		sourceChannelKey: attr.channelKey,
		primaryInquiry: attr.primaryInquiry,
		utm: attr.utm,
		administrativeProfile: {
			advertisingSource: attr.channelLabel,
			preferredAppointmentNote,
			dataProcessingBasisNote,
			utmSource: attr.utm.utm_source,
			utmMedium: attr.utm.utm_medium,
			utmCampaign: attr.utm.utm_campaign,
		},
		consents: { medicalCareProcessing, marketingPromotions },
	};
}

export function linkPatientRevenueToLeadAttribution(
	leads: readonly FunnelLead[],
	payments: readonly {
		leadId?: string;
		patientId?: string;
		phone?: string;
		paidAmountRub: number;
	}[],
): FunnelLead[] {
	return leads.map((lead) => {
		const cleanPhone = (raw?: string | null) =>
			raw ? raw.replace(/\D/g, "").slice(-10) : "";
		const leadPhone = cleanPhone(lead.phone);
		const matches = payments.filter(
			(p) =>
				(p.leadId && p.leadId === lead.id) ||
				(p.phone && leadPhone && cleanPhone(p.phone) === leadPhone),
		);
		if (matches.length === 0) return lead;

		const total = matches.reduce(
			(sum, p) => sum + (Number.isFinite(p.paidAmountRub) ? p.paidAmountRub : 0),
			0,
		);
		const newRevenueRub = Math.max(
			extractLeadRevenueRub(lead),
			Math.round(total),
		);
		return {
			...lead,
			actualRevenueRub: newRevenueRub,
			paidAmountRub: newRevenueRub,
			paidAmountKopecks: newRevenueRub * 100,
			...(newRevenueRub > 0 ? { isPaid: true, stageReached: "paid" } : {}),
		};
	});
}
