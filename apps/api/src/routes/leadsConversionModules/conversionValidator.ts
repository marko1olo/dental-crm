/**
 * conversionValidator.ts — Schema validation & structured attribution for lead conversion.
 * Mandate 8b (Strict <= 120 lines). Mandate 8ap (Relational truth over regex-mining).
 */

import { z } from "zod";

export const convertLeadSchema = z.object({
	appointmentStart: z.string().datetime().or(z.literal("")).optional().nullable(),
	appointmentEnd: z.string().datetime().or(z.literal("")).optional().nullable(),
	chairId: z.string().optional().nullable(),
	doctorId: z.string().optional().nullable(),
	organizationId: z.string().uuid().optional(),
	reason: z.string().optional().nullable(),
	comment: z.string().optional().nullable(),
});

export type ConvertLeadPayload = z.infer<typeof convertLeadSchema>;

export interface StructuredLeadAttribution {
	utmSource?: string;
	utmMedium?: string;
	utmCampaign?: string;
	utmContent?: string;
	utmTerm?: string;
	formattedUtm?: string;
	leadSource?: string;
}

/**
 * Normalizes structured attribution from lead metadata or structured source.
 * Strict Mandate 8ap: Relational structured metadata is authoritative over text regexes.
 */
export function resolveStructuredLeadAttribution(input?: {
	source?: string | null | undefined;
	metadata?: Record<string, unknown> | null | undefined;
	utmSource?: string | null | undefined;
	utmMedium?: string | null | undefined;
	utmCampaign?: string | null | undefined;
	utmContent?: string | null | undefined;
	utmTerm?: string | null | undefined;
}): StructuredLeadAttribution {
	const utmSource = input?.utmSource || (input?.metadata?.utm_source as string | undefined);
	const utmMedium = input?.utmMedium || (input?.metadata?.utm_medium as string | undefined);
	const utmCampaign = input?.utmCampaign || (input?.metadata?.utm_campaign as string | undefined);
	const utmContent = input?.utmContent || (input?.metadata?.utm_content as string | undefined);
	const utmTerm = input?.utmTerm || (input?.metadata?.utm_term as string | undefined);

	const parts: string[] = [];
	if (utmSource) parts.push(`source=${utmSource}`);
	if (utmMedium) parts.push(`medium=${utmMedium}`);
	if (utmCampaign) parts.push(`campaign=${utmCampaign}`);
	if (utmContent) parts.push(`content=${utmContent}`);
	if (utmTerm) parts.push(`term=${utmTerm}`);

	const res: StructuredLeadAttribution = {};
	if (utmSource) res.utmSource = utmSource;
	if (utmMedium) res.utmMedium = utmMedium;
	if (utmCampaign) res.utmCampaign = utmCampaign;
	if (utmContent) res.utmContent = utmContent;
	if (utmTerm) res.utmTerm = utmTerm;
	if (parts.length > 0) res.formattedUtm = `UTM: ${parts.join(" | ")}`;
	if (input?.source) res.leadSource = input.source;
	return res;
}

function parseUtmFromSource(source?: string | null): Partial<StructuredLeadAttribution> {
	if (!source || !source.includes("=")) return {};
	try {
		const queryPart = source.includes("?") ? source.slice(source.indexOf("?") + 1) : source;
		const cleaned = queryPart.replace(/[\[\]]/g, "&");
		const params = new URLSearchParams(cleaned);
		const get = (key: string): string | undefined => {
			const val = params.get(key) || params.get(key.toLowerCase());
			return val ? val.trim() : undefined;
		};
		const utmSource = get("utm_source");
		const utmMedium = get("utm_medium");
		const utmCampaign = get("utm_campaign");
		const utmContent = get("utm_content");
		const utmTerm = get("utm_term");

		const res: Partial<StructuredLeadAttribution> = {};
		if (utmSource) res.utmSource = utmSource;
		if (utmMedium) res.utmMedium = utmMedium;
		if (utmCampaign) res.utmCampaign = utmCampaign;
		if (utmContent) res.utmContent = utmContent;
		if (utmTerm) res.utmTerm = utmTerm;
		return res;
	} catch {
		return {};
	}
}

/**
 * Structured lead UTM attribution extractor.
 * Strict Mandate 8ap: Zero regex-mining on freeform text / notes!
 * Relational structured metadata and source column are authoritative.
 */
export function extractUtmAttribution(
	source?: string | null,
	metadataOrNotes?: Record<string, unknown> | string | null,
	structured?: Partial<StructuredLeadAttribution> | null,
): StructuredLeadAttribution {
	if (structured && Object.keys(structured).length > 0) {
		return resolveStructuredLeadAttribution({ source, ...structured });
	}

	if (metadataOrNotes && typeof metadataOrNotes === "object" && !Array.isArray(metadataOrNotes)) {
		return resolveStructuredLeadAttribution({
			source,
			metadata: metadataOrNotes as Record<string, unknown>,
		});
	}

	if (source && source.trim()) {
		const parsedFromSource = parseUtmFromSource(source.trim());
		return resolveStructuredLeadAttribution({
			source: source.trim(),
			...parsedFromSource,
		});
	}

	return {};
}
